import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateBackup, normalizeBackupPayload, migrateImportedData } from '../src/backupService.js';
import { SNAPSHOT_KEYS, validateSnapshotData, validateStoredSnapshot } from '../src/backupSchema.js';
import { normalizeExpedition, calculateExpeditionRewards } from '../src/expeditionService.js';
import { COLLECTION_MILESTONE_DEFINITIONS } from '../src/collectionMilestoneService.js';

const fixture = (version) => JSON.parse(readFileSync(new URL(`./fixtures/backups/legacy-${version}.json`, import.meta.url), 'utf8'));
const flat = () => { const data = fixture('3.4.4'); delete data.data; return data; };
const canonical = () => {
  const raw = fixture('3.4.4');
  return { app: 'QuestNote', version: 2, appVersion: '3.4.4', exportedAt: raw.exportedAt,
    data: Object.fromEntries(SNAPSHOT_KEYS.map((key) => [key, raw.data[key]])) };
};
// Serialized fields match startExpedition/claimExpeditionRewards at a0936fc and
// current HEAD; reward values come from the actual calculator, with fixed ranges.
const expedition = () => normalizeExpedition({ id: 'synthetic-expedition', petId: 'pet_n01',
  areaId: 'mist_forest', durationMinutes: 30, energyCost: 1,
  startedAt: '2026-09-22T04:00:00.000Z', endsAt: '2026-09-22T04:30:00.000Z',
  completed: true, claimed: true, rewardsPreview: null,
  rewardsFinal: calculateExpeditionRewards({ rewards: { stardust: { min: 10, max: 10 },
    material: { id: 'forest_leaf', min: 1, max: 1 }, bondExp: 3 } },
  { id: 'pet_n01', rarity: 'N', bondLevel: 1 }) });

test('verified historical exporters remain valid and migrate to complete snapshots', () => {
  for (const version of ['1.8.1', '3.0.1', '3.4.4']) {
    const raw = fixture(version);
    const result = validateBackup(raw);
    assert.equal(result.valid, true, result.error);
    const prepared = normalizeBackupPayload(raw);
    assert.deepEqual(validateSnapshotData(prepared, undefined, prepared.appVersion), [],
      'restore preflight must use the original row profile before migration');
    const normalized = migrateImportedData(prepared);
    assert.deepEqual(validateSnapshotData(normalized), []);
    assert.equal(normalized.wallet.stardust, raw.data.wallet.stardust);
    assert.equal(normalized.tasks[0].id, raw.data.tasks[0].id);
  }
});

test('partial current backup cannot masquerade as an older complete shape', () => {
  assert.equal(validateBackup({ appName: 'QuestNote', version: 2, appVersion: '3.4.4', tasks: [] }).valid, false);
  const raw = fixture('1.8.1'); raw.appVersion = '3.4.4';
  assert.equal(validateBackup(raw).valid, false);
  assert.throws(() => normalizeBackupPayload(raw), /缺少/);
});

test('every current core field is required before normalization', () => {
  const raw = flat();
  for (const key of ['tasks', 'wallet', 'collection', 'gachaStats', 'habits', 'expeditions',
    'poolUnlockState', 'idempotentGrants', 'globalMailboxState']) {
    const broken = structuredClone(raw); delete broken[key];
    assert.equal(validateBackup(broken).valid, false, `accepted missing ${key}`);
  }
});

test('top-level/data and projected aliases must agree', () => {
  const raw = fixture('3.4.4'); raw.wallet.stardust += 1;
  assert.equal(validateBackup(raw).valid, false);
  const projected = flat(); projected.settings.theme = 'conflicting';
  assert.equal(validateBackup(projected).valid, false);
  const ordered = fixture('3.4.4');
  ordered.wallet = Object.fromEntries(Object.entries(ordered.wallet).reverse());
  assert.equal(validateBackup(ordered).valid, true, 'object key ordering is immaterial');
});

