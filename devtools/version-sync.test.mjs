// Guards against bumping src/version.js without the service worker (or vice versa): a stale
// CACHE_NAME keeps users on the old precache, so a runtime change silently never reaches them.
// service-worker.js is a classic script and cannot import version.js, so the literal is duplicated.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION, CACHE_NAME } from '../src/version.js';

const workerSource = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');

test('service-worker.js CACHE_NAME literal matches src/version.js', () => {
  const declared = workerSource.match(/^const CACHE_NAME = '([^']+)';$/m);
  assert.ok(declared, 'service-worker.js declares const CACHE_NAME as a string literal');
  assert.equal(declared[1], CACHE_NAME);
});

test('CACHE_NAME carries the APP_VERSION build tag', () => {
  // Same tag getServiceWorkerRegisterUrl() uses: 3.17.1 -> v3171.
  const buildTag = APP_VERSION.replace(/\./g, '');
  assert.match(CACHE_NAME, new RegExp(`-v${buildTag}(-|$)`), `CACHE_NAME "${CACHE_NAME}" must contain -v${buildTag}`);
});
