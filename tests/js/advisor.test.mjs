import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildForecast, hourRanges } from '../../lib/model.js';
import { parseQuestion } from '../../lib/intent.js';
import { answer, advisoryText, waLink } from '../../lib/advisor.js';

// Fixture: archived Open-Meteo forecast for Delhi from 28 May 2024 (tests/fixtures/delhi_2024-05-28.json)
const raw = JSON.parse(readFileSync(new URL('../fixtures/delhi_2024-05-28.json', import.meta.url)));
const place = { name: 'Delhi', lat: 28.65195, lon: 77.23149, elevation: 227, region: 'plains' };
const NOW = new Date('2024-05-28T06:00:00Z');

test('forecast model builds days with IMD status', () => {
  const fc = buildForecast(raw, place, 'moderate', null);
  assert.ok(fc.days.length >= 3);
  for (const d of fc.days) {
    assert.equal(d.imd.level, d.tmax >= 47 ? 2 : d.tmax >= 45 ? 1 : 0); // no normals -> absolute test only
  }
});

test('answers use forecast numbers in the asked language', () => {
  const fc = buildForecast(raw, place, 'moderate', null);
  const en = answer(parseQuestion('Can I work at 2pm tomorrow in Delhi?', NOW), fc, NOW);
  const h = fc.hours.find((x) => x.date === '2024-05-29' && x.hour === 14);
  assert.match(en, new RegExp(`air ${Math.round(h.tC)}°C`));
  assert.match(en, /^Answer:/);
  const hi = answer(parseQuestion('कल दोपहर दिल्ली में काम करना सुरक्षित है?', NOW), fc, NOW);
  assert.match(hi, /^जवाब:/);
  assert.match(hi, new RegExp(`हवा ${Math.round(h.tC)}°C`));
  const far = answer(parseQuestion('Delhi on Sunday 2pm?', NOW), fc, NOW);
  assert.match(far, /outside the 72-hour/);
});

test('WhatsApp advisory', () => {
  const fc = buildForecast(raw, place, 'moderate', null);
  const t = advisoryText(fc, 'hi', 'moderate', 'https://example.org');
  assert.match(t, /लू साथी/);
  assert.ok(waLink(t).startsWith('https://wa.me/?text='));
  assert.equal(hourRanges([6, 7, 8, 12, 13]), '06:00–09:00, 12:00–14:00');
});

test('hour answers show wet-bulb and flag an out-of-range heat index', () => {
  const fc = buildForecast(raw, place, 'moderate', null);
  const h = fc.hours.find((x) => x.date === '2024-05-29' && x.hour === 14);
  const en = answer(parseQuestion('Can I work at 2pm tomorrow in Delhi?', NOW), fc, NOW);
  assert.match(en, new RegExp(`wet-bulb ${h.tw.toFixed(1)}°C`));
  const hi = answer(parseQuestion('कल दोपहर 2 बजे दिल्ली में काम करना सुरक्षित है?', NOW), fc, NOW);
  assert.match(hi, /वेट-बल्ब/);
  const dry = { ...h, tC: 45.9, rh: 7, hiOutOfRange: true };
  const fc2 = { ...fc, hours: fc.hours.map((x) => (x === h ? dry : x)) };
  assert.match(answer(parseQuestion('Can I work at 2pm tomorrow in Delhi?', NOW), fc2, NOW), /rough: formula not valid/);
  assert.equal(h.hiOutOfRange, h.rh < 13 && h.tC * 9 / 5 + 32 > 112);
});

test('hour answers name the WBGT estimate that drove the verdict (EN + HI)', () => {
  const fc = buildForecast(raw, place, 'moderate', null);
  const h = fc.hours.find((x) => x.date === '2024-05-29' && x.hour === 14);
  const src = { bom: ['BoM formula', 'BoM सूत्र'], globe: ['sun/globe model', 'धूप/ग्लोब मॉडल'] }[h.wbgtSource];
  assert.equal(h.wbgt, Math.max(h.wbgtGlobe, h.wbgtBom));
  const en = answer(parseQuestion('Can I work at 2pm tomorrow in Delhi?', NOW), fc, NOW);
  assert.match(en, new RegExp(`the higher of two estimates, from the ${src[0]}`));
  const hi = answer(parseQuestion('कल दोपहर 2 बजे दिल्ली में काम करना सुरक्षित है?', NOW), fc, NOW);
  assert.ok(hi.includes(`दो अनुमानों में ज़्यादा वाला: ${src[1]}`));
  // a globe-driven hour is reported as such
  const g = { ...h, wbgtSource: 'globe', wbgtGlobe: h.wbgtBom + 1, wbgt: h.wbgtBom + 1 };
  const fc2 = { ...fc, hours: fc.hours.map((x) => (x === h ? g : x)) };
  assert.match(answer(parseQuestion('Can I work at 2pm tomorrow in Delhi?', NOW), fc2, NOW), /from the sun\/globe model; BoM formula/);
});
