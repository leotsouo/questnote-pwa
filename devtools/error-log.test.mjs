/**
 * src/errorLog.js keeps the last uncaught errors of a session for the feedback report and the
 * settings version card, so a bug report carries the real error text instead of a photographed toast.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  installErrorLog, recordError, getRecentErrors, clearRecentErrors, formatRecentErrors, describeError,
  RECENT_ERRORS_KEY, RECENT_ERRORS_LIMIT,
} from '../src/errorLog.js';
import { collectFeedbackDiagnostics } from '../src/feedbackService.js';

function fakeWindow(stored) {
  const listeners = {};
  const storage = new Map(stored ? [[RECENT_ERRORS_KEY, JSON.stringify(stored)]] : []);
  const win = {
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
    sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
  };
  return { win, listeners, storage, emit: (type, event) => (listeners[type] || []).forEach((fn) => fn(event)) };
}

test('installing in Node without a window is a no-op', () => {
  clearRecentErrors({});
  assert.equal(installErrorLog({}), false);
  assert.deepEqual(getRecentErrors(), []);
});

test('uncaught errors and unhandled rejections are recorded with version, source and stack', () => {
  clearRecentErrors({});
  const { win, emit, storage } = fakeWindow();
  assert.equal(installErrorLog(win), true);
  const error = new ReferenceError("Can't find variable: getMailboxCatalogs");
  emit('error', { target: win, error, message: error.message, filename: 'https://host/questnote-pwa/src/ui.js', lineno: 630 });
  emit('unhandledrejection', { reason: new TypeError('x is not a function') });
  // A failed <img> load is a plain Event on the element, not an App error.
  emit('error', { target: { tagName: 'IMG' } });
  const entries = getRecentErrors();
  assert.equal(entries.length, 2);
  assert.equal(entries[0].kind, 'error');
  assert.equal(entries[0].message, "ReferenceError: Can't find variable: getMailboxCatalogs");
  assert.equal(entries[0].source, 'src/ui.js:630');
  assert.match(entries[0].stack, /ReferenceError/);
  assert.match(entries[0].appVersion, /^\d+\.\d+\.\d+$/);
  assert.equal(entries[1].kind, 'unhandledrejection');
  assert.equal(entries[1].message, 'TypeError: x is not a function');
  assert.equal(JSON.parse(storage.get(RECENT_ERRORS_KEY)).length, 2);
  const lines = formatRecentErrors(entries);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /getMailboxCatalogs @ src\/ui\.js:630$/);
});

test('the buffer is capped, survives a reload through sessionStorage and can be cleared', () => {
  const previous = [{ time: '2026-10-20T01:00:00.000Z', kind: 'error', message: 'old one', source: '', stack: '', appVersion: '3.12.1' }];
  const { win } = fakeWindow(previous);
  installErrorLog(win);
  assert.equal(getRecentErrors()[0].message, 'old one');
  for (let i = 0; i < RECENT_ERRORS_LIMIT + 5; i += 1) recordError(`e${i}`, {}, win);
  assert.equal(getRecentErrors().length, RECENT_ERRORS_LIMIT);
  assert.equal(getRecentErrors().at(-1).message, `e${RECENT_ERRORS_LIMIT + 4}`);
  clearRecentErrors(win);
  assert.deepEqual(getRecentErrors(), []);
  assert.equal(win.sessionStorage.getItem(RECENT_ERRORS_KEY), null);
});

test('describeError clips long text and tolerates non-Error reasons', () => {
  assert.equal(describeError('plain text').message, 'plain text');
  assert.equal(describeError({ message: 'object message' }).message, 'object message');
  assert.equal(describeError(undefined).message, 'Unknown error');
  assert.equal(describeError('x'.repeat(1000)).message.length, 400);
});

test('feedback diagnostics carry the recent errors', () => {
  clearRecentErrors({});
  recordError(new Error('boom'), { source: 'src/app.js:1' }, {});
  const diagnostics = collectFeedbackDiagnostics({ navigator: { userAgent: 'test', language: 'zh-TW', onLine: true }, innerWidth: 375, innerHeight: 812 });
  assert.equal(diagnostics.recentErrors.length, 1);
  assert.match(diagnostics.recentErrors[0], /Error: boom @ src\/app\.js:1$/);
  clearRecentErrors({});
});
