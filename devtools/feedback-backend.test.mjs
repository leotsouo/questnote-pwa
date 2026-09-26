import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../backend/feedback/worker.js';

export function createTestDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../backend/feedback/schema.sql', import.meta.url), 'utf8'));
  return { db, binding: { prepare(sql) { return { bind(...params) {
    return { run: async () => db.prepare(sql).run(...params), first: async () => db.prepare(sql).get(...params) || null };
  } }; } } };
}
const payload = () => ({ id: crypto.randomUUID(), type: 'bug', title: '測試', description: '這是測試', steps: '', expected: '', diagnostics: null });
const request = (data, extra = {}) => new Request('https://feedback.test/v1/feedback', {
  method: 'POST', headers: { Origin: 'https://app.test', 'Content-Type': 'application/json' }, body: JSON.stringify(data), ...extra,
});
function setup(t) {
  const { db, binding } = createTestDatabase();
  t.after(() => db.close());
  return { db, env: { DB: binding, ALLOWED_ORIGINS: 'https://app.test', INTAKE_RATE: { limit: async () => ({ success: true }) } } };
}

test('anonymous report is durably inserted, retry is idempotent, altered payload cannot overwrite', async (t) => {
  const { db, env } = setup(t);
  const data = payload();
  for (let i = 0; i < 2; i++) {
    const response = await worker.fetch(request(data), env);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { accepted: true, id: data.id });
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM feedback').get().n, 1);
  assert.equal((await worker.fetch(request({ ...data, title: 'changed' }), env)).status, 409);
  assert.equal(db.prepare('SELECT title FROM feedback').get().title, data.title);
});

test('there is no public list or read endpoint; disallowed origins cannot send', async (t) => {
  const { env } = setup(t);
  assert.equal((await worker.fetch(request(payload(), { headers: { Origin: 'https://evil.test' } }), env)).status, 403);
  const response = await worker.fetch(new Request('https://feedback.test/v1/feedback', { headers: { Origin: 'https://app.test' } }), env);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await worker.fetch(new Request('https://feedback.test/admin'), env)).status, 404);
  const preflight = await worker.fetch(new Request('https://feedback.test/v1/feedback', { method: 'OPTIONS', headers: { Origin: 'https://app.test' } }), env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://app.test');
});

test('validation and streamed size limits reject bad input before database writes', async (t) => {
  const { db, env } = setup(t);
  for (const change of [{ id: 'bad' }, { type: '__proto__' }, { title: ' ' }, { description: 'a'.repeat(4001) }, { website: 'spam' }, { diagnostics: [] }]) {
    assert.equal((await worker.fetch(request({ ...payload(), ...change }), env)).status, 400);
  }
  assert.equal((await worker.fetch(request(payload(), { body: 'x'.repeat(32769) }), env)).status, 413);
  assert.equal((await worker.fetch(request(payload(), { body: '{bad' }), env)).status, 400);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM feedback').get().n, 0);
});

test('diagnostics allowlist and parameter binding prevent extra private fields and SQL injection', async (t) => {
  const { db, env } = setup(t);
  const data = { ...payload(), title: "'); DROP TABLE feedback; --", diagnostics: { appVersion: '3.4.15', tasks: 'private', token: 'secret' } };
  assert.equal((await worker.fetch(request(data), env)).status, 200);
  const row = db.prepare('SELECT * FROM feedback').get();
  assert.equal(row.title, data.title);
  assert.deepEqual(JSON.parse(row.diagnostics_json), { appVersion: '3.4.15' });
});

test('rate limit and database failure return retryable errors without false success', async (t) => {
  const { env } = setup(t);
  const limited = await worker.fetch(request(payload()), { ...env, INTAKE_RATE: { limit: async () => ({ success: false }) } });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('Retry-After'), '60');
  assert.equal((await worker.fetch(request(payload()), { ...env, DB: { prepare() { throw Error('offline'); } } })).status, 503);
});

test('daily cap prevents additional inserts but still acknowledges retries', async (t) => {
  const { db, env } = setup(t);
  const first = payload();
  await worker.fetch(request(first), env);
  const insert = db.prepare("INSERT INTO feedback (id,submitted_at,type,title,description,steps,expected,payload_hash) VALUES (?,?,'bug','test','test','','','test')");
  for (let i = 0; i < 999; i++) insert.run(crypto.randomUUID(), new Date().toISOString());
  assert.equal((await worker.fetch(request(payload()), env)).status, 429);
  assert.equal((await worker.fetch(request(first), env)).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM feedback').get().n, 1000);
});
