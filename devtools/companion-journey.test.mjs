import test from 'node:test';
import assert from 'node:assert/strict';
import { planTaskCompletion } from '../src/rewardService.js';
import { createCollectionEntry } from '../src/collectionService.js';
import { getTaskMemories, getMemoryProgress, getCompletionLine, getMemoryHeading } from '../src/companionJourneyService.js';
import { buildJourneyHtml, buildCompletionFeedback } from '../src/companionJourneyView.js';
import { validateSnapshotData } from '../src/backupSchema.js';

const now = '2026-09-27T01:00:00.000Z';
const task = (overrides = {}) => ({ id: 'task-1', title: '完成報告', content: '完成報告',
  completed: false, rewardClaimed: false, createdAt: now, ...overrides });
const pet = (overrides = {}) => ({ ...createCollectionEntry('pet_n04', now), isCompanion: true, ...overrides });
const finish = (item = task(), companion = pet()) => planTaskCompletion(item, null, companion ? [companion] : [], null, now);

test('first completion atomically records actual companion and unchanged reward values', () => {
  for (const [priority, amount, energy, bond] of [['normal', 20, 1, 5], ['important', 45, 2, 12], ['urgent', 80, 3, 20]]) {
    const plan = finish(task({ priority, worthRemembering: true }));
    assert.equal(plan.result.amount, amount);
    assert.equal(plan.result.energy, energy);
    assert.equal(plan.result.bond.expGained, bond);
    assert.equal(plan.result.memory.petId, 'pet_n04');
    assert.equal(plan.result.memory.ordinal, 1);
    assert.equal(plan.result.memory.meaningful, true);
    assert.equal(plan.puts.find((write) => write.store === 'collection').value.journeyTaskCount, 1);
    assert.equal(plan.result.task.completed, true);
    assert.deepEqual(validateSnapshotData({ tasks: [plan.result.task] }, []), []);
  }
});

test('retry and undo/recomplete do not award again or change the original memory', () => {
  const first = finish();
  const companion = first.puts.find((write) => write.store === 'collection').value;
  const wallet = first.puts.find((write) => write.store === 'meta').value;
  const retry = planTaskCompletion(first.result.task, wallet, [companion], null, now);
  assert.deepEqual(retry.puts, []);
  assert.equal(retry.result.justCompleted, false);
  const second = finish({ ...first.result.task, completed: false, completedAt: null }, pet({ petId: 'pet_r01' }));
  assert.equal(second.result.amount, 0);
  assert.equal(second.result.bond, null);
  assert.deepEqual(second.result.task.completionMemory, first.result.memory);
  assert.deepEqual(second.puts.map((write) => write.store), ['tasks']);
});

test('no companion and legacy completions never gain fabricated shared history', () => {
  const personal = finish(task(), null).result;
  assert.equal(personal.memory.petId, null);
  assert.equal(personal.memory.milestone, false);
  assert.equal(personal.bond, null);
  assert.equal(getMemoryHeading(personal.memory), '你又往前了一步');
  const old = task({ completed: true, rewardClaimed: true });
  assert.equal(finish(old).result.task.completionMemory, undefined);
  assert.deepEqual(getTaskMemories([old, personal.task], 'pet_n04'), []);
});

test('milestones use stored shared count and bond progress reflects real thresholds', () => {
  const plan = finish(task(), pet({ journeyTaskCount: 9, bondExp: 45 }));
  assert.equal(plan.result.memory.ordinal, 10);
  assert.equal(plan.result.memory.milestone, true);
  assert.equal(plan.result.bond.newLevel, 2);
  assert.equal(getMemoryProgress(plan.result.memory).current, 0);
  assert.equal(getMemoryProgress(plan.result.memory).max, 100);
  assert.match(getMemoryProgress(plan.result.memory).unlocked, /已解鎖親近台詞/);
  const max = finish(task(), pet({ bondExp: 500, bondLevel: 5 })).result.memory;
  assert.equal(getMemoryProgress(max).percent, 100);
  assert.match(getMemoryProgress(max).next, /已解鎖/);
});

test('history filters by real completion and pet, renders input as text, and keeps authored personality', () => {
  const result = finish(task({ title: '<img src=x onerror=alert(1)>' })).result;
  const history = getTaskMemories([result.task, task(), { ...result.task, id: 'undone', completed: false }]);
  assert.equal(history.length, 1);
  const character = { id: 'pet_n04', name: '<script>bad</script>', dialogues: { praise: ['做到了！'] } };
  const html = buildJourneyHtml([result.task], [character]);
  assert.ok(!html.includes('<img') && !html.includes('<script>'));
  assert.match(html, /&lt;img/);
  assert.equal(getCompletionLine(character, result.memory), '做到了！');
  assert.equal(getCompletionLine({ ...character, dialogues: { praise: ['連續完成好多任務！', '做到了！'] } }, result.memory), '做到了！');
  assert.ok(!buildCompletionFeedback(result.memory, character, result).includes('<script>'));
  const ordinary = { ...result.memory, ordinal: 2, milestone: false };
  assert.ok(!buildCompletionFeedback(ordinary, character, result).includes('<progress'));
});

test('backup rejects malformed optional memories and accepts older rows without them', () => {
  const result = finish();
  const row = result.result.task;
  assert.deepEqual(validateSnapshotData({ tasks: [row] }, []), []);
  for (const changes of [{ petId: 'not-a-pet' }, { ordinal: -1 }, { meaningful: 'yes' }, { bondAfter: NaN }]) {
    assert.ok(validateSnapshotData({ tasks: [{ ...row, completionMemory: { ...row.completionMemory, ...changes } }] }, []).length);
  }
  const old = { ...row }; delete old.completionMemory; delete old.worthRemembering;
  assert.deepEqual(validateSnapshotData({ tasks: [old] }, []), []);
});
