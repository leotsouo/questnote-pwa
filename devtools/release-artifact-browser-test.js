/** Real assembled-runtime smoke tests. This page must run only on its fresh loopback server. */
const output = document.getElementById('results');
const results = [];
const frames = new Set();
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let configuration;
let storageOwnershipEstablished = false;
const observations = {};
const publish = () => {
  output.textContent = JSON.stringify({ running: true, results, observations }, null, 2);
};
async function until(check, description, timeout = 75000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(50);
  }
  throw new Error(`Timed out: ${description}`);
}
async function test(name, run) {
  publish();
  try { await run(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.stack || error.message }); }
  publish();
}
async function databaseNames() {
  assert(typeof indexedDB.databases === 'function', 'This harness needs IndexedDB.databases() to verify ownership');
  return (await indexedDB.databases()).map((entry) => entry.name).sort();
}
async function previewTransactionSnapshot() {
  assert(storageOwnershipEstablished, 'Read requires owned test origin');
  const name = configuration.profiles.preview.profile.dbName;
  assert((await databaseNames()).includes(name), 'Existing preview database required');
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(['meta', 'collection'], 'readonly');
      const values = {};
      for (const key of ['wallet', 'gachaStats', 'poolUnlockState']) {
        const read = transaction.objectStore('meta').get(key);
        read.onsuccess = () => { values[key] = read.result; };
      }
      const collection = transaction.objectStore('collection').getAll();
      collection.onsuccess = () => { values.collection = collection.result; };
      transaction.oncomplete = () => { database.close(); resolve(JSON.stringify(values)); };
      transaction.onabort = () => { database.close(); reject(transaction.error); };
    };
  });
}
async function control(profile, fault) {
  const response = await fetch('./control', { method: 'POST', headers: {
    'Content-Type': 'application/json', 'X-Harness-Token': configuration.token,
  }, body: JSON.stringify({ profile, fault }) });
  assert(response.ok, 'Fixture control failed');
}
function directClient(profile, query = '') {
  const frame = document.createElement('iframe');
  frame.title = `Isolated ${profile} artifact client`;
  frame.style.cssText = 'width:390px;height:740px;border:1px solid #888';
  frame.src = configuration.profiles[profile].profile.scopePath + query;
  frames.add(frame);
  document.getElementById('clients').appendChild(frame);
  return frame;
}
function closeClients() {
  for (const frame of frames) frame.remove();
  frames.clear();
}
async function cleanupOrigin() {
  if (!storageOwnershipEstablished) return;
  closeClients();
  await delay(200);
  const allowedScopes = new Set(Object.values(configuration.profiles).map((item) => new URL(item.profile.scopePath, location.origin).href));
  const allowedCaches = new Set([...Object.values(configuration.profiles).flatMap((item) => item.cacheNames), ...configuration.legacyCacheNames]);
  const allowedDatabases = new Set(Object.values(configuration.profiles).map((item) => item.profile.dbName));
  for (const registration of await navigator.serviceWorker.getRegistrations()) {
    assert(allowedScopes.has(registration.scope), 'Unexpected SW registration: refusing broad cleanup');
    await registration.unregister();
  }
  for (const name of await caches.keys()) {
    assert(allowedCaches.has(name), `Unexpected cache ${name}: refusing deletion`);
    await caches.delete(name);
  }
  for (const name of await databaseNames()) {
    assert(allowedDatabases.has(name), `Unexpected database ${name}: refusing deletion`);
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      const timer = setTimeout(() => reject(new Error(`Test database cleanup blocked: ${name}`)), 12000);
      request.onsuccess = () => { clearTimeout(timer); resolve(); };
      request.onerror = () => { clearTimeout(timer); reject(request.error); };
      // Removed iframe connections may close asynchronously; leave the request pending.
    });
  }
  for (const item of Object.values(configuration.profiles)) sessionStorage.removeItem(`questnote-boot:${item.profile.artifactId}`);
  assert((await databaseNames()).length === 0, 'Synthetic test databases remain after cleanup');
  assert((await caches.keys()).length === 0, 'Synthetic test caches remain after cleanup');
}
async function waitForStarted(frame, profile) {
  const expected = configuration.profiles[profile];
  await until(() => {
    const document = frame.contentDocument;
    return typeof frame.contentWindow?.runAppHealthCheck === 'function'
      && document?.getElementById('task-view-content')?.children.length > 0
      && !document.getElementById('app-loader');
  }, `${profile}: bootstrap, reload, app import and initialization`);
  const client = frame.contentWindow;
  assert(client.navigator.serviceWorker.controller, 'Initialized release is not SW-controlled');
  const script = new URL(client.navigator.serviceWorker.controller.scriptURL);
  assert(script.origin === location.origin && script.pathname === `${expected.profile.scopePath}service-worker.js`, 'Wrong controller scope');
  assert(script.searchParams.get('artifact') === expected.profile.artifactId, 'Controller belongs to another artifact');
  assert(frame.contentDocument.querySelector('meta[name="questnote-artifact"]')?.content === expected.profile.artifactId, 'Wrong index artifact marker');
  assert(!sessionStorage.getItem(`questnote-boot:${expected.profile.artifactId}`), 'Controlled boot did not clear its one-reload guard');
  return client;
}
async function checkCatalogAndUi(frame, profile) {
  const item = configuration.profiles[profile];
  const response = await frame.contentWindow.fetch(new URL(item.profile.contentBundleUrl, frame.contentWindow.location.href));
  assert(response.ok, 'Content bundle unavailable to the actual controlled page');
  const bytes = await response.arrayBuffer();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  assert(hash === item.profile.contentBundleSha256, 'Actual controlled catalog has the wrong generation');
  const bundle = JSON.parse(new TextDecoder().decode(bytes));
  assert(bundle.petsData.pets.length === item.expected.petCount, 'Pet catalog count mismatch');
  const document = frame.contentDocument;
  document.querySelector('[data-view="gacha"]').click();
  await until(() => document.getElementById('view-gacha').classList.contains('active'), 'gacha view');
  if (item.expected.firstPool) {
    assert(document.getElementById('gacha-pool-name').textContent === item.expected.firstPool.name, 'Wrong pool displayed by actual runtime');
    assert(document.getElementById('gacha-cost').textContent === String(item.expected.firstPool.cost), 'Wrong single-draw price');
    assert(document.getElementById('gacha-ten-cost').textContent === String(item.expected.firstPool.cost * 10), 'Wrong ten-draw price');
    assert(document.getElementById('gacha-rates').children.length === 5, 'Rarity rates not rendered');
  } else {
    assert(document.getElementById('btn-pull').disabled && document.getElementById('btn-pull-ten').disabled, 'All-inactive artifact allows a draw');
  }
  document.querySelector('[data-view="collection"]').click();
  await until(() => document.getElementById('collection-grid').children.length > 0, 'collection view');
  assert(document.getElementById('collection-count').textContent.endsWith(`/${item.expected.petCount}`), 'Collection does not use the complete bundle');
  document.querySelector('[data-view="tasks"]').click();
  observations[profile] = { artifactId: item.profile.artifactId, catalogSha256: hash,
    petCount: bundle.petsData.pets.length, controller: frame.contentWindow.navigator.serviceWorker.controller.scriptURL };
}
try {
  assert(location.hostname === '127.0.0.1' && location.protocol === 'http:' && location.port, 'Refusing a non-ephemeral-loopback origin');
  configuration = await fetch('./config').then((response) => response.json());
  assert(configuration.origin === location.origin && typeof configuration.runId === 'string', 'Harness origin mismatch');
  assert(!navigator.serviceWorker.controller, 'Parent test page must remain uncontrolled');
  assert((await navigator.serviceWorker.getRegistrations()).length === 0, 'Origin already has a worker; use a new server port');
  assert((await caches.keys()).length === 0, 'Origin already has caches; use a new server port');
  assert((await databaseNames()).length === 0, 'Origin already has databases; use a new server port');
  storageOwnershipEstablished = true;

  for (const fault of ['profile-null', 'index-marker-mismatch', 'missing503', 'corrupt']) {
    await test(`uncontrolled first boot rejects ${fault} before app import or database access`, async () => {
      await control('production', fault);
      const frame = directClient('production');
      try {
        await until(() => frame.contentDocument?.getElementById('app-loader')?.querySelector('button')?.textContent === '重新載入', 'visible bootstrap failure');
        assert(typeof frame.contentWindow.runAppHealthCheck === 'undefined', 'App module executed before release validation');
        assert((await databaseNames()).length === 0, 'Failed first boot opened a QuestNote database');
        const audit = await fetch('./audit').then((response) => response.json());
        assert(!audit.production.some((entry) => entry.path === 'src/app.js' && entry.destination === 'script'), 'Browser imported app.js before verification');
        const failure = frame.contentDocument.getElementById('app-loader').textContent;
        assert(/失敗|不一致|尚未|無法/.test(failure), 'Failure is not explained visibly');
        observations[fault] = { failure, requests: audit.production.length, databaseNames: await databaseNames() };
      } finally { await cleanupOrigin(); }
    });
  }

  await test('known legacy network-first controller cannot start the new app before every legacy client closes', async () => {
    await control('production', 'legacy');
    try {
      const productionScope = configuration.profiles.production.profile.scopePath;
      const registration = await navigator.serviceWorker.register(`${productionScope}service-worker.js?v=344`, {
        scope: productionScope, updateViaCache: 'none',
      });
      await until(() => registration.active?.state === 'activated', 'legacy fixture activation');
      const first = directClient('production');
      const second = directClient('production');
      await until(() => first.contentWindow?.legacyHarness && second.contentWindow?.legacyHarness, 'two legacy clients');
      assert(first.contentWindow.navigator.serviceWorker.controller?.scriptURL.endsWith('?v=344'), 'Fixture did not use the known legacy controller');
      await control('production', 'none');
      first.src = `${productionScope}index.html?transition=${configuration.runId}`;
      await until(() => first.contentDocument?.getElementById('app-loader')?.querySelector('button')
        && /關閉/.test(first.contentDocument.getElementById('app-loader').textContent), 'safe legacy-transition waiting message');
      assert(typeof first.contentWindow.runAppHealthCheck === 'undefined', 'New app executed under the legacy controller');
      assert((await databaseNames()).length === 0, 'Legacy transition opened the new database before verification');
      await until(() => registration.waiting?.state === 'installed', 'verified replacement waiting');
      const replacement = registration.waiting;
      assert(new URL(replacement.scriptURL).searchParams.get('artifact') === configuration.profiles.production.profile.artifactId, 'Replacement has wrong artifact identity');
      replacement.postMessage({ type: 'SKIP_WAITING' });
      await delay(120);
      assert(replacement.state === 'installed', 'Old skip command forced the replacement active');
      const audit = await fetch('./audit').then((response) => response.json());
      assert(!audit.production.some((entry) => entry.path === 'src/app.js' && entry.destination === 'script'), 'Legacy-controlled browser imported the new app');
      first.remove(); frames.delete(first); await delay(120);
      assert(replacement.state === 'installed', 'Replacement activated while the second legacy client remained');
      second.remove(); frames.delete(second);
      await until(() => replacement.state === 'activated', 'natural activation after legacy clients close');
      const migrated = directClient('production');
      await waitForStarted(migrated, 'production');
      await checkCatalogAndUi(migrated, 'production');
      observations.legacyTransition = { baselineCommit: configuration.legacyCommit,
        waitingBeforeClose: true, zeroDatabasesBeforeClose: true, newArtifact: configuration.profiles.production.profile.artifactId };
    } finally { await cleanupOrigin(); }
  });

  let productionFrame;
  let previewFrame;
  await test('direct first production visit verifies, activates, reloads, and initializes the actual app', async () => {
    await control('production', 'none');
    productionFrame = directClient('production');
    await waitForStarted(productionFrame, 'production');
    assert(JSON.stringify(await databaseNames()) === JSON.stringify(['QuestNoteDB']), 'Production opened an unexpected database');
    await checkCatalogAndUi(productionFrame, 'production');
  });
  await test('direct preview visit coexists with production using a separate database and controller', async () => {
    await control('preview', 'none');
    previewFrame = directClient('preview');
    await waitForStarted(previewFrame, 'preview');
    assert(JSON.stringify(await databaseNames()) === JSON.stringify(['QuestNoteDB', 'QuestNotePreviewDB']), 'Profiles do not use separate databases');
    await checkCatalogAndUi(previewFrame, 'preview');
    await waitForStarted(productionFrame, 'production');
    assert(!navigator.serviceWorker.controller, 'Artifact worker claimed the parent harness');
    const names = await caches.keys();
    for (const profile of ['production', 'preview']) assert(names.includes(configuration.profiles[profile].cacheNames[0]), `${profile} shell was deleted by the other environment`);
  });
  await test('old perf/debug shortcuts cannot expose diagnostics or grant test currency', async () => {
    const before = await previewTransactionSnapshot();
    const flagged = directClient('preview', '?perf=1&debug=1');
    const client = await waitForStarted(flagged, 'preview');
    const dev = await client.eval('import(' + JSON.stringify(new URL('src/devService.js', client.location.href).href) + ')');
    assert(!dev.isDevMode() && !dev.isDebugMode() && !dev.isAuthorLocalDevMode(), 'Released debug entry enabled');
    let rejected = false;
    try { await dev.grantDevStardust(); } catch { rejected = true; }
    assert(rejected, 'Release accepted test currency');
    const perf = await client.eval('import(' + JSON.stringify(new URL('src/perfDiagnostics.js', client.location.href).href) + ')');
    perf.startPerfDiagnostics(null, null);
    assert(!flagged.contentDocument.getElementById('questnote-perf'), 'Release exposed diagnostics panel');
    flagged.contentDocument.querySelector('[data-view="more"]').click();
    flagged.contentDocument.querySelector('[data-goto="settings"]').click();
    await until(() => flagged.contentDocument.getElementById('view-settings').classList.contains('active'), 'released settings');
    assert(!flagged.contentDocument.getElementById('dev-tools-section'), 'Release exposed settings debug tools');
    assert(await previewTransactionSnapshot() === before, 'Debug shortcut changed persistent state');
    flagged.remove(); frames.delete(flagged);
  });
  await test('evicted required assets reject 503 and wrong-generation catalog bytes without changing persistent state', async () => {
    const item = configuration.profiles.preview;
    const cache = await caches.open(item.cacheNames[0]);
    const before = await previewTransactionSnapshot();
    for (const [fault, path] of [['missing503', 'src/app.js'], ['corrupt', item.profile.contentBundleUrl]]) {
      const url = new URL(item.profile.scopePath + path, location.origin).href;
      await cache.delete(url);
      await control('preview', fault);
      const response = await previewFrame.contentWindow.fetch(url + '?recovery-check=1');
      assert(response.status === 503 && !(await cache.match(url)), 'Unverified network response entered cache');
      await control('preview', 'none');
      assert((await previewFrame.contentWindow.fetch(url)).ok && await cache.match(url), 'Valid bytes did not repair the missing asset');
    }
    assert(await previewTransactionSnapshot() === before, 'Recovery changed wallet, pity, unlock or collection');
  });
  await test('cleared preview shell rebuilds verified bytes while two clients and persisted state survive', async () => {
    const item = configuration.profiles.preview;
    const second = directClient('preview');
    await waitForStarted(second, 'preview');
    const before = await previewTransactionSnapshot();
    const firstStart = previewFrame.contentWindow.performance.timeOrigin;
    const secondStart = second.contentWindow.performance.timeOrigin;
    // Reproduce the cache loss caused by the deployed legacy production worker.
    await caches.delete(item.cacheNames[0]);
    await Promise.all([previewFrame, second].map(async (frame) => {
      const response = await frame.contentWindow.fetch(item.profile.scopePath + 'src/app.js?repair=1');
      assert(response.ok, 'Concurrent verified repair failed');
    }));
    const reopened = directClient('preview');
    await waitForStarted(reopened, 'preview');
    await checkCatalogAndUi(reopened, 'preview');
    assert(previewFrame.contentWindow.performance.timeOrigin === firstStart
      && second.contentWindow.performance.timeOrigin === secondStart, 'Repair reloaded an active client');
    assert(await previewTransactionSnapshot() === before, 'Rebuilt cache changed persistent transaction state');
    assert((await caches.keys()).includes(configuration.profiles.production.cacheNames[0]), 'Repair changed production cache');
    second.remove(); frames.delete(second); reopened.remove(); frames.delete(reopened);
  });
  await test('both fully assembled cached apps and catalogs boot while all artifact HTTP responses are 503', async () => {
    closeClients();
    await control('production', 'all503'); await control('preview', 'all503');
    productionFrame = directClient('production'); previewFrame = directClient('preview');
    await waitForStarted(productionFrame, 'production'); await waitForStarted(previewFrame, 'preview');
    await checkCatalogAndUi(productionFrame, 'production'); await checkCatalogAndUi(previewFrame, 'preview');
  });
  await test('growth chapters remain usable and resume the saved step without the network', async () => {
    let document = productionFrame.contentDocument;
    document.querySelector('[data-onboarding-action="skip"]')?.click();
    await until(() => !document.querySelector('[data-onboarding-action="start"]'), 'welcome dismissed');
    document.querySelector('[data-view="more"]').click();
    document.querySelector('[data-goto="guide"]').click();
    await until(() => document.querySelectorAll('#guide-chapters article').length === 4, 'four offline chapters');
    document.querySelector('[data-onboarding-action="lesson:workshop"]').click();
    await until(() => document.querySelector('[data-onboarding-action="lesson-next"]'), 'offline chapter started');
    document.querySelector('[data-onboarding-action="lesson-next"]').click();
    await until(() => document.querySelector('.onboarding-dock')?.textContent.includes('看懂配方'), 'craft step persisted');
    productionFrame.remove(); frames.delete(productionFrame);
    productionFrame = directClient('production');
    await waitForStarted(productionFrame, 'production');
    document = productionFrame.contentDocument;
    await until(() => document.querySelector('.onboarding-dock')?.textContent.includes('看懂配方'), 'offline chapter resumes');
    document.querySelector('[data-onboarding-action="lesson-locate"]').click();
    await until(() => document.getElementById('view-workshop').classList.contains('active')
      && document.querySelector('[data-action="craft-item"]'), 'offline recipe navigation');
    observations.offlineGrowthLesson = { chapter: 'workshop', step: 'craft', resumed: true };
  });
} catch (error) {
  results.push({ name: 'harness setup', ok: false, error: error.stack || error.message });
} finally {
  try { await cleanupOrigin(); }
  catch (error) { results.push({ name: 'cleanup', ok: false, error: error.stack || error.message }); }
  output.textContent = JSON.stringify({ running: false, runId: configuration?.runId,
    passed: results.filter((result) => result.ok).length, failed: results.filter((result) => !result.ok).length,
    results, observations, cleanupOwnedOrigin: storageOwnershipEstablished }, null, 2);
  document.title = results.length > 0 && results.every((result) => result.ok) ? 'PASS — Assembled artifact' : 'FAIL — Assembled artifact';
}
