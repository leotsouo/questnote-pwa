import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createECDH, randomBytes } from 'node:crypto';
import webpush from 'web-push';
import ece from 'http_ece';
import worker, { runSchedule, runScheduled, sanitizeState, validateSubscription } from '../backend/reminders/worker.js';
import { sendPush } from '../backend/reminders/push.js';
import { REMINDER_DEFAULTS, projectReminderData, buildDailyDigest, nextReminderAt, shiftDate } from '../src/reminderRules.js';

const settings = { ...REMINDER_DEFAULTS, timeZone: 'Asia/Taipei' };
const subscriber = createECDH('prime256v1'); subscriber.generateKeys();
const auth = randomBytes(16);
const subscription = { endpoint: 'https://web.push.apple.com/test', keys: { p256dh: subscriber.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } };
const input = (changes = {}) => ({ revision: 1, settings, subscription, tasks: [{ id: 't1', plannedDate: '2026-10-01', dueDate: '2026-10-01' }], habits: [], ...changes });
function setup(t) {
  const db = new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../backend/reminders/schema.sql', import.meta.url), 'utf8'));
  t.after(() => db.close());
  const binding = { prepare(sql) { return { bind(...args) { return {
    first: async () => db.prepare(sql).get(...args) || null,
    run: async () => db.prepare(sql).run(...args),
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  }; } }; }, async batch(statements) {
    db.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.all());
      db.exec('COMMIT'); return results;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  } };
  return { db, env: { DB: binding, ALLOWED_ORIGINS: 'https://app.test', API_RATE: { limit: async () => ({ success: true }) } } };
}
function request(path, method = 'GET', body = null, identity = {}) {
  return new Request('https://reminders.test' + path, { method,
    headers: { Origin: 'https://app.test', 'Content-Type': 'application/json', ...(identity.token ? { Authorization: 'Bearer ' + identity.token, 'X-Installation-Id': identity.installationId } : {}) },
    ...(body === null ? {} : { body: JSON.stringify(body) }),
  });
}
function seed(db, changes = {}) {
  const now = Date.parse('2026-10-01T00:00:00Z');
  db.prepare('INSERT INTO installations(id, token_hash, revision, state_json, enabled, next_at, updated_at) VALUES(?,?,?,?,1,?,?)')
    .run('schedule-test', 'hash', 1, JSON.stringify(sanitizeState(input(changes))), now, now);
  return now;
}

