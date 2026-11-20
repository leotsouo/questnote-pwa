/**
 * Blocks source checks that match "A, then B within the next N characters" with a fixed-length
 * wildcard window, e.g. `[\s\S]{0,N}`, `[^]{0,N}` or `.{0,N}` with a large N. Such a window silently
 * stops matching once the function grows (V3.12.1: two App health checks failed after the ui.js
 * split, see devtools/app-health-source.test.mjs). Use functionSource() or a whole-file match instead.
 *
 * Covered: devtools/*.mjs (which includes every devtools/*.test.mjs).
 * Not yet covered: src/healthCheckService.js — 16 fixed-window regexes remain there (V3.17.2) whose
 * anchors are not a single function name; add the file to SCANNED once they are rewritten.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const MIN_WINDOW = 50;
const SCANNED = readdirSync(path.join(root, 'devtools'))
  .filter((name) => name.endsWith('.mjs'))
  .map((name) => `devtools/${name}`);

// A wildcard atom ([\s\S], [\S\s], [\w\W], [\d\D], [^] or .) followed by a bounded {m,N} quantifier.
// Built from pieces so this file's own source never matches it.
const WILDCARD = ['\\[\\\\s\\\\S\\]', '\\[\\\\S\\\\s\\]', '\\[\\\\w\\\\W\\]', '\\[\\\\d\\\\D\\]', '\\[\\^\\]', '(?<!\\\\)\\.'].join('|');
const FIXED_WINDOW = new RegExp(`(?:${WILDCARD})\\{\\d*,(\\d+)\\}`, 'g');

function findFixedWindows(text) {
  const hits = [];
  text.split('\n').forEach((line, index) => {
    for (const match of line.matchAll(FIXED_WINDOW)) {
      if (Number(match[1]) >= MIN_WINDOW) hits.push({ line: index + 1, snippet: match[0] });
    }
  });
  return hits;
}

test('the detector catches each fixed-window form and ignores small or escaped bounds', () => {
  const open = '{0,';
  assert.equal(findFixedWindows(`/a[\\s\\S]${open}600}b/`).length, 1);
  assert.equal(findFixedWindows(`/a[^]${open}200}b/`).length, 1);
  assert.equal(findFixedWindows(`/a.${open}80}b/`).length, 1);
  assert.equal(findFixedWindows(`/^\\d${open}3}$/`).length, 0);
  assert.equal(findFixedWindows(`/a.${open}10}b/`).length, 0);
  assert.equal(findFixedWindows(`/a\\.${open}80}b/`).length, 0);
});

test('static source checks do not use a fixed character window', () => {
  const offenders = SCANNED.flatMap((file) => findFixedWindows(readFileSync(path.join(root, file), 'utf8'))
    .map(({ line, snippet }) => `${file}:${line} ${snippet}`));
  assert.deepEqual(offenders, [], 'use functionSource() or a whole-file match instead of a fixed window');
});
