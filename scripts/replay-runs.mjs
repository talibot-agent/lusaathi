#!/usr/bin/env node
/**
 * Deterministic replay of the wired Agent Studio tool chain for three advisor prompts.
 * Uses archived Open-Meteo fixtures (Delhi / Jaipur / Kolkata, 2024-05-28 window) so
 * Runs/Replay evidence does not depend on live weather or a paid Agent SDK key.
 *
 * Chain: parse_intent → geocode → forecast → heat_stress → imd_status → advise
 * Method frozen at 328ed36 — this script never changes WBGT/risk math.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parse_intent, geocode, forecast, heat_stress, imd_status, advise, TOOL_ORDER,
} from '../tools/index.mjs';
import { setFetchForTests } from '../tools/_fetch.mjs';
import { advisoryText } from '../lib/advisor.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'agentfoundry/runs');
const NOW_ISO = '2024-05-28T06:00:00.000Z'; // morning of the heat-wave window (local=UTC fields)

const CASES = [
  {
    id: 'delhi',
    prompt: 'Delhi, today 3 pm, heavy construction work — is it safe?',
    fixture: 'tests/fixtures/delhi_2024-05-28.json',
    expect: {
      lang: 'en',
      place: 'Delhi',
      hour: 15,
      dayOffset: 0,
      date: '2024-05-28',
      workload: 'hard',
    },
  },
  {
    id: 'jaipur-hi',
    prompt: 'कल दोपहर 3 बजे जयपुर में छत पर काम कर सकते हैं?',
    fixture: 'tests/fixtures/jaipur_2024-05-28.json',
    expect: {
      lang: 'hi',
      place: 'Jaipur',
      hour: 15,
      dayOffset: 1,
      date: '2024-05-29',
      workload: 'moderate',
    },
  },
  {
    id: 'kolkata',
    prompt: 'Kolkata tomorrow 1 pm, moderate work, humid — safe?',
    fixture: 'tests/fixtures/kolkata_2024-05-28.json',
    expect: {
      lang: 'en',
      place: 'Kolkata',
      hour: 13,
      dayOffset: 1,
      date: '2024-05-29',
      workload: 'moderate',
    },
  },
];

function loadRaw(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'));
}

async function timed(name, input, fn) {
  const t0 = Date.now();
  const out = await fn();
  const ms = Date.now() - t0;
  // Strip heavy _fc from logged output (kept separately for downstream)
  const logged = out?.data
    ? { ...out.data, _fc: out.data._fc ? '[omitted; see forecast._fc retained in-process]' : undefined }
    : out;
  return { name, input, output: logged, ms, _full: out };
}

function checksFor(caseDef, parsed, geo, hour, day, answerText, advisory) {
  const e = caseDef.expect;
  const checks = {
    lang: parsed.lang === e.lang,
    place: (geo.name || parsed.place) === e.place,
    hour: parsed.hour === e.hour,
    dayOffset: parsed.dayOffset === e.dayOffset,
    date: hour?.date === e.date,
    workload: (parsed.workload || 'moderate') === e.workload,
    has108: /108\s*\/\s*112/.test(answerText) && /108\s*\/\s*112/.test(advisory),
    hasImd: /IMD/i.test(answerText),
    imdNotOverridden: !/ignore (IMD|alert)|override/i.test(answerText),
    concreteVerdict: /^(Answer:|जवाब:|उत्तर:)/m.test(answerText),
    usesForecastNumbers: /\d+\s*°C/.test(answerText),
  };
  checks.ok = Object.values(checks).every(Boolean);
  return checks;
}

export async function runOne(caseDef, { nowIso = NOW_ISO } = {}) {
  setFetchForTests(async () => {
    throw new Error('replay must stay offline — pass fixture raw, do not fetch');
  });
  const raw = loadRaw(caseDef.fixture);
  const steps = [];

  const s1 = await timed('parse_intent', { text: caseDef.prompt, nowIso }, () =>
    parse_intent.run({ text: caseDef.prompt, nowIso }));
  steps.push({ name: s1.name, input: s1.input, output: s1.output, ms: s1.ms });
  const parsed = s1._full.data;

  const s2 = await timed('geocode', { place: parsed.place, lang: parsed.lang }, () =>
    geocode.run({ place: parsed.place, lang: parsed.lang, allowNetwork: false }));
  steps.push({ name: s2.name, input: s2.input, output: s2.output, ms: s2.ms });
  const geo = s2._full.data;
  if (!geo.ok) {
    return { id: caseDef.id, prompt: caseDef.prompt, nowIso, ok: false, error: 'geocode failed', steps, parsed };
  }

  const workload = parsed.workload || caseDef.expect.workload || 'moderate';
  const s3 = await timed(
    'forecast',
    { lat: geo.lat, lon: geo.lon, name: geo.name, region: geo.region, elevation: geo.elevation, workload, raw: '[fixture]' },
    () => forecast.run({
      lat: geo.lat, lon: geo.lon, name: geo.name, region: geo.region,
      elevation: geo.elevation, workload, raw,
    }),
  );
  const fc = s3._full.data._fc;
  steps.push({
    name: s3.name,
    input: s3.input,
    output: { ...s3.output, dayCount: s3._full.data.dayCount, hourCount: s3._full.data.hourCount },
    ms: s3.ms,
  });

  const targetDate = caseDef.expect.date;
  const hour = fc.hours.find((h) => h.date === targetDate && h.hour === caseDef.expect.hour);
  const day = fc.days.find((d) => d.date === targetDate);
  const s4 = await timed(
    'heat_stress',
    {
      tC: hour.tC, rh: hour.rh, wind10kmh: hour.wind, ghi: hour.shortwave ?? hour.ghi,
      utcMs: hour.utcMs, lat: geo.lat, lon: geo.lon, workload,
    },
    () => heat_stress.run({
      tC: hour.tC, rh: hour.rh, wind10kmh: hour.wind, ghi: hour.shortwave ?? hour.ghi,
      utcMs: hour.utcMs, lat: geo.lat, lon: geo.lon, workload,
    }),
  );
  steps.push({ name: s4.name, input: s4.input, output: s4.output, ms: s4.ms });

  const priorLevels = fc.days
    .filter((d) => d.date < targetDate)
    .map((d) => d.imd.level);
  const s5 = await timed(
    'imd_status',
    { tmax: day.tmax, region: geo.region, priorLevels },
    () => imd_status.run({ tmax: day.tmax, region: geo.region, priorLevels }),
  );
  steps.push({ name: s5.name, input: s5.input, output: s5.output, ms: s5.ms });

  const s6 = await timed(
    'advise',
    { text: caseDef.prompt, nowIso, workload, mode: 'answer' },
    () => advise.run({ text: caseDef.prompt, nowIso, fc, workload, mode: 'answer' }),
  );
  steps.push({ name: s6.name, input: s6.input, output: { ok: s6._full.data.ok, lang: s6._full.data.lang, text: s6._full.data.text }, ms: s6.ms });

  const answerText = s6._full.data.text;
  const advisory = advisoryText(fc, parsed.lang, workload, '');
  const checks = checksFor(caseDef, parsed, geo, hour, day, answerText, advisory);

  return {
    id: caseDef.id,
    prompt: caseDef.prompt,
    nowIso,
    fixture: caseDef.fixture,
    toolOrder: TOOL_ORDER,
    parsed,
    place: { name: geo.name, lat: geo.lat, lon: geo.lon, region: geo.region, elevation: geo.elevation },
    target: { date: targetDate, hour: caseDef.expect.hour, workload },
    hour: hour && {
      date: hour.date, hour: hour.hour, tC: hour.tC, rh: hour.rh, tw: hour.tw,
      wbgt: hour.wbgt, wbgtGlobe: hour.wbgtGlobe, wbgtBom: hour.wbgtBom,
      wbgtSource: hour.wbgtSource, category: hour.category, shortwave: hour.shortwave,
      strongSun: hour.strongSun, workRest: hour.workRest,
    },
    day: day && { date: day.date, tmax: day.tmax, imd: day.imd, peakCat: day.peakCat, peakWbgt: day.peakWbgt },
    heat_stress: s4.output,
    imd_status: s5.output,
    answer: answerText,
    advisory,
    steps,
    checks,
    totalMs: steps.reduce((a, s) => a + s.ms, 0),
  };
}

export async function runAll(opts = {}) {
  const results = [];
  for (const c of CASES) results.push(await runOne(c, opts));
  return results;
}

function mdEscape(s) {
  return String(s ?? '').replace(/\r/g, '');
}

function writeReplayMd(results) {
  const lines = [
    '# Tool-wired replay (honest substitute for AgentFoundry Replay)',
    '',
    `Generated offline by \`npm run replay\` against fixtures. NOW = \`${NOW_ISO}\` (morning of the 2024 heat-wave window).`,
    'Method frozen at `328ed36` — no WBGT/risk logic changes.',
    '',
    'IDE Runs/Trace could not exercise this chain (see `ide-baseline.md`): RUN > Runs stayed empty, EVAL > Trace ran SMART-Code with **no tool calls**. This harness is the recorded substitute.',
    '',
  ];
  for (const r of results) {
    lines.push(`## ${r.id}`);
    lines.push('');
    lines.push(`**Prompt:** ${r.prompt}`);
    lines.push(`**Fixture:** \`${r.fixture}\` · target ${r.target.date} ${String(r.target.hour).padStart(2, '0')}:00 · workload \`${r.target.workload}\``);
    lines.push('');
    lines.push('| step | ms | notes |');
    lines.push('|---|---:|---|');
    for (const s of r.steps) {
      let note = '';
      if (s.name === 'parse_intent') note = `lang=${r.parsed.lang}, place=${r.parsed.place}, hour=${r.parsed.hour}, dayOffset=${r.parsed.dayOffset}, workload=${r.parsed.workload}`;
      else if (s.name === 'geocode') note = `${r.place.name} (${r.place.lat.toFixed(2)}, ${r.place.lon.toFixed(2)}) ${r.place.region}`;
      else if (s.name === 'forecast') note = `${s.output.dayCount} days / ${s.output.hourCount} hours from fixture`;
      else if (s.name === 'heat_stress') note = `WBGT ${Number(s.output.wbgt).toFixed(1)} °C → Cat ${s.output.category} (${s.output.wbgtSource})`;
      else if (s.name === 'imd_status') note = `IMD level ${s.output.imd?.level} · ${s.output.note?.slice(0, 48)}…`;
      else if (s.name === 'advise') note = `lang=${s.output.lang}`;
      lines.push(`| ${s.name} | ${s.ms} | ${note} |`);
    }
    lines.push('');
    lines.push('**Verdict summary**');
    lines.push('');
    lines.push(`- Category: **${r.hour?.category}** (${r.hour?.wbgtSource}); WBGT ${r.hour?.wbgt?.toFixed?.(1) ?? r.hour?.wbgt} °C; air ${r.hour?.tC} °C / RH ${r.hour?.rh}%`);
    lines.push(`- Work/rest: ${r.hour?.workRest ? `${r.hour.workRest.workMin} min work / ${r.hour.workRest.restMin} min rest` : 'n/a'}`);
    lines.push(`- IMD: level ${r.day?.imd?.level} (${r.day?.imd?.basis || 'n/a'})`);
    lines.push(`- Checks: ${r.checks.ok ? 'PASS' : 'FAIL'} — lang=${r.checks.lang} place=${r.checks.place} hour=${r.checks.hour} day=${r.checks.date} workload=${r.checks.workload} 108/112=${r.checks.has108} IMD=${r.checks.hasImd} verdict=${r.checks.concreteVerdict}`);
    lines.push('');
    lines.push('**Answer**');
    lines.push('');
    lines.push('```');
    lines.push(mdEscape(r.answer));
    lines.push('```');
    lines.push('');
  }
  writeFileSync(join(outDir, 'REPLAY.md'), `${lines.join('\n')}\n`);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const results = await runAll();
  for (const r of results) {
    const { steps, ...rest } = r;
    // Keep steps; drop only in-process handles if any
    writeFileSync(join(outDir, `${r.id}.json`), `${JSON.stringify(r, null, 2)}\n`);
  }
  writeReplayMd(results);
  const failed = results.filter((r) => !r.checks.ok);
  for (const r of results) {
    const v = (r.answer || '').split('\n')[0];
    console.log(`${r.id}: Cat ${r.hour?.category} | ${v}`);
    console.log(`  checks ${r.checks.ok ? 'PASS' : 'FAIL'}`, JSON.stringify(r.checks));
  }
  if (failed.length) {
    console.error(`replay: ${failed.length} case(s) failed checks`);
    process.exitCode = 1;
  } else {
    console.log(`replay: ${results.length}/${results.length} PASS → agentfoundry/runs/`);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
