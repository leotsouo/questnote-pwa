# Historical backup exporter fixtures

These are **synthetic fixtures**, not user backups or evidence of deployed versions.
The JSON envelope and serialized records were produced by each historical
`exportBackup()` and its actual service modules, with only `src/db.js` replaced by
an in-memory Map adapter. No browser storage, network, checkout, or Git index is
used. The clock, timezone, and UUIDs are fixed.

- `legacy-1.8.1.json`: `a0936fce709d94f9abc72e2f2bd9969c5bb71645`.
- `legacy-3.0.1.json`: `edb6ae7cccdfe729aab98c9d3735b22b71147f41`.
- `legacy-3.4.4.json`: `6b3d2ea25417e25cd9bd98bd89b9f991e7aea829`.

Each contains a completed task and subtask, completed daily habit, owned companion
with fragments and bond progress, nonzero wallet and pity, and achievement claim
markers. Later versions also contain daily/wheel, quest, collection milestone,
mailbox, and (3.4.4 only) pool unlock/grant markers. Some progression markers are
deliberately synthetic normalized service state; these fixtures test persistence
compatibility, not the feasibility of an entire gameplay history.

Assertions in the generator verify all flat/nested aliases match, 1.8.1 has no
`settings` or `titles`, and 3.0.1 has no pool unlock/grant state. The fixture
contents are not hand-assembled backup envelopes. Defaults, fields, and aliases
come from the historical modules. In particular, 1.8.1 preferences have no theme,
its wallet has four material keys, and its collection entries have no nickname
or bond-unlock object.

## Reproduce

From the repository root, run the following PowerShell command. Node's VM modules
flag is required. The generator creates missing JSON files or verifies identical
existing files; it refuses to overwrite changed fixtures. Git history containing
the three commits must be available.

```powershell
$fixtureReadme = Get-Content -Raw devtools/fixtures/backups/README.md
$fixtureGenerator = [regex]::Match($fixtureReadme, '(?s)```javascript\r?\n(.*?)\r?\n```').Groups[1].Value
$fixtureGenerator | node --experimental-vm-modules
```

