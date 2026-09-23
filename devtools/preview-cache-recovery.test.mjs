import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';

// Real worker programs, isolated synthetic HTTP bytes and in-memory CacheStorage.
// No browser storage, product database, artifact directory or official catalog is written.
const workerSource = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const legacySource = execFileSync('git', ['show', 'aada9a7:service-worker.js'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8',
});
const constant = (source, name) => source.match(new RegExp(`const ${name} = '([^']+)';`))[1];
const legacyNames = ['CACHE_NAME', 'PET_IMAGE_CACHE', 'MAILBOX_RUNTIME_CACHE'].map((name) => constant(legacySource, name));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const origin = 'https://questnote.invalid';
const previewBase = `${origin}/questnote-pwa-preview/`;
const ownCache = 'questnote-preview-app-recovery-fixture';
const bundle = JSON.stringify({ schemaVersion: 1, generation: 'immutable-preview-fixture' });
const bundlePath = `data/releases/${hash(bundle)}/catalog.json`;
const assets = {
  'index.html': '<!doctype html><title>Verified preview</title><script type="module" src="src/app.js"></script>',
  'src/app.js': 'export const generation = "immutable-preview-fixture";',
  [bundlePath]: bundle,
};
const hashes = Object.fromEntries(Object.entries(assets).map(([name, body]) => [name, hash(body)]));
const profile = { schemaVersion: 1, profile: 'preview', scopePath: '/questnote-pwa-preview/',
  artifactId: 'f'.repeat(64), cacheNamespace: 'questnote-preview-', dbName: 'QuestNotePreviewDB',
  sourceCommit: 'a'.repeat(40), runtimeContentSchema: 1, contentBundleUrl: bundlePath,
  contentBundleSha256: hash(bundle) };
const urlOf = (request) => typeof request === 'string' ? request : request.url;

function memoryCaches() {
  const stores = new Map();
  const operations = [];
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name) => { operations.push({ action: 'delete', name }); return stores.delete(name); },
    open: async (name) => {
      operations.push({ action: 'open', name });
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        match: async (request) => entries.get(urlOf(request))?.clone(),
        keys: async () => [...entries.keys()].map((url) => new Request(url)),
        put: async (request, response) => {
          operations.push({ action: 'put', name, url: urlOf(request) });
          entries.set(urlOf(request), response.clone());
        },
        delete: async (request) => entries.delete(urlOf(request)),
      };
    },
    match: async (request) => {
      for (const entries of stores.values()) if (entries.has(urlOf(request))) return entries.get(urlOf(request)).clone();
      return undefined;
    },
  };
  const seed = (name, entries) => stores.set(name, new Map(Object.entries(entries).map(([url, body]) => [url, new Response(body)])));
  const snapshot = async () => Object.fromEntries(await Promise.all([...stores].map(async ([name, entries]) => [name,
    Object.fromEntries(await Promise.all([...entries].map(async ([url, response]) => [url, await response.clone().text()]))) ])));
  return { caches, stores, operations, seed, snapshot };
}

