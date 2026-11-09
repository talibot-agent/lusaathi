// Builds answers to parsed questions and the WhatsApp advisory text, using only numbers from the forecast.
import { CAT, IMD, WORKLOAD, REGION, SRC, fmtDate, fmtHour, r0, r1, workRestText } from './i18n.js';
import { hourRanges, WORK_START, WORK_END } from './model.js';
import { workRest } from './heat.js';

export const NDMA_NOON = [12, 13, 14]; // NDMA: avoid going out in the sun 12:00–15:00 during heat waves

function imdLine(day, lang) {
  let s = IMD[lang][day.imd.level];
  if (day.imd.departure != null) {
    s += lang === 'hi' ? ` (विचलन ${day.imd.departure >= 0 ? '+' : ''}${r1(day.imd.departure)}°C)` : ` (departure ${day.imd.departure >= 0 ? '+' : ''}${r1(day.imd.departure)}°C)`;
  } else if (day.needsNormal) {
    s += lang === 'hi' ? ' (सामान्य तापमान उपलब्ध नहीं – केवल निरपेक्ष जाँच)' : ' (normal unavailable – absolute test only)';
  }
  return s;
}

/** Coolest-category alternative hour on the same day within work hours (earliest hour of lowest category). */
export function bestAlternative(fc, date) {
  const hs = fc.hours.filter((h) => h.date === date && h.hour >= WORK_START && h.hour <= WORK_END);
  if (!hs.length) return null;
  const minCat = Math.min(...hs.map((h) => h.category));
  return { cat: minCat, hours: hs.filter((h) => h.category === minCat).map((h) => h.hour) };
}

/**
 * @param q parsed question; @param fc forecast from buildForecast; @param nowLocal Date (UTC fields = local time)
 */
export function answer(q, fc, nowLocal, defaultWorkload = 'moderate') {
  const lang = q.lang;
  const wl = q.workload || defaultWorkload;
  const todayIso = nowLocal.toISOString().slice(0, 10);
  const placeName = fc.place.displayName || fc.place.name;
  const dayOffset = q.dayOffset ?? (q.hour != null && q.hour <= nowLocal.getUTCHours() ? 1 : 0);
  const target = new Date(Date.parse(todayIso + 'T00:00:00Z') + dayOffset * 86400000).toISOString().slice(0, 10);
  const day = fc.days.find((d) => d.date === target);
  if (!day) {
    return lang === 'hi'
      ? `${placeName}: यह तारीख अगले 72 घंटों के पूर्वानुमान से बाहर है। आज, कल या परसों के बारे में पूछें।`
      : `${placeName}: that date is outside the 72-hour forecast window. Ask about today, tomorrow or the day after.`;
  }
  const L = [];
  if (q.hour != null) {
    const h = fc.hours.find((x) => x.date === target && x.hour === q.hour);
    if (!h) return lang === 'hi' ? `${placeName}: उस समय का डेटा नहीं मिला।` : `${placeName}: no forecast for that hour.`;
    const wr = workRest(h.category, wl);
    const head = `${placeName}, ${fmtDate(target, lang)} ${fmtHour(q.hour)}`;
    if (lang === 'hi') {
      L.push(`${head}: हवा ${r0(h.tC)}°C, नमी ${r0(h.rh)}%, वेट-बल्ब ${r1(h.tw)}°C, हीट इंडेक्स ${r0(h.hi)}°C${h.hiOutOfRange ? ' (इतनी सूखी हवा में मोटा अनुमान)' : ''}, अनुमानित WBGT ${r1(h.wbgt)}°C (दो अनुमानों में ज़्यादा वाला: ${SRC.hi[h.wbgtSource]}; ${h.wbgtSource === 'bom' ? `धूप/ग्लोब मॉडल ${r1(h.wbgtGlobe)}°C` : `BoM सूत्र ${r1(h.wbgtBom)}°C`}) → ${CAT.hi[h.category]}.`);
      L.push(`${WORKLOAD.hi[wl]} के लिए: ${workRestText(wr, 'hi')}; हर घंटे लगभग ${wr.waterLph} लीटर पानी (दिन में 11 लीटर से ज़्यादा नहीं)।`);
    } else {
      L.push(`${head}: air ${r0(h.tC)}°C, humidity ${r0(h.rh)}%, wet-bulb ${r1(h.tw)}°C, heat index ${r0(h.hi)}°C${h.hiOutOfRange ? ' (rough: formula not valid in air this dry)' : ''}, estimated WBGT ${r1(h.wbgt)}°C (the higher of two estimates, from the ${SRC.en[h.wbgtSource]}; ${h.wbgtSource === 'bom' ? `sun/globe model ${r1(h.wbgtGlobe)}°C` : `BoM formula ${r1(h.wbgtBom)}°C`}) → ${CAT.en[h.category]}.`);
      L.push(`For ${WORKLOAD.en[wl]}: ${workRestText(wr, 'en')}; drink about ${wr.waterLph} L water per hour (not more than ~1.4 L/hour or ~11 L/day).`);
    }
    let verdict;
    if (wr.noLimit) verdict = lang === 'hi' ? 'जवाब: हाँ, सामान्य सावधानी के साथ (छाँव, पानी, हल्के कपड़े)।' : 'Answer: Yes, with normal precautions (shade, water, light clothing).';
    else if (wr.workMin >= 30) verdict = lang === 'hi' ? `जवाब: हाँ, लेकिन केवल तय आराम-अंतराल के साथ (${workRestText(wr, 'hi')})।` : `Answer: Yes, but only with the scheduled breaks (${workRestText(wr, 'en')}).`;
    else verdict = lang === 'hi' ? `जवाब: जोखिम अधिक – इस घंटे में सिर्फ़ ${wr.workMin} मिनट काम की सीमा है; काम ठंडे समय पर करें।` : `Answer: High risk – the guideline allows only ${wr.workMin} min of work in this hour; move the work to a cooler time.`;
    L.unshift(verdict);
    if (!wr.noLimit) {
      const alt = bestAlternative(fc, target);
      if (alt && alt.cat < h.category) {
        L.push(lang === 'hi' ? `उसी दिन बेहतर समय: ${hourRanges(alt.hours)} (${CAT.hi[alt.cat]})।` : `Better time that day: ${hourRanges(alt.hours)} (${CAT.en[alt.cat]}).`);
      }
    }
    if (NDMA_NOON.includes(q.hour) && (day.imd.level > 0 || h.category >= 3)) {
      L.push(lang === 'hi' ? 'NDMA लू दिशानिर्देश: दोपहर 12 से 3 बजे तक धूप में जाने से बचें; मेहनत वाला काम ठंडे समय पर करें।' : 'NDMA heat-wave guidance: avoid going out in the sun 12:00–15:00 and schedule strenuous jobs to cooler times of the day.');
    }
  } else {
    if (lang === 'hi') {
      L.push(`${placeName}, ${fmtDate(target, lang)}: अधिकतम ${r1(day.tmax)}°C; सबसे ज़्यादा WBGT ${r1(day.peakWbgt)}°C (${fmtHour(day.peakHour)}, ${CAT.hi[day.peakCat]}; ${SRC.hi[day.peakSource]})।`);
      L.push(day.restrictedHours.length ? `${WORKLOAD.hi[wl]} पर समय-सीमा वाले घंटे: ${hourRanges(day.restrictedHours)}।` : 'काम के घंटों में कोई समय-सीमा नहीं।');
    } else {
      L.push(`${placeName}, ${fmtDate(target, lang)}: max ${r1(day.tmax)}°C; peak WBGT ${r1(day.peakWbgt)}°C at ${fmtHour(day.peakHour)} (${CAT.en[day.peakCat]}; ${SRC.en[day.peakSource]}).`);
      L.push(day.restrictedHours.length ? `Hours needing work/rest limits (${WORKLOAD.en[wl]}): ${hourRanges(day.restrictedHours)}.` : 'No work-time limits needed during work hours.');
    }
  }
  L.push(imdLine(day, lang) + (lang === 'hi' ? ` [${REGION.hi[fc.place.region]}]` : ` [${REGION.en[fc.place.region]}]`));
  return L.join('\n');
}

