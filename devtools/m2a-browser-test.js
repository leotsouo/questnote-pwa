import { createPoolContentFixtures } from './fixtures/pool-content-fixtures.mjs';
const databaseName = `QuestNoteTest-M2A-${crypto.randomUUID()}`;
const output = document.getElementById('test-results');
const results = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
async function test(name, run) {
  try { await run(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.stack || error.message }); }
  output.textContent = JSON.stringify(results, null, 2);
}
async function rejects(run) {
  try { await run(); } catch { return; }
  throw new Error('Expected rejection');
}
async function createClient() {
  const frame = document.createElement('iframe');
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Client did not initialize')), 15000);
    const listener = (event) => {
      if (event.source === frame.contentWindow && event.origin === location.origin
        && event.data?.type === 'M2A_CLIENT_READY' && event.data.databaseName === databaseName) {
        clearTimeout(timer); removeEventListener('message', listener); resolve(frame.contentWindow.questnoteTestClient);
      }
    };
    addEventListener('message', listener);
  });
  frame.src = `./m2a-browser-client.html?db=${databaseName}`;
  document.getElementById('clients').append(frame);
  return ready;
}
let a, b;
try {
  assert(!navigator.serviceWorker?.controller, 'Use a fresh localhost origin without an app SW');
  [a, b] = await Promise.all([createClient(), createClient()]);
  assert(a.databaseName === databaseName && b.databaseName === databaseName, 'Both clients must be isolated');
  const { catalog, pets, alpha, beta } = createPoolContentFixtures();
  const { META, COLLECTION } = a.storage.STORES;
  const snapshot = () => a.storage.readAllStoresSnapshot();
  const seed = async (overrides = {}) => {
    a.fault(null); b.fault(null); a.random(0); b.random(0);
    await a.storage.replaceAllStores({ wallet: { key: 'wallet', stardust: 10000, adventureEnergy: 100,
      materials: { forest_leaf: 100 } }, ...overrides });
  };
  const unchanged = async (run) => {
    const before = await snapshot();
    await rejects(run);
    assert(same(before, await snapshot()), 'Rejected operation changed committed state');
  };
  await test('one/ten draws each commit wallet, pity, collection and unlock in one transaction', async () => {
    await seed();
    const one = await a.gacha.pullOnce(pets, catalog, alpha.id);
    const ten = await a.gacha.performTenPull(pets, catalog, alpha.id);
    assert(one.isNew && ten.success && ten.results.every((pull) => !pull.isNew), 'Duplicate semantics changed');
    assert((await b.rewards.getWallet()).stardust === 8900, 'Wrong committed debit');
    assert((await b.gacha.getGachaStats()).totalPulls === 11, 'Wrong draw count');
    assert((await b.collection.getPetCollection('pet_n900')).fragments === 10, 'Fragments lost');
    assert((await b.unlock.getPoolUnlockEntry(alpha.id)).lifetimeDraws === 11, 'Wrong lifetime draws');
  });
  await test('empty, inactive, invalid-price and missing-gift catalogs fail without writes', async () => {
    await seed();
    await unchanged(() => a.gacha.pullOnce([], catalog, alpha.id));
    const inactive = structuredClone(catalog); inactive.pools.forEach((pool) => { pool.active = false; });
    await unchanged(() => a.gacha.pullOnce(pets, inactive, alpha.id));
    const invalid = structuredClone(catalog); invalid.pools[0].cost = -1;
    await unchanged(() => a.gacha.performTenPull(pets, invalid, alpha.id));
    await unchanged(() => a.gacha.pullOnce(pets.filter((pet) => pet.id !== alpha.unlockExpansion.rewardPetId), catalog, alpha.id));
  });
  await test('insufficient funds preserve single throw and ten structured-error interfaces', async () => {
    await seed({ wallet: { key: 'wallet', stardust: 0 } });
    await unchanged(() => a.gacha.pullOnce(pets, catalog, alpha.id));
    const before = await snapshot();
    const ten = await a.gacha.performTenPull(pets, catalog, beta.id);
    assert(!ten.success && ten.error.includes('750'), 'Wrong dynamic ten price');
    assert(same(before, await snapshot()), 'Insufficient ten wrote state');
  });
  for (const kind of ['throw', 'abort']) {
    for (let at = 1; at <= 6; at++) {
      await test(`ten threshold fault ${kind} at put ${at} rolls back debit, pity, gift and grants`, async () => {
        await seed({ poolUnlockState: { key: 'poolUnlockState', byPool: { [alpha.id]: { lifetimeDraws: 19 } } } });
        a.fault({ kind, at });
        try { await unchanged(() => a.gacha.performTenPull(pets, catalog, alpha.id)); }
        finally { a.fault(null); }
      });
    }
  }
  await test('mutation promise cannot resolve after request success if the native transaction aborts', async () => {
    await seed();
    a.fault({ kind: 'abort', at: 1 });
    let resolved = false;
    const pending = a.gacha.pullOnce(pets, catalog, alpha.id);
    pending.then(() => { resolved = true; }, () => {});
    try {
      await rejects(() => pending);
      assert(a.requestSucceeded && !resolved, 'Resolved before transaction completion');
    } finally { a.fault(null); }
  });
  await test('async reducers and writes outside locked stores abort without state changes', async () => {
    await seed();
    await unchanged(() => a.storage.dbMutateRecords([{ store: META, key: 'wallet' }], async () => ({ puts: [] })));
    await unchanged(() => a.storage.dbMutateRecords([{ store: META, key: 'wallet' }], () => ({
      puts: [{ store: META, value: { key: 'probe', value: 1 } }, { store: COLLECTION, value: { petId: 'pet_n999' } }],
    })));
  });
  await test('two connections racing for one draw balance commit exactly one draw', async () => {
    await seed({ wallet: { key: 'wallet', stardust: 100 } });
    const outcomes = await Promise.allSettled([a.gacha.pullOnce(pets, catalog, alpha.id), b.gacha.pullOnce(pets, catalog, alpha.id)]);
    assert(outcomes.filter((outcome) => outcome.status === 'fulfilled').length === 1, 'Double spend accepted');
    assert((await a.rewards.getWallet()).stardust === 0, 'Wrong remaining wallet');
    assert((await a.gacha.getGachaStats()).totalPulls === 1, 'Wrong committed draw count');
  });
  await test('wallet energy/material/add/spend/init mutations cannot overwrite concurrent gacha debit', async () => {
    await seed();
    const actions = [];
    for (let index = 0; index < 10; index++) {
      actions.push(a.gacha.pullOnce(pets, catalog, alpha.id), b.rewards.addAdventureEnergy(1),
        b.rewards.spendAdventureEnergy(1), b.rewards.addMaterial('forest_leaf', 2),
        b.rewards.spendMaterial('forest_leaf', 1), b.rewards.spendMaterials({ forest_leaf: 1 }),
        b.rewards.addStardust(2), b.rewards.spendStardust(1), b.rewards.initWallet());
    }
    await Promise.all(actions);
    const wallet = await a.rewards.getWallet();
    assert(wallet.stardust === 9010 && wallet.adventureEnergy === 100 && wallet.materials.forest_leaf === 100,
      'A shared wallet writer lost concurrent changes');
    await Promise.all([a.rewards.setStardust(500), b.rewards.addAdventureEnergy(3)]);
    const afterSet = await a.rewards.getWallet();
    assert(afterSet.stardust === 500 && afterSet.adventureEnergy === 103, 'Explicit stardust setter overwrote energy');
  });
  await test('collection nickname/bond/migration/init cannot erase concurrent duplicate fragments', async () => {
    const entry = { ...a.collection.createCollectionEntry('pet_n900'), isCompanion: true };
    delete entry.nickname; delete entry.bondUnlocks;
    await seed({ collection: [entry] });
    const actions = [];
    for (let index = 0; index < 10; index++) {
      actions.push(a.gacha.pullOnce(pets, catalog, alpha.id), b.collection.setPetNickname('pet_n900', '安全暱稱'),
        b.collection.addBondExpToPet('pet_n900', 1), b.collection.addBondExpToCompanion(1),
        b.collection.migrateCollectionNicknames(), b.collection.addPetToCollection('pet_n900'),
        b.collection.updatePetBondUnlocks('pet_n900'));
    }
    await Promise.all(actions);
    const after = await a.collection.getPetCollection('pet_n900');
    assert(after.fragments === 10 && after.bondExp === 20 && after.nickname === '安全暱稱', 'Collection fields lost');
    await Promise.all([a.collection.addFragments('pet_n900', 1), b.collection.clearPetNickname('pet_n900')]);
    const cleared = await a.collection.getPetCollection('pet_n900');
    assert(cleared.fragments === 11 && cleared.nickname === null, 'Clear nickname lost fragments');
  });
  await test('star upgrades and companion selection are atomic across connections', async () => {
    await seed({ collection: [{ ...a.collection.createCollectionEntry('pet_n900'), fragments: 5 }, a.collection.createCollectionEntry('pet_r900')] });
    const upgrades = await Promise.all([a.collection.upgradeStar('pet_n900'), b.collection.upgradeStar('pet_n900')]);
    assert(upgrades.filter((result) => result.success).length === 1, 'Duplicate upgrade');
    await Promise.all([a.collection.setCompanion('pet_n900'), b.collection.setCompanion('pet_r900')]);
    assert((await a.collection.getCollection()).filter((entry) => entry.isCompanion).length === 1, 'Multiple companions');
    const pets = await Promise.all([a.collection.petCompanion(), b.collection.petCompanion()]);
    assert(pets.filter((result) => result.success).length === 1, 'Pet cooldown awarded twice');
  });
  await test('pity/init/selection and unlock animation/backfill updates preserve concurrent draw progress', async () => {
    await seed();
    const actions = [];
    for (let index = 0; index < 10; index++) actions.push(a.gacha.pullOnce(pets, catalog, alpha.id),
      b.gacha.initGachaStats(), b.gacha.setSelectedPoolId(beta.id), b.unlock.markUnlockAnimationSeen(alpha.id), b.unlock.ensurePoolUnlockLegacyBackfillMarked());
    await Promise.all(actions);
    const stats = await a.gacha.getGachaStats();
    const entry = await a.unlock.getPoolUnlockEntry(alpha.id);
    assert(stats.totalPulls === 10 && stats.poolPity[alpha.id].ssrPity === 10 && entry.lifetimeDraws === 10 && entry.animationSeen,
      'A state patch overwrote draw progress');
  });
  await test('19→20 single stays locked and next draw can use expanded candidates', async () => {
    await seed({ poolUnlockState: { key: 'poolUnlockState', byPool: { [alpha.id]: { lifetimeDraws: 19 } } } });
    a.random(0.99);
    const threshold = await a.gacha.pullOnce(pets, catalog, alpha.id);
    assert(threshold.pet.id === 'pet_ur900' && threshold.unlockProgress.justUnlocked, 'Threshold changed its own candidates');
    const next = await a.gacha.pullOnce(pets, catalog, alpha.id);
    assert(next.pet.id === 'pet_ur901', 'Next draw failed to use expanded pool');
  });
  await test('two threshold-crossing tens award one actual-rarity gift and distinct pool grants', async () => {
    await seed({ collection: [{ ...a.collection.createCollectionEntry('pet_ssr911'), fragments: 7 }] });
    a.random(0.99); b.random(0.99);
    const tens = await Promise.all([a.gacha.performTenPull(pets, catalog, beta.id), b.gacha.performTenPull(pets, catalog, beta.id)]);
    const first = tens.find((result) => result.unlockProgress.justUnlocked);
    assert(first && first.results.every((pull) => pull.petId === 'pet_ur910'), 'First ten did not freeze locked candidates');
    assert((await a.collection.getPetCollection('pet_ssr911')).fragments === 17, 'Gift not exactly once at SSR compensation');
    assert((await a.unlock.getPoolUnlockEntry(beta.id)).lifetimeDraws === 20, 'Concurrent ten lifetime lost');
    await Promise.all([a.unlock.ensureUnlockRewardClaimed(beta.id, beta.unlockExpansion, pets),
      b.unlock.ensureUnlockRewardClaimed(beta.id, beta.unlockExpansion, pets)]);
    assert((await a.collection.getPetCollection('pet_ssr911')).fragments === 17, 'Recovery repeated gift');
    await a.gacha.performTenPull(pets, catalog, alpha.id);
    await a.gacha.performTenPull(pets, catalog, alpha.id);
    assert((await a.unlock.getIdempotentGrants()).claimedIds.length === 2, 'Pool grants collided');
  });
  await test('M2A snapshots remain compatible with M1 export and complete restoration', async () => {
    const backup = await a.backup.exportBackup();
    assert(a.backup.validateBackup(backup).valid, 'M2A snapshot failed backup validation');
    await a.backup.importBackup(backup);
    const restored = await b.backup.exportBackup();
    assert(same(backup.data, restored.data), 'M1 round-trip changed M2A state');
  });
} catch (error) {
  results.push({ name: 'harness setup', ok: false, error: error.stack || error.message });
} finally {
  a?.close(); b?.close();
  try {
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = resolve; request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Test cleanup blocked'));
    });
  } catch (error) { results.push({ name: 'isolated cleanup', ok: false, error: error.message }); }
  globalThis.m2aTestResults = { complete: true, databaseName, passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length, results };
  output.textContent = JSON.stringify(globalThis.m2aTestResults, null, 2);
  document.title = `M2A ${globalThis.m2aTestResults.failed ? 'FAIL' : 'PASS'} (${results.length})`;
}
