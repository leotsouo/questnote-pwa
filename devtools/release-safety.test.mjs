import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { loadCatalogBundle, validateContentBundle, validateReleaseProfile, sha256Bytes } from '../src/releaseCatalog.js';
import { bootApplication } from '../src/bootstrap.js';

test('release bootstrap opens no product code until controlled and refuses partial profiles or reload loops', async () => {
  const profile = { artifactId: 'a'.repeat(64), scopePath: '/preview/' };
  const values = new Map();
  const attemptStorage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  let starts = 0; let reloads = 0;
  const active = { state: 'activated' };
  const serviceWorker = { controller: null, register: async () => ({ active }) };
  const options = { profile, marker: profile.artifactId, baseUrl: 'https://test.invalid/preview/', attemptStorage,
    serviceWorker, start: async () => { starts++; }, reload: () => { reloads++; }, timeoutMs: 10 };
  for (const change of [{ marker: null }, { profile: null }, { marker: 'b'.repeat(64) }, { serviceWorker: null }, { baseUrl: 'https://test.invalid/wrong/' }]) {
    await assert.rejects(bootApplication({ ...options, ...change }));
  }
  assert.equal(starts, 0); assert.equal(reloads, 0);
  assert.equal(await bootApplication(options), 'reload');
  assert.equal(starts, 0); assert.equal(reloads, 1);
  await assert.rejects(bootApplication(options), /無法取得/);
  serviceWorker.controller = { scriptURL: `https://test.invalid/preview/service-worker.js?artifact=${profile.artifactId}` };
  assert.equal(await bootApplication(options), 'controlled');
  assert.equal(starts, 1); assert.equal(values.size, 0);
  assert.equal(await bootApplication({ ...options, profile: null, marker: null }), 'source');
});

test('legacy or mismatched controlling worker cannot execute a new runtime before all old clients close', async () => {
  let starts = 0; let reloads = 0;
  const profile = { artifactId: 'd'.repeat(64), scopePath: '/preview/' };
  const waiting = { state: 'installed' };
  const result = bootApplication({ profile, marker: profile.artifactId, baseUrl: 'https://test.invalid/preview/',
    attemptStorage: { getItem: () => null },
    serviceWorker: { controller: { scriptURL: 'https://test.invalid/preview/service-worker.js?v=344' },
      register: async () => ({ active: { state: 'activated' }, waiting }) },
    start: async () => { starts++; }, reload: () => { reloads++; } });
  await assert.rejects(result, /關閉所有 QuestNote/);
  assert.equal(starts, 0); assert.equal(reloads, 0);
});

test('first release installation failure and timeout reject without importing app or reloading', async () => {
  const worker = new EventTarget(); worker.state = 'installing';
  let touched = false;
  const options = { profile: { artifactId: 'c'.repeat(64), scopePath: '/preview/' }, marker: 'c'.repeat(64),
    baseUrl: 'https://test.invalid/preview/', attemptStorage: { getItem: () => null },
    serviceWorker: { controller: null, register: async () => ({ installing: worker }) },
    start: async () => { touched = true; }, reload: () => { touched = true; }, timeoutMs: 10 };
  const pending = bootApplication(options);
  await Promise.resolve(); worker.state = 'redundant'; worker.dispatchEvent(new Event('statechange'));
  await assert.rejects(pending, /驗證失敗/);
  worker.state = 'installing';
  await assert.rejects(bootApplication(options), /尚未準備完成/);
  await assert.rejects(bootApplication({ ...options, serviceWorker: { register: async () => { throw new Error('503'); } } }), /503/);
  assert.equal(touched, false);
});

const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const bundle = () => ({ schemaVersion: 1, petsData: read('pets'), poolsData: read('pools'),
  loreData: read('pets-lore'), seriesCatalog: read('pet-series') });
const workerSource = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const cacheName = workerSource.match(/const CACHE_NAME = '([^']+)'/)[1];
const encoder = new TextEncoder();
async function descriptor(content, profile = 'preview') {
  const hash = await sha256Bytes(encoder.encode(JSON.stringify(content)), webcrypto);
  return { schemaVersion: 1, profile, artifactId: 'a'.repeat(64), sourceCommit: 'b'.repeat(40),
    scopePath: `/${profile}/`, runtimeContentSchema: 1, contentBundleSha256: hash,
    contentBundleUrl: `data/releases/${hash}/catalog.json`,
    dbName: profile === 'preview' ? 'QuestNotePreviewDB' : 'QuestNoteDB',
    cacheNamespace: `questnote-${profile}-` };
}