/** WhatsApp advisory text for employers / supervisors / ASHA workers. */
export function advisoryText(fc, lang, workload = 'moderate', url = '') {
  const name = fc.place.displayName || fc.place.name;
  const L = [];
  L.push(lang === 'hi' ? `🌡️ लू साथी – गर्मी सलाह: ${name}` : `🌡️ LuSaathi heat advisory: ${name}`);
  for (const d of fc.days.slice(0, 3)) {
    const cat = CAT[lang][d.peakCat];
    const lim = d.restrictedHours.length ? hourRanges(d.restrictedHours) : (lang === 'hi' ? 'कोई नहीं' : 'none');
    const wr = workRest(d.peakCat, workload);
    if (lang === 'hi') {
      L.push(`\n📅 ${fmtDate(d.date, 'hi')}: अधिकतम ${r0(d.tmax)}°C, अधिकतम WBGT ${r1(d.peakWbgt)}°C (${cat}; ${SRC.hi[d.peakSource]})`);
      if (d.imd.level) L.push(`⚠️ ${IMD.hi[d.imd.level]}`);
      L.push(`⏱️ समय-सीमा वाले घंटे (${WORKLOAD.hi[workload]}): ${lim}`);
      if (!wr.noLimit) L.push(`➡️ सबसे गर्म घंटे में: ${workRestText(wr, 'hi')}, ~${wr.waterLph} ली. पानी/घंटा`);
    } else {
      L.push(`\n📅 ${fmtDate(d.date, 'en')}: max ${r0(d.tmax)}°C, peak WBGT ${r1(d.peakWbgt)}°C (${cat}; ${SRC.en[d.peakSource]})`);
      if (d.imd.level) L.push(`⚠️ ${IMD.en[d.imd.level]}`);
      L.push(`⏱️ Hours needing work/rest limits (${WORKLOAD.en[workload]}): ${lim}`);
      if (!wr.noLimit) L.push(`➡️ At the hottest hour: ${workRestText(wr, 'en')}, ~${wr.waterLph} L water/hour`);
    }
  }
  L.push(lang === 'hi'
    ? '\n✅ ठंडा पानी, छाँव, ORS रखें; भारी काम सुबह/शाम करें; नए मज़दूरों को 7–14 दिन में धीरे-धीरे आदत डालें। लू के लक्षण दिखें तो 108/112।'
    : '\n✅ Provide cool water, shade and ORS; schedule heavy jobs early/late; acclimatise new workers over 7–14 days. Heat-stroke signs → call 108/112.');
  L.push(lang === 'hi' ? '(मॉडल अनुमान; IMD/राज्य चेतावनी को प्राथमिकता दें)' : '(Model estimate; official IMD/State alerts take priority)');
  if (url) L.push(url);
  return L.join('\n');
}

export const waLink = (text) => 'https://wa.me/?text=' + encodeURIComponent(text);
