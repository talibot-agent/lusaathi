#!/usr/bin/env node
/**
 * CLI runner for .codenow/agent-studio/evals/lusaathi-parser.json
 * Invokes tools/parse_intent.mjs and writes agentfoundry/evals/parser-results.{json,md}.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as parse_intent from '../tools/parse_intent.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const suitePath = join(root, '.codenow/agent-studio/evals/lusaathi-parser.json');
const outDir = join(root, 'agentfoundry/evals');

const DEFAULT_NOW = '2026-11-09T11:00:00.000Z';

function same(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  return false;
}

function checkExpected(actual, expected) {
  const failures = [];
  for (const [k, v] of Object.entries(expected)) {
    if (!same(actual[k], v)) failures.push(`${k}: got ${JSON.stringify(actual[k])}, want ${JSON.stringify(v)}`);
  }
  return failures;
}

export async function runSuite(suite = null) {
  const data = suite || JSON.parse(readFileSync(suitePath, 'utf8'));
  const results = [];
  for (const c of data.cases) {
    const nowIso = c.nowIso || DEFAULT_NOW;
    const out = await parse_intent.run({ text: c.input, nowIso });
    const actual = out.data;
    const misses = checkExpected(actual, c.expected || {});
    // AF IDE field: expected_contains must appear in the tool text payload
    if (c.expected_contains != null) {
      const blob = out.content.map((x) => x.text).join('\n');
      if (!blob.includes(String(c.expected_contains))) {
        misses.push(`expected_contains "${c.expected_contains}" not in tool text`);
      }
    }
    results.push({
      id: c.id,
      lang: c.lang || actual.lang || 'unknown',
      category: c.category || 'uncategorized',
      input: c.input,
      pass: misses.length === 0,
      misses,
      actual,
      expected: c.expected || {},
    });
  }
  return { name: data.name, description: data.description, results };
}

function tally(rows, key) {
  const map = new Map();
  for (const r of rows) {
    const k = r[key] || 'unknown';
    if (!map.has(k)) map.set(k, { total: 0, pass: 0 });
    const t = map.get(k);
    t.total += 1;
    if (r.pass) t.pass += 1;
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, v]) => ({ name, ...v, rate: v.total ? v.pass / v.total : 0 }));
}

function formatTable(title, rows) {
  const lines = [`### ${title}`, '', '| key | pass | total | rate |', '|---|---:|---:|---:|'];
  for (const r of rows) {
    lines.push(`| ${r.name} | ${r.pass} | ${r.total} | ${(100 * r.rate).toFixed(0)}% |`);
  }
  return lines.join('\n');
}

export function renderMarkdown(summary) {
  const { results } = summary;
  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const byLang = tally(results, 'lang');
  const byCat = tally(results, 'category');
  const fails = results.filter((r) => !r.pass);
  const lines = [
    `# Parser eval results — ${summary.name}`,
    '',
    `Overall: **${passed}/${total}** (${total ? ((100 * passed) / total).toFixed(0) : 0}%)`,
    '',
    formatTable('By language', byLang),
    '',
    formatTable('By category', byCat),
    '',
    '## Failures',
    '',
  ];
  if (!fails.length) lines.push('_None._');
  else {
    for (const f of fails) {
      lines.push(`### \`${f.id}\` (${f.lang}/${f.category})`);
      lines.push('');
      lines.push(`Input: \`${JSON.stringify(f.input)}\``);
      lines.push('');
      for (const m of f.misses) lines.push(`- ${m}`);
      lines.push('');
    }
  }
  lines.push('');
  return lines.join('\n');
}

export function printTables(summary) {
  const { results } = summary;
  const passed = results.filter((r) => r.pass).length;
  console.log(`\nParser evals: ${passed}/${results.length} passed`);
  const fmt = (title, rows) => {
    console.log(`\n${title}`);
    console.log('key'.padEnd(22) + 'pass'.padStart(6) + 'total'.padStart(8) + 'rate'.padStart(8));
    for (const r of rows) {
      console.log(
        String(r.name).padEnd(22) +
          String(r.pass).padStart(6) +
          String(r.total).padStart(8) +
          `${(100 * r.rate).toFixed(0)}%`.padStart(8),
      );
    }
  };
  fmt('By language', tally(results, 'lang'));
  fmt('By category', tally(results, 'category'));
  const fails = results.filter((r) => !r.pass);
  if (fails.length) {
    console.log('\nFailures:');
    for (const f of fails) {
      console.log(`- ${f.id}: ${f.misses.join('; ')}`);
    }
  }
}

async function main() {
  const summary = await runSuite();
  mkdirSync(outDir, { recursive: true });
  const passed = summary.results.filter((r) => r.pass).length;
  const payload = {
    name: summary.name,
    description: summary.description,
    generatedAt: new Date().toISOString(),
    passed,
    total: summary.results.length,
    byLanguage: tally(summary.results, 'lang'),
    byCategory: tally(summary.results, 'category'),
    results: summary.results,
  };
  writeFileSync(join(outDir, 'parser-results.json'), JSON.stringify(payload, null, 2) + '\n');
  writeFileSync(join(outDir, 'parser-results.md'), renderMarkdown(summary));
  printTables(summary);
  if (passed !== summary.results.length) process.exitCode = 1;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
