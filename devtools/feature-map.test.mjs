/**
 * docs/feature-map.md maps what the user calls a screen to its module and test, and lists the
 * screens a browser walk-through visits. This check keeps it from going stale: every UI module in
 * src/uiSourceParts.js must appear in the map, and every src/…js file and devtools/… test the map
 * names must exist (a renamed or deleted file fails here instead of misleading the next reader).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UI_SOURCE_PARTS } from '../src/uiSourceParts.js';

const root = path.resolve(import.meta.dirname, '..');
const map = fs.readFileSync(path.join(root, 'docs/feature-map.md'), 'utf8');

test('every UI module in src/uiSourceParts.js appears in the feature map', () => {
  const missing = UI_SOURCE_PARTS.filter((file) => !map.includes(file));
  assert.deepEqual(missing, [], `add these modules to docs/feature-map.md: ${missing.join(', ')}`);
});

test('every src/ and devtools/ file named in the feature map exists', () => {
  const named = new Set(map.match(/\b(?:src|devtools)\/[\w./-]+\.(?:m?js|html)\b/g) ?? []);
  assert.ok(named.size > 0, 'the feature map names no files');
  const missing = [...named].filter((file) => !fs.existsSync(path.join(root, file)));
  assert.deepEqual(missing, [], `docs/feature-map.md names files that do not exist: ${missing.join(', ')}`);
});
