// Only this QA document overrides IDB opening. All services below are production code.
const databaseName = sessionStorage.getItem('encounterQA-database') || `QuestNoteTest-Encounter-${crypto.randomUUID()}`;
sessionStorage.setItem('encounterQA-database', databaseName);
const nativeOpen = indexedDB.open.bind(indexedDB);
indexedDB.open = (name, version) => {
  if (!['QuestNoteDB','QuestNotePreviewDB'].includes(name)) throw new Error('Unexpected database request');
  return nativeOpen(databaseName, version);
};
const out = document.getElementById('results');
const results = [];
const assert = (value, message) => { if (!value) throw new Error(message); };
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
async function check(name, run) {
  try { await run(); results.push({ name, ok:true }); }
  catch (error) { results.push({ name, ok:false, error:error.stack || error.message }); }
  out.textContent = JSON.stringify(results,null,2);
}
document.getElementById('run').addEventListener('click', async (event) => {
  event.target.disabled = true;
  try {
    assert(!navigator.serviceWorker?.controller, 'Use a fresh loopback port without an app worker');
    const db = await import('../src/db.js');
    const core = await import('../src/encounterEconomyCore.js');
    const service = await import('../src/encounterEconomyService.js');
    const backup = await import('../src/backupService.js');
    const collection = await import('../src/collectionService.js');
    const [petsData,pools,fixture] = await Promise.all(['../data/pets.json','../data/pools.json','./fixtures/backups/legacy-3.4.4.json'].map(async (url) => (await fetch(url)).json()));
    assert((await db.openDB()).name === databaseName, 'Database is not isolated');
    await db.replaceAllStores({}); // Only the randomly named synthetic database above.
    await check('fresh profile: no historical message and valid current backup', async () => {
      const state = await service.ensureEncounterMigration();
      assert(state.balance === 0 && state.migrationReceipt === null, 'Fresh migration mismatch');
      assert(backup.validateBackup(await backup.exportBackup()).valid, 'Fresh export invalid');
    });
    const legacy = structuredClone(fixture);
    legacy.data.collection = [[1,0,'pet_n01'],[2,7,'pet_r01'],[3,0,'pet_sr01'],[4,17,'pet_ssr01'],[5,3,'pet_ur01']].map(([stars,fragments,id]) => {
      const row = { ...collection.createCollectionEntry(id), stars,fragments,nickname:'旅程名字' };
      delete row.encounterMigrationVersion; delete row.legacySpecialtyFloor; return row;
    });
    // Historical envelopes can contain projected aliases; keep both copies faithful.
    legacy.collection = structuredClone(legacy.data.collection);
    await check('legacy restore: mixed 202, unchanged wallet/pity/bond and retry once', async () => {
      await backup.importBackup(legacy);
      const first = await service.ensureEncounterMigration();
      assert(first.balance === 202, 'Expected 202 fragments');
      assert(same(first,await service.ensureEncounterMigration()), 'Retry double granted');
      const saved = await backup.exportBackup();
      assert(saved.data.wallet.stardust === legacy.data.wallet.stardust, 'Wallet changed');
      assert(saved.data.gachaStats.totalPulls === legacy.data.gachaStats.totalPulls, 'Draw count changed');
      assert(saved.data.collection.every((row) => row.bondExp === 0 && !('stars' in row)), 'Growth was invented');
    });
    await check('concurrent same UR invitation: one acquisition, one 200 charge, no pity changes', async () => {
      const before = await backup.exportBackup();
      const candidate = core.invitationCandidates(petsData.pets,pools,before.data.poolUnlockState,before.data.collection).find((row) => row.pet.rarity === 'UR' && row.available && !row.owned);
      const calls = await Promise.allSettled([service.inviteCompanion(candidate.pet.id,petsData.pets,pools),service.inviteCompanion(candidate.pet.id,petsData.pets,pools)]);
      assert(calls.filter((call) => call.status === 'fulfilled').length === 1, 'Duplicate commit');
      const after = await backup.exportBackup();
      assert(after.data.encounterEconomy.balance === 2, 'Charged incorrectly');
      assert(after.data.collection.filter((row) => row.petId === candidate.pet.id).length === 1, 'Collection duplicated');
      assert(same(before.data.gachaStats,after.data.gachaStats) && same(before.data.poolUnlockState,after.data.poolUnlockState), 'Pity or pool unlock changed');
    });
    await check('write failure aborts migration and currency together; clean retry succeeds', async () => {
      await db.replaceAllStores({ collection:legacy.data.collection });
      const before = await db.readAllStoresSnapshot();
      const originalPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(value,...args) { if (this.name === 'collection') throw new DOMException('Synthetic storage failure','QuotaExceededError'); return originalPut.call(this,value,...args); };
      let rejected = false;
      try { await service.ensureEncounterMigration(); } catch { rejected = true; }
      finally { IDBObjectStore.prototype.put = originalPut; }
      assert(rejected && same(before,await db.readAllStoresSnapshot()), 'Partial migration committed');
      assert((await service.ensureEncounterMigration()).balance === 202, 'Retry did not recover');
    });
    await check('converted backup round-trip replaces snapshot without adding migration twice', async () => {
      const first = await backup.exportBackup();
      await backup.importBackup(first); await service.ensureEncounterMigration();
      const second = await backup.exportBackup();
      assert(same(first.data,second.data), 'Converted backup changed');
      await backup.importBackup(legacy); await backup.importBackup(legacy);
      assert((await service.getEncounterEconomy()).balance === 202, 'Historical whole restore added instead of replacing');
    });
    await check('offline service path: retry, invitation, acknowledgement and export need no network', async () => {
      const nativeFetch = window.fetch;
      window.fetch = () => Promise.reject(new TypeError('QA offline'));
      try {
        await service.ensureEncounterMigration();
        const state = await backup.exportBackup();
        const candidate = core.invitationCandidates(petsData.pets,pools,state.data.poolUnlockState,state.data.collection).find((row) => row.pet.rarity === 'SSR' && row.available && !row.owned);
        assert((await service.inviteCompanion(candidate.pet.id,petsData.pets,pools)).balance === 102, 'Offline invite failed');
        await service.acknowledgeEncounterMigration(); await service.ensureEncounterMigration();
        const restored = await backup.exportBackup(); await backup.importBackup(restored);
        assert((await service.getEncounterEconomy()).migrationReceipt.acknowledgedAt, 'Acknowledgement lost');
      } finally { window.fetch = nativeFetch; }
    });
    await backup.importBackup(legacy);
    await db.dbPut(db.STORES.META,{ key:'onboardingV1', schemaVersion:2, status:'dismissed', step:'task', lessons:{} });
    document.getElementById('app').disabled = results.some((row) => !row.ok);
    document.getElementById('restart').disabled = results.some((row) => !row.ok);
    sessionStorage.setItem('encounterQA-results',JSON.stringify(results));
    out.textContent = `${results.filter((row) => row.ok).length}/${results.length} passed\n` + JSON.stringify(results,null,2);
  } catch (error) { out.textContent += '\n' + (error.stack || error.message); }
});
document.getElementById('restart').addEventListener('click', () => { sessionStorage.setItem('encounterQA-restart','true'); location.reload(); });
if (sessionStorage.getItem('encounterQA-restart')) {
  sessionStorage.removeItem('encounterQA-restart');
  results.push(...JSON.parse(sessionStorage.getItem('encounterQA-results')));
  const service = await import('../src/encounterEconomyService.js');
  await check('actual page restart: stored receipt remains 202 with one conversion', async () => {
    const before = await service.getEncounterEconomy();
    assert(before.balance === 202 && same(before,await service.ensureEncounterMigration()), 'Restart double granted');
  });
  out.textContent = `${results.filter((row) => row.ok).length}/${results.length} passed\n` + JSON.stringify(results,null,2);
  document.getElementById('app').disabled = results.some((row) => !row.ok);
}
document.getElementById('app').addEventListener('click', async () => {
  const markup = await (await fetch('../index.html')).text();
  // Same document keeps the isolated IDB opener; the base resolves real App assets.
  document.open(); document.write(markup.replace('<head>','<head><base href="../">')); document.close();
});
