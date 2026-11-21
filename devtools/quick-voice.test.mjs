/**
 * V3.17.0 quick voice entry: one tap starts listening, only the 停止 button saves, 取消 saves nothing,
 * and anything that is not a deliberate stop (60 s cap, engine ending by itself, errors, empty
 * speech) hands the text to the typed form instead of creating a task.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createQuickVoiceSession, QUICK_VOICE_MAX_MS } from '../src/quickVoice.js';
import { parseWidgetLink } from '../src/nativeBridge.js';

class FakeRecognition {
  static last = null;
  static startThrows = false;
  constructor() { FakeRecognition.last = this; this.started = false; this.aborted = false; this.stopped = false; }
  start() {
    if (FakeRecognition.startThrows) throw new Error('not allowed to start');
    this.started = true;
    this.onstart?.();
  }
  stop() { this.stopped = true; }
  abort() { this.aborted = true; }
  say(text, isFinal = false) { this.onresult?.({ results: [Object.assign([{ transcript: text }], { isFinal })] }); }
  fail(error) { this.onerror?.({ error }); }
  end() { this.onend?.(); }
}

function setup(extra = {}) {
  FakeRecognition.last = null;
  FakeRecognition.startThrows = false;
  const log = { saved: [], fallbacks: [], cancels: 0, states: [] };
  const timers = [];
  const session = createQuickVoiceSession({
    Recognition: FakeRecognition,
    onState: (state, text) => log.states.push([state, text]),
    onSave: (text) => log.saved.push(text),
    onFallback: (text, reason) => log.fallbacks.push([text, reason]),
    onCancel: () => { log.cancels += 1; },
    setTimer: (fn, ms) => { timers.push({ fn, ms, cleared: false }); return timers.length - 1; },
    clearTimer: (id) => { if (timers[id]) timers[id].cleared = true; },
    ...extra,
  });
  return { session, log, timers, rec: () => FakeRecognition.last };
}

test('starts in zh-TW, keeps listening, and shows the live transcript', () => {
  const { session, log, rec } = setup();
  session.start();
  assert.equal(rec().lang, 'zh-TW');
  assert.equal(rec().continuous, true);
  assert.equal(rec().interimResults, true);
  rec().say('買牙');
  rec().say('買牙膏');
  assert.deepEqual(log.states.at(-1), ['listening', '買牙膏']);
  assert.deepEqual(log.saved, []);
});

test('only 停止 saves: stop → final text arrives → engine ends → save once', () => {
  const { session, log, rec } = setup();
  session.start();
  rec().say('明天早上吃藥');
  session.stop();
  assert.equal(rec().stopped, true);
  assert.deepEqual(log.saved, [], 'nothing is saved before the engine finishes');
  rec().say('明天早上吃藥', true);
  rec().end();
  assert.deepEqual(log.saved, ['明天早上吃藥']);
  assert.deepEqual(log.fallbacks, []);
  rec().end();
  session.stop();
  assert.equal(log.saved.length, 1, 'saved exactly once');
});

test('a pause in speech never ends the session by itself', () => {
  const { session, log, rec } = setup();
  session.start();
  rec().say('吃藥', true);
  assert.equal(session.state, 'listening');
  assert.deepEqual(log.saved, []);
});

test('the engine ending without 停止 does not save; the text goes to the typed form', () => {
  const { session, log, rec } = setup();
  session.start();
  rec().say('倒垃圾');
  rec().end();
  assert.deepEqual(log.saved, []);
  assert.deepEqual(log.fallbacks, [['倒垃圾', 'ended']]);
});

test('取消 aborts and saves nothing, even if late results arrive', () => {
  const { session, log, rec } = setup();
  session.start();
  rec().say('不要了');
  session.cancel();
  assert.equal(rec().aborted, true);
  rec().say('不要了啦', true);
  rec().end();
  assert.deepEqual(log.saved, []);
  assert.deepEqual(log.fallbacks, []);
  assert.equal(log.cancels, 1);
});

test('60 s cap stops listening but never saves; text goes to the typed form', () => {
  const { session, log, timers, rec } = setup();
  session.start();
  assert.equal(QUICK_VOICE_MAX_MS, 60000);
  assert.equal(timers[0].ms, 60000);
  rec().say('一直說一直說');
  timers[0].fn();
  assert.equal(rec().stopped, true);
  rec().end();
  assert.deepEqual(log.saved, []);
  assert.deepEqual(log.fallbacks, [['一直說一直說', 'timeout']]);
});

test('the cap timer is cleared once the session is stopped or cancelled', () => {
  const a = setup();
  a.session.start();
  a.session.stop();
  assert.equal(a.timers[0].cleared, true);
  const b = setup();
  b.session.start();
  b.session.cancel();
  assert.equal(b.timers[0].cleared, true);
});

test('empty speech opens the typed form instead of saving a blank task', () => {
  const { session, log, rec } = setup();
  session.start();
  session.stop();
  rec().end();
  assert.deepEqual(log.saved, []);
  assert.deepEqual(log.fallbacks, [['', 'empty']]);
});

test('whitespace-only speech counts as empty', () => {
  const { session, log, rec } = setup();
  session.start();
  rec().say('   ', true);
  session.stop();
  rec().end();
  assert.deepEqual(log.fallbacks, [['', 'empty']]);
});

test('permission denied or other errors fall back to typing and never save', () => {
  const { session, log, rec } = setup();
  session.start();
  rec().fail('not-allowed');
  rec().end();
  assert.deepEqual(log.saved, []);
  assert.deepEqual(log.fallbacks, [['', 'not-allowed']]);
});

test('an error after some speech keeps what was heard for the typed form', () => {
  const { session, log, rec } = setup();
  session.start();
  rec().say('買牛奶');
  rec().fail('network');
  rec().end();
  assert.deepEqual(log.fallbacks, [['買牛奶', 'network']]);
});

test('unsupported engine falls back to typing right away', () => {
  const { session, log } = setup({ Recognition: null });
  session.start();
  assert.deepEqual(log.fallbacks, [['', 'unsupported']]);
});

test('start() refused (no user gesture) goes to the idle state so a big mic can be pressed', () => {
  FakeRecognition.startThrows = true;
  const log = [];
  const session = createQuickVoiceSession({
    Recognition: FakeRecognition,
    onState: (state) => log.push(state),
    onSave() {}, onFallback() {}, onCancel() {},
    setTimer: () => 1, clearTimer() {},
  });
  FakeRecognition.startThrows = true;
  session.start();
  assert.equal(session.state, 'idle');
  assert.equal(log.at(-1), 'idle');
  FakeRecognition.startThrows = false;
  session.start();
  assert.equal(session.state, 'listening');
});

test('the widget can open the voice sheet with questnote://voice', () => {
  assert.deepEqual(parseWidgetLink('questnote://voice'), { action: 'voice' });
  assert.deepEqual(parseWidgetLink('questnote://add'), { action: 'add' });
});

test('wiring: mic button, view module, precache and widget link handler exist', async () => {
  const [html, sw, app, ui, parts] = await Promise.all(['index.html', 'service-worker.js', 'src/app.js', 'src/ui.js', 'src/uiSourceParts.js']
    .map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  assert.match(html, /id="btn-voice-task"/);
  assert.match(sw, /'src\/quickVoice\.js'/);
  assert.match(sw, /'src\/ui\/quickVoiceView\.js'/);
  assert.match(parts, /'src\/ui\/quickVoiceView\.js'/);
  assert.match(app, /link\.action === 'voice'/);
  assert.match(ui, /btn-voice-task/);
});
