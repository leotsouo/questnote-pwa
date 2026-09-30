import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { beginUpdate, endUpdate, hasUpdateActivity, trackUpdateActivity } from '../src/updateActivity.js';
import { bootApplication } from '../src/bootstrap.js';

test('a complete asynchronous UI action blocks updates across gaps between writes, then unlocks', async () => {
  let finish;
  const work = trackUpdateActivity(async () => { await new Promise((resolve) => { finish = resolve; }); return 7; })();
  assert.equal(hasUpdateActivity(), true);
  assert.equal(beginUpdate(), false);
  finish(); assert.equal(await work, 7);
  assert.equal(beginUpdate(), true);
  let ran = false;
  trackUpdateActivity(() => { ran = true; })(); assert.equal(ran, false);
  endUpdate();
  assert.throws(trackUpdateActivity(() => { throw Error('Rejected write'); }));
  assert.equal(hasUpdateActivity(), false);
  await assert.rejects(trackUpdateActivity(async () => { throw Error('Async rejected write'); })());
  assert.equal(beginUpdate(), true); endUpdate();
});

const workerSource = await fs.readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
const artifactId = 'b'.repeat(64);
const scope = 'https://example.test/questnote-pwa/';
const workerUrl = scope + 'service-worker.js?artifact=old-url';
function worker({ windows = [{ id: 'caller', url: scope + 'index.html' }], cached = true, waiting = true, missingPath = null } = {}) {
  const handlers = {}; let skips = 0; let claims = 0;
  const source = workerSource.replace('const BUILD_PROFILE = null;', `const BUILD_PROFILE = ${JSON.stringify({ artifactId, scopePath: '/questnote-pwa/' })};`);
  runInNewContext(source, { URL, Request, Response, Uint8Array, crypto: webcrypto,
    setTimeout, clearTimeout, AbortController,
    caches: { open: async () => ({ match: async (url) => cached && !String(url).endsWith(missingPath || 'no-missing-path') ? new Response('verified index') : null }) },
    self: { location: { href: workerUrl }, registration: { scope, waiting: waiting ? { scriptURL: workerUrl } : null },
      addEventListener: (name, callback) => { handlers[name] = callback; },
      clients: { matchAll: async (options) => { assert.equal(options.includeUncontrolled, true); return windows; }, claim: async () => { claims++; } },
      skipWaiting: async () => { skips++; } },
  });
  return { lifecycle: () => ({ skips, claims }), async message(data, source = { id: 'caller', url: scope + 'index.html' }) {
    let result; let pending;
    handlers.message({ data, source, ports: [{ postMessage: (value) => { result = value; } }], waitUntil: (promise) => { pending = promise; } });
    await pending; return result;
  } };
}

test('explicit update activates only the installed, pinned generation with one scoped caller; never claims', async () => {
  const instance = worker();
  assert.deepEqual(JSON.parse(JSON.stringify(await instance.message({ type: 'QUESTNOTE_UPDATE_INFO' }))), { artifactId, scopePath: '/questnote-pwa/' });
  assert.equal((await instance.message({ type: 'QUESTNOTE_APPLY_UPDATE', artifactId })).status, 'accepted');
  assert.deepEqual(instance.lifecycle(), { skips: 1, claims: 0 });
});

test('another app window vetoes activation, including uncontrolled and legacy clients', async () => {
  const instance = worker({ windows: [{ id: 'caller', url: scope + 'index.html' }, { id: 'old-tab', url: scope }] });
  assert.equal((await instance.message({ type: 'QUESTNOTE_APPLY_UPDATE', artifactId })).status, 'other-clients');
  assert.deepEqual(instance.lifecycle(), { skips: 0, claims: 0 });
});

test('preview sibling clients do not block the production scope', async () => {
  const instance = worker({ windows: [{ id: 'caller', url: scope }, { id: 'preview', url: 'https://example.test/questnote-pwa-preview/' }] });
  assert.equal((await instance.message({ type: 'QUESTNOTE_APPLY_UPDATE', artifactId })).status, 'accepted');
});

test('missing cache, wrong artifact, active worker, wrong caller and legacy skip remain fail closed', async () => {
  for (const options of [{ cached: false }, { waiting: false }, { missingPath: 'src/app.js' }]) {
    const instance = worker(options);
    assert.equal((await instance.message({ type: 'QUESTNOTE_APPLY_UPDATE', artifactId })).status, 'unavailable');
    assert.equal(instance.lifecycle().skips, 0);
  }
  const instance = worker();
  assert.equal((await instance.message({ type: 'QUESTNOTE_APPLY_UPDATE', artifactId: 'c'.repeat(64) })).status, 'unavailable');
  assert.equal((await instance.message({ type: 'QUESTNOTE_APPLY_UPDATE', artifactId }, { id: 'wrong', url: 'https://example.test/elsewhere/' })).status, 'unavailable');
  assert.equal(await instance.message({ type: 'SKIP_WAITING' }), undefined);
  assert.equal(instance.lifecycle().skips, 0);
});

test('bootstrap verifies new worker bytes installed at an old script URL before opening the DB/runtime', async () => {
  let starts = 0;
  const result = await bootApplication({ profile: { artifactId, scopePath: '/questnote-pwa/' }, marker: artifactId,
    baseUrl: scope, attemptStorage: { removeItem: () => {} },
    serviceWorker: { controller: { scriptURL: workerUrl, postMessage: (_, ports) => { ports[0].postMessage({ artifactId, scopePath: '/questnote-pwa/' }); } } },
    start: async () => { starts++; }, reload: () => { throw Error('Unnecessary reload'); } });
  assert.equal(result, 'controlled'); assert.equal(starts, 1);
});
