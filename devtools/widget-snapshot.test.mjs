/**
 * V3.14.0 phase 2 prep: the iOS home-screen widget shows unfinished to-dos from a snapshot the
 * app writes after every refresh. Order: overdue → today → upcoming due date → the rest.
 * Tutorial and finished tasks never appear, matching the icon badge count.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildWidgetSnapshot, WIDGET_SNAPSHOT_LIMIT } from '../src/widgetSnapshot.js';
import { syncNativeWidget, resetNativeWidgetCache, parseWidgetLink, listenForWidgetLinks, WIDGET_LINK_EVENT } from '../src/nativeBridge.js';
import { countUnfinishedTasks } from '../src/appBadge.js';

const TODAY = '2026-10-25';
const task = (id, extra = {}) => ({ id, title: `任務 ${id}`, completed: false, priority: 'normal',
  createdAt: `2026-10-01T00:00:0${id.length}Z`, plannedDate: null, dueDate: null, ...extra });
const tasks = [
  task('later'),
  task('due-soon', { dueDate: '2026-10-28' }),
  task('due-later', { dueDate: '2026-11-30' }),
  task('today-plan', { plannedDate: TODAY }),
  task('overdue', { dueDate: '2026-10-20' }),
  task('due-today', { dueDate: TODAY }),
  task('done', { completed: true }),
  task('tutorial:1', { isTutorial: true }),
];

test('orders overdue, today, upcoming due dates, then the rest', () => {
  const snapshot = buildWidgetSnapshot(tasks, TODAY);
  assert.deepEqual(snapshot.tasks.map((t) => t.id), ['overdue', 'today-plan', 'due-today', 'due-soon', 'due-later', 'later']);
  assert.equal(snapshot.unfinishedCount, countUnfinishedTasks(tasks));
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.today, TODAY);
});

test('keeps only widget fields and bounds the size', () => {
  const many = Array.from({ length: 40 }, (_, i) => task(`t${i}`, { content: '很長的內容'.repeat(50), title: 'x'.repeat(200) }));
  const snapshot = buildWidgetSnapshot(many, TODAY);
  assert.equal(snapshot.tasks.length, WIDGET_SNAPSHOT_LIMIT);
  assert.equal(snapshot.unfinishedCount, 40);
  assert.deepEqual(Object.keys(snapshot.tasks[0]).sort(), ['dueDate', 'id', 'plannedDate', 'priority', 'title']);
  assert.ok(snapshot.tasks[0].title.length <= 60);
});

test('sends the snapshot to the native bridge only inside the app and only when it changes', async () => {
  resetNativeWidgetCache();
  const calls = [];
  const capacitor = { isNativePlatform: () => true,
    nativePromise: async (plugin, method, options) => { calls.push([plugin, method, options.snapshot.unfinishedCount]); } };
  assert.equal(await syncNativeWidget(tasks, { capacitor, today: TODAY }), 'sent');
  assert.equal(await syncNativeWidget(tasks, { capacitor, today: TODAY }), 'unchanged');
  assert.deepEqual(calls, [['QuestNoteWidgetBridge', 'update', 6]]);
  assert.equal(await syncNativeWidget(tasks, { capacitor: undefined, today: TODAY }), 'unavailable');
  assert.equal(await syncNativeWidget(tasks, { capacitor: { isNativePlatform: () => false }, today: TODAY }), 'unavailable');
});

test('a failing bridge is silent and retried on the next refresh', async () => {
  resetNativeWidgetCache();
  let attempts = 0;
  const capacitor = { isNativePlatform: () => true, nativePromise: async () => { attempts += 1; throw new Error('not implemented'); } };
  assert.equal(await syncNativeWidget(tasks, { capacitor, today: TODAY }), 'failed');
  assert.equal(await syncNativeWidget(tasks, { capacitor, today: TODAY }), 'failed');
  assert.equal(attempts, 2);
});

test('refreshState hands the tasks to the widget after the badge', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(source, /import \{ syncNativeWidget[^}]*\} from '\.\/nativeBridge\.js';/);
  const body = source.slice(source.indexOf('async function refreshState'));
  assert.ok(body.indexOf('syncNativeWidget(appState.tasks)') > body.indexOf('syncAppBadge(appState.tasks)'));
});

// V3.16.0: tapping the widget opened the app on whatever page was last shown. Widget links now say
// where to go: the task list, a new task, or one task.
test('reads the widget links and ignores anything else', () => {
  assert.deepEqual(parseWidgetLink('questnote://tasks'), { action: 'tasks' });
  assert.deepEqual(parseWidgetLink('questnote://add'), { action: 'add' });
  assert.deepEqual(parseWidgetLink('questnote://task?id=task_1%2Fa'), { action: 'task', taskId: 'task_1/a' });
  for (const url of ['questnote://task', 'questnote://settings', 'https://tasks', 'not a url', null, undefined]) {
    assert.equal(parseWidgetLink(url), null, String(url));
  }
});

test('pulls a pending widget link at startup and whenever the native side announces one', async () => {
  const pending = ['questnote://task?id=t1', null, 'questnote://add'];
  const calls = [];
  const capacitor = { isNativePlatform: () => true,
    nativePromise: async (plugin, method) => { calls.push(`${plugin}.${method}`); return { url: pending.shift() ?? undefined }; } };
  const target = new EventTarget();
  const opened = [];
  assert.equal(listenForWidgetLinks((link) => opened.push(link), { capacitor, target, doc: null }), true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  target.dispatchEvent(new Event(WIDGET_LINK_EVENT));
  target.dispatchEvent(new Event(WIDGET_LINK_EVENT));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(opened, [{ action: 'task', taskId: 't1' }, { action: 'add' }]);
  assert.deepEqual(calls, Array(3).fill('QuestNoteWidgetBridge.consumeLink'));
  assert.equal(listenForWidgetLinks(() => {}, { capacitor: null, target }), false);
});

test('the app opens widget links after startup', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const init = source.slice(source.indexOf('async function initApp'));
  assert.ok(init.indexOf('listenForWidgetLinks(') > init.indexOf('hideLoader();'), 'listen after the loader is gone');
});
