import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parse_intent, geocode, forecast, heat_stress, imd_status, advise, TOOL_ORDER } from '../../tools/index.mjs';
import { setFetchForTests } from '../../tools/_fetch.mjs';
import { BOM_MIN_SW_WM2 } from '../../lib/heat.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const raw = JSON.parse(readFileSync(join(root, 'tests/fixtures/delhi_2024-05-28.json'), 'utf8'));
const NOW_ISO = '2024-05-28T06:00:00Z';

test('TOOL_ORDER is the six-step chain', () => {
  assert.deepEqual(TOOL_ORDER, [
    'parse_intent', 'geocode', 'forecast', 'heat_stress', 'imd_status', 'advise',
  ]);
});

test('parse_intent wraps lib/intent (EN + HI)', async () => {
  const en = await parse_intent.run({ text: 'Can I work at 2pm tomorrow in Delhi?', nowIso: NOW_ISO });
  assert.equal(en.data.lang, 'en');
  assert.equal(en.data.place, 'Delhi');
  assert.equal(en.data.hour, 14);
  assert.equal(en.data.dayOffset, 1);
  const hi = await parse_intent.run({ text: 'कल दोपहर दिल्ली में काम करना सुरक्षित है?', nowIso: NOW_ISO });
  assert.equal(hi.data.lang, 'hi');
  assert.equal(hi.data.place, 'Delhi');
  assert.match(parse_intent.toolDef.name, /^parse_intent$/);
  assert.ok(parse_intent.toolDef.inputSchema);
});

test('geocode resolves gazetteer places offline (no network)', async () => {
  setFetchForTests(async () => { throw new Error('network should not be called'); });
  const g = await geocode.run({ place: 'Delhi' });
  assert.equal(g.data.ok, true);
  assert.equal(g.data.name, 'Delhi');
  assert.ok(Math.abs(g.data.lat - 28.65195) < 0.01);
  assert.equal(g.data.region, 'plains');
  assert.equal(g.data.source, 'gazetteer');
  const mr = await geocode.run({ place: 'पुणे' });
  assert.equal(mr.data.name, 'Pune');
  const miss = await geocode.run({ place: 'Atlantis-Not-A-City', allowNetwork: false });
  assert.equal(miss.data.ok, false);
});

test('forecast builds from fixture raw offline; fetch stub unused', async () => {
  setFetchForTests(async () => { throw new Error('network should not be called'); });
  const r = await forecast.run({
    lat: 28.65195, lon: 77.23149, name: 'Delhi', region: 'plains', elevation: 227,
    raw,
  });
  assert.equal(r.data.ok, true);
  assert.ok(r.data.dayCount >= 3);
  assert.ok(r.data._fc.hours.length > 20);
  assert.ok(r.data.days.some((d) => d.date === '2024-05-28'));
});

test('heat_stress uses frozen radiation-gated assessHour (Jaipur Cat 5 case)', async () => {
  assert.equal(BOM_MIN_SW_WM2, 600);
  const r = await heat_stress.run({
    tC: 45.9, rh: 7, wind10kmh: 17.1, ghi: 786, direct: 506, diffuse: 280, pHpa: 948.6,
    utcMs: Date.UTC(2024, 4, 29, 8, 30), lat: 26.91962, lon: 75.78781,
  });
  assert.equal(r.data.ok, true);
  assert.equal(r.data.category, 5);
  assert.equal(r.data.wbgtSource, 'bom');
  assert.equal(r.data.workRest.workMin, 20);
  // weak sun → globe, not BoM
  const weak = await heat_stress.run({
    tC: 45.9, rh: 7, wind10kmh: 17.1, ghi: 100, pHpa: 948.6,
    utcMs: Date.UTC(2024, 4, 29, 8, 30), lat: 26.91962, lon: 75.78781,
  });
  assert.equal(weak.data.wbgtSource, 'globe');
  assert.equal(weak.data.strongSun, false);
});

test('imd_status wraps imdHeatwave offline', async () => {
  const r = await imd_status.run({ tmax: 47, region: 'plains' });
  assert.equal(r.data.imd.level, 2);
  assert.match(r.data.note, /Never override/);
  const withPrior = await imd_status.run({ tmax: 45, region: 'plains', priorLevels: [1] });
  assert.equal(withPrior.data.imd.level, 1);
  assert.equal(withPrior.data.imd2day, 1);
});

test('advise answers from fixture forecast offline', async () => {
  const fr = await forecast.run({
    lat: 28.65195, lon: 77.23149, name: 'Delhi', region: 'plains', raw,
  });
  const a = await advise.run({
    text: 'Can I work at 2pm tomorrow in Delhi?',
    nowIso: NOW_ISO,
    fc: fr.data._fc,
  });
  assert.equal(a.data.ok, true);
  assert.match(a.data.text, /^Answer:/);
  assert.match(a.data.text, /air \d+°C/);
  const wa = await advise.run({ fc: fr.data._fc, mode: 'advisory', lang: 'hi' });
  assert.match(wa.data.text, /लू साथी/);
  assert.match(wa.data.text, /108\/112/);
});

test('manifest lists all 6 tools in order; prompt has 4 guardrails incl. 108/112', () => {
  const manifest = JSON.parse(readFileSync(
    join(root, '.codenow/agent-studio/agents/lusaathi-heat-advisor.json'), 'utf8'));
  assert.deepEqual(manifest.tools, TOOL_ORDER);
  assert.ok(manifest.evals.includes('lusaathi-heat-advisor-smoke'));
  assert.notEqual(manifest.runsAt, 'undefined');
  assert.notEqual(manifest.invocationUrl, 'undefined');

  const prompt = readFileSync(
    join(root, '.codenow/agent-studio/prompts/lusaathi-heat-advisor-system.md'), 'utf8');
  assert.match(prompt, /Never override or contradict IMD/);
  assert.match(prompt, /No medical diagnosis/);
  assert.match(prompt, /108 or 112/);
  assert.match(prompt, /Do not collect or store personal data/);
  assert.match(prompt, /Answer in the user's language/);
  for (const name of TOOL_ORDER) assert.match(prompt, new RegExp(name));

  const smoke = JSON.parse(readFileSync(
    join(root, '.codenow/agent-studio/evals/lusaathi-heat-advisor-smoke.json'), 'utf8'));
  const blob = JSON.stringify(smoke);
  for (const name of ['parse_intent', 'geocode', 'heat_stress', 'imd_status', 'advise', '108']) {
    assert.match(blob, new RegExp(name));
  }

  // Each tool file exposes name + inputSchema for AgentFoundry scanTools
  for (const name of TOOL_ORDER) {
    const src = readFileSync(join(root, `tools/${name}.mjs`), 'utf8');
    assert.match(src, new RegExp(`name:\\s*'${name}'`));
    assert.match(src, /inputSchema\s*:/);
  }
});

test('no paid API-key scaffold remains in committed agent paths', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.scripts.test, 'node --test tests/js/*.test.mjs tests/js/*.test.js');
  // defenseclaw kept; Anthropic env example must not exist
  let sawEnvExample = false;
  try {
    readFileSync(join(root, 'lusaathi-heat-advisor/.env.example'), 'utf8');
    sawEnvExample = true;
  } catch (_) { /* expected missing */ }
  assert.equal(sawEnvExample, false);
});
