/** Actual UI draw acceptance. Only this tab's UUID database may be opened or deleted. */
const output = document.getElementById('test-results');
const results = [];
const databaseName = `QuestNoteTest-SummonDraw-${crypto.randomUUID()}`;
const originalRandom = Math.random;
const nativeOpen = indexedDB.open.bind(indexedDB);
const nativeDelete = indexedDB.deleteDatabase.bind(indexedDB);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const node = (id) => document.getElementById(id);
let db;
let ui;
let opened = false;
let serverInstance;
async function waitFor(check, description, timeout = 7000) {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) { if (await check()) return; await delay(20); }
  throw new Error(`Timed out: ${description}`);
}
async function test(name, run) {
  try { await run(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.stack || error.message }); throw error; }
  finally { output.textContent = JSON.stringify(results, null, 2); }
}
async function settlePull() {
  // A confirmation dismissal may first restore its result. Closing again finishes that result.
  for (let attempt = 0; attempt < 3; attempt++) {
    ui?.closeModal();
    await delay(30);
  }
  await waitFor(() => !node('btn-pull')?.dataset.pulling && !node('btn-pull-ten')?.dataset.pulling, 'draw finally cleanup');
}
try {
  assert(['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname), 'Localhost only');
  const response = await fetch('/__ui-polish_test_guard__', { cache: 'no-store' });
  assert(response.ok, 'Dedicated ui-polish server marker missing');
  const guard = await response.json();
  assert(guard.purpose === 'questnote-ui-polish-synthetic-only' && guard.instance, 'Wrong server marker');
  serverInstance = guard.instance;
  assert(!navigator.serviceWorker?.controller && !(await navigator.serviceWorker?.getRegistrations())?.length, 'Fresh origin without service workers required');
  if (indexedDB.databases) {
    assert(!(await indexedDB.databases()).some((entry) => ['QuestNoteDB', 'QuestNotePreviewDB'].includes(entry.name)), 'Product database exists on this origin; use a fresh server port');
  }
  indexedDB.open = (name, version) => {
    assert(['QuestNoteDB', 'QuestNotePreviewDB'].includes(name), `Unexpected database request: ${name}`);
    opened = true;
    return nativeOpen(databaseName, version);
  };
  const [storage, contract, fixtureModule, html, petsData] = await Promise.all([
    import('../src/db.js'), import('../src/poolContentContract.js'), import('./fixtures/pool-content-fixtures.mjs'),
    fetch('index.html', { cache: 'no-store' }).then((result) => result.text()),
    fetch('data/pets.json', { cache: 'no-store' }).then((result) => result.json()),
  ]);
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.querySelectorAll('script, #app-loader').forEach((element) => element.remove());
  const styles = [...parsed.querySelectorAll('link[rel="stylesheet"]')];
  await Promise.all(styles.map((source) => new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = source.getAttribute('href');
    link.onload = resolve; link.onerror = () => reject(new Error(`Stylesheet failed: ${link.href}`));
    document.head.append(link);
  })));
  assert(styles.length > 0, 'Actual index styles missing');
  document.getElementById('app-fixture').append(...parsed.body.childNodes);
  const fixture = fixtureModule.createPoolContentFixtures();
  const pool = fixture.beta;
  const expansion = contract.normalizeUnlockExpansion(pool);
  // Real images avoid irrelevant missing-fixture asset errors; identities remain synthetic.
  const allPets = fixture.pets.map((pet) => ({ ...petsData.pets.find((item) => item.rarity === pet.rarity), ...pet }));
  const state = {
    allPets, poolsData: { schemaVersion: 1, pools: [pool] }, tasks: [], habits: [], categories: [],
    enrichedCollection: [], todayCompleted: 0, achievementSummary: {}, habitSummary: {}, questSummary: null,
    dailyCheckIn: null, inventory: null, companion: null,
    wallet: { key: 'wallet', stardust: 2000, adventureEnergy: 0 },
    gachaStats: { key: 'gachaStats', selectedPoolId: pool.id },
    poolUnlockState: { key: 'poolUnlockState', schemaVersion: 1, byPool: {} },
    userPreferences: { reduceMotion: true, theme: 'default' },
  };
  db = await storage.openDB();
  assert(db.name === databaseName, 'UUID database isolation failed');
  ui = await import('../src/ui.js');
  ui.initUI(state, async () => {
    state.wallet = await storage.dbGet(storage.STORES.META, 'wallet') || state.wallet;
    state.gachaStats = await storage.dbGet(storage.STORES.META, 'gachaStats') || state.gachaStats;
    state.poolUnlockState = await storage.dbGet(storage.STORES.META, 'poolUnlockState') || state.poolUnlockState;
    ui.renderView('gacha');
  }, async () => ({ newlyUnlocked: [], newTitles: [] }));
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === 'view-gacha'));
  document.body.classList.add('reduce-motion');
  const snapshot = async () => JSON.stringify(await storage.readAllStoresSnapshot());
  Math.random = () => 0.2;
  for (const theme of ['default', 'sweet']) {
    await settlePull();
    // Clear only this generated tenant's fixture data between themes, never another database.
    for (const store of Object.values(storage.STORES)) await storage.dbClear(store);
    state.userPreferences.theme = theme;
    document.body.dataset.theme = theme;
    state.wallet = { key: 'wallet', stardust: 2000, adventureEnergy: 0 };
    state.gachaStats = { key: 'gachaStats', selectedPoolId: pool.id };
    const entry = { poolId: pool.id, schemaVersion: 1, lifetimeDraws: expansion.threshold,
      unlocked: true, rewardClaimed: true, animationSeen: true };
    state.poolUnlockState = { key: 'poolUnlockState', schemaVersion: 1, byPool: { [pool.id]: entry } };
    for (const record of [state.wallet, state.gachaStats, state.poolUnlockState,
      { key: 'poolDebutSeen', seenPoolIds: [pool.id] },
      { key: 'idempotentGrants', claimedIds: [contract.resolveUnlockGrantId(pool.id, expansion)] }]) {
      await storage.dbPut(storage.STORES.META, record);
    }
    await storage.dbPut(storage.STORES.COLLECTION, { petId: expansion.rewardPetId,
      stars: 1, fragments: 0, bondExp: 0, bondLevel: 1, isCompanion: false });
    ui.renderView('gacha');
    const prefix = `${theme}: `;
    await test(prefix + 'rapid single click charges exactly 75 once', async () => {
      const previousResult = node('modal-body').firstElementChild;
      node('btn-pull').click(); node('btn-pull').click();
      await waitFor(() => node('modal-overlay').classList.contains('open')
        && node('modal-body').firstElementChild !== previousResult
        && document.querySelector(`.${theme}-summon-result--single [data-action="result-ten-pull"]`), 'fresh open single result');
      assert(state.wallet.stardust === 1925 && state.gachaStats.totalPulls === 1,
        `Rapid click totals incorrect: stardust=${state.wallet.stardust}, totalPulls=${state.gachaStats.totalPulls}`);
      assert(document.querySelector(`.${theme}-summon-result--single`), 'Wrong theme result');
      const pet = await storage.dbGet(storage.STORES.COLLECTION, 'pet_n910');
      assert(pet && pet.fragments === 0, 'First N draw or duplicate compensation incorrect');
    });
    const body = node('modal-body');
    const originalNodes = [...body.childNodes];
    const originalHtml = body.innerHTML;
    const unchanged = await snapshot();
    const assertRestored = async () => {
      assert(node('modal-overlay').classList.contains('open'), 'Result closed instead of restored');
      assert(originalNodes.length === body.childNodes.length && originalNodes.every((element, index) => element === body.childNodes[index]), 'Original result DOM identity lost');
      assert(body.innerHTML === originalHtml, 'Result content changed');
      assert(await snapshot() === unchanged, 'Dismissal changed persisted state');
      assert(document.activeElement === body.querySelector('[data-action="result-ten-pull"]'), 'Result trigger focus not restored');
    };
    const confirm = () => {
      body.querySelector('[data-action="result-ten-pull"]').click();
      assert(node('ten-pull-confirm-text')?.textContent.includes('750'), 'Actual pool price not quoted');
    };
    for (const dismissal of ['Cancel', 'Escape', 'close', 'backdrop']) {
      await test(prefix + `${dismissal} restores exact result and state`, async () => {
        confirm();
        if (dismissal === 'Cancel') node('ten-pull-confirm-cancel').click();
        if (dismissal === 'Escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        if (dismissal === 'close') node('modal-close').click();
        if (dismissal === 'backdrop') node('modal-overlay').click();
        await assertRestored();
      });
    }
    await test(prefix + 'same-pool price change aborts quoted ten pull', async () => {
      confirm();
      pool.cost = 80;
      try { node('ten-pull-confirm-ok').click(); await assertRestored(); }
      finally { pool.cost = 75; }
    });
    await test(prefix + 'confirmed ten draws charge 750 and compensate ten N duplicates', async () => {
      const previousResult = node('modal-body').firstElementChild;
      confirm(); node('ten-pull-confirm-ok').click();
      await waitFor(() => node('modal-overlay').classList.contains('open')
        && node('modal-body').firstElementChild !== previousResult
        && document.querySelector(`.${theme}-summon-result--ten`), 'fresh open ten result');
      assert(document.querySelectorAll(`.${theme}-summon-grid-card`).length === 10, 'Ten result card count incorrect');
      assert(state.wallet.stardust === 1175, `Ten cost is not 750 or an unexpected refund occurred: stardust=${state.wallet.stardust}`);
      assert(state.gachaStats.totalPulls === 11 && state.gachaStats.tenPullCount === 1,
        `Draw counters incorrect: totalPulls=${state.gachaStats.totalPulls}, tenPullCount=${state.gachaStats.tenPullCount}`);
      assert((await storage.dbGet(storage.STORES.COLLECTION, 'pet_n910')).fragments === 10, 'Duplicate N compensation must total ten fragments');
      const collection = await storage.dbGetAll(storage.STORES.COLLECTION);
      assert(collection.length === 2 && collection.find((pet) => pet.petId === expansion.rewardPetId)?.fragments === 0, 'Unexpected grant or collection mutation');
      assert(state.poolUnlockState.byPool[pool.id].lifetimeDraws === expansion.threshold + 11, 'Lifetime draw progress incorrect');
    });
    await test(prefix + 'closing result releases pull locks without further writes', async () => {
      const before = await snapshot();
      node('ten-pull-close').click();
      await settlePull();
      assert(!node('modal-overlay').classList.contains('open') && !node('btn-pull').disabled && !node('gacha-pool-select').disabled, 'Modal or draw lock leaked');
      assert(await snapshot() === before, 'Result close changed product data');
    });
  }
} catch (error) {
  if (!results.some((result) => !result.ok)) results.push({ name: 'harness setup', ok: false, error: error.stack || error.message });
} finally {
  try { if (ui) await settlePull(); }
  catch (error) { results.push({ name: 'pull cleanup', ok: false, error: error.message }); }
  Math.random = originalRandom;
  db?.close();
  if (opened) await new Promise((resolve) => {
    const request = nativeDelete(databaseName);
    request.onsuccess = resolve;
    request.onerror = request.onblocked = () => {
      results.push({ name: 'database cleanup', ok: false, error: request.error?.message || 'Test cleanup blocked' }); resolve();
    };
  });
  indexedDB.open = nativeOpen;
  const passed = results.filter((result) => result.ok).length;
  const failed = results.filter((result) => !result.ok).length;
  output.textContent = JSON.stringify({ expected: 16, passed, failed, complete: passed === 16 && failed === 0, databaseName, serverInstance, results }, null, 2);
  document.title = passed === 16 && failed === 0 ? 'PASS — summon polish draws' : 'FAIL — summon polish draws';
}