```javascript
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

process.env.TZ = 'Asia/Taipei';
const instant = '2026-09-22T04:00:00.000Z';
const today = '2026-09-22';
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const destination = path.join(root, 'devtools', 'fixtures', 'backups');
const revisions = [
  ['1.8.1', 'a0936fce709d94f9abc72e2f2bd9969c5bb71645'],
  ['3.0.1', 'edb6ae7cccdfe729aab98c9d3735b22b71147f41'],
  ['3.4.4', '6b3d2ea25417e25cd9bd98bd89b9f991e7aea829'],
];

async function generate(version, revision) {
  const modules = new Map();
  const stores = { TASKS: 'tasks', META: 'meta', COLLECTION: 'collection', EXPEDITIONS: 'expeditions', HABITS: 'habits' };
  const rows = new Map(Object.values(stores).map((name) => [name, new Map()]));
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const forbidden = async () => { throw new Error('Synthetic exporter must not access real storage or network'); };
  const db = {
    STORES: stores,
    openDB: forbidden,
    replaceAllStores: forbidden,
    clearAllData: forbidden,
    dbGet: async (store, key) => clone(rows.get(store).get(key)),
    dbGetAll: async (store) => [...rows.get(store).values()].map(clone),
    dbPut: async (store, value) => {
      const key = store === 'meta' ? value.key : store === 'collection' ? value.petId : value.id;
      assert.ok(key);
      rows.get(store).set(key, clone(value));
      return key;
    },
    dbDelete: async (store, key) => rows.get(store).delete(key),
    dbClear: async (store) => rows.get(store).clear(),
  };
  let uuidSequence = 0;
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return Date.parse(instant); }
  }
  const context = vm.createContext({
    console, URL, Date: FixedDate, fetch: forbidden,
    crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++uuidSequence).padStart(12, '0')}` },
  });
  const gitSource = (file) => execFileSync('git', ['show', `${revision}:${file}`], { cwd: root, encoding: 'utf8' });
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const module = file === 'src/db.js'
      ? new vm.SyntheticModule(Object.keys(db), function () {
        for (const [key, value] of Object.entries(db)) this.setExport(key, value);
      }, { context, identifier: file })
      : new vm.SourceTextModule(gitSource(file), { context, identifier: file });
    modules.set(file, module);
    return module;
  }
  const backup = load('src/backupService.js');
  await backup.link((specifier, referring) => load(path.posix.normalize(path.posix.join(path.posix.dirname(referring.identifier), specifier))));
  await backup.evaluate();
  const service = (name) => modules.get(`src/${name}.js`)?.namespace;
  const saveMeta = (value) => db.dbPut('meta', value);
  const reward = service('rewardService');
  await saveMeta({ key: 'wallet', stardust: 2400, adventureEnergy: 12, materials: { ...reward.DEFAULT_MATERIALS, forest_leaf: 4 } });
  const collection = service('collectionService');
  await collection.addPetToCollection('pet_n01');
  await collection.setCompanion('pet_n01');
  await collection.addFragments('pet_n01', 7);
  await collection.addBondExpToPet('pet_n01', 63);
  const tasks = service('taskService');
  const task = await tasks.createTask({
    content: 'Synthetic recovery task\nVerify historical snapshot restoration.',
    priority: 'important', categoryId: 'general', planToday: true,
    startDate: today, dueDate: today,
    subtasks: [{ id: 'synthetic-subtask-1', text: 'Synthetic completed subtask' }],
  });
  await tasks.toggleSubtaskComplete(task.id, 'synthetic-subtask-1');
  await tasks.toggleTaskComplete(task.id);
  const habits = service('habitService');
  const { habit } = await habits.createHabit({ name: 'Synthetic daily habit', description: 'Fixture only', frequency: 'daily', categoryId: 'general' });
  assert.equal((await habits.completeHabitToday(habit.id, today)).success, true);
  const achievements = await service('achievementService').getAchievementsState();
  await saveMeta({ ...achievements, unlockedAchievementIds: ['synthetic-achievement-claimed'], claimedAchievementIds: ['synthetic-achievement-claimed'], unlockedTitleIds: ['synthetic-title'], equippedTitleId: 'synthetic-title', hasExportedBackup: true });
  const stats = await service('gachaService').getGachaStats();
  Object.assign(stats, { ssrPity: 7, urPity: 27, totalPulls: 47, tenPullCount: 3 });
  if ('poolPity' in stats) {
    stats.selectedPoolId = 'eternal_slumber_bloom';
    stats.poolPity = { standard: { ssrPity: 7, urPity: 27 }, eternal_slumber_bloom: { ssrPity: 3, urPity: 20 } };
  }
  await saveMeta(stats);
  if (service('dailyCheckInService')) {
    const daily = service('dailyCheckInService');
    await saveMeta(daily.normalizeDailyCheckIn({ lastCheckInDate: today, lastCheckInAt: instant, streak: 3, bestStreak: 3, totalCheckIns: 3, lastWheelSpinDate: today, lastWheelSpinAt: instant, totalWheelSpins: 2 }));
    const quests = await service('questService').getQuestProgress();
    const first = Object.values(quests.daily.quests)[0];
    Object.assign(first, { current: first.target, completed: true, claimed: true });
    quests.stats.totalDailyQuestsClaimed = 1;
    await saveMeta(quests);
    await saveMeta(service('collectionMilestoneService').normalizeCollectionMilestoneState({ claimedIds: ['collection_005'], lastUpdatedAt: instant }));
    await saveMeta(service('mailboxService').normalizeGlobalMailboxState({ readIds: ['synthetic-mail-claimed'], claimedIds: ['synthetic-mail-claimed'], lastFetchedAt: instant }));
  }
  if (service('poolUnlockService')) {
    const unlock = service('poolUnlockService');
    await collection.addPetToCollection('pet_r16');
    await saveMeta(unlock.normalizePoolUnlockState({ byPool: { eternal_slumber_bloom: { lifetimeDraws: 20, unlocked: true, rewardClaimed: true, animationSeen: true, unlockedAt: instant } }, legacyBackfill: { attempted: true } }));
    await saveMeta(unlock.normalizeIdempotentGrants({ claimedIds: [unlock.MORNING_GARDEN_GRANT_ID] }));
    await saveMeta(service('poolDebutService').normalizePoolDebutSeen({ seenPoolIds: ['eternal_slumber_bloom'] }));
  }
  const result = clone(await backup.namespace.exportBackup());
  assert.equal(result.appVersion, version);
  assert.equal(result.exportedAt, instant);
  for (const [key, value] of Object.entries(result.data)) assert.deepEqual(result[key], value, `${version}: alias ${key}`);
  assert.equal(result.tasks[0].rewardClaimed, true);
  assert.equal(result.tasks[0].subtasks[0].completed, true);
  assert.equal(result.habits[0].logs[today].rewardClaimed, true);
  assert.ok(result.collection[0].fragments > 0);
  assert.ok(result.wallet.stardust > 0);
  assert.equal(result.gachaStats.ssrPity, 7);
  if (version === '1.8.1') {
    for (const key of ['settings', 'titles']) {
      assert.equal(Object.hasOwn(result, key), false);
      assert.equal(Object.hasOwn(result.data, key), false);
    }
  }
  if (version === '3.0.1') {
    for (const key of ['poolUnlockState', 'idempotentGrants', 'poolDebutSeen']) assert.equal(Object.hasOwn(result.data, key), false);
  }
  const file = path.join(destination, `legacy-${version}.json`);
  const text = JSON.stringify(result, null, 2) + '\n';
  fs.mkdirSync(destination, { recursive: true });
  if (fs.existsSync(file)) assert.equal(fs.readFileSync(file, 'utf8'), text, 'Refusing to overwrite changed fixture');
  else fs.writeFileSync(file, text, { flag: 'wx' });
  console.log(`${version}: ${Buffer.byteLength(text)} bytes; historical exporter and alias assertions passed`);
}

(async () => {
  for (const [version, revision] of revisions) await generate(version, revision);
})().catch((error) => { console.error(error); process.exitCode = 1; });
```
