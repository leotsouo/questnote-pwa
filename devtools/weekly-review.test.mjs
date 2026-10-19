import test from 'node:test';
import assert from 'node:assert/strict';
import { getReviewWeek, buildWeeklyReview, buildSeniorWeeklySummary, formatWeekRange, isMondayCardDue }
  from '../src/weeklyReviewService.js';

// 2026-10-15 is a Thursday; its week runs Monday 10-12 to Sunday 10-18.
const TODAY = '2026-10-15';
const localIso = (date, time = '10:00:00') => new Date(`${date}T${time}`).toISOString();
const log = (...dates) => Object.fromEntries(dates.map((date) => [date, { completed: true, completedAt: localIso(date) }]));

test('weeks run Monday to Sunday; the current week counts only the days that have happened', () => {
  assert.deepEqual(getReviewWeek(TODAY, 0), { start: '2026-10-12', end: '2026-10-18', isCurrentWeek: true, elapsedDays: 4 });
  assert.deepEqual(getReviewWeek(TODAY, 1), { start: '2026-10-05', end: '2026-10-11', isCurrentWeek: false, elapsedDays: 7 });
  assert.equal(getReviewWeek('2026-10-18', 0).start, '2026-10-12', 'Sunday belongs to the week that started on Monday');
  assert.equal(getReviewWeek('2026-10-18', 0).elapsedDays, 7);
  assert.equal(getReviewWeek('2026-10-19', 0).start, '2026-10-19');
  assert.equal(getReviewWeek('2026-10-19', 0).elapsedDays, 1);
});

test('tasks count when completed inside the week, by local date, newest first', () => {
  const tasks = [
    { id: 'a', title: '週一', completed: true, completedAt: localIso('2026-10-12', '08:00:00') },
    { id: 'b', title: '週四', completed: true, completedAt: localIso('2026-10-15', '21:00:00') },
    { id: 'c', title: '上週日', completed: true, completedAt: localIso('2026-10-11', '23:30:00') },
    { id: 'd', title: '未完成', completed: false, completedAt: null },
    { id: 'e', title: '取消後沒有時間', completed: true, completedAt: null },
    { id: 'f', content: '只有內容\n第二行', completed: true, completedAt: localIso('2026-10-13') },
  ];
  const review = buildWeeklyReview({ tasks, today: TODAY });
  assert.equal(review.tasks.completed, 3);
  assert.deepEqual(review.tasks.recent.map((task) => task.id), ['b', 'f', 'a']);
  assert.equal(review.tasks.recent[1].title, '只有內容\n第二行');
  const lastWeek = buildWeeklyReview({ tasks, today: TODAY, weekOffset: 1 });
  assert.deepEqual(lastWeek.tasks.recent.map((task) => task.id), ['c']);
});

test('habits report this week against the right target, distinct active days and streaks', () => {
  const habits = [
    { id: 'walk', name: '散步', frequency: 'daily', isActive: true, logs: log('2026-10-11', '2026-10-12', '2026-10-13', '2026-10-15') },
    { id: 'read', name: '閱讀', frequency: 'weekly', targetPerWeek: 2, isActive: true,
      logs: { ...log('2026-10-13', '2026-10-14'), 'week_2026-10-12': { weeklyRewardClaimed: true, claimedAt: localIso('2026-10-14') } } },
    { id: 'old', name: '已封存', frequency: 'daily', isActive: false, logs: log('2026-10-12') },
  ];
  const review = buildWeeklyReview({ habits, today: TODAY });
  assert.deepEqual(review.habits.items.map((item) => item.id), ['walk', 'read'], 'archived habits are left out');
  const [walk, read] = review.habits.items;
  assert.deepEqual({ done: walk.done, target: walk.target, met: walk.met, streak: walk.streak }, { done: 3, target: 4, met: false, streak: 1 });
  assert.deepEqual({ done: read.done, target: read.target, met: read.met, weeklyRewardClaimed: read.weeklyRewardClaimed },
    { done: 2, target: 2, met: true, weeklyRewardClaimed: true });
  assert.equal(review.habits.completions, 5);
  assert.equal(review.habits.activeDays, 4, '10-12, 10-13, 10-14 and 10-15 each had at least one habit');

  const lastWeek = buildWeeklyReview({ habits, today: TODAY, weekOffset: 1 });
  assert.equal(lastWeek.habits.items[0].done, 1);
  assert.equal(lastWeek.habits.items[0].target, 7);
  assert.equal(lastWeek.habits.items[0].streak, null, 'no "current streak" on a past week');
  assert.equal(lastWeek.habits.items[1].weeklyRewardClaimed, false);
});

test('check-ins come from the stored history; a missing record is reported as unavailable', () => {
  const dailyCheckIn = { history: [
    { date: '2026-10-12', checkedInAt: localIso('2026-10-12') },
    { date: '2026-10-13', checkedInAt: localIso('2026-10-13') },
    { date: '2026-10-14', wheelReward: { type: 'stardust' } },
    { date: '2026-10-09', checkedInAt: localIso('2026-10-09') },
  ] };
  assert.deepEqual(buildWeeklyReview({ dailyCheckIn, today: TODAY }).checkIns, { available: true, days: 2 });
  assert.deepEqual(buildWeeklyReview({ dailyCheckIn, today: TODAY, weekOffset: 1 }).checkIns, { available: true, days: 1 });
  assert.deepEqual(buildWeeklyReview({ today: TODAY }).checkIns, { available: false, days: 0 });
});

test('an empty save still produces a complete review', () => {
  const review = buildWeeklyReview({ today: TODAY });
  assert.equal(review.tasks.completed, 0);
  assert.deepEqual(review.habits, { items: [], completions: 0, activeDays: 0 });
  assert.deepEqual(buildSeniorWeeklySummary(review), { tasks: 0, habitDays: 0, message: '這週從一件小事開始就很好。' });
});

test('senior summary keeps two numbers and one line that fits them', () => {
  const base = buildWeeklyReview({ today: TODAY });
  const make = (tasks, habitDays) => buildSeniorWeeklySummary({ ...base, tasks: { ...base.tasks, completed: tasks },
    habits: { ...base.habits, activeDays: habitDays } });
  assert.equal(make(2, 3).message, '事情和習慣都有照顧到，很棒。');
  assert.equal(make(2, 0).message, '完成的每一件事都算數。');
  assert.equal(make(0, 3).message, '習慣有在持續，繼續保持。');
  assert.deepEqual([make(2, 3).tasks, make(2, 3).habitDays], [2, 3]);
});

test('week label and the Monday home card', () => {
  assert.equal(formatWeekRange(buildWeeklyReview({ today: TODAY })), '10/12（一）～10/18（日）');
  assert.equal(isMondayCardDue('2026-10-19', null), true);
  assert.equal(isMondayCardDue('2026-10-19', '2026-10-19'), false, 'dismissed for this week');
  assert.equal(isMondayCardDue('2026-10-19', '2026-10-12'), true, 'an older dismissal does not carry over');
  assert.equal(isMondayCardDue('2026-10-20', null), false, 'only on Mondays');
});
