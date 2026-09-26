import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  FEEDBACK_MARKER, normalizeFeedback, validateFeedback,
  loadFeedbackDraft, saveFeedbackDraft, clearFeedbackDraft, collectFeedbackDiagnostics,
  buildFeedbackReport, sendFeedback, savePendingFeedback, loadPendingFeedback, finishFeedback, getFeedbackReceipt,
} from '../src/feedbackService.js';
import { APP_VERSION, CACHE_NAME } from '../src/version.js';

const valid = { type: 'bug', title: '完成任務沒有更新', description: '按下完成後數字沒有變',
  steps: '首頁 → 任務 → 完成', expected: '看到新獎勵' };

test('required fields reject whitespace and malformed persisted drafts recover safely', () => {
  assert.match(validateFeedback({ ...valid, title: '  ' }), /標題/);
  assert.match(validateFeedback({ ...valid, description: '\n ' }), /問題/);
  assert.equal(validateFeedback(valid), '');
  assert.deepEqual(normalizeFeedback(null), normalizeFeedback());
  assert.equal(normalizeFeedback({ type: '__proto__', title: {}, includeDiagnostics: 'yes' }).type, 'bug');
  assert.equal(normalizeFeedback({ title: '長'.repeat(101) }).title.length, 100);
  assert.equal(normalizeFeedback({ includeDiagnostics: 'yes' }).includeDiagnostics, false);
});

test('drafts survive reload, can be cleared, and storage failures are reported', () => {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) };
  assert.equal(saveFeedbackDraft({ ...valid, includeDiagnostics: true, secret: 'must not persist' }, storage), true);
  assert.deepEqual(loadFeedbackDraft(storage), normalizeFeedback({ ...valid, includeDiagnostics: true }));
  assert.doesNotMatch([...values.values()][0], /secret/);
  assert.equal(clearFeedbackDraft(storage), true);
  assert.deepEqual(loadFeedbackDraft(storage), normalizeFeedback());
  assert.deepEqual(loadFeedbackDraft({ getItem: () => '{broken' }), normalizeFeedback());
  const broken = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); }, removeItem() { throw Error('blocked'); } };
  assert.deepEqual(loadFeedbackDraft(broken), normalizeFeedback());
  assert.equal(saveFeedbackDraft(valid, broken), false);
  assert.equal(clearFeedbackDraft(broken), false);
});

test('diagnostics contain useful environment data without URLs, tasks or account data', () => {
  const diagnostics = collectFeedbackDiagnostics({
    navigator: { userAgent: 'Test Browser', language: 'zh-TW', onLine: false, standalone: true,
      serviceWorker: { controller: {} } }, innerWidth: 390, innerHeight: 844,
    location: { href: 'https://example.com/?token=secret#private' },
    tasks: [{ title: 'private task' }], account: 'private@example.com',
  });
  assert.equal(diagnostics.appVersion, APP_VERSION);
  assert.equal(diagnostics.cacheName, CACHE_NAME);
  assert.equal(diagnostics.online, false);
  assert.equal(diagnostics.displayMode, 'standalone');
  assert.equal(diagnostics.viewport, '390 × 844');
  assert.equal(diagnostics.serviceWorkerControlled, true);
  assert.doesNotMatch(JSON.stringify(diagnostics), /token=secret|private task|private@example.com|"tasks"|"account"/);
});

test('environment diagnostics require opt-in; reports have stable structure and an ID', () => {
  const diagnostics = collectFeedbackDiagnostics({ navigator: { userAgent: 'TEST_AGENT' } });
  const without = buildFeedbackReport(valid, diagnostics);
  assert.ok(without.body.includes(FEEDBACK_MARKER));
  assert.ok(without.body.includes(without.id));
  assert.doesNotMatch(without.body, /TEST_AGENT|環境資訊/);
  const withData = buildFeedbackReport({ ...valid, includeDiagnostics: true }, diagnostics);
  assert.match(withData.body, /TEST_AGENT/);
  assert.match(withData.body, /重現步驟/);
  assert.notEqual(withData.id, without.id);
  assert.throws(() => buildFeedbackReport({}, diagnostics), /標題/);
});

test('direct POST preserves special characters, omits credentials and verifies receipt', async () => {
  const report = buildFeedbackReport({ ...valid, title: '中文 & ? # +', description: '<script>&labels=bad\n新行' }, {});
  const result = await sendFeedback(report, { fetcher: async (url, options) => {
    assert.match(url, /workers.dev\/v1\/feedback$/);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.method, 'POST');
    assert.equal(JSON.parse(options.body).description, '<script>&labels=bad\n新行');
    return Response.json({ accepted: true, id: report.id });
  } });
  assert.equal(result.id, report.id);
});

test('long Chinese reports are submitted intact without URL length limits', async () => {
  const report = buildFeedbackReport({ ...valid, description: '測'.repeat(4000) }, {});
  await sendFeedback(report, { fetcher: async (_url, options) => {
    assert.equal(JSON.parse(options.body).description.length, 4000);
    return Response.json({ accepted: true, id: report.id });
  } });
  assert.ok(report.body.includes('測'.repeat(4000)));
});

test('offline shell caches feedback modules and matches current version cache', async () => {
  const worker = await fs.readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
  assert.ok(worker.includes(`const CACHE_NAME = '${CACHE_NAME}'`));
  for (const name of ['feedbackService', 'feedbackController', 'feedbackConfig']) assert.ok(worker.includes(`'src/${name}.js'`));
});

test('failed, rate-limited and malformed replies never count as accepted', async () => {
  const report = buildFeedbackReport(valid, {});
  for (const response of [new Response('', { status: 503 }), new Response('', { status: 429 }),
    Response.json({ accepted: true, id: 'wrong-id' }), Response.json({})]) {
    await assert.rejects(sendFeedback(report, { fetcher: async () => response }));
  }
  await assert.rejects(sendFeedback(report, { timeoutMs: 5, fetcher: async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')));
  }) }), /逾時/);
});

test('uncertain submissions reuse the exact payload after reload; receipt clears the draft', () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
  const report = buildFeedbackReport(valid, {});
  saveFeedbackDraft(valid, storage);
  savePendingFeedback(valid, report, storage);
  assert.deepEqual(loadPendingFeedback(loadFeedbackDraft(storage), storage), report);
  assert.equal(loadPendingFeedback({ ...valid, title: 'edited' }, storage), null);
  assert.equal(finishFeedback(report.id, storage), true);
  assert.equal(getFeedbackReceipt(storage).id, report.id);
  assert.equal(loadPendingFeedback(valid, storage), null);
  assert.equal(loadFeedbackDraft(storage).title, '');
});
