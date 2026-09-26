import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONBOARDING_KEY,
  isPristineOnboardingSnapshot,
  initialOnboardingStateForSnapshot,
  normalizeOnboardingState,
  advanceOnboardingForEvent,
} from '../src/onboardingService.js';

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
  assert.deepEqual(restored, stored);
  assert.equal(advanceOnboardingForEvent(restored, 'task-completed', { taskId: 'task-42' }).step, 'reward');
  assert.equal(advanceOnboardingForEvent({ ...restored, status: 'active' }, 'task-completed', { taskId: 'task-42' }).step, 'summon');
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