test('tomorrow crosses month/year, next local reminder respects current time and DST gaps/folds', () => {
  assert.equal(shiftDate('2026-09-30', 1), '2026-10-01'); assert.equal(shiftDate('2026-12-31', 1), '2027-01-01');
  assert.equal(nextReminderAt(Date.parse('2026-09-30T14:00:00Z'), settings), Date.parse('2026-10-01T00:00:00Z'));
  assert.equal(nextReminderAt(Date.parse('2026-10-01T00:00:01Z'), settings), Date.parse('2026-10-02T00:00:00Z'));
  const dst = { ...settings, timeZone: 'America/New_York', time: '02:30' };
  assert.equal(new Date(nextReminderAt(Date.parse('2026-03-08T05:00:00Z'), dst)).toISOString(), '2026-03-08T07:00:00.000Z');
  assert.equal(new Date(nextReminderAt(Date.parse('2026-11-01T04:00:00Z'), { ...dst, time: '01:30' })).toISOString(), '2026-11-01T05:30:00.000Z');
});
test('projection excludes completed/archive/private text and titles require explicit opt-in', () => {
  const tasks = [{ id: 't', content: '私人內文\n更多', plannedDate: '2026-10-01' }, { id: 'done', completed: true }];
  const habits = [{ id: 'h', name: '私人名稱', frequency: 'daily', logs: { '2026-09-30': { completed: true }, week_x: { weeklyRewardClaimed: true } } }, { id: 'old', archivedAt: 'date' }];
  const data = projectReminderData(tasks, habits, settings, Date.parse('2026-10-01T00:00:00Z'));
  assert.equal(data.tasks.length, 1); assert.equal(data.habits.length, 1);
  assert.ok(!JSON.stringify(data).includes('私人')); assert.deepEqual(data.habits[0].completedDates, ['2026-09-30']);
  assert.equal(projectReminderData(tasks, habits, { ...settings, showTitles: true }).tasks[0].title, '私人內文');
});
test('digest deduplicates date conditions, excludes completed habits and resets weekly goals across weeks', () => {
  const state = sanitizeState(input({ habits: [{ id: 'daily', frequency: 'daily', targetPerWeek: 1, completedDates: ['2026-10-01'] }, { id: 'weekly', frequency: 'weekly', targetPerWeek: 1, completedDates: ['2026-09-28'] }] }));
  assert.equal(buildDailyDigest(state, Date.parse('2026-10-01T00:00:00Z')).count, 1);
  assert.equal(buildDailyDigest(state, Date.parse('2026-10-05T00:00:00Z')).count, 2);
  assert.ok(buildDailyDigest(state, Date.parse('2026-10-05T00:00:00Z')).body.includes('本週'));
});
test('subscription validation blocks arbitrary URL fetches and strips private payload fields', () => {
  for (const endpoint of ['https://evil.test/push', 'http://web.push.apple.com/', 'https://web.push.apple.com:444/', 'https://localhost/', 'https://fcm.googleapis.com.evil.test/']) assert.throws(() => validateSubscription({ ...subscription, endpoint }));
  const data = sanitizeState(input({ tasks: [{ id: 'a', title: 'PRIVATE', content: 'SECRET', token: 'SECRET' }] }));
  assert.ok(!JSON.stringify(data).includes('SECRET')); assert.ok(!JSON.stringify(data).includes('PRIVATE'));
  assert.throws(() => sanitizeState(input({ settings: { ...settings, time: '99:00' } })));
  assert.throws(() => sanitizeState(input({ tasks: [{ id: 'a', plannedDate: '2026-02-30' }] })));
});
test('anonymous credential protects state; sync is monotonic, idempotent and CORS is restricted', async (t) => {
  const { db, env } = setup(t);
  const identity = await (await worker.fetch(request('/v1/reminder-installations', 'POST', {}), env)).json();
  assert.equal((await worker.fetch(request('/v1/reminder-installation/status'), env)).status, 401);
  const state = input();
  assert.equal((await worker.fetch(request('/v1/reminder-installation/state', 'PUT', state, identity), env)).status, 200);
  assert.equal((await worker.fetch(request('/v1/reminder-installation/state', 'PUT', state, identity), env)).status, 200);
  assert.equal((await worker.fetch(request('/v1/reminder-installation/state', 'PUT', { ...state, tasks: [] }, identity), env)).status, 409);
  assert.equal((await worker.fetch(request('/v1/reminder-installation/state', 'PUT', { ...state, revision: 2, tasks: [] }, identity), env)).status, 200);
  assert.equal((await worker.fetch(request('/v1/reminder-installation/state', 'PUT', state, identity), env)).status, 409);
  assert.ok(!db.prepare('SELECT token_hash FROM installations').get().token_hash.includes(identity.token));
  assert.equal((await worker.fetch(new Request('https://reminders.test/v1/reminder-installations', { method: 'POST', headers: { Origin: 'https://evil.test' } }), env)).status, 403);
  assert.equal((await worker.fetch(request('/v1/reminder-installation/state', 'DELETE', null, identity), env)).status, 200);
  assert.equal(db.prepare('SELECT count(*) n FROM installations').get().n, 0);
});
test('parallel scheduler claims once, sends the current day and advances without a second notification', async (t) => {
  const { db, env } = setup(t); const now = seed(db); const messages = [];
  const push = async (_sub, payload) => { messages.push(payload); return { status: 201 }; };
  await Promise.all([runSchedule(env, now, push), runSchedule(env, now, push)]);
  await runSchedule(env, now + 60000, push);
  assert.equal(messages.length, 1); assert.equal(messages[0].tag, 'daily-2026-10-01');
  assert.equal(db.prepare('SELECT next_at FROM installations').get().next_at, now + 86400000);
});
test('empty and expired summaries do not send; subscription expiry disables reminders', async (t) => {
  for (const [changes, delay, result, expected] of [[{ tasks: [], habits: [] }, 0, 201, 'skipped'], [{}, 3600001, 201, 'skipped'], [{}, 0, 410, 'subscription-expired']]) {
    const { db, env } = setup(t); const now = seed(db, changes); let sent = 0;
    await runSchedule(env, now + delay, async () => { sent++; return { status: result }; });
    assert.equal(sent, result === 410 ? 1 : 0); assert.equal(db.prepare('SELECT status FROM deliveries').get().status, expected);
    if (result === 410) assert.equal(db.prepare('SELECT enabled FROM installations').get().enabled, 0);
  }
});
test('temporary failures retry at most three times and do not block the next day', async (t) => {
  const { db, env } = setup(t); const now = seed(db); let sent = 0;
  for (const delay of [0, 60000, 120000, 180000]) await runSchedule(env, now + delay, async () => { sent++; return { status: 503 }; });
  assert.equal(sent, 3); assert.equal(db.prepare('SELECT status FROM deliveries').get().status, 'failed');
  assert.ok(db.prepare('SELECT next_at FROM installations').get().next_at > now + 3600000);
});
test('a missed earlier day recovers today within its window without skipping or duplicating today', async (t) => {
  const { db, env } = setup(t); const now = seed(db); const messages = [];
  db.prepare('UPDATE installations SET next_at = ?').run(now - 86400000);
  const push = async (_sub, payload) => { messages.push(payload); return { status: 201 }; };
  await runSchedule(env, now + 60000, push);
  assert.equal(db.prepare('SELECT next_at FROM installations').get().next_at, now);
  await runSchedule(env, now + 120000, push);
  await runSchedule(env, now + 180000, push);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].tag, 'daily-2026-10-01');
  assert.deepEqual(db.prepare('SELECT local_date, status FROM deliveries ORDER BY local_date').all().map((r) => ({ ...r })), [
    { local_date: '2026-09-30', status: 'skipped' }, { local_date: '2026-10-01', status: 'accepted' },
  ]);
});
test('recovery never catches up after today\'s delivery window expires', async (t) => {
  const { db, env } = setup(t); const now = seed(db);
  db.prepare('UPDATE installations SET next_at = ?').run(now - 86400000);
  await runSchedule(env, now + 3600000, async () => { assert.fail('Expired reminders must not send'); });
  assert.equal(db.prepare('SELECT next_at FROM installations').get().next_at, now + 86400000);
});
test('changing to a later time can reschedule an unsent skipped day, but cannot resend an accepted day', async (t) => {
  const originalClock = Date.now; let now = Date.parse('2026-10-01T00:05:00Z');
  Date.now = () => now; t.after(() => { Date.now = originalClock; });
  const { db, env } = setup(t);
  const identity = await (await worker.fetch(request('/v1/reminder-installations', 'POST', {}), env)).json();
  await worker.fetch(request('/v1/reminder-installation/state', 'PUT', input({ tasks: [] }), identity), env);
  db.prepare('UPDATE installations SET next_at = ?').run(now - 5 * 60000);
  await runSchedule(env, now, async () => { assert.fail('Empty digest must not send'); });
  await worker.fetch(request('/v1/reminder-installation/state', 'PUT', input({ revision: 2, tasks: [] }), identity), env);
  assert.equal(db.prepare('SELECT last_status FROM installations').get().last_status, 'skipped');
  // Older frontend syncs could overwrite the summary status; the delivery record remains authoritative.
  db.prepare("UPDATE installations SET last_status = 'enabled'").run();
  const changed = await worker.fetch(request('/v1/reminder-installation/state', 'PUT', input({ revision: 3, settings: { ...settings, time: '09:00' } }), identity), env);
  assert.equal(changed.status, 200);
  const target = Date.parse('2026-10-01T01:00:00Z');
  assert.equal((await changed.json()).nextAt, target);
  assert.equal(db.prepare('SELECT status FROM deliveries').get().status, 'pending');
  now = target; let pushes = 0;
  await runSchedule(env, now, async () => { pushes++; return { status: 201 }; });
  const afterSent = await worker.fetch(request('/v1/reminder-installation/state', 'PUT', input({ revision: 4, settings: { ...settings, time: '10:00' } }), identity), env);
  assert.equal((await afterSent.json()).nextAt, Date.parse('2026-10-02T02:00:00Z'));
  await runSchedule(env, Date.parse('2026-10-01T02:00:00Z'), async () => { pushes++; return { status: 201 }; });
  assert.equal(pushes, 1);
});
test('moving a claimed unsent reminder to a future time keeps that day eligible', async (t) => {
  const originalClock = Date.now; let now = Date.parse('2026-09-30T23:50:00Z');
  Date.now = () => now; t.after(() => { Date.now = originalClock; });
  const { db, env } = setup(t);
  const identity = await (await worker.fetch(request('/v1/reminder-installations', 'POST', {}), env)).json();
  await worker.fetch(request('/v1/reminder-installation/state', 'PUT', input(), identity), env);
  const binding = env.DB; let moved = false;
  env.DB = { ...binding, prepare(sql) {
    const statement = binding.prepare(sql);
    if (sql !== 'SELECT * FROM installations WHERE id = ?') return statement;
    return { bind(...args) {
      const bound = statement.bind(...args);
      return { ...bound, async first() {
        if (!moved) {
          moved = true;
          const response = await worker.fetch(request('/v1/reminder-installation/state', 'PUT', input({ revision: 2, settings: { ...settings, time: '08:30' } }), identity), env);
          assert.equal(response.status, 200);
        }
        return bound.first();
      } };
    } };
  } };
  now = Date.parse('2026-10-01T00:00:00Z'); let pushes = 0;
  const push = async () => { pushes++; return { status: 201 }; };
  await runSchedule(env, now, push);
  assert.equal(pushes, 0);
  assert.equal(db.prepare('SELECT status FROM deliveries').get().status, 'pending');
  assert.equal(db.prepare('SELECT attempts FROM deliveries').get().attempts, 0);
  now += 30 * 60000;
  await runSchedule(env, now, push);
  assert.equal(pushes, 1);
});
test('scheduler health requires a completed background run, and reports a stalled or failed scheduler', async (t) => {
  const { db, env } = setup(t); const now = Date.now(); env.VAPID_PRIVATE_KEY = 'test-only';
  const health = async () => (await (await worker.fetch(request('/health'), env)).json()).scheduler;
  assert.equal((await health()).healthy, false);
  assert.equal((await health()).lastStatus, 'unverified');
  await runScheduled(env, now - 60000, undefined, () => now);
  assert.equal((await health()).healthy, true);
  db.prepare('UPDATE scheduler_health SET completed_at = ?').run(now - 6 * 60000);
  assert.equal((await health()).healthy, false);
  const failing = { ...env, DB: { prepare(sql) {
    if (sql.startsWith('SELECT * FROM installations')) throw new Error('fixture scheduler failure');
    return env.DB.prepare(sql);
  } } };
  await assert.rejects(runScheduled(failing, now, undefined, () => now + 1), /fixture scheduler failure/);
  assert.equal((await health()).lastStatus, 'failed');
  assert.equal((await health()).healthy, false);
});
test('a delayed platform trigger uses execution time and does not send a stale notification', async (t) => {
  const { db, env } = setup(t); const scheduledAt = seed(db); let pushes = 0;
  await runScheduled(env, scheduledAt, async () => { pushes++; return { status: 201 }; }, () => scheduledAt + 3600001);
  assert.equal(pushes, 0);
  assert.equal(db.prepare('SELECT last_status FROM installations').get().last_status, 'skipped');
});
test('Web Push payload is encrypted and decrypts using only the receiving device key', async () => {
  const keys = webpush.generateVAPIDKeys(); let delivered;
  await sendPush(subscription, { title: '加密測試' }, { VAPID_SUBJECT: 'https://app.test', VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey }, 60, async (_url, options) => {
    delivered = options; return new Response(null, { status: 201 });
  });
  assert.equal(delivered.redirect, 'manual'); assert.equal(delivered.headers['Content-Encoding'], 'aes128gcm');
  assert.ok(!delivered.body.includes(Buffer.from('加密測試')));
  const plain = ece.decrypt(delivered.body, { version: 'aes128gcm', privateKey: subscriber, authSecret: auth });
  assert.equal(JSON.parse(plain.toString()).title, '加密測試');
});