function makeWorker({ memory = memoryCaches(), source = workerSource, legacy = false,
  buildProfile = profile, expectedHashes = hashes, network = null } = {}) {
  const handlers = {};
  const fetches = [];
  const lifecycle = { skips: 0, claims: 0, navigations: 0, messages: 0, databaseCalls: 0 };
  let program = source;
  if (!legacy) {
    program = program.replace('const BUILD_PROFILE = null;', `const BUILD_PROFILE = ${JSON.stringify(buildProfile)};`)
      .replace('const PRECACHE_HASHES = null;', `const PRECACHE_HASHES = ${JSON.stringify(expectedHashes)};`)
      .replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = '${ownCache}';`)
      .replace(/const PRECACHE_URLS = \[[\s\S]*?\];/, `const PRECACHE_URLS = ${JSON.stringify(Object.keys(assets))};`);
  }
  const location = { href: legacy ? `${origin}/questnote-pwa/service-worker.js` : `${previewBase}service-worker.js?artifact=${profile.artifactId}`,
    reload: () => { lifecycle.navigations++; } };
  runInNewContext(program, { URL, Request, Response, Uint8Array, crypto: webcrypto, setTimeout, clearTimeout,
    AbortController, console, caches: memory.caches, location,
    indexedDB: new Proxy({}, { get: () => () => { lifecycle.databaseCalls++; throw new Error('SW must not access test product data'); } }),
    fetch: async (request, options) => {
      const url = urlOf(request); fetches.push({ url, options });
      if (network) return network(url, options, fetches.length);
      const relative = url.startsWith(previewBase) ? url.slice(previewBase.length) : null;
      return Object.hasOwn(assets, relative) ? new Response(assets[relative]) : new Response('Missing fixture', { status: 404 });
    },
    self: { location, addEventListener: (name, handler) => { handlers[name] = handler; },
      skipWaiting: async () => { lifecycle.skips++; },
      clients: { claim: async () => { lifecycle.claims++; }, matchAll: async () => [
        { navigate: async () => { lifecycle.navigations++; }, postMessage: () => { lifecycle.messages++; } },
        { navigate: async () => { lifecycle.navigations++; }, postMessage: () => { lifecycle.messages++; } },
      ] } },
  });
  return { memory, fetches, lifecycle,
    async dispatch(name, extra = {}) {
      let pending;
      handlers[name]?.({ ...extra, waitUntil: (promise) => { pending = promise; }, respondWith: (promise) => { pending = promise; } });
      return pending;
    },
  };
}
const navigate = () => ({ url: `${previewBase}?entry=home`, method: 'GET', mode: 'navigate' });
const requestAsset = (path, query = '') => new Request(`${previewBase}${path}${query}`);
const noLifecycleChanges = (worker) => assert.deepEqual(worker.lifecycle,
  { skips: 0, claims: 0, navigations: 0, messages: 0, databaseCalls: 0 });
async function cachedText(memory, relative) {
  return memory.stores.get(ownCache)?.get(`${previewBase}${relative}`)?.clone().text();
}

async function legacyDeletesPreview() {
  const memory = memoryCaches();
  memory.seed(ownCache, Object.fromEntries(Object.entries(assets).map(([relative, body]) => [`${previewBase}${relative}`, body])));
  for (const name of legacyNames) memory.seed(name, { [`${origin}/questnote-pwa/${name}`]: `legacy:${name}` });
  const legacy = makeWorker({ memory, source: legacySource, legacy: true });
  await legacy.dispatch('activate');
  assert.equal(memory.stores.has(ownCache), false, 'Known production worker must actually remove the preview cache');
  assert.equal(legacy.lifecycle.claims, 1, 'Exercise the original activation body, not a custom eviction shortcut');
  for (const name of legacyNames) assert.ok(memory.stores.has(name));
  memory.operations.length = 0;
  return memory;
}

test('actual legacy activation evicts preview; verified navigation, module and versioned bundle recover without lifecycle or DB effects', async () => {
  const memory = await legacyDeletesPreview();
  const legacyBefore = await memory.snapshot();
  const worker = makeWorker({ memory });
  for (const [request, relative] of [[navigate(), 'index.html'], [requestAsset('src/app.js'), 'src/app.js'], [requestAsset(bundlePath), bundlePath]]) {
    const response = await worker.dispatch('fetch', { request });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), assets[relative]);
    assert.equal(await cachedText(memory, relative), assets[relative]);
  }
  assert.deepEqual(worker.fetches.map((entry) => entry.url), Object.keys(assets).map((relative) => previewBase + relative));
  assert.ok(worker.fetches.every((entry) => entry.options.cache === 'no-store'));
  const after = await memory.snapshot();
  for (const name of legacyNames) assert.deepEqual(after[name], legacyBefore[name], 'Preview recovery changed production cache bytes');
  await worker.dispatch('message', { data: { type: 'SKIP_WAITING' } });
  noLifecycleChanges(worker);
});

for (const failure of ['bad-hash', 'http-503', 'offline']) {
  test(`legacy eviction followed by ${failure} never publishes unverified navigation, module or catalog bytes`, async () => {
    const memory = await legacyDeletesPreview();
    const worker = makeWorker({ memory, network: async () => {
      if (failure === 'offline') throw new Error('Synthetic offline');
      return failure === 'http-503' ? new Response('Unavailable', { status: 503 }) : new Response('Another release');
    } });
    for (const request of [navigate(), requestAsset('src/app.js'), requestAsset(bundlePath)]) {
      const response = await worker.dispatch('fetch', { request });
      assert.equal(response.status, 503);
      assert.match(await response.text(), /Verified application cache unavailable/);
    }
    assert.equal(memory.stores.get(ownCache)?.size || 0, 0);
    assert.equal(memory.operations.filter((entry) => entry.action === 'put').length, 0);
    noLifecycleChanges(worker);
  });
}

test('partial eviction repairs only the missing canonical asset and ignores caller query versions', async () => {
  const memory = memoryCaches();
  memory.seed(ownCache, { [`${previewBase}index.html`]: assets['index.html'], [`${previewBase}${bundlePath}`]: bundle });
  const worker = makeWorker({ memory });
  const module = await worker.dispatch('fetch', { request: requestAsset('src/app.js', '?v=another-release&session=2') });
  assert.equal(await module.text(), assets['src/app.js']);
  assert.deepEqual(worker.fetches.map((entry) => entry.url), [`${previewBase}src/app.js`]);
  assert.deepEqual([...memory.stores.get(ownCache).keys()].sort(), Object.keys(assets).map((relative) => previewBase + relative).sort());
  assert.equal(await (await worker.dispatch('fetch', { request: navigate() })).text(), assets['index.html']);
  assert.equal(await (await worker.dispatch('fetch', { request: requestAsset('src/app.js', '?v=next') })).text(), assets['src/app.js']);
  assert.equal(worker.fetches.length, 1, 'Existing verified cache hits must not be replaced from the network');
  noLifecycleChanges(worker);
});

test('recovery never borrows another namespace or touches an out-of-scope URL', async () => {
  const memory = memoryCaches();
  memory.seed('questnote-production-sibling', { [`${previewBase}src/app.js`]: assets['src/app.js'] });
  memory.seed('unrelated-app', { [`${previewBase}index.html`]: assets['index.html'] });
  const before = await memory.snapshot();
  const worker = makeWorker({ memory, network: async () => new Response('Wrong live deployment') });
  assert.equal((await worker.dispatch('fetch', { request: requestAsset('src/app.js') })).status, 503);
  assert.equal((await worker.dispatch('fetch', { request: navigate() })).status, 503);
  assert.equal(await worker.dispatch('fetch', { request: new Request(`${origin}/questnote-pwa/src/app.js`) }), undefined);
  assert.equal(await worker.dispatch('fetch', { request: new Request('https://other.invalid/questnote-pwa-preview/src/app.js') }), undefined);
  assert.equal((await worker.dispatch('fetch', { request: requestAsset('src/unlisted.js') })).status, 503);
  const after = await memory.snapshot();
  for (const [name, contents] of Object.entries(before)) assert.deepEqual(after[name], contents);
  assert.ok(memory.operations.every((entry) => entry.action === 'open' && entry.name === ownCache));
  assert.equal(worker.fetches.length, 2, 'Unknown or out-of-scope assets must never enter repair');
  noLifecycleChanges(worker);
});

test('two concurrent clients independently receive complete verified bytes and leave one canonical cache entry', async () => {
  const memory = await legacyDeletesPreview();
  const worker = makeWorker({ memory, network: async (url) => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response(assets[url.slice(previewBase.length)]);
  } });
  const [first, second] = await Promise.all([
    worker.dispatch('fetch', { request: requestAsset('src/app.js', '?client=1') }),
    worker.dispatch('fetch', { request: requestAsset('src/app.js', '?client=2') }),
  ]);
  assert.equal(first.status, 200); assert.equal(second.status, 200);
  assert.equal(await first.text(), assets['src/app.js']); assert.equal(await second.text(), assets['src/app.js']);
  assert.equal(memory.stores.get(ownCache).size, 1);
  assert.equal(await cachedText(memory, 'src/app.js'), assets['src/app.js']);
  assert.ok(worker.fetches.every((entry) => entry.url === `${previewBase}src/app.js` && entry.options.cache === 'no-store'));
  noLifecycleChanges(worker);
});

test('a racing wrong-generation response cannot overwrite another client’s verified repair', async () => {
  const worker = makeWorker({ network: async (_url, _options, count) => {
    await new Promise((resolve) => setTimeout(resolve, count === 1 ? 1 : 15));
    return new Response(count === 1 ? assets['src/app.js'] : 'Corrupt second response');
  } });
  const responses = await Promise.all([1, 2].map((client) => worker.dispatch('fetch', { request: requestAsset('src/app.js', `?client=${client}`) })));
  assert.deepEqual(responses.map((response) => response.status), [200, 503]);
  assert.equal(await cachedText(worker.memory, 'src/app.js'), assets['src/app.js']);
  assert.equal(worker.memory.operations.filter((entry) => entry.action === 'put').length, 1);
  noLifecycleChanges(worker);
});

for (const [label, buildProfile, expectedHashes] of [
  ['source checkout has no profile or hashes', null, null],
  ['release descriptor has no hash manifest', profile, null],
  ['release hash manifest omits this asset', profile, {}],
  ['source checkout must not recover using stray hashes', null, hashes],
]) {
  test(`${label}: a cache miss fails closed without trusting a live URL`, async () => {
    const worker = makeWorker({ buildProfile, expectedHashes });
    assert.equal((await worker.dispatch('fetch', { request: navigate() })).status, 503);
    assert.equal((await worker.dispatch('fetch', { request: requestAsset('src/app.js') })).status, 503);
    assert.equal(worker.fetches.length, 0);
    assert.equal(worker.memory.stores.get(ownCache)?.size || 0, 0);
    noLifecycleChanges(worker);
  });
}
