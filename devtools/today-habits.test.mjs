import test from 'node:test';
import assert from 'node:assert/strict';
import { getTodayDailyHabits, renderTodayHabits } from '../src/todayHabitsView.js';

const today = '2026-10-02';
const habit = (id, extra = {}) => ({ id, name: id, frequency: 'daily', isActive: true, logs: {}, ...extra });

test('today shows active daily habits, with pending first and no mutation of the saved data', () => {
  const habits = [habit('done', { logs: { [today]: { completed: true } } }), habit('pending'),
    habit('weekly', { frequency: 'weekly' }), habit('archived', { archivedAt: '2026-10-01' }),
    habit('inactive', { isActive: false }), habit('yesterday', { logs: { '2026-10-01': { completed: true } } })];
  const snapshot = structuredClone(habits);
  assert.deepEqual(getTodayDailyHabits(habits, today).map((entry) => entry.id), ['pending', 'yesterday', 'done']);
  assert.deepEqual(habits, snapshot);
  assert.deepEqual(getTodayDailyHabits(habits, '2026-10-03').map((entry) => entry.id), ['done', 'pending', 'yesterday']);
});

test('category filtering applies to habits without reclassifying or creating tasks', () => {
  const habits = [habit('general'), habit('health', { categoryId: 'health' })];
  assert.deepEqual(getTodayDailyHabits(habits, today, 'general').map((entry) => entry.id), ['general']);
  assert.equal(renderTodayHabits(habits, { today, categoryFilter: 'missing' }), '');
});

test('controls reflect the stored date, escape user text and retain undo after completion', () => {
  const html = renderTodayHabits([habit('id"', { name: '<img onerror="bad()">',
    logs: { [today]: { completed: true } } })], { today, busy: true });
  assert.ok(!html.includes('<img'));
  assert.match(html, /&lt;img/);
  assert.match(html, /data-id="id&quot;"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /habit-uncomplete/);
  assert.match(html, /disabled/);
  assert.match(html, /1 \/ 1/);
});

test('empty and failed loads have distinct recovery actions', () => {
  assert.match(renderTodayHabits([], { today }), /新增每日習慣/);
  const failed = renderTodayHabits([], { today, loadError: true });
  assert.match(failed, /暫時無法載入/);
  assert.ok(!failed.includes('habit-create-first'));
});