test('duplicate persistent keys and malformed nested records are rejected', () => {
  for (const key of ['tasks', 'collection', 'habits', 'expeditions']) {
    const raw = flat();
    if (key === 'expeditions') raw.expeditions = [expedition()];
    assert.ok(raw[key].length, `fixture missing ${key}`);
    assert.equal(validateBackup(raw).valid, true, `initial ${key} fixture must be valid`);
    raw[key].push(structuredClone(raw[key][0]));
    assert.equal(validateBackup(raw).valid, false, key);
  }
  const raw = flat(); raw.tasks[0].subtasks = [{ id: 'same' }, { id: 'same' }];
  assert.equal(validateBackup(raw).valid, false);
  raw.tasks[0].subtasks = [null];
  assert.equal(validateBackup(raw).valid, false);
});

test('money, counters, booleans and dangerous object keys fail closed', () => {
  for (const value of ['100', -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const raw = flat(); raw.wallet.stardust = value;
    assert.equal(validateBackup(raw).valid, false, String(value));
  }
  const boolean = flat(); boolean.tasks[0].completed = 'false';
  assert.equal(validateBackup(boolean).valid, false);
  const poison = flat(); poison.poolUnlockState.byPool = JSON.parse('{"__proto__":{"unlocked":true}}');
  assert.equal(validateBackup(poison).valid, false);
});

test('future/unknown partial formats are rejected with a compatibility explanation', () => {
  const future = flat(); future.appVersion = '99.0.0';
  assert.equal(validateBackup(future).valid, false);
  const unknown = fixture('1.8.1'); unknown.appVersion = '1.9.99';
  assert.equal(validateBackup(unknown).valid, false);
  assert.equal(validateBackup({ tasks: [] }).valid, false);
});

test('snapshot restoration does not roll historical quest dates forward or maximize draws', () => {
  const raw = fixture('3.4.4');
  const normalized = normalizeBackupPayload(raw);
  normalized.questProgress.daily.dateKey = '2020-01-02';
  normalized.questProgress.weekly.weekKey = '2020-W01';
  normalized.poolUnlockState.byPool.eternal_slumber_bloom.lifetimeDraws = 2;
  const migrated = migrateImportedData(normalized);
  assert.equal(migrated.questProgress.daily.dateKey, '2020-01-02');
  assert.equal(migrated.questProgress.weekly.weekKey, '2020-W01');
  assert.equal(migrated.poolUnlockState.byPool.eternal_slumber_bloom.lifetimeDraws, 2);
});

test('empty nested state and ID-only rows cannot be silently normalized into defaults', () => {
  for (const key of SNAPSHOT_KEYS.filter((key) => !['tasks', 'collection', 'habits', 'expeditions'].includes(key))) {
    const raw = canonical(); raw.data[key] = {};
    assert.equal(validateBackup(raw).valid, false, `accepted empty ${key}`);
  }
  for (const [key, row] of [['tasks', { id: 'task' }], ['habits', { id: 'habit' }],
    ['collection', { petId: 'pet_n01' }], ['expeditions', { id: 'expedition' }]]) {
    const raw = canonical(); raw.data[key] = [row];
    assert.equal(validateBackup(raw).valid, false, `accepted ID-only ${key}`);
  }
});

test('every serialized nested state field is required before legacy normalization', () => {
  const paths = ['tasks.0', 'tasks.0.subtasks.0', 'habits.0', 'collection.0',
    'achievements', 'taskStats', 'userPreferences', 'inventory', 'workshopStats', 'dailyCheckIn',
    'questProgress', 'questProgress.daily', 'questProgress.weekly', 'questProgress.stats',
    'questProgress.daily.quests.daily_complete_tasks_3',
    'explorationProgress', 'explorationProgress.areas.mist_forest', 'explorationProgress.stats',
    'collectionMilestones', 'globalMailboxState', 'poolUnlockState',
    'poolUnlockState.byPool.eternal_slumber_bloom', 'idempotentGrants', 'poolDebutSeen'];
  // Keys are identity/version metadata; these do not carry user progress and legacy
  // normalized collection state may omit owned. Optional source marks are not tested.
  const optional = new Set(['key', 'version', 'schemaVersion', 'owned', 'obtainedSource']);
  for (const path of paths) {
    const original = path.split('.').reduce((value, key) => value[key], canonical().data);
    for (const field of Object.keys(original).filter((key) => !optional.has(key))) {
      const raw = canonical();
      const object = path.split('.').reduce((value, key) => value[key], raw.data);
      delete object[field];
      assert.equal(validateBackup(raw).valid, false, `accepted missing ${path}.${field}`);
    }
  }
});

test('malformed nested maps, date/counter values and missing fixed entries fail closed', () => {
  const cases = [
    ['questProgress.daily', 'broken'], ['questProgress.daily.quests', {}],
    ['questProgress.daily.quests.daily_complete_tasks_3.current', '3'],
    ['explorationProgress.areas', {}], ['explorationProgress.areas.mist_forest.claimedMilestones', ['10']],
    ['inventory.itemUsageLogs', []], ['habits.0.logs.2026-09-22.stardustGiven', '5'],
    ['dailyCheckIn.history', [null]], ['dailyCheckIn.lastCheckInDate', '2026-02-30'],
    ['collection.0.bondUnlocks.notifiedLevels', [9]], ['collection.0.stars', 6],
    ['collection.0.bondLevel', 0], ['tasks.0.createdAt', {}],
    ['gachaStats.poolPity', {}], ['gachaStats.poolPity.standard.ssrPity', 8],
  ];
  for (const [path, value] of cases) {
    const raw = canonical(); const keys = path.split('.');
    const parent = keys.slice(0, -1).reduce((value, key) => value[key], raw.data);
    parent[keys.at(-1)] = value;
    assert.equal(validateBackup(raw).valid, false, `accepted invalid ${path}`);
  }
});

test('collection state cannot override trusted catalog presentation through companion merge', () => {
  for (const [key, value] of [['rarity', 'N"><span data-audit-injected="true"></span>'],
    ['image', 'https://example.invalid/pixel'], ['imageVariants', {}], ['name', 'Replacement name'],
    ['lore', 'Replacement lore'], ['personality', []], ['futureCatalogProperty', 'unknown']]) {
    const raw = canonical(); raw.data.collection[0][key] = value;
    assert.equal(validateBackup(raw).valid, false, `accepted catalog override ${key}`);
  }
});

test('valid daily, cancelled and weekly habit logs and item usage variants remain accepted', () => {
  const raw = canonical();
  raw.data.habits[0].frequency = 'weekly'; raw.data.habits[0].targetPerWeek = 2;
  raw.data.habits[0].logs['2026-09-21'] = { completed: false, rewardClaimed: true,
    stardustGiven: 5, bondGiven: 1, cancelledAt: '2026-09-21T04:00:00.000Z' };
  raw.data.habits[0].logs['week_2026-09-21'] = { weeklyRewardClaimed: true,
    weeklyGoalMet: true, claimedAt: '2026-09-22T04:00:00.000Z' };
  raw.data.inventory.itemUsageLogs = { '2026-09-22': { pet_n01: { bondItemsUsed: 1 } } };
  raw.data.collection[1].obtainedSource = 'morning_garden_unlock_reward';
  const result = validateBackup(raw);
  assert.equal(result.valid, true, result.error);
});

test('active/completed expeditions preserve full reward records and reject partial rewards', () => {
  const raw = canonical(); raw.data.expeditions = [expedition()];
  assert.equal(validateBackup(raw).valid, true);
  const normalized = migrateImportedData(normalizeBackupPayload(raw));
  assert.deepEqual(normalized.expeditions[0], raw.data.expeditions[0]);
  for (const key of Object.keys(expedition())) {
    const broken = structuredClone(raw); delete broken.data.expeditions[0][key];
    assert.equal(validateBackup(broken).valid, false, `missing expedition.${key}`);
  }
  for (const key of Object.keys(expedition().rewardsFinal)) {
    const broken = structuredClone(raw); delete broken.data.expeditions[0].rewardsFinal[key];
    assert.equal(validateBackup(broken).valid, false, `missing reward.${key}`);
  }
  for (const value of [[], 'corrupt', { stardust: 10 }]) {
    const broken = structuredClone(raw); broken.data.expeditions[0].rewardsFinal = value;
    assert.equal(validateBackup(broken).valid, false);
  }
  Object.assign(raw.data.expeditions[0], { completed: false, claimed: false, rewardsFinal: null });
  assert.equal(validateBackup(raw).valid, true);
});

test('daily history supports check-in, wheel-only and combined persisted variants', () => {
  const raw = canonical();
  const checkIn = { checkedInAt: '2026-09-22T04:00:00.000Z', checkInReward: {
    stardust: 20, adventureEnergy: 1, materials: {}, items: {} } };
  const wheel = { wheelReward: { type: 'stardust', amount: 30, label: '星塵 +30',
    materialId: undefined, itemId: undefined } };
  raw.data.dailyCheckIn.history = [{ date: '2026-09-20', ...checkIn },
    { date: '2026-09-21', ...wheel }, { date: '2026-09-22', ...checkIn, ...wheel }];
  assert.equal(validateBackup(raw).valid, true, 'pre-serialization undefined optional fields are normal');
  assert.equal(validateBackup(JSON.parse(JSON.stringify(raw))).valid, true);
  raw.data.dailyCheckIn.history[0].checkInReward = {};
  assert.equal(validateBackup(raw).valid, false);
});

test('export preflight permits fresh/mixed legacy stores but refuses existing malformed state', () => {
  const empty = () => ({ tasks: [], habits: [], collection: [], expeditions: [], meta: [] });
  assert.deepEqual(validateStoredSnapshot(empty()), []);
  for (const version of ['1.8.1', '3.0.1', '3.4.4']) {
    const data = fixture(version).data;
    const stored = empty();
    for (const key of ['tasks', 'habits', 'collection', 'expeditions']) stored[key] = data[key];
    stored.meta = SNAPSHOT_KEYS.filter((key) => !['tasks', 'habits', 'collection', 'expeditions'].includes(key)
      && data[key] !== undefined).map((key) => ({ ...data[key], key }));
    assert.deepEqual(validateStoredSnapshot(stored), [], `stored legacy ${version}`);
  }
  for (const row of [{ key: 'poolUnlockState' }, { key: 'collectionMilestones' },
    { key: 'inventory', items: {}, itemUsageLogs: 'corrupt' },
    { key: 'wallet', stardust: '12', adventureEnergy: 0, materials: {} }]) {
    const stored = empty(); stored.meta = [row];
    assert.ok(validateStoredSnapshot(stored).length, `accepted corrupt stored ${row.key}`);
  }
  const invalidRows = empty(); invalidRows.collection = [null];
  assert.ok(validateStoredSnapshot(invalidRows).length);
  const storedExpedition = empty(); const active = expedition(); delete active.rewards;
  storedExpedition.expeditions = [active];
  assert.deepEqual(validateStoredSnapshot(storedExpedition), [], 'writer omits normalized legacy rewards alias');
  assert.equal(Object.hasOwn(active, 'rewards'), false, 'preflight must not mutate DB rows');
});

test('claim markers that normalizers would discard or rewrite are rejected', () => {
  const raw = canonical();
  raw.data.collectionMilestones.claimedIds = COLLECTION_MILESTONE_DEFINITIONS.map((entry) => entry.id);
  assert.equal(validateBackup(raw).valid, true, 'schema must cover every supported milestone marker');
  raw.data.collectionMilestones.claimedIds = ['unknown_milestone'];
  assert.equal(validateBackup(raw).valid, false);
  const whitespace = canonical(); whitespace.data.globalMailboxState.claimedIds = ['mail', ' mail '];
  assert.equal(validateBackup(whitespace).valid, false);
});
