// Unit tests for the PR gate that rejects runtime changes shipped without an APP_VERSION bump
// (the recurring "changed runtime, forgot version/cache name" mistake).
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkVersionBump, readAppVersion } from './check-version-bump.mjs';

test('runtime change without a version bump fails', () => {
  for (const file of ['src/ui/tasks.js', 'service-worker.js', 'index.html']) {
    const result = checkVersionBump(['docs/a.md', file], '3.17.1', '3.17.1');
    assert.equal(result.ok, false, file);
    assert.match(result.reason, /APP_VERSION/);
  }
});

test('runtime change with a version bump passes', () => {
  assert.equal(checkVersionBump(['src/app.js', 'service-worker.js'], '3.17.1', '3.17.2').ok, true);
});

test('non-runtime changes need no bump', () => {
  assert.equal(checkVersionBump(['devtools/x.test.mjs', 'scripts/y.mjs', 'docs/z.md', '.github/workflows/validate.yml'], '3.17.1', '3.17.1').ok, true);
  assert.equal(checkVersionBump([], '3.17.1', '3.17.1').ok, true);
});

test('readAppVersion parses src/version.js source', () => {
  assert.equal(readAppVersion("export const APP_VERSION = '3.17.1';\n"), '3.17.1');
  assert.throws(() => readAppVersion('nothing here'), /APP_VERSION not found/);
});