test('release loader accepts exactly one hash-verified complete catalog generation', async () => {
  const data = bundle(); const profile = await descriptor(data); const urls = [];
  const loaded = await loadCatalogBundle({ profile, baseUrl: 'https://test.invalid/preview/', cryptoImpl: webcrypto,
    fetchImpl: async (url) => { urls.push(String(url)); return new Response(JSON.stringify(data)); } });
  assert.deepEqual(loaded, data);
  assert.deepEqual(urls, [`https://test.invalid/preview/${profile.contentBundleUrl}`]);
});

test('incompatible, corrupt, partial and unavailable releases never fall back to mutable catalogs', async () => {
  const data = bundle(); const profile = await descriptor(data);
  for (const response of [new Response('{}'), new Response('', { status: 503 }),
    new Response(JSON.stringify({ ...data, schemaVersion: 99 }))]) {
    const urls = [];
    await assert.rejects(loadCatalogBundle({ profile, baseUrl: 'https://test.invalid/preview/', cryptoImpl: webcrypto,
      fetchImpl: async (url) => { urls.push(String(url)); return response; } }));
    assert.equal(urls.length, 1);
  }
  for (const mutate of [(value) => { value.schemaVersion = 99; },
    (value) => { value.petsData.pets.pop(); }, (value) => { delete value.loreData; },
    (value) => { value.poolsData.pools[0].rates.N = 0; }]) {
    const broken = bundle(); mutate(broken);
    assert.equal(validateContentBundle(broken).ok, false);
  }
  for (const mutate of [(value) => { value.profile = 'constructor'; },
    (value) => { value.dbName = 'QuestNoteDB'; }, (value) => { value.runtimeContentSchema = 2; },
    (value) => { value.contentBundleUrl = '../data/pools.json'; }]) {
    const invalid = structuredClone(profile); mutate(invalid);
    assert.throws(() => validateReleaseProfile(invalid));
  }
  await assert.rejects(loadCatalogBundle({ profile, baseUrl: 'https://test.invalid/production/' }), /scope/);
});

function worker({ profile = null, failPath = null, offline = false, cacheSeed = {}, hashes = null } = {}) {
  const handlers = {}; const fetches = []; let skips = 0; let claims = 0;
  const scope = profile?.scopePath || '/preview/';
  const ownName = profile ? `${profile.cacheNamespace}shell-test` : cacheName;
  const stores = new Map(Object.entries(cacheSeed).map(([name, rows]) => [name,
    new Map(Object.entries(rows).map(([url, body]) => [url, new Response(body)]))]));
  const key = (request) => typeof request === 'string' ? request : request.url;
  const caches = {
    keys: async () => [...stores.keys()], delete: async (name) => stores.delete(name),
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const values = stores.get(name);
      return { match: async (request) => values.get(key(request))?.clone(),
        put: async (request, response) => { values.set(key(request), response.clone()); },
        keys: async () => [...values.keys()].map((url) => new Request(url)) };
    },
  };
  let source = workerSource.replace('const BUILD_PROFILE = null;', `const BUILD_PROFILE = ${JSON.stringify(profile)};`)
    .replace('const PRECACHE_HASHES = null;', `const PRECACHE_HASHES = ${JSON.stringify(hashes)};`);
  if (profile) source = source.replace(`const CACHE_NAME = '${cacheName}';`, `const CACHE_NAME = '${ownName}';`);
  runInNewContext(source, { URL, Request, Response, Uint8Array, crypto: webcrypto, setTimeout, clearTimeout, AbortController,
    caches, console, self: { location: { href: `https://test.invalid${scope}service-worker.js` },
      addEventListener: (type, handler) => { handlers[type] = handler; },
      skipWaiting: async () => { skips++; }, clients: { claim: async () => { claims++; } } },
    fetch: async (request) => {
      const url = key(request); fetches.push(url);
      if (offline) throw new Error('Offline');
      return url.endsWith(failPath || 'never-match') ? new Response('', { status: 503 }) : new Response(`asset:${url}`);
    },
  });
  return { stores, fetches, ownName, handlers, lifecycle: () => ({ skips, claims }),
    async dispatch(type, extra = {}) {
      let pending; handlers[type]?.({ ...extra, waitUntil: (promise) => { pending = promise; },
        respondWith: (promise) => { pending = promise; } });
      return pending;
    } };
}

