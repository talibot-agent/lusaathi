import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../../lib/heat.js';
import * as I from '../../lib/imd.js';

test('heat index vs NWS chart', () => {
  assert.ok(Math.abs(H.cToF(H.heatIndexC(H.fToC(96), 65)) - 121) <= 1);
  assert.ok(Math.abs(H.cToF(H.heatIndexC(H.fToC(90), 50)) - 95) <= 1);
});

test('Stull wet bulb 20°C/50% = 13.7°C', () => {
  assert.ok(Math.abs(H.wetBulbStullC(20, 50) - 13.7) < 0.1);
});

test('TB MED 507 categories and work/rest', () => {
  assert.equal(H.heatCategory(H.fToC(90)), 5);
  assert.equal(H.heatCategory(H.fToC(87.9)), 3);
  assert.equal(H.workRest(5, 'moderate').workMin, 20);
  assert.equal(H.workRest(3, 'hard').restMin, 30);
});

test('IMD criteria', () => {
  assert.equal(I.imdHeatwave(40, 35.5, 'plains').level, 1);
  assert.equal(I.imdHeatwave(47, null, 'plains').level, 2);
  assert.equal(I.imdHeatwave(37, 32.5, 'coastal').level, 1);
  assert.equal(I.imdHeatwave(32, 25.5, 'hills').level, 2);
  assert.deepEqual(I.consecutiveDays([1, 1, 0, 1]), [0, 1, 0, 0]);
});

test('region classification', () => {
  assert.equal(I.classifyRegion(19.07, 72.88, 14), 'coastal');
  assert.equal(I.classifyRegion(28.65, 77.23, 216), 'plains');
  assert.equal(I.classifyRegion(31.1, 77.17, 2200), 'hills');
});

test('formula validity flags: NWS heat index range, Stull wet-bulb range (Jaipur 29 May 2024 14:00 IST case)', () => {
  // Archived Open-Meteo replay values for Jaipur: 45.9 °C, 7 % RH (114.6 °F > 112 °F, RH < 13 %)
  assert.equal(H.heatIndexOutOfRange(45.9, 7), true);
  assert.equal(H.heatIndexOutOfRange(40, 7), false);   // 104 °F: NWS low-RH adjustment is defined
  assert.equal(H.heatIndexOutOfRange(46, 20), false);
  assert.equal(H.wetBulbInRange(45.9, 7), true);       // Stull 2011: RH 5–99 %, −20…50 °C
  assert.equal(H.wetBulbInRange(45, 3), false);
  assert.equal(H.wetBulbInRange(51, 30), false);
  assert.ok(Math.abs(H.wetBulbStullC(45.9, 7) - 20.12) < 0.01);
});

test('cautious rule: the higher WBGT estimate wins, whichever it is', () => {
  assert.deepEqual(H.cautiousWbgt(29.0, 32.7), { wbgt: 32.7, source: 'bom' });   // BoM higher
  assert.deepEqual(H.cautiousWbgt(31.5, 30.2), { wbgt: 31.5, source: 'globe' }); // sun/globe model higher
  assert.deepEqual(H.cautiousWbgt(30.0, 30.0), { wbgt: 30.0, source: 'globe' }); // tie -> globe
});

test('Jaipur 29 May 2024 14:00 IST (archived replay inputs) -> Category 5, 20 min work / 40 min rest', () => {
  const a = H.assessHour({ tC: 45.9, rh: 7, wind10kmh: 17.1, ghi: 786, direct: 506, diffuse: 280, pHpa: 948.6,
    utcMs: Date.UTC(2024, 4, 29, 8, 30), lat: 26.91962, lon: 75.78781 }, 'moderate');
  assert.ok(Math.abs(a.wbgtGlobe - 29.02) < 0.01);
  assert.ok(Math.abs(a.wbgtBom - 32.71) < 0.01);
  assert.equal(a.wbgtSource, 'bom');
  assert.equal(a.wbgt, a.wbgtBom);
  assert.equal(a.category, 5);
  assert.equal(a.workRest.workMin, 20);
  assert.equal(a.workRest.restMin, 40);
  // the permissive (sun/globe only) value would have been Category 2
  assert.equal(H.heatCategory(a.wbgtGlobe), 2);
});

