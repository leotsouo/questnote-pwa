/**
 * V3.13.0: the Home Screen icon badge shows how many to-dos are still unfinished
 * (Badging API, iOS 16.4+ Home Screen web apps once notifications are allowed).
 * Tutorial tasks never count, 0 clears the badge, and a missing API or a refused
 * permission must never break refreshState().
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { countUnfinishedTasks, syncAppBadge, resetAppBadgeCache, appBadgeStatus, enableAppBadge } from '../src/appBadge.js';

function fakeNavigator({ reject = false } = {}) {
  const calls = [];
  return {
    calls,
    setAppBadge: async (count) => { calls.push(['set', count]); if (reject) throw new DOMException('denied', 'NotAllowedError'); },
    clearAppBadge: async () => { calls.push(['clear']); if (reject) throw new DOMException('denied', 'NotAllowedError'); },
  };
}

const tasks = [
  { id: 'a', completed: false },
  { id: 'b', completed: true },
  { id: 'c', completed: false, startDate: '2099-01-01' },
  { id: 'tutorial:1', completed: false, isTutorial: true },
];

test('counts unfinished non-tutorial tasks', () => {
  assert.equal(countUnfinishedTasks(tasks), 2);
  assert.equal(countUnfinishedTasks([]), 0);
  assert.equal(countUnfinishedTasks(undefined), 0);
});

test('sets the count, clears at zero and skips repeated values', async () => {
  resetAppBadgeCache();
  const nav = fakeNavigator();
  assert.equal(await syncAppBadge(tasks, nav), 'set');
  assert.equal(await syncAppBadge(tasks, nav), 'unchanged');
  assert.equal(await syncAppBadge([{ id: 'b', completed: true }], nav), 'cleared');
  assert.deepEqual(nav.calls, [['set', 2], ['clear']]);
});

test('missing API and refused permission are silent', async () => {
  resetAppBadgeCache();
  assert.equal(await syncAppBadge(tasks, {}), 'unsupported');
  assert.equal(await syncAppBadge(tasks, undefined), 'unsupported');
  const nav = fakeNavigator({ reject: true });
  assert.equal(await syncAppBadge(tasks, nav), 'denied');
  // A refused call is not cached, so the badge appears once notifications are allowed.
  assert.equal(await syncAppBadge(tasks, nav), 'denied');
  assert.equal(nav.calls.length, 2);
});

// V3.13.1: the preview build has no reminder backend, so "啟用每日提醒" never asks for notification
// permission there and the badge could not be tested. The badge now asks for permission on its own.
test('badge status follows API support and notification permission', () => {
  assert.equal(appBadgeStatus({}, { permission: 'granted' }), 'unsupported');
  assert.equal(appBadgeStatus(fakeNavigator(), undefined), 'unsupported');
  assert.equal(appBadgeStatus(fakeNavigator(), { permission: 'default' }), 'off');
  assert.equal(appBadgeStatus(fakeNavigator(), { permission: 'granted' }), 'on');
  assert.equal(appBadgeStatus(fakeNavigator(), { permission: 'denied' }), 'blocked');
});

test('enabling the badge asks for permission and then shows the count', async () => {
  resetAppBadgeCache();
  const nav = fakeNavigator();
  let permission = 'default';
  const notification = { get permission() { return permission; }, requestPermission: async () => { permission = 'granted'; return permission; } };
  assert.equal(await enableAppBadge({ nav, notification, loadTasks: async () => tasks }), 'on');
  assert.deepEqual(nav.calls, [['set', 2]]);

  permission = 'default';
  const refusing = { get permission() { return permission; }, requestPermission: async () => { permission = 'denied'; return permission; } };
  let loaded = false;
  assert.equal(await enableAppBadge({ nav, notification: refusing, loadTasks: async () => { loaded = true; return tasks; } }), 'blocked');
  assert.equal(loaded, false);
});

test('settings show a badge switch that works without the reminder backend', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="app-badge-enable"/);
  assert.match(html, /id="app-badge-status"/);
  const controller = await readFile(new URL('../src/reminderController.js', import.meta.url), 'utf8');
  assert.match(controller, /enableAppBadge\(/);
  assert.match(controller, /renderAppBadgeSetting\(\)/);
});

test('refreshState syncs the badge after loading tasks', async () => {
  const source = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(source, /import \{ syncAppBadge \} from '\.\/appBadge\.js';/);
  const body = source.slice(source.indexOf('async function refreshState'));
  const tasksAssigned = body.indexOf('appState.tasks = sortTasks(tasks);');
  const badgeSynced = body.indexOf('syncAppBadge(appState.tasks)');
  assert.ok(tasksAssigned >= 0 && badgeSynced > tasksAssigned, 'syncAppBadge runs after appState.tasks is set');
});
