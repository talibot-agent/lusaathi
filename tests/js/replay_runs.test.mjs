import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseQuestion } from '../../lib/intent.js';
import { runAll } from '../../scripts/replay-runs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const NOW = new Date('2024-05-28T06:00:00.000Z');

test('explicit "moderate work" / "easy" workload words parse', () => {
  assert.equal(parseQuestion('Kolkata tomorrow 1 pm, moderate work, humid — safe?', NOW).workload, 'moderate');
  assert.equal(parseQuestion('easy work in the shade today in Delhi?', NOW).workload, 'easy');
});

test('replay tool chain: language, city, hour, day, workload, 108/112, IMD, verdict', async () => {
  const results = await runAll();
  assert.equal(results.length, 3);
  for (const r of results) {
    assert.equal(r.checks.ok, true, `${r.id} checks failed: ${JSON.stringify(r.checks)}`);
    assert.match(r.answer, /108\s*\/\s*112/);
    assert.match(r.answer, /IMD/i);
    assert.match(r.advisory, /108\s*\/\s*112/);
    assert.equal(r.steps.length, 6);
  }

  const delhi = results.find((r) => r.id === 'delhi');
  assert.equal(delhi.parsed.lang, 'en');
  assert.equal(delhi.parsed.place, 'Delhi');
  assert.equal(delhi.parsed.hour, 15);
  assert.equal(delhi.parsed.dayOffset, 0);
  assert.equal(delhi.parsed.workload, 'hard');
  assert.equal(delhi.hour.category, 5);
  assert.match(delhi.answer, /^Answer:/);
  assert.match(delhi.answer, /Delhi/);

  const jaipur = results.find((r) => r.id === 'jaipur-hi');
  assert.equal(jaipur.parsed.lang, 'hi');
  assert.equal(jaipur.parsed.place, 'Jaipur');
  assert.equal(jaipur.parsed.hour, 15);
  assert.equal(jaipur.parsed.dayOffset, 1);
  assert.equal(jaipur.parsed.workload, 'moderate');
  assert.match(jaipur.answer, /^जवाब:/);
  assert.match(jaipur.answer, /जयपुर|Jaipur/);

  const kolkata = results.find((r) => r.id === 'kolkata');
  assert.equal(kolkata.parsed.lang, 'en');
  assert.equal(kolkata.parsed.place, 'Kolkata');
  assert.equal(kolkata.parsed.hour, 13);
  assert.equal(kolkata.parsed.dayOffset, 1);
  assert.equal(kolkata.parsed.workload, 'moderate');
  assert.match(kolkata.answer, /^Answer:/);
  assert.match(kolkata.answer, /Kolkata/);
});

test('committed replay JSON artifacts match the six-tool order', () => {
  for (const id of ['delhi', 'jaipur-hi', 'kolkata']) {
    const j = JSON.parse(readFileSync(join(root, `agentfoundry/runs/${id}.json`), 'utf8'));
    assert.equal(j.id, id);
    assert.deepEqual(j.toolOrder, [
      'parse_intent', 'geocode', 'forecast', 'heat_stress', 'imd_status', 'advise',
    ]);
    assert.equal(j.steps.length, 6);
    assert.deepEqual(j.steps.map((s) => s.name), j.toolOrder);
    assert.equal(j.checks.ok, true);
  }
});
