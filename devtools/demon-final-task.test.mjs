import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEMON_QUESTION, demonFinalTaskId, validateDemonFinalTask, assertDemonTaskUpdate, demonFinalTaskComplete } from '../src/demonFinalTaskCore.js';
import { DARKCOURT_AWAKENING_IDS } from '../src/petAwakeningProfiles.js';
import { beginPetAwakening, advancePetAwakening } from '../src/petAwakeningCore.js';
import { awakeningWizardStep, renderAwakeningReader } from '../src/petAwakeningView.js';
import { normalizeTask } from '../src/taskMigration.js';
import { getTodayViewSections, filterBySmartList } from '../src/taskFilterService.js';
import { validateSnapshotData } from '../src/backupSchema.js';
const at = '2026-10-08T01:00:00Z';
const later = '2026-10-08T02:00:00Z';
const ready = (id) => advancePetAwakening(beginPetAwakening(null, id, at), [
  ...[1, 2, 3].map((n) => ({ key: `task:t${n}`, at: later })),
  { key: 'expedition:e1', at: later, startedAt: at, areaId: 'darkcrown_border', petIds: [id] },
]);
const task = (id = 'pet_ur28') => ({ id: demonFinalTaskId(id), systemTask: 'demon-final', awakeningPetId: id,
  title: '惡魔的趣味', content: '惡魔的趣味\n完成一直拖延的整理', priority: 'important', type: 'one_time', categoryId: 'general',
  startDate: null, dueDate: null, plannedDate: '2026-10-08', isPlannedToday: true, plannedTime: null,
  subtasks: [], completed: false, rewardClaimed: false, createdAt: at, updatedAt: at, completedAt: null, lastRewardClaimedAt: null });
const catalog = JSON.parse(readFileSync(new URL('../data/pet-awakening.json', import.meta.url)));

test('all seven dark court partners require an answer and completion before food/ritual', () => {
  for (const id of DARKCOURT_AWAKENING_IDS) {
    const pet = { id, owned: true, bondLevel: 5, name: '<惡魔>' };
    const state = { awakeningCatalog: catalog, petAwakening: ready(id), bondJourney: { byPet: { [id]: { chapters: { 5: { claimedAt: at } } } } }, inventory: { items: { item_chaos_ember_tart: 1 } }, tasks: [] };
    assert.equal(awakeningWizardStep(pet, state), 'demon-question');
    const before = renderAwakeningReader(pet, state);
    assert.ok(before.includes(DEMON_QUESTION));
    assert.match(before, /id="awakening-question"[^>]*>\? \? \?</);
    assert.ok(!before.includes('惡魔的趣味'));
    assert.ok(!before.includes('不能編輯') && !before.includes('不能刪除'));
    state.tasks = [task(id)];
    assert.equal(awakeningWizardStep(pet, state), 'demon-task');
    const after = renderAwakeningReader(pet, state);
    assert.ok(after.includes('惡魔的趣味'));
    assert.ok(after.includes('哈、哈、哈……'));
    assert.ok(after.includes('不能編輯、刪除或移出今日'));
    state.tasks[0].completed = true; state.tasks[0].completedAt = later;
    assert.equal(awakeningWizardStep(pet, state), 'ritual');
    state.inventory.items = {};
    assert.equal(awakeningWizardStep(pet, state), 'food');
    Object.assign(state.petAwakening.byPet[id], { status: 'awakened', awakenedAt: later, tokenConsumedAt: later });
    state.tasks = [];
    assert.equal(awakeningWizardStep(pet, state), 'done');
  }
});

test('unfinished promise stays in Today after days pass without a deadline; completed promise leaves tomorrow', () => {
  const t = task();
  assert.equal(normalizeTask(t, '2026-11-30').isPlannedToday, true);
  assert.deepEqual(getTodayViewSections([t], '2026-11-30').plannedIncomplete, [t]);
  assert.deepEqual(filterBySmartList('today', [t], '2026-11-30'), [t]);
  assert.deepEqual(filterBySmartList('overdue', [t], '2026-11-30'), []);
  Object.assign(t, { completed: true, completedAt: later });
  assert.equal(normalizeTask(t, '2026-11-30').isPlannedToday, false);
  assert.deepEqual(getTodayViewSections([t], '2026-11-30').planned, []);
});

test('promise permits completion and reward receipt, rejects editing, unplanning and undo', () => {
  const t = task();
  for (const updates of [{ content: 'different' }, { title: 'different' }, { plannedDate: null }, { dueDate: '2026-11-30' }, { systemTask: null }, { awakeningPetId: 'pet_ur29' }]) {
    assert.throws(() => assertDemonTaskUpdate(t, { ...t, ...updates }));
  }
  const done = { ...t, completed: true, completedAt: later, updatedAt: later };
  assert.doesNotThrow(() => assertDemonTaskUpdate(t, done));
  assert.doesNotThrow(() => assertDemonTaskUpdate(done, { ...done, rewardClaimed: true, lastRewardClaimedAt: later }));
  assert.throws(() => assertDemonTaskUpdate(done, { ...done, completed: false, completedAt: null }));
  assert.throws(() => assertDemonTaskUpdate(null, t));
  assert.ok(demonFinalTaskComplete([done], t.awakeningPetId));
  assert.equal(demonFinalTaskComplete([{ ...done, systemTask: null }], t.awakeningPetId), false);
});

test('backup keeps the system identity and rejects malformed or contradictory final tasks', () => {
  const t = task(); const data = { tasks: [t], petAwakening: ready(t.awakeningPetId) };
  assert.deepEqual(validateSnapshotData(data, []), []);
  assert.deepEqual(validateDemonFinalTask(t), []);
  for (const changes of [{ systemTask: undefined }, { content: '惡魔的趣味\n   ' }, { awakeningPetId: 'pet_ur29' }, { dueDate: '2026-11-30' }]) {
    assert.ok(validateSnapshotData({ ...data, tasks: [{ ...t, ...changes }] }, []).length);
  }
  assert.ok(validateSnapshotData({ tasks: [t] }, []).length);
});
