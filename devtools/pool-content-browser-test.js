// This tab can open only its generated database, never a user's QuestNote database.
const databaseName = `QuestNoteTest-M4-${crypto.randomUUID()}`;
const nativeOpen = indexedDB.open.bind(indexedDB);
indexedDB.open = (name, version) => {
  if (!['QuestNoteDB', 'QuestNotePreviewDB'].includes(name)) throw new Error('Unexpected database request');
  return nativeOpen(databaseName, version);
};
const output = document.getElementById('test-results');
const results = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(check, description, timeout = 4500) {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) { if (await check()) return; await delay(20); }
  throw new Error(`Timed out: ${description}`);
}
async function test(name, run) {
  try { await run(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.stack || error.message }); }
  output.textContent = JSON.stringify(results, null, 2);
}
let db;
try {
  assert(!navigator.serviceWorker?.controller, 'Use a fresh localhost port without a controlling service worker');
  const storage = await import('../src/db.js');
  const contract = await import('../src/poolContentContract.js');
  const { createPoolContentFixtures } = await import('./fixtures/pool-content-fixtures.mjs');
  const [catalog, petsData, html] = await Promise.all([
    fetch('data/pools.json').then((response) => response.json()),
    fetch('data/pets.json').then((response) => response.json()),
    fetch('index.html').then((response) => response.text()),
  ]);
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.querySelectorAll('script, #app-loader').forEach((node) => node.remove());
  document.getElementById('app-fixture').append(...parsed.body.childNodes);
  const fixture = createPoolContentFixtures();
  const glacier = { ...structuredClone(fixture.alpha), id: 'fixture_glacier', name: 'Glacier test', unlockExpansion: null,
    presentation: { ...structuredClone(fixture.alpha.presentation), themeKey: 'glacier_arrival', animationKey: 'glacier_arrival',
      debutLabel: '冰河測試', debutLines: ['冰壁', '誓火', '抵達'] } };
  const allPets = [...petsData.pets, ...fixture.pets];
  const poolsData = { schemaVersion: 1, pools: [...catalog.pools, ...fixture.catalog.pools, glacier] };
  const state = {
    allPets, poolsData, tasks: [], habits: [], categories: [], enrichedCollection: [],
    todayCompleted: 0, achievementSummary: {}, habitSummary: {}, questSummary: null,
    wallet: { key: 'wallet', stardust: 750, adventureEnergy: 0 },
    gachaStats: { key: 'gachaStats', selectedPoolId: 'fixture_beta' },
    poolUnlockState: { key: 'poolUnlockState', byPool: {} },
    userPreferences: { reduceMotion: true, theme: 'default' },
    dailyCheckIn: null, inventory: null, companion: null,
  };
  db = await storage.openDB();
  assert(db.name === databaseName, 'Database isolation failed');
  await storage.dbPut(storage.STORES.META, state.wallet);
  const ui = await import('../src/ui.js');
  ui.initUI(state, async () => {
    state.wallet = await storage.dbGet(storage.STORES.META, 'wallet') || state.wallet;
    state.gachaStats = await storage.dbGet(storage.STORES.META, 'gachaStats') || state.gachaStats;
    ui.renderView('gacha');
  }, async () => {});
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === 'view-gacha'));
  const choose = (id) => { state.gachaStats.selectedPoolId = id; ui.renderView('gacha'); };

  await test('unthemed pool renders independent unlock panel with selected-pool prices', async () => {
    choose('fixture_beta');
    const panel = document.getElementById('gacha-awakening-panel');
    assert(!panel.hidden && !panel.closest('#gacha-theme-stage'), 'Unlock is still coupled to hidden theme');
    assert(getComputedStyle(panel).display !== 'none', 'Unlock panel is not visible');
    assert(document.getElementById('gacha-theme-stage').hidden, 'Unthemed stage unexpectedly shown');
    assert(document.getElementById('gacha-ten-cost').textContent === '750', 'Ten-pull price is not 750');
    assert(!document.getElementById('btn-pull-ten').disabled, '750 should afford ten pulls');
    assert(document.getElementById('gacha-awakening-desc').textContent.includes('fixture_beta reward'), 'Wrong gift copy');
    state.wallet.stardust = 749;
    ui.updateGachaAffordability();
    assert(document.getElementById('btn-pull-ten').disabled, '749 should not afford ten pulls');
    assert(document.getElementById('gacha-hint-ten').textContent.includes('750'), 'Stale hardcoded 1000 hint');
    state.wallet.stardust = 750;
  });

  await test('legacy locked and awakened presentation retains exact content and CSS identity', async () => {
    choose('eternal_slumber_bloom');
    assert(document.getElementById('gacha-panel').dataset.poolTheme === 'eternal_slumber_bloom', 'Legacy CSS theme changed');
    assert(document.getElementById('gacha-awakening-desc').textContent === '完成 20 次永眠花海召喚，解鎖 4 位晨醒角色，並固定獲得曉露花蝟。', 'Legacy locked copy changed');
    state.poolUnlockState.byPool.eternal_slumber_bloom = { lifetimeDraws: 20, unlocked: true, rewardClaimed: true, animationSeen: true };
    ui.renderView('gacha');
    assert(document.getElementById('gacha-panel').dataset.poolPhase === 'awakened', 'Awakened phase missing');
    assert(document.getElementById('gacha-theme-dual-hero').querySelectorAll('figure').length === 2, 'Dual heroes missing');
    assert(document.getElementById('gacha-awakening-progress').textContent === '晨醒花庭已解鎖', 'Legacy unlocked copy changed');
    delete state.poolUnlockState.byPool.eternal_slumber_bloom;
  });

  await test('content text is escaped by the real pool DOM renderer', async () => {
    fixture.alpha.presentation.eyebrow = '<span data-m4-injected="yes">text</span>';
    fixture.alpha.unlockExpansion.title = '<span data-m4-injected="yes">unlock</span>';
    choose('fixture_alpha');
    assert(!document.querySelector('[data-m4-injected]'), 'Content created an HTML node');
    assert(document.getElementById('gacha-theme-eyebrow').textContent.startsWith('<span'), 'Literal text was lost');
  });

  await test('all inactive pools remove stale enabled controls without breaking task rendering', async () => {
    const enabled = poolsData.pools.map((pool) => pool.active);
    poolsData.pools.forEach((pool) => { pool.active = false; });
    ui.renderView('gacha');
    assert(document.getElementById('btn-pull').disabled && document.getElementById('btn-pull-ten').disabled, 'Unavailable controls remain enabled');
    assert(document.getElementById('gacha-pool-content').hidden, 'Old pool content remains shown');
    ui.renderView('tasks');
    assert(document.getElementById('view-tasks'), 'Task view failed');
    poolsData.pools.forEach((pool, index) => { pool.active = enabled[index]; });
    choose('fixture_beta');
  });

  const { playPoolUnlock, isPoolAwakeningPlaying } = await import('../src/poolAwakeningController.js');
  for (const forceFallback of [false, true]) {
    await test(`generic SSR gift overlay uses actual rarity and cleans up (fallback=${forceFallback})`, async () => {
      const model = contract.resolvePoolPresentationModel(fixture.beta, allPets, { unlocked: true, lifetimeDraws: 3 });
      const pending = playPoolUnlock({ model, reduceMotion: true, forceFallback });
      const selector = forceFallback ? '.pool-awakening-fallback button' : '.pool-awakening-confirm';
      await waitFor(() => document.querySelector(selector) && !document.querySelector(selector).hidden, 'unlock confirm');
      const overlay = document.querySelector(forceFallback ? '.pool-awakening-fallback' : '.pool-awakening-overlay');
      assert(overlay.textContent.includes('SSR｜fixture_beta reward'), 'Overlay hardcoded R or legacy pet');
      document.querySelector(selector).click();
      const outcome = await pending;
      assert(outcome.seen && !isPoolAwakeningPlaying(), 'Unlock did not finish');
      assert(!document.querySelector('.pool-awakening-overlay, .pool-awakening-fallback'), 'Unlock overlay leaked');
    });
  }

  await test('new pet IDs reuse moon/petal safely and preserve legacy captions', async () => {
    const reveal = await import('../src/summonRevealService.js');
    const pet = { ...fixture.pets.find((item) => item.rarity === 'UR'), presentation: { revealKey: 'moon', revealCaption: '<b data-m4-injected="yes">Moon</b>' } };
    const overlay = reveal.createSummonRevealOverlay({ rarity: 'UR', pet, reduceMotion: true });
    document.body.appendChild(overlay);
    assert(overlay.dataset.theme === 'moon' && overlay.querySelector('.summon-reveal-moon'), 'New ID did not use moon template');
    assert(!overlay.querySelector('[data-m4-injected]'), 'Caption injected DOM');
    assert(overlay.querySelector('.summon-reveal-caption').textContent === pet.presentation.revealCaption, 'Caption changed');
    overlay.remove();
  });

  await test('debut uses safe content copy and waits for an explicit close', async () => {
    const { playPoolDebutPresentation } = await import('../src/themedSummonController.js');
    const presentation = { ...contract.normalizePoolDefinition(fixture.alpha).presentation,
      debutLabel: 'Fixture debut', debutLines: ['<b data-m4-injected="yes">First</b>', 'Second', 'Third'] };
    const pending = playPoolDebutPresentation({ poolName: fixture.alpha.name, presentation, reduceMotion: true });
    const overlay = document.querySelector('.dream-debut-overlay');
    assert(overlay?.getAttribute('aria-label') === 'Fixture debut', 'Debut has a stale pool name');
    assert(!overlay.querySelector('[data-m4-injected]'), 'Debut copy injected DOM');
    assert(overlay.querySelector('[data-seg="a"]').textContent === presentation.debutLines[0], 'Debut copy changed');
    await waitFor(() => overlay.classList.contains('is-ready'), 'debut ready');
    assert(overlay.isConnected, 'Debut auto-closed before user action');
    overlay.querySelector('[data-role="skip"]').click();
    await pending;
    assert(!overlay.isConnected, 'Debut did not clean up');
  });

  // Gift is already paid. These cases exercise UI resume, not M2A gift transactions.
  for (const poolId of ['eternal_slumber_bloom', 'fixture_beta']) {
    await test(`seen debut does not block pending unlock resume: ${poolId}`, async () => {
      const pool = poolsData.pools.find((item) => item.id === poolId);
      const expansion = contract.normalizeUnlockExpansion(pool);
      const entry = { poolId, schemaVersion: 1, lifetimeDraws: expansion.threshold, unlocked: true, rewardClaimed: true, animationSeen: false };
      const entries = { [poolId]: entry };
      state.poolUnlockState = { key: 'poolUnlockState', schemaVersion: 1, byPool: entries };
      await storage.dbPut(storage.STORES.META, state.poolUnlockState);
      await storage.dbPut(storage.STORES.META, { key: 'poolDebutSeen', seenPoolIds: [poolId] });
      await storage.dbPut(storage.STORES.META, { key: 'idempotentGrants', claimedIds: [contract.resolveUnlockGrantId(poolId, expansion), 'awakening_reward:eternal_slumber_bloom:20'] });
      await storage.dbPut(storage.STORES.COLLECTION, { petId: expansion.rewardPetId, stars: 1, fragments: 0, bondExp: 0, bondLevel: 1, isCompanion: false });
      state.gachaStats.selectedPoolId = poolId;
      const walletBefore = await storage.dbGet(storage.STORES.META, 'wallet');
      ui.switchView('gacha');
      await waitFor(() => document.querySelector('.pool-awakening-confirm') && !document.querySelector('.pool-awakening-confirm').hidden, 'UI resume confirm');
      assert(!document.querySelector('.dream-debut-overlay'), 'Already seen debut replayed');
      document.querySelector('.pool-awakening-confirm').click();
      await waitFor(async () => (await storage.dbGet(storage.STORES.META, 'poolUnlockState'))?.byPool?.[poolId]?.animationSeen === true, 'animationSeen commit');
      assert(JSON.stringify(walletBefore) === JSON.stringify(await storage.dbGet(storage.STORES.META, 'wallet')), 'Resume changed wallet');
      ui.switchView('gacha');
      await delay(120);
      assert(!document.querySelector('.pool-awakening-overlay'), 'Seen unlock replayed');
    });
  }
  if (new URL(location.href).searchParams.has('draws')) {
    await test('glacier UI dispatches debut and a paid draw with no repeat charge or unlock gift', async () => {
      state.wallet.stardust = 1500;
      state.gachaStats.selectedPoolId = glacier.id;
      await storage.dbPut(storage.STORES.META, state.wallet);
      await storage.dbPut(storage.STORES.META, state.gachaStats);
      ui.switchView('gacha');
      await waitFor(() => document.querySelector('.dream-debut-overlay[data-animation="glacier_arrival"]'), 'glacier debut');
      document.querySelector('.dream-debut-overlay [data-role="skip"]').click();
      await waitFor(() => !document.querySelector('.dream-debut-overlay'), 'debut cleanup');
      assert(document.getElementById('gacha-panel').dataset.poolTheme === 'glacier_arrival', 'Wrong panel theme');
      assert(document.getElementById('gacha-awakening-panel').hidden, 'Unexpected unlock panel');
      const random = Math.random;
      Math.random = () => 0.1;
      try {
        document.getElementById('btn-pull').click();
        await waitFor(() => document.querySelector('.dream-bloom-overlay[data-animation="glacier_arrival"][data-state="summary"]'), 'glacier paid summary');
        const afterPayment = await storage.readAllStoresSnapshot();
        assert((await storage.dbGet(storage.STORES.META, 'wallet')).stardust === 1400, 'Incorrect charge');
        const progress = (await storage.dbGet(storage.STORES.META, 'poolUnlockState'))?.byPool?.[glacier.id];
        assert(!progress?.unlocked && !progress?.rewardClaimed, 'Unexpected expansion or gift');
        document.querySelector('.dream-bloom-overlay [data-action="close"]').click();
        await waitFor(() => !document.getElementById('btn-pull').dataset.pulling, 'paid draw completion');
        assert(JSON.stringify(afterPayment) === JSON.stringify(await storage.readAllStoresSnapshot()), 'Presentation mutated transaction state');
        assert(!document.querySelector('.dream-bloom-overlay'), 'Presentation remained open');
        assert(document.documentElement.scrollWidth <= innerWidth, 'Glacier panel horizontal overflow');
      } finally { Math.random = random; }
    });
    await test('M2A integration: repeat-ten confirmation preserves the quoted pool and price', async () => {
      state.wallet.stardust = 1500;
      await storage.dbPut(storage.STORES.META, state.wallet);
      state.gachaStats.selectedPoolId = 'fixture_beta';
      await storage.dbPut(storage.STORES.META, state.gachaStats);
      choose('fixture_beta');
      const originalRandom = Math.random;
      Math.random = () => 0.2;
      try {
        document.getElementById('btn-pull').click();
        await waitFor(() => document.querySelector('[data-action="result-ten-pull"]'), 'single result modal');
        const before = await storage.readAllStoresSnapshot();
        document.querySelector('[data-action="result-ten-pull"]').click();
        assert(document.getElementById('ten-pull-confirm-text').textContent.includes('750'), 'Confirmation did not quote selected-pool price');
        document.getElementById('ten-pull-confirm-cancel').click();
        assert(JSON.stringify(before) === JSON.stringify(await storage.readAllStoresSnapshot()), 'Cancel changed product state');
        document.querySelector('[data-action="result-ten-pull"]').click();
        state.gachaStats.selectedPoolId = 'fixture_alpha';
        document.getElementById('ten-pull-confirm-ok').click();
        assert(!document.getElementById('ten-pull-confirm-ok'), 'Changed quote did not restore the result');
        assert(JSON.stringify(before) === JSON.stringify(await storage.readAllStoresSnapshot()), 'Changed quote performed a draw');
        state.gachaStats.selectedPoolId = 'fixture_beta';
        ui.closeModal();
        await waitFor(() => !document.getElementById('btn-pull').dataset.pulling, 'pull finally cleanup');
      } finally { Math.random = originalRandom; ui.closeModal(); }
    });
  }
} catch (error) {
  results.push({ name: 'harness setup', ok: false, error: error.stack || error.message });
} finally {
  db?.close();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Test cleanup blocked'));
  }).catch((error) => results.push({ name: 'cleanup', ok: false, error: error.message }));
  output.textContent = JSON.stringify({ passed: results.filter((result) => result.ok).length, failed: results.filter((result) => !result.ok).length, databaseName, results }, null, 2);
  document.title = results.every((result) => result.ok) ? 'PASS — QuestNote M4' : 'FAIL — QuestNote M4';
}