test('required precache 503 and digest mismatch abort installation before cache publication', async () => {
  for (const options of [{ failPath: 'src/app.js' }, { hashes: {} }, { offline: true }]) {
    const instance = worker({ ...options, cacheSeed: { 'questnote-preview-old': { 'https://test.invalid/preview/index.html': 'old' } } });
    await assert.rejects(instance.dispatch('install'));
    assert.equal(instance.stores.has(cacheName), false);
    assert.equal(await instance.stores.get('questnote-preview-old').values().next().value.text(), 'old');
    assert.deepEqual(instance.lifecycle(), { skips: 0, claims: 0 });
  }
});

test('successful installation does not force activation, claim clients or honor old skip messages', async () => {
  const instance = worker(); await instance.dispatch('install');
  assert.ok(instance.stores.get(cacheName).size > 50);
  await instance.dispatch('message', { data: { type: 'SKIP_WAITING' } });
  await instance.dispatch('activate');
  assert.deepEqual(instance.lifecycle(), { skips: 0, claims: 0 });
});

test('both production and preview activation preserve every other cache namespace', async () => {
  for (const name of ['production', 'preview']) {
    const profile = await descriptor(bundle(), name);
    const other = name === 'production' ? 'preview' : 'production';
    const instance = worker({ profile, cacheSeed: { [`questnote-${name}-old`]: {},
      [`questnote-${other}-old`]: {}, 'unrelated-app': {} } });
    await instance.dispatch('activate');
    assert.equal(instance.stores.has(`questnote-${name}-old`), false);
    assert.equal(instance.stores.has(`questnote-${other}-old`), true);
    assert.equal(instance.stores.has('unrelated-app'), true);
  }
});

test('verified shell serves one generation online/offline and never reads another scope', async () => {
  const instance = worker({ cacheSeed: { [cacheName]: {
    'https://test.invalid/preview/index.html': 'this release index',
    'https://test.invalid/preview/src/app.js': 'this release code',
  }, 'questnote-production-other': { 'https://test.invalid/production/index.html': 'wrong release' } } });
  const code = await instance.dispatch('fetch', { request: new Request('https://test.invalid/preview/src/app.js?v=new') });
  assert.equal(await code.text(), 'this release code'); assert.equal(instance.fetches.length, 0);
  const page = await instance.dispatch('fetch', { request: { url: 'https://test.invalid/preview/', method: 'GET', mode: 'navigate' } });
  assert.equal(await page.text(), 'this release index');
  assert.equal(await instance.dispatch('fetch', { request: new Request('https://test.invalid/production/src/app.js') }), undefined);
  assert.equal(await instance.dispatch('fetch', { request: new Request('https://else.invalid/preview/src/app.js') }), undefined);
});

test('mailbox HTTP 503 falls back only to the exact current-scope cache entry', async () => {
  const instance = worker({ failPath: 'global-mailbox.json', cacheSeed: { 'questnote-preview-mailbox-runtime-v1': {
    'https://test.invalid/production/data/global-mailbox.json': 'wrong mailbox',
    'https://test.invalid/preview/data/global-mailbox.json': 'right mailbox',
  } } });
  const result = await instance.dispatch('fetch', { request: new Request('https://test.invalid/preview/data/global-mailbox.json') });
  assert.equal(await result.text(), 'right mailbox');
  const withoutOwn = worker({ offline: true, cacheSeed: { 'questnote-preview-mailbox-runtime-v1': {
    'https://test.invalid/production/data/global-mailbox.json': 'wrong mailbox',
  } } });
  const unavailable = await withoutOwn.dispatch('fetch', { request: new Request('https://test.invalid/preview/data/global-mailbox.json') });
  assert.equal(unavailable.status, 503); assert.deepEqual((await unavailable.json()).messages, []);
});