// Archived Open-Meteo replay inputs for Jaipur (26.91962 N, 75.78781 E), 29 May 2024; IST = UTC+5:30
const JAIPUR = { lat: 26.91962, lon: 75.78781 };
const ist = (h, m = 0) => Date.UTC(2024, 4, 29, h, m) - 19800000;

test('daylight-only rule: max of both estimates while the sun is up, sun/globe model when it is down', () => {
  assert.deepEqual(H.daylightWbgt(29.0, 32.7, true), { wbgt: 32.7, source: 'bom' });
  assert.deepEqual(H.daylightWbgt(31.5, 30.2, true), { wbgt: 31.5, source: 'globe' });
  assert.deepEqual(H.daylightWbgt(29.0, 32.7, false), { wbgt: 29.0, source: 'globe' });
});

test('solar elevation boundary decides the rule, not the clock (Jaipur sunrise, 29 May 2024)', () => {
  let lo = ist(5, 30), hi = ist(6, 0); // elevation -1.5° .. +4.6°
  assert.ok(H.solarElevationDeg(lo, JAIPUR.lat, JAIPUR.lon) < 0 && H.solarElevationDeg(hi, JAIPUR.lat, JAIPUR.lon) > 0);
  while (hi - lo > 1000) { const mid = (lo + hi) / 2; if (H.solarElevationDeg(mid, JAIPUR.lat, JAIPUR.lon) > 0) hi = mid; else lo = mid; }
  const base = { ...JAIPUR, tC: 33.7, rh: 40, wind10kmh: 24.9, ghi: 0, direct: 0, diffuse: 0, pHpa: 949.2 };
  const before = H.assessHour({ ...base, utcMs: lo - 60000 });
  const after = H.assessHour({ ...base, utcMs: hi + 60000 });
  assert.equal(before.sunUp, false); assert.equal(before.wbgtSource, 'globe'); assert.equal(before.wbgt, before.wbgtGlobe);
  assert.equal(after.sunUp, true); assert.equal(after.wbgtSource, 'bom'); assert.equal(after.wbgt, after.wbgtBom);
  // geometric sunrise ~05:34 IST
  const t = new Date(hi + 19800000); assert.equal(t.getUTCHours(), 5); assert.ok(t.getUTCMinutes() >= 30 && t.getUTCMinutes() <= 40);
});

test('Jaipur 29 May 2024: 14:00 Cat 5 (BoM), 06:00 sun already up (BoM, Cat 4), 05:00 before sunrise and 02:00 night use G', () => {
  const noon = H.assessHour({ ...JAIPUR, tC: 45.9, rh: 7, wind10kmh: 17.1, ghi: 786, direct: 506, diffuse: 280, pHpa: 948.6, utcMs: ist(14) });
  assert.equal(noon.wbgtSource, 'bom'); assert.equal(noon.category, 5); assert.equal(noon.workRest.workMin, 20);
  const six = H.assessHour({ ...JAIPUR, tC: 33.7, rh: 40, wind10kmh: 24.9, ghi: 31, direct: 4, diffuse: 27, pHpa: 949.2, utcMs: ist(6) });
  assert.ok(Math.abs(six.solarElevation - 4.59) < 0.05);
  assert.equal(six.sunUp, true); assert.equal(six.wbgtSource, 'bom'); assert.equal(six.category, 4);
  const five = H.assessHour({ ...JAIPUR, tC: 32.1, rh: 40, wind10kmh: 19.4, ghi: 0, direct: 0, diffuse: 0, pHpa: 948.7, utcMs: ist(5) });
  assert.equal(five.sunUp, false); assert.equal(five.wbgtSource, 'globe');
  assert.ok(five.wbgtBom > five.wbgtGlobe); // BoM would have been higher, but does not apply in the dark
  assert.equal(five.category, 0);
  const night = H.assessHour({ ...JAIPUR, tC: 33.4, rh: 29, wind10kmh: 19.8, ghi: 0, direct: 0, diffuse: 0, pHpa: 947.6, utcMs: ist(2) });
  assert.ok(night.solarElevation < -30); assert.equal(night.wbgtSource, 'globe'); assert.equal(night.wbgt, night.wbgtGlobe);
  assert.equal(night.wbgtStrict, night.wbgtBom);
});
