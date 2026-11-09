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
