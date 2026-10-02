/** Exercise the bundled notification Worker in workerd, with in-memory D1 and blocked external delivery. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createECDH, randomBytes } from 'node:crypto';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import webpush from 'web-push';
import ece from 'http_ece';
import { zonedParts } from '../src/reminderRules.js';
const keys = webpush.generateVAPIDKeys(); const ec = createECDH('prime256v1'); ec.generateKeys();
const auth = randomBytes(16); const pushes = [];
const bundled = await fs.readFile('backend/reminders/.dev-backups/reminder-worker/worker-runtime.js', 'utf8');
assert.ok(bundled.includes('worker_default as default'), 'Build the current Worker before running the runtime check');
// This entry point exists only in the in-memory fixture, never in the deployed Worker.
const fixtureScript = bundled.replace('worker_default as default', 'runtime_fixture as default') + `
var runtime_fixture = {
  ...worker_default,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/__test/alarm') {
      await env.SCHEDULER.getByName('minute-dispatch').fireForTest();
      return new Response('scheduled');
    }
    return worker_default.fetch(request, env, ctx);
  }
};
export class RuntimeScheduler extends ReminderScheduler {
  async fireForTest() { await this.alarm(); }
  async inspectForTest() { return { nextAt: await this.ctx.storage.getAlarm() }; }
  async stopForTest() { await this.ctx.storage.deleteAlarm(); }
}`;
const config = JSON.parse(await fs.readFile('backend/reminders/wrangler.jsonc', 'utf8'));
const mf = new Miniflare(convertV4MiniflareOptions({
  name: 'isolated-reminders', modules: true, script: fixtureScript, compatibilityDate: config.compatibility_date, compatibilityFlags: config.compatibility_flags,
  d1Databases: { DB: 'isolated-reminders-runtime' }, d1Persist: false,
  durableObjects: { SCHEDULER: { className: 'RuntimeScheduler', useSQLite: true } }, durableObjectsPersist: false,
  bindings: { ALLOWED_ORIGINS: 'https://app.test', VAPID_SUBJECT: 'https://app.test', VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey },
  outboundService: async (request) => {
    const host = new URL(request.url).hostname;
    assert.ok(['web.push.apple.com', 'fcm.googleapis.com'].includes(host));
    assert.equal(request.headers.get('Content-Encoding'), 'aes128gcm');
    assert.ok(request.headers.get('Authorization').startsWith('vapid '));
    const payload = JSON.parse(ece.decrypt(Buffer.from(await request.arrayBuffer()), { version: 'aes128gcm', privateKey: ec, authSecret: auth }).toString());
    pushes.push({ host, payload });
    return new Response(null, { status: 201 });
  },
}));
try {
  const db = await mf.getD1Database('DB');
  const schema = await fs.readFile('backend/reminders/schema.sql', 'utf8');
  await db.batch(schema.split(';').map((s) => s.trim()).filter(Boolean).map((s) => db.prepare(s)));
  const call = (path, method, body, identity = {}) => mf.dispatchFetch('https://reminders.test' + path, { method,
    headers: { Origin: 'https://app.test', 'Content-Type': 'application/json', ...(identity.token ? { Authorization: 'Bearer ' + identity.token, 'X-Installation-Id': identity.installationId } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const now = Date.now(); const today = zonedParts(now, 'Asia/Taipei'); const identities = [];
  for (const host of ['web.push.apple.com', 'fcm.googleapis.com']) {
    const identity = await (await call('/v1/reminder-installations', 'POST', {})).json(); identities.push(identity);
    const state = { revision: 1, settings: { time: today.time, timeZone: 'Asia/Taipei', tasks: true, habits: true },
      tasks: [{ id: 'runtime-task', plannedDate: today.date }],
      habits: [{ id: 'runtime-habit', frequency: 'daily', targetPerWeek: 1, completedDates: [] }],
      subscription: { endpoint: `https://${host}/runtime-fixture`, keys: { p256dh: ec.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } } };
    const synced = await call('/v1/reminder-installation/state', 'PUT', state, identity);
    assert.equal(synced.status, 200, await synced.text());
  }
  const tested = await call('/v1/reminder-installation/test', 'POST', {}, identities[0]);
  assert.equal(tested.status, 200, await tested.text()); assert.equal(pushes.length, 1);
  const healthBefore = await (await call('/health', 'GET')).json();
  assert.equal(healthBefore.scheduler.healthy, false);
  // Simulate the real missed schedule, then stop foreground syncing entirely.
  await db.prepare('UPDATE installations SET next_at = ?').bind(Math.floor(now / 60000) * 60000 - 86400000).run();
  for (let invocation = 0; invocation < 3; invocation++) {
    const response = await mf.dispatchFetch('https://reminders.test/__test/alarm');
    assert.equal(response.status, 200, await response.text());
  }
  const daily = pushes.filter((p) => p.payload.tag === `daily-${today.date}`);
  assert.equal(daily.length, 2);
  assert.deepEqual(daily.map((p) => p.host).sort(), ['fcm.googleapis.com', 'web.push.apple.com']);
  for (const { payload } of daily) assert.match(payload.body, /1 項任務、1 項每日習慣/);
  const health = await (await call('/health', 'GET')).json();
  assert.equal(health.scheduler.healthy, true); assert.equal(health.scheduler.lastStatus, 'ok');
  assert.equal(health.scheduler.driver, 'durable-alarm');
  const namespace = await mf.getDurableObjectNamespace('SCHEDULER');
  const scheduler = namespace.getByName('minute-dispatch');
  const beforeSync = await scheduler.inspectForTest(); assert.ok(beforeSync.nextAt > Date.now());
  await scheduler.ensure(); assert.equal((await scheduler.inspectForTest()).nextAt, beforeSync.nextAt, 'sync does not postpone the next wakeup');
  await scheduler.stopForTest();
  const records = (await db.prepare('SELECT local_date, status FROM deliveries ORDER BY local_date').all()).results;
  assert.equal(records.filter((r) => r.status === 'accepted').length, 2);
  assert.equal(records.filter((r) => r.status === 'skipped').length, 2);
  for (const identity of identities) assert.equal((await call('/v1/reminder-installation/state', 'DELETE', null, identity)).status, 200);
  console.log('PASS workerd: actual Durable Object alarm, persisted next wakeup, missed-day recovery, Apple/Android encrypted delivery without foreground sync, deduplication, scheduler health and cleanup');
} finally { await mf.dispose(); }
