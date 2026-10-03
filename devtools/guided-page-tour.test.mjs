import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_LESSONS, transitionPageTour } from '../src/guidedPageTour.js';

test('page tour covers twelve real pages and progresses to completion', () => {
  assert.equal(new Set(PAGE_LESSONS.map((lesson) => lesson.view)).size, 12);
  let state = transitionPageTour(null, 'start');
  for (let i = 0; i < PAGE_LESSONS.length; i += 1) {
    assert.equal(state.cursor, i);
    state = transitionPageTour(state, 'next', i);
  }
  assert.equal(state.status, 'completed');
});

test('pause survives serialization; resume preserves position; completed replay starts over', () => {
  let state = transitionPageTour({ cursor: 7, status: 'active' }, 'pause', 7);
  state = transitionPageTour(JSON.parse(JSON.stringify(state)), 'start');
  assert.equal(state.cursor, 7);
  assert.equal(state.status, 'active');
  assert.equal(transitionPageTour({ status: 'completed', cursor: 14 }, 'start').cursor, 0);
});

test('stale rapid next and paused actions cannot skip a lesson', () => {
  const first = transitionPageTour(null, 'start');
  const next = transitionPageTour(first, 'next', 0);
  assert.deepEqual(transitionPageTour(next, 'next', 0), next);
  const paused = transitionPageTour(next, 'pause', 1);
  assert.deepEqual(transitionPageTour(paused, 'next', 1), paused);
  assert.equal(transitionPageTour(first, 'back', 0).cursor, 0);
});

test('invalid saved cursor is bounded without changing economy or formal task data', () => {
  assert.equal(transitionPageTour({ cursor: 999 }, 'start').cursor, 0);
  const raw = { status: 'active', cursor: 3, wallet: { stardust: 123 }, taskIds: ['own'] };
  const next = transitionPageTour(raw, 'next', 3);
  assert.deepEqual(next.wallet, raw.wallet);
  assert.deepEqual(next.taskIds, raw.taskIds);
});
