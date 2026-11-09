import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSuite } from '../../scripts/run-parser-evals.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Known-failing case ids (with reasons) would go here only if a fix would touch
 * frozen method logic. The parser is not method — so this list must stay empty.
 */
const KNOWN_FAILING = {
  // none — parser bugs are fixed in lib/intent.js, not WBGT/risk method
};

test('lusaathi-parser eval suite is 100% pass (or listed known failures)', async () => {
  const suite = JSON.parse(
    readFileSync(join(root, '.codenow/agent-studio/evals/lusaathi-parser.json'), 'utf8'),
  );
  assert.ok(suite.cases.length >= 35, `expected ~40 cases, got ${suite.cases.length}`);
  const { results } = await runSuite(suite);
  const unexpected = [];
  for (const r of results) {
    if (r.pass) {
      assert.ok(!(r.id in KNOWN_FAILING), `${r.id} is listed known-failing but now passes`);
      continue;
    }
    if (r.id in KNOWN_FAILING) continue;
    unexpected.push(`${r.id}: ${r.misses.join('; ')}`);
  }
  // Every known-failing id must still be in the suite
  for (const id of Object.keys(KNOWN_FAILING)) {
    assert.ok(results.some((r) => r.id === id), `known-failing id missing from suite: ${id}`);
  }
  assert.equal(
    unexpected.length,
    0,
    `unexpected parser eval failures:\n${unexpected.join('\n')}`,
  );
});

test('suite covers EN, HI, Hinglish, Marathi', () => {
  const suite = JSON.parse(
    readFileSync(join(root, '.codenow/agent-studio/evals/lusaathi-parser.json'), 'utf8'),
  );
  const langs = new Set(suite.cases.map((c) => c.lang));
  for (const need of ['en', 'hi', 'hinglish', 'mr']) {
    assert.ok(langs.has(need), `missing language bucket: ${need}`);
  }
});
