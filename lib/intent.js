// Rule-based intent parser for English, Hindi (Devanagari) and Hinglish questions. No LLM.
// parseQuestion(text, nowLocal) -> {lang, place, placeSource, dayOffset, hour, workload, wantsNow}
import { PLACES } from './gazetteer.js';

const DEV_DIGITS = '०१२३४५६७८९';
export const normDigits = (s) => s.replace(/[०-९]/g, (d) => String(DEV_DIGITS.indexOf(d)));
export const isDevanagari = (s) => /[\u0900-\u097F]/.test(s);

const WEEKDAYS = [
  ['sunday', 'sun', 'रविवार', 'इतवार', 'ravivar'],
  ['monday', 'mon', 'सोमवार', 'somvar'],
  ['tuesday', 'tue', 'मंगलवार', 'mangalvar'],
  ['wednesday', 'wed', 'बुधवार', 'budhvar'],
  ['thursday', 'thu', 'गुरुवार', 'बृहस्पतिवार', 'guruvar'],
  ['friday', 'fri', 'शुक्रवार', 'shukravar'],
  ['saturday', 'sat', 'शनिवार', 'shanivar'],
];

const WORKLOAD = [
  ['hard', /\b(carry|carrying|lift|lifting|dig|digging|brick|bricks|load|loading|unload|cement|mason|masonry|shovel|heavy|harvest by hand)\b|ढो|उठा|खुदाई|ईंट|बोझ|भारी|मज़दूरी|मजदूरी/i],
  ['moderate', /\b(roof|roofing|construction|site|deliver|delivery|ride|riding|cycle|rickshaw|farm|field|harvest|walk|walking|plaster|paint|painting|weld)\b|छत|निर्माण|डिलीवरी|खेत|कटाई|रिक्शा|साइकिल|चलना/i],
  ['easy', /\b(sit|sitting|stall|vend|vendor|guard|watchman|traffic|light work|selling)\b|बैठ|ठेला|दुकान|चौकीदार|गार्ड|हल्का/i],
];

const STOP = new Set(['tomorrow', 'today', 'tonight', 'now', 'at', 'on', 'the', 'day', 'after', 'morning', 'afternoon',
  'evening', 'night', 'noon', 'safe', 'work', 'working', 'is', 'it', 'to', 'for', 'this', 'next', 'kal', 'aaj',
  'am', 'pm', 'roof', 'outside', 'outdoors', 'site']);

function findPlace(text) {
  const low = ` ${text.toLowerCase()} `;
  let best = null;
  for (const [name, aliases] of PLACES) {
    for (const a of aliases) {
      const re = isDevanagari(a)
        ? new RegExp(`(^|[\\s,.?!।])${a}($|[\\s,.?!।])`)
        : new RegExp(`[^a-z]${a.replace(/ /g, '\\s+')}[^a-z]`);
      if (re.test(low) && (!best || a.length > best.len)) best = { name, len: a.length };
    }
  }
  if (best) return { place: best.name, placeSource: 'gazetteer' };
  // English pattern: "in/at/near/for <Place words>"
  const m = text.match(/\b(?:in|at|near|for|around)\s+([A-Z][A-Za-z.-]+(?:\s+[A-Z][A-Za-z.-]+){0,2})/);
  if (m) {
    const words = m[1].split(/\s+/).filter((w) => !STOP.has(w.toLowerCase()));
    if (words.length) return { place: words.join(' '), placeSource: 'pattern' };
  }
  // Hindi pattern: "<Place> में" (word before "में")
  const h = text.match(/([\u0900-\u097F]{2,})\s+में/);
  if (h && !['आज', 'कल', 'परसों', 'दोपहर', 'सुबह', 'शाम', 'रात', 'धूप', 'छत', 'खेत'].includes(h[1])) {
    return { place: h[1], placeSource: 'pattern' };
  }
  const hl = text.match(/\b([A-Za-z]{3,})\s+(?:mein|me|mai)\b/i);
  if (hl && !STOP.has(hl[1].toLowerCase())) return { place: hl[1], placeSource: 'pattern' };
  return { place: null, placeSource: null };
}

function findDay(text, nowLocal) {
  const t = text.toLowerCase();
  if (/day after tomorrow|परसों|\bparson\b|\bparso\b/.test(t)) return 2;
  if (/tomorrow|\btmrw\b|कल|\bkal\b/.test(t)) return 1; // "kal" = tomorrow in a forecast context
  if (/today|tonight|\bnow\b|आज|अभी|\baaj\b|\babhi\b/.test(t)) return 0;
  const dow = nowLocal.getUTCDay();
  for (let i = 0; i < 7; i++) {
    for (const w of WEEKDAYS[i]) {
      const re = isDevanagari(w) ? new RegExp(w) : new RegExp(`\\b${w}\\b`);
      if (re.test(t)) return (i - dow + 7) % 7;
    }
  }
  return null;
}

function findHour(text) {
  const t = normDigits(text.toLowerCase());
  let m = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/);
  if (m) {
    let h = Number(m[1]) % 12;
    if (m[3].startsWith('p')) h += 12;
    return h;
  }
  m = t.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m) return Number(m[1]);
  const period = /दोपहर|dopahar|dopehar|afternoon/.test(t) ? 'aft'
    : /शाम|shaam|sham\b|evening/.test(t) ? 'eve'
      : /रात|raat|night|tonight/.test(t) ? 'night'
        : /सुबह|subah|morning/.test(t) ? 'morn'
          : /\bnoon\b|midday|दोपहर 12/.test(t) ? 'noon' : null;
  m = t.match(/(\d{1,2})\s*(?:बजे|baje|o'?clock)/) || t.match(/\bat\s+(\d{1,2})\b(?!\s*(?:km|°|c\b|%))/);
  if (m) {
    let h = Number(m[1]);
    if (h > 23) return null;
    if (period === 'aft' || period === 'eve') { if (h < 12) h += 12; } else if (period === 'night') {
      if (h >= 6 && h < 12) h += 12;
    } else if (period === 'morn') { if (h === 12) h = 0; } else if (h >= 1 && h <= 6) h += 12; // "at 2" -> 14:00
    return h;
  }
  if (period === 'noon') return 12;
  if (period === 'aft') return 14;
  if (period === 'eve') return 17;
  if (period === 'night') return 21;
  if (period === 'morn') return 8;
  return null;
}

function findWorkload(text) {
  for (const [w, re] of WORKLOAD) if (re.test(text)) return w;
  return null;
}

/** nowLocal: a Date whose UTC fields represent local wall-clock time at the place (IST). */
export function parseQuestion(text, nowLocal = new Date()) {
  const hinglish = (text.toLowerCase().match(/\b(kal|aaj|parson|mein|hai|kaam|karna|baje|dopahar|subah|shaam|raat|abhi|kya|sakta|sakte|garmi)\b/g) || []).length;
  const lang = isDevanagari(text) || hinglish >= 2 ? 'hi' : 'en';
  const { place, placeSource } = findPlace(text);
  const wantsNow = /\bnow\b|\bright now\b|अभी|\babhi\b/i.test(text);
  let dayOffset = findDay(text, nowLocal);
  let hour = findHour(text);
  if (wantsNow) { dayOffset = 0; hour = nowLocal.getUTCHours(); }
  return { lang, place, placeSource, dayOffset, hour, workload: findWorkload(text), wantsNow };
}
