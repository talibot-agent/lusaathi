import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestion } from '../../lib/intent.js';
import { UI } from '../../lib/i18n.js';
import { readFileSync } from 'node:fs';
import { buildForecast } from '../../lib/model.js';
import { answer, advisoryText } from '../../lib/advisor.js';

const NOW = new Date(Date.UTC(2026, 10, 9, 11, 0)); // Monday 9 Nov 2026, 11:00 IST

// ============================================================================
// Marathi language detection and parsing
// ============================================================================

test('Marathi: उद्या दुपारी 3 वाजता पुण्यात छतावर काम करू शकतो का?', () => {
  const q = parseQuestion('उद्या दुपारी 3 वाजता पुण्यात छतावर काम करू शकतो का?', NOW);
  assert.equal(q.lang, 'mr', 'should detect as Marathi (mr)');
  assert.equal(q.place, 'Pune', 'should parse पुण्यात (locative) as Pune');
  assert.equal(q.dayOffset, 1, 'should parse उद्या as tomorrow (dayOffset 1)');
  assert.equal(q.hour, 15, 'should parse दुपारी 3 वाजता as 15:00 (3 PM)');
  assert.equal(q.workload, 'moderate', 'should parse छत (roof) as moderate work');
});

test('Marathi: आज मुंबईमध्ये जड काम सुरक्षित आहे का?', () => {
  const q = parseQuestion('आज मुंबईमध्ये जड काम सुरक्षित आहे का?', NOW);
  assert.equal(q.lang, 'mr', 'should detect as Marathi (mr)');
  assert.equal(q.place, 'Mumbai', 'should parse मुंबई (before मध्ये) as Mumbai');
  assert.equal(q.dayOffset, 0, 'should parse आज as today (dayOffset 0)');
  assert.equal(q.workload, 'hard', 'should parse जड as hard work');
});

test('Marathi: नागपूर मध्ये उद्या सकाळी 10 वाजता हलके काम', () => {
  const q = parseQuestion('नागपूर मध्ये उद्या सकाळी 10 वाजता हलके काम', NOW);
  assert.equal(q.lang, 'mr', 'should detect as Marathi (mr)');
  assert.equal(q.place, 'Nagpur', 'should parse नागपूर as Nagpur');
  assert.equal(q.dayOffset, 1, 'should parse उद्या as tomorrow (dayOffset 1)');
  assert.equal(q.hour, 10, 'should parse सकाळी 10 वाजता as 10:00 (morning)');
  assert.equal(q.workload, 'easy', 'should parse हलके as easy work');
});

// ============================================================================
// Hindi should remain Hindi
// ============================================================================

test('Hindi: कल दोपहर 3 बजे जयपुर में काम कर सकते हैं? (must stay hi, not mr)', () => {
  const q = parseQuestion('कल दोपहर 3 बजे जयपुर में काम कर सकते हैं?', NOW);
  assert.equal(q.lang, 'hi', 'should remain Hindi (hi), not Marathi');
  assert.equal(q.place, 'Jaipur', 'should parse जयपुर as Jaipur');
  assert.equal(q.dayOffset, 1, 'should parse कल as tomorrow (dayOffset 1)');
  assert.equal(q.hour, 15, 'should parse दोपहर 3 बजे as 15:00 (3 PM)');
});

// ============================================================================
// UI.mr completeness check: every key in UI.hi must exist in UI.mr
// ============================================================================

test('UI.mr has all keys from UI.hi', () => {
  const hiKeys = Object.keys(UI.hi);
  const mrKeys = Object.keys(UI.mr);

  for (const key of hiKeys) {
    assert.ok(
      mrKeys.includes(key),
      `UI.mr is missing key '${key}' that exists in UI.hi`
    );
  }
});

test('UI.mr values are not empty strings (basic sanity check)', () => {
  for (const key in UI.mr) {
    assert.notEqual(
      UI.mr[key],
      '',
      `UI.mr['${key}'] should not be empty`
    );
  }
});


// ============================================================================
// Advisor answers in Marathi
// ============================================================================

test('Marathi advisor answer uses mr strings and forecast numbers', () => {
  const raw = JSON.parse(readFileSync(new URL('../fixtures/delhi_2024-05-28.json', import.meta.url)));
  const place = { name: 'Delhi', lat: 28.65195, lon: 77.23149, elevation: 227, region: 'plains' };
  const fc = buildForecast(raw, place, 'moderate', null);
  const now = new Date('2024-05-28T06:00:00Z');
  const q = parseQuestion('उद्या दुपारी 2 वाजता दिल्ली मध्ये छतावर काम करू शकतो का?', now);
  assert.equal(q.lang, 'mr');
  assert.equal(q.place, 'Delhi');
  assert.equal(q.hour, 14);
  const h = fc.hours.find((x) => x.date === '2024-05-29' && x.hour === 14);
  const text = answer(q, fc, now);
  assert.match(text, /^उत्तर:/);
  assert.match(text, new RegExp(`हवा ${Math.round(h.tC)}°C`));
  assert.match(text, /वेट-बल्ब/);
  assert.ok(text.includes(UI.mr.title) || /WBGT/.test(text));
  const wa = advisoryText(fc, 'mr', 'moderate', 'https://example.org');
  assert.match(wa, /लू साथी/);
  assert.match(wa, /उष्णता सल्ला/);
  assert.match(wa, /मैदानी प्रदेश|कमाल|WBGT/);
});
