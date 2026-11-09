import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestion } from '../../lib/intent.js';

const NOW = new Date(Date.UTC(2026, 10, 9, 11, 0)); // Monday 9 Nov 2026, 11:00 IST

test('English example from the brief', () => {
  const q = parseQuestion('Can I work on the roof at 2pm tomorrow in Nagpur?', NOW);
  assert.deepEqual([q.lang, q.place, q.dayOffset, q.hour, q.workload], ['en', 'Nagpur', 1, 14, 'moderate']);
});

test('Hindi example from the brief', () => {
  const q = parseQuestion('कल दोपहर जयपुर में काम करना सुरक्षित है?', NOW);
  assert.deepEqual([q.lang, q.place, q.dayOffset, q.hour], ['hi', 'Jaipur', 1, 14]);
});

test('Hindi with Devanagari digits and evening', () => {
  const q = parseQuestion('शाम ५ बजे गोंडा में मज़दूरी ठीक है?', NOW);
  assert.equal(q.place, 'गोंडा');
  assert.equal(q.hour, 17);
  assert.equal(q.workload, 'hard');
});

test('day after tomorrow + morning in Hindi', () => {
  const q = parseQuestion('परसों सुबह 7 बजे लखनऊ में खेत में काम?', NOW);
  assert.deepEqual([q.place, q.dayOffset, q.hour], ['Lucknow', 2, 7]);
});

test('Hinglish answered in Hindi', () => {
  const q = parseQuestion('kal dopahar 3 baje Patna mein kaam safe hai?', NOW);
  assert.deepEqual([q.lang, q.place, q.dayOffset, q.hour], ['hi', 'Patna', 1, 15]);
});

test('weekday names and 24h clock', () => {
  const q = parseQuestion('Is it safe to carry bricks in Banda on Wednesday at 13:30', NOW);
  assert.deepEqual([q.place, q.dayOffset, q.hour, q.workload], ['Banda', 2, 13, 'hard']);
});

test('unknown place via "in X" pattern', () => {
  const q = parseQuestion('What about at 4 in Bhiwandi tomorrow?', NOW);
  assert.deepEqual([q.place, q.placeSource, q.hour], ['Bhiwandi', 'pattern', 16]);
});

test('now / abhi', () => {
  const q = parseQuestion('अभी दिल्ली में बाहर काम?', NOW);
  assert.deepEqual([q.place, q.dayOffset, q.hour, q.wantsNow], ['Delhi', 0, 11, true]);
});

test('12 am / 12 pm', () => {
  assert.equal(parseQuestion('Pune at 12 pm', NOW).hour, 12);
  assert.equal(parseQuestion('Pune at 12 am', NOW).hour, 0);
});

test('aliases (Bombay, Gurgaon)', () => {
  assert.equal(parseQuestion('bombay tomorrow 3pm', NOW).place, 'Mumbai');
  assert.equal(parseQuestion('site work in gurgaon today', NOW).place, 'Gurugram');
});

test('midnight is hour 0 (not 21 via night substring)', () => {
  assert.equal(parseQuestion('midnight in Delhi tomorrow', NOW).hour, 0);
  assert.equal(parseQuestion('at midnight in Pune', NOW).hour, 0);
});

test('welding is moderate workload', () => {
  assert.equal(parseQuestion('welding in Delhi at 2pm', NOW).workload, 'moderate');
});

test('Marathi आता sets wantsNow + lang mr', () => {
  const q = parseQuestion('आता पुण्यात काम?', NOW);
  assert.equal(q.lang, 'mr');
  assert.equal(q.wantsNow, true);
  assert.equal(q.dayOffset, 0);
  assert.equal(q.hour, 11);
  assert.equal(q.place, 'Pune');
});
