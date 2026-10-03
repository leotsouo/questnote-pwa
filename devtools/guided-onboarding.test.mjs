import test from 'node:test';
import assert from 'node:assert/strict';
import { GUIDED_STEPS, initialGuidedState, normalizeGuidedState, transitionGuidedState,
  recoverGuidedState, tutorialDraft, tutorialReward } from '../src/guidedOnboardingCore.js';
import { awakeningEvents } from '../src/petAwakeningCore.js';
import { normalizeTask } from '../src/taskMigration.js';
import { projectReminderData } from '../src/reminderRules.js';
import { getTwilightJourney } from '../src/twilightPresentation.js';

const empty = () => ({ tasks: [], meta: [], collection: [], habits: [], expeditions: [] });
test('only a truly pristine installation enters practice; every legacy status bypasses it', () => {
  assert.equal(initialGuidedState(empty()).status, 'active');
  for (const key of Object.keys(empty())) {
    const snapshot = empty(); snapshot[key].push({ key: 'existing' });
    assert.equal(initialGuidedState(snapshot).status, 'existing');
  }
  for (const status of ['new', 'active', 'paused', 'dismissed', 'completed']) {
    assert.equal(initialGuidedState(empty(), { status }).status, 'existing');
  }
  assert.equal(initialGuidedState({}).status, 'existing');
});
test('read acknowledgements cannot bypass creation, completion or reward observation', () => {
  for (const step of ['OPEN_CREATE_QUEST', 'CREATE_TUTORIAL_QUEST', 'COMPLETE_TUTORIAL_QUEST']) {
    const s = normalizeGuidedState({ status: 'active', step });
    assert.deepEqual(transitionGuidedState(s, 'acknowledge'), s);
    assert.equal(transitionGuidedState(s, 'finish').status, 'active');
  }
  const s = normalizeGuidedState({ status: 'active', step: 'CREATE_TUTORIAL_QUEST' });
  assert.equal(transitionGuidedState(s, 'task-created', { taskId: 'real-task' }).step, s.step);
  assert.equal(transitionGuidedState(s, 'task-created', { taskId: 't', isTutorial: true, runId: 'stale' }).step, s.step);
});
test('the full practice flow requires matching real actions and versions completion', () => {
  let s = initialGuidedState(empty());
  for (let index = 0; index < 3; index++) s = transitionGuidedState(s, 'acknowledge');
  assert.equal(s.step, 'OPEN_CREATE_QUEST');
  const draft = tutorialDraft(s);
  assert.equal(draft.id, tutorialDraft(s).id);
  s = transitionGuidedState(s, 'editor-opened');
  s = transitionGuidedState(s, 'task-created', { isTutorial: true, runId: s.runId, taskId: draft.id });
  s = transitionGuidedState(s, 'acknowledge');
  assert.equal(transitionGuidedState(s, 'task-completed', { taskId: 'another', reward: tutorialReward('first') }).step, s.step);
  s = transitionGuidedState(s, 'task-completed', { taskId: s.taskId, reward: tutorialReward('first') });
  assert.equal(s.step, 'REWARD_REVEAL');
  s = transitionGuidedState(s, 'acknowledge'); s = transitionGuidedState(s, 'acknowledge');
  s = transitionGuidedState(s, 'finish');
  assert.equal(s.status, 'completed'); assert.equal(s.onboardingCompletedVersion, 1);
  assert.deepEqual(transitionGuidedState(s, 'finish'), s);
});
test('every checkpoint survives reload and reconciles committed task/receipt after interruption', () => {
  for (const step of GUIDED_STEPS) {
    const s = normalizeGuidedState({ status: 'active', step, runId: 'r' });
    assert.equal(normalizeGuidedState(JSON.parse(JSON.stringify(s))).step, step);
  }
  const s = normalizeGuidedState({ status: 'active', step: 'CREATE_TUTORIAL_QUEST', runId: 'r' });
  const task = { id: 'tutorial:r', isTutorial: true, tutorialRunId: 'r' };
  assert.equal(recoverGuidedState(s, [task]).step, 'RETURN_HOME');
  assert.equal(recoverGuidedState(s, [{ ...task, completed: true, rewardClaimed: true, tutorialReward: tutorialReward('first') }]).step, 'REWARD_REVEAL');
  assert.equal(recoverGuidedState({ ...s, step: 'COMPLETE_TUTORIAL_QUEST' }, []).step, 'OPEN_CREATE_QUEST');
  assert.equal(recoverGuidedState({ ...s, step: 'FINISH' }, [{ ...task, rewardClaimed: true }]).step, 'FINISH');
});
test('replay uses a new identity and explicitly labels preview rewards', () => {
  const first = tutorialDraft({ status: 'active', step: 'CREATE_TUTORIAL_QUEST' });
  const replay = tutorialDraft({ status: 'active', mode: 'replay', runId: 'replay-42', step: 'CREATE_TUTORIAL_QUEST' });
  assert.notEqual(first.id, replay.id); assert.equal(replay.tutorialMode, 'replay');
  assert.equal(tutorialReward('replay').preview, true);
  assert.equal(tutorialReward('first').amount, 20);
});
test('tutorial metadata survives migration and is excluded from awakening and reminders', () => {
  const task = normalizeTask({ id: 'tutorial:first', content: 'practice', isTutorial: true,
    tutorialRunId: 'first', tutorialMode: 'first', completed: true, completedAt: '2026-10-03T04:00:00Z' });
  assert.equal(task.isTutorial, true); assert.equal(task.tutorialRunId, 'first');
  assert.deepEqual(getTwilightJourney([{ ...task, plannedDate: '2026-10-03' }], '2026-10-03'),
    { pending: 0, done: 0, total: 0, percent: 0 });
  assert.deepEqual(awakeningEvents([task]), []);
  assert.deepEqual(projectReminderData([{ ...task, completed: false, plannedDate: '2026-10-03' }], [],
    { timeZone: 'Asia/Taipei' }, Date.parse('2026-10-03T04:00:00Z')).tasks, []);
});
