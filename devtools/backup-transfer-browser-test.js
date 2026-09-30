// Authored local fixture controller. Never writes to an existing or remote origin.
const output = document.getElementById('results');
const results = [];
const publish = () => { output.textContent = JSON.stringify(results, null, 2); };
const assert = (condition, message) => { if (!condition) throw Error(message); };
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
async function until(condition, label) {
  for (let n = 0; n < 300; n++) { if (await condition()) return; await new Promise((resolve) => setTimeout(resolve, 100)); }
  throw Error('Timeout: ' + label);
}
const note = (name, details) => { results.push({ name, ok: true, details }); publish(); };
let frame;
const doc = () => frame.contentDocument;
const service = (name) => frame.contentWindow.eval(`import('${location.origin}/questnote-pwa/src/${name}.js')`);
async function boot() {
  await new Promise((resolve) => { frame.onload = resolve; frame.src = '/questnote-pwa/index.html?backup-transfer=' + Date.now(); });
  await until(() => doc()?.querySelector('#view-more [data-app-update="apply"]') && !doc().querySelector('#app-loader'), 'app ready');
}
try {
  assert(location.hostname === '127.0.0.1', 'Loopback only');
  const config = await (await fetch('./config')).json();
  assert(config.origin === location.origin && config.purpose === 'synthetic-backup-transfer-only', 'Wrong test origin');
  assert(!(await indexedDB.databases()).length && !(await navigator.serviceWorker.getRegistrations()).length && !(await caches.keys()).length, 'Unknown storage: refusing fixture writes');
  frame = document.createElement('iframe'); document.getElementById('clients').append(frame); await boot();
  assert(doc().querySelector('meta[name="questnote-artifact"]').content === config.artifactId, 'Wrong deployed artifact');
  doc().querySelector('[data-onboarding-action="skip"]')?.click();
  await until(() => !doc().querySelector('#onboarding-welcome-title'), 'onboarding dismissed');
  let db = await service('db');
  let backup = await service('backupService');
  const collection = await service('collectionService');
  const catalog = await (await frame.contentWindow.fetch('/questnote-pwa/' + config.contentBundleUrl)).json();
  const pets = catalog.petsData.pets;
  assert(pets.length === 84, 'Expected full deployed 84-pet catalog');
  const legacy = await (await fetch('/devtools/fixtures/backups/legacy-3.4.4.json')).json();
  const fixture = backup.migrateImportedData(backup.normalizeBackupPayload(legacy));
  const now = new Date().toISOString();
  const date = new Date().toLocaleDateString('en-CA');
  const thresholds = [0, 50, 150, 300, 500];
  const companion = pets.find((pet) => pet.name.includes('曙綻')) || pets.find((pet) => pet.rarity === 'UR');
  if (config.role === 'source') {
    fixture.collection = pets.map((pet, index) => {
      const level = pet.id === companion.id ? 5 : index % 5 + 1;
      return collection.normalizeCollectionItem({ petId: pet.id, stars: index % 5 + 1, fragments: index * 3 + 7,
        bondExp: thresholds[level - 1] + 8, bondLevel: level, isCompanion: pet.id === companion.id,
        nickname: pet.id === companion.id ? '花花夥伴🌸' : index % 3 === 0 ? '測試夥伴' + index : null,
        lastPettedAt: index % 2 ? null : now, obtainedAt: '2026-09-22T04:00:00.000Z', obtainedSource: 'synthetic-transfer-verification' });
    });
    fixture.tasks.push({ ...structuredClone(fixture.tasks[0]), id: 'transfer-open-task', content: '移轉測試：閱讀與整理筆記', title: '移轉測試：閱讀與整理筆記', completed: false,
      rewardClaimed: false, completedAt: null, lastRewardClaimedAt: null, type: 'repeatable', dueDate: date, plannedDate: date, subtasks: [] });
    fixture.habits.push({ ...structuredClone(fixture.habits[0]), id: 'transfer-weekly-habit', name: '每週運動三次', frequency: 'weekly', targetPerWeek: 3 });
    fixture.wallet.stardust = 87654; fixture.wallet.adventureEnergy = 23;
    for (const [index, id] of Object.keys(fixture.wallet.materials).entries()) fixture.wallet.materials[id] = 11 + index;
    fixture.userPreferences.theme = 'twilight'; fixture.userPreferences.reduceMotion = true;
    fixture.campProgress.level = 3; fixture.campProgress.upgradedAt = now;
    fixture.inventory.items = { bond_cookie: 7 }; fixture.inventory.itemUsageLogs = { [date]: { [companion.id]: { bondItemsUsed: 2 } } };
    fixture.workshopStats = { key: 'workshopStats', craftCount: 9, giftCount: 8, favoriteGiftCount: 3, firstCraftAt: now, firstGiftAt: now, firstFavoriteGiftAt: now };
    fixture.explorationProgress.areas.mist_forest.progress = 75;
    fixture.explorationProgress.areas.mist_forest.completedRuns = 12;
    fixture.explorationProgress.areas.mist_forest.claimedMilestones = [10, 25, 50];
    fixture.collectionMilestones.claimedIds = ['collection_005', 'bond_first_liberated'];
    fixture.globalMailboxState.readIds = ['synthetic-transfer-mail']; fixture.globalMailboxState.claimedIds = ['synthetic-transfer-mail'];
    fixture.expeditions = [{ id: 'transfer-running-expedition', petId: companion.id, petIds: [companion.id, pets[0].id], areaId: 'mist_forest', durationMinutes: 120,
      energyCost: 4, startedAt: now, endsAt: new Date(Date.now() + 7200000).toISOString(), completed: false, claimed: false,
      rewardsPreview: null, rewardsFinal: null, rewards: null, objective: 'bond', firstJourney: false }];
  } else {
    fixture.collection = [collection.normalizeCollectionItem({ petId: 'pet_n01', stars: 1, fragments: 99, bondExp: 0, bondLevel: 1, isCompanion: true,
      nickname: '移入前夥伴', lastPettedAt: null, obtainedAt: now })];
    fixture.tasks = [{ ...fixture.tasks[0], id: 'destination-sentinel', title: '匯入前的任務', content: '匯入前的任務' }];
    fixture.wallet.stardust = 1234;
  }
  await backup.safeReplaceAllData(fixture);
  await boot();
  db = await service('db'); backup = await service('backupService');
  const ui = await service('ui'); ui.switchView('settings');
  const baseline = await backup.exportBackup();
  note(config.role + ' initialized', { version: baseline.appVersion, pets: baseline.collection.length, companion: baseline.collection.find((pet) => pet.isCompanion), tasks: baseline.tasks.length, habits: baseline.habits.length, stardust: baseline.wallet.stardust, artifactId: config.artifactId });
  document.getElementById('compare').disabled = false;
  document.getElementById('safety').disabled = false;
  document.getElementById('compare').onclick = async () => {
    try {
      db = await service('db'); backup = await service('backupService');
      const expected = await (await fetch('./expected.json')).json();
      const actual = await backup.exportBackup();
      const comparisons = Object.fromEntries(Object.keys(expected.data).map((key) => {
        const left = structuredClone(expected.data[key]); const right = structuredClone(actual.data[key]);
        // This timestamp records a fresh public mailbox fetch on each startup, not a claim or reward.
        if (key === 'globalMailboxState') { delete left.lastFetchedAt; delete right.lastFetchedAt; }
        return [key, { equal: same(left, right), ...(same(left, right) ? {} : { expected: left, actual: right }) }];
      }));
      results.push({ name: 'Full file-to-database comparison', ok: Object.values(comparisons).every((value) => value.equal), comparisons,
        mailboxFetchedAt: { expected: expected.data.globalMailboxState.lastFetchedAt, actual: actual.data.globalMailboxState.lastFetchedAt },
        renderedCompanion: doc().querySelector('.companion-card')?.textContent?.trim(), renderedTheme: doc().body.dataset.theme }); publish();
    } catch (error) { results.push({ name: 'Comparison', ok: false, error: error.stack }); publish(); }
  };
  document.getElementById('safety').onclick = async () => {
    try {
      db = await service('db'); backup = await service('backupService');
      const before = await db.readAllStoresSnapshot(); const valid = await backup.exportBackup();
      const cases = [
        ['Missing collection', (file) => { delete file.collection; delete file.data.collection; }],
        ['Duplicate pet', (file) => { file.data.collection.push(structuredClone(file.data.collection[0])); file.collection = file.data.collection; }],
        ['Invalid pet stars', (file) => { file.data.collection[0].stars = 6; file.collection = file.data.collection; }],
        ['Future version', (file) => { file.appVersion = '99.0.0'; }],
      ];
      for (const [name, mutate] of cases) {
        const invalid = JSON.parse(JSON.stringify(valid)); mutate(invalid); let rejected = false;
        try { await backup.importBackup(invalid); } catch { rejected = true; }
        assert(rejected && same(before, await db.readAllStoresSnapshot()), name + ' changed saved data'); note(name + ' rejected with zero writes');
      }
      const nativePut = frame.contentWindow.IDBObjectStore.prototype.put; let count = 0;
      frame.contentWindow.IDBObjectStore.prototype.put = function (...args) {
        const request = nativePut.apply(this, args);
        if (++count === 4) request.addEventListener('success', () => this.transaction.abort());
        return request;
      };
      let rejected = false;
      try { await backup.importBackup(valid); } catch { rejected = true; }
      finally { frame.contentWindow.IDBObjectStore.prototype.put = nativePut; }
      assert(rejected && same(before, await db.readAllStoresSnapshot()), 'Interrupted restore failed to roll back');
      note('Interrupted transaction rolls back all five stores; all pets preserved');
    } catch (error) { results.push({ name: 'Safety', ok: false, error: error.stack }); publish(); }
  };
} catch (error) { results.push({ name: 'Initialization', ok: false, error: error.stack }); publish(); }
