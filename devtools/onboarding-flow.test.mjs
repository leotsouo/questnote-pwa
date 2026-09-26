import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONBOARDING_KEY,
  isPristineOnboardingSnapshot,
  initialOnboardingStateForSnapshot,
  normalizeOnboardingState,
  advanceOnboardingForEvent,
  startLesson, pauseLesson, advanceLesson, previousLessonStep,
} from '../src/onboardingService.js';
import { LESSONS, getLessonStepContent, getLessonAvailability } from '../src/onboardingLessons.js';

const emptySnapshot = () => ({ tasks: [], meta: [], collection: [], expeditions: [], habits: [] });

test('first-use eligibility requires an entirely empty profile before normal initialization', () => {
  assert.equal(isPristineOnboardingSnapshot(emptySnapshot()), true);
  for (const store of Object.keys(emptySnapshot())) {
    const snapshot = emptySnapshot();
    snapshot[store].push({ key: 'existing' });
    assert.equal(isPristineOnboardingSnapshot(snapshot), false, store);
  }
  assert.equal(isPristineOnboardingSnapshot({ tasks: [] }), false);
  assert.equal(initialOnboardingStateForSnapshot(emptySnapshot()).status, 'new');
  assert.equal(initialOnboardingStateForSnapshot({ ...emptySnapshot(), meta: [{ key: 'wallet' }] }).status, 'dismissed');
});

test('saved step and practice task survive normalization for resume', () => {
  const stored = { key: ONBOARDING_KEY, schemaVersion: 1, status: 'paused', step: 'reward', taskId: 'task-42' };
  const restored = normalizeOnboardingState(stored);
  assert.equal(restored.schemaVersion, 2);
  assert.equal(restored.status, stored.status);
  assert.equal(restored.step, stored.step);
  assert.equal(restored.taskId, stored.taskId);
  assert.equal(advanceOnboardingForEvent(restored, 'task-completed', { taskId: 'task-42' }).step, 'reward');
  assert.equal(advanceOnboardingForEvent({ ...restored, status: 'active' }, 'task-completed', { taskId: 'task-42' }).step, 'summon');
});

test('existing users retain core decisions and receive unstarted chapters without a welcome', () => {
  for (const status of ['completed', 'dismissed', 'paused', 'active']) {
    const migrated = normalizeOnboardingState({ schemaVersion: 1, status, step: 'collection', taskId: 'task-42' });
    assert.equal(migrated.status, status);
    assert.equal(migrated.step, 'collection');
    assert.equal(migrated.activeLesson, null);
    assert.ok(LESSONS.every((lesson) => migrated.lessons[lesson.id].status === 'new'));
    assert.deepEqual(normalizeOnboardingState(migrated), migrated);
  }
});

test('chapters preserve reading position and practice evidence independently of core progress', () => {
  let state = normalizeOnboardingState({ status: 'active', step: 'reward', taskId: 'mine' });
  state = startLesson(state, 'workshop');
  assert.equal(state.status, 'paused');
  state = advanceLesson(state);
  state = advanceOnboardingForEvent(state, 'item-crafted');
  assert.equal(state.lessons.workshop.step, 'gift');
  assert.deepEqual(state.lessons.workshop.practiced, ['craft']);
  state = pauseLesson(state);
  assert.equal(state.activeLesson, null);
  assert.deepEqual(advanceOnboardingForEvent(state, 'gift-given'), state);
  state = startLesson(normalizeOnboardingState(state), 'workshop');
  assert.equal(state.lessons.workshop.step, 'gift');
  state = advanceOnboardingForEvent(state, 'gift-given');
  assert.equal(state.lessons.workshop.status, 'practiced');
  assert.equal(state.activeLesson, null);
  assert.equal(state.taskId, 'mine');
  assert.equal(state.step, 'reward');
});

test('understanding a chapter does not claim practice or complete other chapters', () => {
  let state = startLesson({ status: 'completed' }, 'stars');
  for (let i = 0; i < 3; i++) state = advanceLesson(state);
  assert.equal(state.lessons.stars.status, 'understood');
  assert.deepEqual(state.lessons.stars.practiced, []);
  assert.equal(state.lessons.bond.status, 'new');
  assert.equal(state.status, 'completed');
  assert.deepEqual(advanceOnboardingForEvent(state, 'star-upgraded'), state);
});

test('only the matching successful action at the practice step counts', () => {
  for (const lesson of LESSONS) {
    let state = startLesson({ status: 'dismissed' }, lesson.id);
    for (const step of lesson.steps) {
      assert.equal(state.lessons[lesson.id].step, step);
      assert.deepEqual(advanceOnboardingForEvent(state, 'operation-failed'), state);
      assert.deepEqual(advanceOnboardingForEvent(state, 'view-changed'), state);
      state = lesson.practice[step] ? advanceOnboardingForEvent(state, lesson.practice[step]) : advanceLesson(state);
    }
    assert.equal(state.lessons[lesson.id].status, 'practiced');
  }
});

