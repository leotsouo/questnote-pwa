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
  catch (error) { results.push({ name, ok: false, error: error.stack || error.message, clients: [...frames].map(frame => ({url: frame.contentWindow?.location.href, active: frame.contentDocument?.querySelector('.view.active')?.id, coach: frame.contentDocument?.querySelector('.growth-coach')?.textContent, workshop: frame.contentDocument?.querySelector('#workshop-content')?.textContent})) }); }
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
  // Catalog smoke checks are separate from the dedicated first-use suite.
  // Exit the new guide through its real, deliberate skip controls.
  const skip = document.querySelector('[data-guided-action="skip"]');
  if (skip && skip.getClientRects().length) {
    skip.click();
    await until(() => document.querySelector('[data-guided-action="confirm-skip"]'), 'guided skip confirmation');
    document.querySelector('[data-guided-action="confirm-skip"]').click();
    await until(() => !document.querySelector('.guided-coach'), 'guided skip persisted');
  }
  const debut = await frame.contentWindow.eval('import(' + JSON.stringify(new URL('src/poolDebutService.js', frame.contentWindow.location.href).href) + ')');
  const needsDebut = item.expected.firstPool && !await debut.hasSeenPoolDebut(item.expected.firstPool.id);
  document.querySelector('[data-view="gacha"]').click();
  await until(() => document.getElementById('view-gacha').classList.contains('active'), 'gacha view');
  const encounter = document.querySelector('#view-gacha .identity-surface');
  if (encounter && needsDebut) {
    await until(() => document.querySelector('.dream-debut-overlay [data-role="skip"]'), 'complete pool debut');
    document.querySelector('.dream-debut-overlay [data-role="skip"]').click();
    await until(() => !document.querySelector('.dream-debut-overlay'), 'debut closes before reading rules');
  }
  if (item.expected.firstPool) {
    if (encounter) {
      assert(encounter.querySelector('.sanctuary-heading h2').textContent === item.expected.firstPool.name, 'Wrong visible native pool');
      assert(encounter.querySelector('[data-identity-action="summon"] small').textContent.includes(String(item.expected.firstPool.cost)), 'Wrong visible single price');
      assert(encounter.querySelector('[data-identity-action="summon-ten"] small').textContent.includes(String(item.expected.firstPool.cost * 10)), 'Wrong visible ten price');
      encounter.querySelector('[data-identity-action="probability"]').click();
      assert(document.querySelector('#identity-detail-dialog .rate-table tbody').children.length === 5, 'Visible rarity rules missing');
      document.querySelector('#identity-detail-dialog [data-identity-action="close-dialog"]').click();
    } else {
      assert(document.getElementById('gacha-pool-name').textContent === item.expected.firstPool.name, 'Wrong pool displayed by actual runtime');
      assert(document.getElementById('gacha-cost').textContent === String(item.expected.firstPool.cost), 'Wrong single-draw price');
      assert(document.getElementById('gacha-ten-cost').textContent === String(item.expected.firstPool.cost * 10), 'Wrong ten-draw price');
      assert(document.getElementById('gacha-rates').children.length === 5, 'Rarity rates not rendered');
    }
  } else {
    assert(document.getElementById('btn-pull').disabled && document.getElementById('btn-pull-ten').disabled, 'All-inactive artifact allows a draw');
  }
  document.querySelector('[data-view="collection"]').click();
  if (encounter) {
    await until(() => document.querySelector('#identity-collection-results .collection-card'), 'visible native collection');
    assert(Number(document.querySelector('#view-collection .collection-progress progress').max) === item.expected.petCount, 'Visible collection misses bundle pets');
  } else {
    await until(() => document.getElementById('collection-grid').children.length > 0, 'collection view');
    assert(document.getElementById('collection-count').textContent.endsWith(`/${item.expected.petCount}`), 'Collection does not use the complete bundle');
  }
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
  const companionResponse = await fetch(configuration.profiles.preview.profile.scopePath + 'release-input/ecosystem.json');
  if (previewFrame.contentDocument.querySelector('.identity-surface')) await test('player previews stay monochrome until the actual awakening ritual reveals color', async () => {
    assert(storageOwnershipEstablished, 'Fixture writes require an owned loopback origin');
    const load = (name) => previewFrame.contentWindow.eval('import(' + JSON.stringify(new URL(`src/${name}.js`, previewFrame.contentWindow.location.href).href) + ')');
    let db = await load('db');
    let document = previewFrame.contentDocument;
    const reloadPreview = async (query) => {
      const loaded = new Promise((resolve) => previewFrame.addEventListener('load', resolve, { once:true }));
      previewFrame.src = configuration.profiles.preview.profile.scopePath + query;
      await loaded;
      await waitForStarted(previewFrame, 'preview');
      db = await load('db');
      document = previewFrame.contentDocument;
    };
    document.querySelector('[data-onboarding-action="skip"]')?.click();
    document.querySelector('[data-view="gacha"]').click();
    // Entering an already-seen pool still checks its receipt asynchronously.
    // Wait for that check before simulating a user's next pool selection.
    await delay(120);
    for (const poolId of ['swordwild_shanhe_v3', 'eternal_slumber_bloom', 'standard']) {
      const selector = document.querySelector('#identity-pool-select-pool');
      selector.value = poolId;
      selector.dispatchEvent(new previewFrame.contentWindow.Event('change', { bubbles: true }));
      await until(() => document.querySelector('.dream-debut-overlay'), `normal full entry on change to ${poolId}`);
      document.querySelector('.dream-debut-overlay [data-role="skip"]').click();
      await until(() => !document.querySelector('.dream-debut-overlay') && document.querySelector('#identity-pool-select-pool')?.value === poolId, 'entry complete');
      await until(async () => (await db.dbGet(db.STORES.META, 'poolDebutSeen'))?.seenPoolIds?.includes(poolId), 'entry receipt committed before next change');
      await delay(50);
      assert(!document.querySelector('[data-identity-action="replay-debut"], [data-identity-action="preview-awakening"], [data-identity-action="replay-awakening"]'), 'Player pool still exposes a test replay');
    }
    const snapshot = async () => JSON.stringify([await db.dbGet(db.STORES.META, 'wallet'), await db.dbGetAll(db.STORES.COLLECTION), await db.dbGet(db.STORES.META, 'petAwakening'), await db.dbGet(db.STORES.META, 'inventory')]);
    const before = await snapshot();
    document.querySelector('[data-view="collection"]').click();
    const inspectPreview = async (petId, expectedFilter) => {
      await until(() => document.querySelector(`[data-pet="${petId}"]`), 'visible collection preview');
      document.querySelector(`[data-pet="${petId}"]`).click();
      document.querySelector('#identity-detail-dialog [data-form="awakened"]').click();
      await until(() => document.querySelector('#identity-detail-dialog .detail-art')?.complete && document.querySelector('#identity-detail-dialog .detail-art')?.naturalWidth > 0, 'awakening portrait loaded');
      const artwork = document.querySelector('#identity-detail-dialog .detail-art');
      assert(previewFrame.contentWindow.getComputedStyle(artwork).filter === expectedFilter, 'Wrong locked/unlocked portrait color');
      assert(!document.querySelector('[data-identity-action="pet-awakening-preview"], .awakening-scene'), 'Static preview exposed the awakening performance');
      document.querySelector('#identity-detail-dialog [data-form="initial"]').click();
      assert(previewFrame.contentWindow.getComputedStyle(document.querySelector('#identity-detail-dialog .detail-art')).filter === 'none', 'Initial form stayed monochrome');
      document.querySelector('#identity-detail-dialog [data-identity-action="close-dialog"]').click();
    };
    await inspectPreview('pet_ur16', 'grayscale(1)');
    await inspectPreview('pet_ur17', 'grayscale(1)');
    assert(await snapshot() === before, 'Static previews changed ownership, wallet, awakening state or inventory');
    const [core, collection, bond] = await Promise.all(['petAwakeningCore', 'collectionService', 'bondJourneyCore'].map(load));
    const at = new Date(Date.now() - 3600000).toISOString();
    const later = new Date(Date.now() - 1800000).toISOString();
    const petId = 'pet_ur17';
    const progress = core.advancePetAwakening(core.beginPetAwakening(null, petId, at), [
      ...[0, 1, 2].map((index) => ({ key:`task:preview-ritual-${index}`, at:later })),
      { key:'expedition:preview-ritual', at:later, startedAt:at, areaId:'cloudrest_trail', petIds:[petId] },
    ]);
    assert(core.validatePetAwakening(progress).length === 0, 'Invalid owned ritual fixture');
    const journey = bond.createBondJourney();
    journey.byPet[petId] = { chapters: Object.fromEntries([2, 3, 4, 5].map(level => [level, { choiceId:'gentle', readAt:at, completedAt:at, claimedAt:at }])) };
    assert(bond.validateBondJourney(journey).length === 0, 'Valid sequential story fixture required');
    await db.dbPut(db.STORES.COLLECTION, collection.normalizeCollectionItem({ ...collection.createCollectionEntry(petId,at), bondExp:500, bondLevel:5 }));
    await db.dbPut(db.STORES.META, progress);
    await db.dbPut(db.STORES.META, journey);
    const inventory = await db.dbGet(db.STORES.META, 'inventory');
    await db.dbPut(db.STORES.META, { ...inventory, key:'inventory', items:{ ...inventory?.items, item_pine_trail_riceball:1 } });
    await reloadPreview('?player-preview-ritual=1');
    document.querySelector('[data-view="collection"]').click();
    await inspectPreview(petId, 'grayscale(1)');
    document.querySelector(`[data-pet="${petId}"]`).click();
    document.querySelector('[data-identity-action="app-pet-detail"]').click();
    await until(() => document.querySelector(`[data-awake-open="${petId}"]`), 'native awakening entry');
    document.querySelector(`[data-awake-open="${petId}"]`).click();
    await until(() => document.querySelector('[data-awake-action="awaken"]'), 'native ready ritual');
    assert(!document.querySelector('[data-awake-action="replay"]'), 'Unawakened player can replay the ritual');
    const wallet = JSON.stringify(await db.dbGet(db.STORES.META, 'wallet'));
    const ownership = JSON.stringify(await db.dbGetAll(db.STORES.COLLECTION));
    document.querySelector('[data-awake-action="awaken"]').click();
    await until(() => document.querySelector('.awakening-scene .awakening-after'), 'actual ritual performance retained');
    assert(document.querySelector('.awakening-after').getAttribute('src').includes('pet_ur17-awakened-'), 'Ritual did not reveal the real awakened artwork');
    document.querySelector('.awakening-scene__skip').click();
    await until(() => !document.querySelector('.awakening-scene') && document.querySelector('.awakening-reader')?.textContent.includes('已覺醒'), 'ritual completes and refreshes native state');
    assert((await db.dbGet(db.STORES.META, 'inventory')).items.item_pine_trail_riceball === 0, 'Ritual must spend exactly one food');
    assert((await db.dbGet(db.STORES.META, 'petAwakening')).byPet[petId].awakenedAt, 'Actual ritual progress not persisted');
    assert(JSON.stringify(await db.dbGet(db.STORES.META, 'wallet')) === wallet && JSON.stringify(await db.dbGetAll(db.STORES.COLLECTION)) === ownership, 'Ritual unexpectedly changed wallet or collection');
    document.querySelector('[data-awake-action="close"]').click();
    await inspectPreview(petId, 'none');
    await reloadPreview('?player-preview-persisted=1');
    document.querySelector('[data-view="collection"]').click();
    await inspectPreview(petId, 'none');
    observations.playerPreview = { testReplaysRemoved:true, normalPoolEntriesPreserved:3, unownedFormsMonochrome:true, ownedUnawakenedMonochrome:true, previewWrites:false, actualRitualPreserved:true, foodSpent:1, awakenedColorSurvivesReload:true };
  });
  await test('retired saved pool selection uses the active fallback without resetting player data', async () => {
    assert(storageOwnershipEstablished, 'Fixture writes require an owned loopback origin');
    const client = previewFrame.contentWindow;
    const db = await client.eval('import(' + JSON.stringify(new URL('src/db.js', client.location.href).href) + ')');
    const beforeWallet = JSON.stringify(await db.dbGet(db.STORES.META, 'wallet'));
    const beforeCollection = JSON.stringify(await db.dbGetAll(db.STORES.COLLECTION));
    const stats = await db.dbGet(db.STORES.META, 'gachaStats');
    await db.dbPut(db.STORES.META, { ...stats, selectedPoolId:'retired-test-pool' });
    const loaded = new Promise((resolve) => previewFrame.addEventListener('load', resolve, { once:true }));
    previewFrame.src = configuration.profiles.preview.profile.scopePath + '?retired-pool-fixture=1';
    await loaded;
    await waitForStarted(previewFrame,'preview');
    await checkCatalogAndUi(previewFrame,'preview');
    const freshClient = previewFrame.contentWindow;
    const freshDb = await freshClient.eval('import(' + JSON.stringify(new URL('src/db.js', freshClient.location.href).href) + ')');
    assert(JSON.stringify(await freshDb.dbGet(freshDb.STORES.META,'wallet')) === beforeWallet, 'Fallback changed wallet');
    assert(JSON.stringify(await freshDb.dbGetAll(freshDb.STORES.COLLECTION)) === beforeCollection, 'Fallback changed collection');
  });
  if (previewFrame.contentDocument.querySelector('.identity-surface')) await test('native ten-pull SR floor spends once and the summon wallet survives return and reload', async () => {
    assert(storageOwnershipEstablished, 'Fixture writes require an owned loopback origin');
    let client = previewFrame.contentWindow;
    const load = (name) => client.eval('import(' + JSON.stringify(new URL(`src/${name}.js`, client.location.href).href) + ')');
    let [db, collection, filter] = await Promise.all(['db', 'collectionService', 'petPoolFilter'].map(load));
    const bundle = await client.fetch(configuration.profiles.preview.profile.contentBundleUrl).then((response) => response.json());
    const selected = bundle.poolsData.pools.find((pool) => pool.id === 'standard');
    assert(bundle.poolsData.pools.every((pool) => pool.tenPullGuarantee === 'SR'), 'Not every pool has the SR floor');
    const eligible = filter.getEligiblePetsForPool(bundle.petsData.pets, selected);
    const [normal, rare] = ['N', 'SR'].map((rarity) => eligible.find((pet) => pet.rarity === rarity));
    const at = new Date().toISOString();
    for (const pet of [normal, rare]) await db.dbPut(db.STORES.COLLECTION, collection.normalizeCollectionItem({ ...collection.createCollectionEntry(pet.id,at), legacySpecialtyFloor:5 }));
    const wallet = await db.dbGet(db.STORES.META, 'wallet');
    await db.dbPut(db.STORES.META,{ key:'encounterEconomy', schemaVersion:1, migrationVersion:1, balance:20, migrationReceipt:null });
    await db.dbPut(db.STORES.META, { ...wallet, key:'wallet', stardust:10000 });
    const stats = await db.dbGet(db.STORES.META, 'gachaStats');
    await db.dbPut(db.STORES.META, { ...stats, selectedPoolId:'standard', ssrPity:0, urPity:0,
      poolPity:{ ...stats.poolPity, standard:{ ssrPity:0, urPity:0 } } });
    const pullsBefore = stats.totalPulls;
    const reload = async (query) => {
      const loaded = new Promise((resolve) => previewFrame.addEventListener('load', resolve, { once:true }));
      previewFrame.src = configuration.profiles.preview.profile.scopePath + query;
      await loaded;
      await waitForStarted(previewFrame, 'preview');
      client = previewFrame.contentWindow;
      db = await load('db');
      previewFrame.contentDocument.querySelector('[data-onboarding-action="skip"]')?.click();
      previewFrame.contentDocument.querySelector('[data-view="gacha"]').click();
      await delay(120);
    };
    await reload('?ten-floor-wallet=1');
    let document = previewFrame.contentDocument;
    assert(document.querySelector('.summon-wallet strong')?.textContent === '10,000', 'Summon wallet did not load the real balance');
    document.querySelector('[data-identity-action="probability"]').click();
    const rules = document.querySelector('#identity-detail-dialog').textContent;
    assert(rules.includes('十連相遇至少獲得一位 SR') && rules.includes('相遇會扣除實際星塵') && !rules.includes('固定展示結果'), 'Actual probability and cost disclosure is stale');
    document.querySelector('#identity-detail-dialog [data-identity-action="close-dialog"]').click();
    const random = client.Math.random;
    try {
      client.Math.random = () => 0;
      const draw = document.querySelector('[data-identity-action="summon-ten"]');
      assert(!draw.disabled, 'Seeded ten-pull is disabled');
      draw.click();
      await until(async () => (await db.dbGet(db.STORES.META, 'wallet')).stardust === 9000, 'native ten atomic transaction', 12000);
    } finally { client.Math.random = random; }
    await until(() => document.querySelectorAll('.batch-grid .batch-card').length === 10, 'complete native ten summary', 15000);
    const rarities = [...document.querySelectorAll('.batch-grid .rarity')].map((node) => node.textContent);
    assert(JSON.stringify(rarities) === JSON.stringify([...Array(9).fill('N'), 'SR']), 'Native ten did not apply the final SR floor');
    assert((await db.dbGet(db.STORES.META,'encounterEconomy')).balance === 34, 'Nine N + one SR must add 14 shared fragments once');
    assert(!(await db.dbGet(db.STORES.COLLECTION, rare.id)).fragments, 'Per-character fragments remain retired');
    document.querySelector('[data-identity-action="close-reveal"]').click();
    await until(() => document.querySelector('.summon-wallet strong')?.textContent === '9,000', 'live wallet after return');
    assert((await db.dbGet(db.STORES.META, 'gachaStats')).totalPulls === pullsBefore + 10, 'Results were applied more than once');
    await reload('?ten-floor-wallet-persisted=1');
    document = previewFrame.contentDocument;
    assert(document.querySelector('.summon-wallet strong')?.textContent === '9,000', 'Summon wallet lost its balance after reload');
    observations.tenFloorWallet = { poolCount:bundle.poolsData.pools.length, realNativeTransaction:true, results:rarities,
      balanceBefore:10000, balanceAfter:9000, duplicateFragments:[9,5], walletSurvivesReload:true, drawsAppliedOnce:true };
  });
  if (previewFrame.contentDocument.querySelector('.summon-wallet')) await test('summon wallet fits three themes, mobile widths and simulated 200% text without changing the save', async () => {
    const before = await previewTransactionSnapshot();
    const client = previewFrame.contentWindow;
    const document = previewFrame.contentDocument;
    const ui = await client.eval('import(' + JSON.stringify(new URL('src/ui.js', client.location.href).href) + ')');
    const originalFrame = previewFrame.style.cssText;
    const originalFont = document.documentElement.style.fontSize;
    const originalTheme = document.body.dataset.theme;
    const checks = [];
    try {
      for (const theme of ['default', 'sweet', 'twilight']) {
        await ui.applyTheme(theme, { silent:true, skipSave:true });
        for (const width of [320, 393]) for (const fontPercent of [100, 200]) {
          previewFrame.style.width = width + 'px';
          previewFrame.style.height = '852px';
          document.documentElement.style.fontSize = fontPercent === 200 ? '32px' : '16px';
          await delay(50);
          const chip = document.querySelector('.summon-wallet');
          const rect = chip.getBoundingClientRect();
          const heading = chip.parentElement.getBoundingClientRect();
          assert(rect.left >= 0 && rect.right <= client.innerWidth + 1, 'Wallet escaped the viewport');
          assert(rect.left >= heading.left - 1 && rect.right <= heading.right + 1, 'Wallet escaped the pool heading');
          assert(document.documentElement.scrollWidth <= client.innerWidth + 1, 'Summon page horizontally overflows');
          assert(chip.textContent.includes('9,000'), 'Responsive view changed the actual balance');
          checks.push({ theme, width, height:852, fontPercent, walletWidth:rect.width, horizontalOverflow:false });
        }
      }
    } finally {
      previewFrame.style.cssText = originalFrame;
      document.documentElement.style.fontSize = originalFont;
      await ui.applyTheme(originalTheme, { silent:true, skipSave:true });
    }
    assert(await previewTransactionSnapshot() === before, 'Responsive checks changed persistent state');
    observations.summonWalletResponsive = { checks, simulatedTextSize:true, persistedStateUnchanged:true };
  });
  if (companionResponse.ok) await test('SOP companion content drives actual crafting, favorite gifting and dispatch specialty in an isolated app', async () => {
    assert(storageOwnershipEstablished, 'Fixture writes require a fresh owned origin');
    const e = await companionResponse.json();
    const client = previewFrame.contentWindow;
    const load = (name) => client.eval('import(' + JSON.stringify(new URL(`src/${name}.js`, client.location.href).href) + ')');
    let [workshop, collection, db, ui, gameplay] = await Promise.all(['workshopService', 'collectionService', 'db', 'ui', 'expeditionGameplay'].map(load));
    const bundle = await client.fetch(configuration.profiles.preview.profile.contentBundleUrl).then((r) => r.json());
    const partner = bundle.petsData.pets.find((p) => e.affinities[p.id]?.some((tag) => e.food.favoriteTags.includes(tag)));
    assert(partner, 'Companion food has no actual recipient');
    assert(gameplay.getPetSpecialty(partner).role === e.specialties[partner.id].role, 'Actual dispatch specialty differs from authoring');
    await collection.addPetToCollection(partner.id);
    const wallet = await db.dbGet(db.STORES.META, 'wallet');
    wallet.materials = { ...(wallet.materials || {}), ...Object.fromEntries(Object.entries(e.food.recipe).map(([id, qty]) => [id, qty * 2])) };
    await db.dbPut(db.STORES.META, wallet);
    // Test seeding changes IndexedDB directly; a fresh app must load that state.
    const reloaded = new Promise((resolve) => previewFrame.addEventListener('load', resolve, { once: true }));
    previewFrame.src = configuration.profiles.preview.profile.scopePath + '?companion-fixture=1';
    await reloaded;
    await waitForStarted(previewFrame, 'preview');
    [workshop, collection, db, ui, gameplay] = await Promise.all(['workshopService', 'collectionService', 'db', 'ui', 'expeditionGameplay'].map(load));
    previewFrame.contentDocument.querySelector('[data-onboarding-action="skip"]')?.click();
    await ui.openTeachingTarget({ view: 'workshop', tab: 'craft' });
    const craftSelector = `[data-action="craft-item"][data-item-id="${e.food.id}"][data-qty="1"]`;
    await until(() => previewFrame.contentDocument.querySelector(craftSelector), 'companion food craft button');
    const craft = previewFrame.contentDocument.querySelector(craftSelector);
    assert(!craft.disabled, 'New recipe is not craftable');
    craft.click(); craft.click();
    await until(async () => (await workshop.getInventory()).items[e.food.id] === 1, 'one crafted food despite rapid clicks');
    await ui.openTeachingTarget({ view: 'workshop', tab: 'gift' });
    const giftSelector = `[data-action="select-gift-item"][data-item-id="${e.food.id}"]`;
    await until(() => previewFrame.contentDocument.querySelector(giftSelector), 'companion gift button');
    previewFrame.contentDocument.querySelector(giftSelector).click();
    const petSelector = `[data-action="select-gift-pet"][data-pet-id="${partner.id}"]`;
    await until(() => previewFrame.contentDocument.querySelector(petSelector), 'favorite partner recommendation');
    previewFrame.contentDocument.querySelector(petSelector).click();
    await until(() => previewFrame.contentDocument.querySelector('[data-action="gift-item"]'), 'gift confirmation');
    previewFrame.contentDocument.querySelector('[data-action="gift-item"]').click();
    await until(async () => (await workshop.getInventory()).items[e.food.id] === 0, 'gift consumes exactly one food');
    const progress = await collection.getPetCollection(partner.id);
    assert(progress.bondExp === 150, 'Favorite gift did not apply exactly 150 bond EXP');
    // The gift's asynchronous UI handler persists level notifications after EXP.
    // Finish that operation before checking that a new debug client is read-only.
    await until(async () => {
      const saved = await db.dbGet(db.STORES.COLLECTION, partner.id);
      return [2, 3].every((level) => saved?.bondUnlocks?.notifiedLevels?.includes(level));
    }, 'favorite gift level notifications finish before the next client boots');
    observations.companionContent = { foodId: e.food.id, petId: partner.id, specialty: e.specialties[partner.id].role,
      craftedOnce: true, favoriteBondExp: progress.bondExp, isolatedOnly: true };
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
    const after = await previewTransactionSnapshot();
    if (after !== before) observations.debugStateDifference = { before: JSON.parse(before), after: JSON.parse(after) };
    assert(after === before, 'Debug shortcut changed persistent state');
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
  await test('published fragment gift grants 50 atomically, survives reload and cannot be reclaimed', async () => {
    assert(storageOwnershipEstablished, 'Gift fixture requires owned origin');
    let client = productionFrame.contentWindow;
    const load = (name) => client.eval('import(' + JSON.stringify(new URL(`src/${name}.js`, client.location.href).href) + ')');
    let db = await load('db');
    let mailbox = await load('mailboxService');
    const payload = await client.fetch('data/global-mailbox.json').then((response) => response.json());
    const gift = mailbox.normalizeMailboxPayload(payload).messages.find((message) => message.id === '2026-10-v362-encounter-fragments-gift-01');
    assert(gift?.reward?.encounterFragments === 50 && !gift.rewardError, 'Gift schema is invalid');
    const economy = await db.dbGet(db.STORES.META,'encounterEconomy');
    const wallet = await db.dbGet(db.STORES.META,'wallet');
    await db.dbPut(db.STORES.META,{ ...economy, balance:Number.MAX_SAFE_INTEGER });
    assert(!(await mailbox.claimMailboxReward(gift)).success, 'Overflow must reject the gift');
    assert(!(await mailbox.getGlobalMailboxState()).claimedIds.includes(gift.id), 'Failed transaction marked claimed');
    await db.dbPut(db.STORES.META,economy);
    const first = await mailbox.claimMailboxReward(gift);
    assert(first.success && first.encounterEconomy.balance === economy.balance + 50, 'Gift must add exactly 50');
    assert(first.wallet.stardust === wallet.stardust, 'Gift must not alter stardust');
    assert(mailbox.formatMailboxRewardPreview(first.reward).some((line) => line.text === '相遇碎片 ×50'), 'Reward preview missing');
    productionFrame.remove(); frames.delete(productionFrame);
    productionFrame = directClient('production'); await waitForStarted(productionFrame,'production');
    client = productionFrame.contentWindow; db = await load('db'); mailbox = await load('mailboxService');
    assert((await mailbox.claimMailboxReward(gift)).alreadyClaimed, 'Reload must not regrant');
    assert((await db.dbGet(db.STORES.META,'encounterEconomy')).balance === economy.balance + 50, 'Reload changed balance');
    observations.fragmentGift = { id:gift.id, before:economy.balance, after:economy.balance+50, rollback:true, reloadIdempotent:true };
  });
  await test('both fully assembled cached apps and catalogs boot while all artifact HTTP responses are 503', async () => {
    closeClients();
    await control('production', 'all503'); await control('preview', 'all503');
    productionFrame = directClient('production'); previewFrame = directClient('preview');
    await waitForStarted(productionFrame, 'production'); await waitForStarted(previewFrame, 'preview');
    await checkCatalogAndUi(productionFrame, 'production'); await checkCatalogAndUi(previewFrame, 'preview');
  });
  await test('specified invitation commits, welcomes, sets companion and replays while every HTTP resource is 503', async () => {
    assert(storageOwnershipEstablished, 'Invitation fixture requires owned origin');
    let client = previewFrame.contentWindow;
    const load = (name) => client.eval('import(' + JSON.stringify(new URL(`src/${name}.js`, client.location.href).href) + ')');
    let db = await load('db');
    const core = await load('encounterEconomyCore');
    const bundle = await client.fetch(configuration.profiles.preview.profile.contentBundleUrl).then((response) => response.json());
    await db.dbPut(db.STORES.META,{ ...(await db.dbGet(db.STORES.META,'encounterEconomy')), balance:202 });
    await db.dbPut(db.STORES.META,{ ...(await db.dbGet(db.STORES.META,'userPreferences')), reduceMotion:true });
    previewFrame.remove(); frames.delete(previewFrame);
    previewFrame = directClient('preview'); await waitForStarted(previewFrame,'preview');
    client = previewFrame.contentWindow; db = await load('db');
    const before = await db.dbGet(db.STORES.META,'gachaStats');
    const candidate = core.invitationCandidates(bundle.petsData.pets,bundle.poolsData,await db.dbGet(db.STORES.META,'poolUnlockState'),await db.dbGetAll(db.STORES.COLLECTION)).find((row) => row.pet.rarity === 'UR' && row.available && !row.owned);
    const document = previewFrame.contentDocument;
    document.querySelector('[data-onboarding-action="skip"]')?.click();
    document.querySelector('[data-view="gacha"]').click();
    await until(() => !document.querySelector('.dream-debut-overlay'),'debut finished');
    document.querySelector('[data-identity-action="invitation"]').click();
    document.querySelector(`[data-invitation-pet="${candidate.pet.id}"]`).click();
    document.querySelector('[data-invitation-action="confirm"]').click();
    document.querySelector('[data-invitation-action="commit"]').click();
    await until(() => document.querySelector('[data-invitation-action="companion"]'),'offline welcome');
    assert((await db.dbGet(db.STORES.META,'encounterEconomy')).balance === 2,'Offline invitation charge mismatch');
    assert(JSON.stringify(before) === JSON.stringify(await db.dbGet(db.STORES.META,'gachaStats')),'Invitation changed pity');
    document.querySelector('[data-invitation-action="companion"]').click();
    await until(async () => (await db.dbGet(db.STORES.COLLECTION,candidate.pet.id))?.isCompanion,'offline companion selection');
    await until(() => document.querySelector('[data-invitation-action="companion"]')?.textContent.includes('正在與你同行'),'companion presentation settled');
    document.querySelector('[data-invitation-action="replay"]').click();
    assert((await db.dbGet(db.STORES.META,'encounterEconomy')).balance === 2,'Replay charged again');
    document.querySelector('[data-invitation-action="close"]').click();
    observations.offlineInvitation = { petId:candidate.pet.id, before:202, after:2, replay:2, companion:true, controller:client.navigator.serviceWorker.controller.scriptURL };
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
    await until(() => document.querySelector('.growth-coach[data-step="craft"]') && document.getElementById('view-workshop').classList.contains('active') && document.querySelector('[data-action="craft-item"]'), 'craft step persisted at actual recipe');
    productionFrame.remove(); frames.delete(productionFrame);
    productionFrame = directClient('production');
    await waitForStarted(productionFrame, 'production');
    document = productionFrame.contentDocument;
    await until(() => document.querySelector('.growth-coach[data-step="craft"]') && document.getElementById('view-workshop').classList.contains('active') && document.querySelector('[data-action="craft-item"]'), 'offline chapter resumes at actual recipe');
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