test('switching chapters pauses the old one; back and replay retain completed practice', () => {
  let state = startLesson({}, 'expedition');
  state = advanceLesson(state);
  state = advanceOnboardingForEvent(state, 'expedition-started');
  state = startLesson(state, 'bond');
  assert.equal(state.lessons.expedition.status, 'paused');
  state = startLesson(state, 'expedition');
  assert.equal(state.lessons.expedition.step, 'claim');
  state = previousLessonStep(state);
  assert.equal(state.lessons.expedition.step, 'dispatch');
  state = advanceLesson(state);
  state = advanceOnboardingForEvent(state, 'expedition-claimed');
  assert.equal(state.lessons.expedition.status, 'practiced');
  state = startLesson(state, 'expedition');
  assert.equal(state.lessons.expedition.step, 'prepare');
  assert.deepEqual(state.lessons.expedition.practiced, ['dispatch', 'claim']);
});

test('malformed chapter data cannot activate multiple coaches or invent practice', () => {
  const state = normalizeOnboardingState({ status: 'active', activeLesson: 'stars', lessons: {
    stars: { status: 'active', step: 'unknown', practiced: ['upgrade', 'fake', 'upgrade'] },
    bond: { status: 'active', step: 'pet', practiced: 'pet' },
  } });
  assert.equal(state.status, 'paused');
  assert.equal(state.lessons.stars.step, 'fragments');
  assert.deepEqual(state.lessons.stars.practiced, ['upgrade']);
  assert.equal(state.lessons.bond.status, 'paused');
  assert.deepEqual(state.lessons.bond.practiced, []);
});

test('teaching previews handle absent resources, full stars, cooldown and changing catalogs without writes', () => {
  const state = { enrichedCollection: [{ id: 'pet', name: '<Buddy>', owned: true, stars: 1, fragments: 2 }],
    wallet: { adventureEnergy: 1, materials: { leaf: 1 } }, inventory: { items: {} },
    craftablesCatalog: [{ id: 'food', name: '測試配方', enabled: true, recipe: { leaf: 4 }, effect: { bondExp: 7 } }],
    materialsCatalog: [{ id: 'leaf', name: '測試材料', sourceArea: '測試地區' }],
    expeditionAreas: [{ id: 'mist_forest', name: '測試森林', energyCost: 9, durationMinutes: 23 }] };
  const before = JSON.stringify(state);
  assert.match(getLessonStepContent('stars', 'upgrade', state).body, /5 個/);
  assert.match(getLessonStepContent('workshop', 'craft', state).body, /還差 3/);
  assert.match(getLessonStepContent('workshop', 'craft', state).body, /測試地區/);
  assert.match(getLessonStepContent('expedition', 'prepare', state).body, /9 點能量.*23 分鐘/);
  for (const lesson of LESSONS) for (const step of lesson.steps) assert.ok(getLessonStepContent(lesson.id, step, {}).body);
  assert.equal(JSON.stringify(state), before);
  state.enrichedCollection[0].stars = 5;
  assert.match(getLessonAvailability('stars', state), /滿星/);
  state.companion = { lastPettedAt: new Date().toISOString() };
  assert.match(getLessonAvailability('bond', state), /還需等/);
});

test('guide advances only from successful matching product actions', () => {
  let state = normalizeOnboardingState({ status: 'active', step: 'task' });
  assert.equal(state.key, ONBOARDING_KEY);
  assert.deepEqual(advanceOnboardingForEvent(state, 'task-completed', { taskId: 'other' }), state);
  state = advanceOnboardingForEvent(state, 'task-created', { taskId: 'mine' });
  assert.equal(state.step, 'reward');
  assert.equal(state.taskId, 'mine');
  assert.deepEqual(advanceOnboardingForEvent(state, 'task-completed', { taskId: 'other' }), state);
  state = advanceOnboardingForEvent(state, 'task-completed', { taskId: 'mine' });
  assert.equal(state.step, 'summon');
  assert.deepEqual(advanceOnboardingForEvent(state, 'mailbox-claimed'), state);
  state = advanceOnboardingForEvent(state, 'summon-completed');
  assert.equal(state.step, 'collection');
  state = advanceOnboardingForEvent(state, 'companion-set');
  assert.equal(state.step, 'expedition');
  state = advanceOnboardingForEvent(state, 'expedition-started');
  assert.equal(state.status, 'completed');
});

test('creating a task after choosing to continue later attaches it to the reward step', () => {
  const state = normalizeOnboardingState({ status: 'active', step: 'reward' });
  const next = advanceOnboardingForEvent(state, 'task-created', { taskId: 'new-task' });
  assert.equal(next.step, 'reward');
  assert.equal(next.taskId, 'new-task');
});

test('dismissed and paused guides never advance from background actions', () => {
  for (const status of ['paused', 'dismissed', 'completed']) {
    const state = normalizeOnboardingState({ status, step: 'task' });
    assert.deepEqual(advanceOnboardingForEvent(state, 'task-created', { taskId: 'mine' }), state);
  }
  assert.equal(normalizeOnboardingState({ status: 'unknown', step: 'unknown' }).status, 'dismissed');
});
