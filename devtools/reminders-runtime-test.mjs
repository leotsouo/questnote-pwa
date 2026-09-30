/** Exercise the bundled notification Worker in workerd, with in-memory D1 and blocked external delivery. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createECDH, randomBytes } from 'node:crypto';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import webpush from 'web-push';
const keys = webpush.generateVAPIDKeys(); const ec = createECDH('prime256v1'); ec.generateKeys();
let pushes = 0;
const fixtureScript = (await fs.readFile('backend/reminders/.dev-backups/reminder-worker/worker.js', 'utf8'))
  .replace('console.error(JSON.stringify({ event: "reminder-api-failed" }))', 'console.error(error.message)');
const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true, script: fixtureScript, compatibilityDate: '2026-09-30', compatibilityFlags: ['nodejs_compat'],
  d1Databases: { DB: 'isolated-reminders-runtime' }, d1Persist: false,
  bindings: { ALLOWED_ORIGINS: 'https://app.test', VAPID_SUBJECT: 'https://app.test', VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey },
  outboundService: async (request) => {
    assert.equal(new URL(request.url).hostname, 'web.push.apple.com');
    assert.equal(request.headers.get('Content-Encoding'), 'aes128gcm');
    assert.ok(request.headers.get('Authorization').startsWith('vapid ')); pushes++;
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
  const identity = await (await call('/v1/reminder-installations', 'POST', {})).json();
  const state = { revision: 1, settings: { time: '08:00', timeZone: 'Asia/Taipei', tasks: true, habits: true }, tasks: [], habits: [],
    subscription: { endpoint: 'https://web.push.apple.com/runtime-fixture', keys: { p256dh: ec.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } } };
  const synced = await call('/v1/reminder-installation/state', 'PUT', state, identity);
  assert.equal(synced.status, 200, await synced.text());
  const tested = await call('/v1/reminder-installation/test', 'POST', {}, identity);
  assert.equal(tested.status, 200, await tested.text()); assert.equal(pushes, 1);
  assert.equal((await call('/v1/reminder-installation/state', 'DELETE', null, identity)).status, 200);
  console.log('PASS workerd: D1 schema, anonymous identity, durable sync, Node-compatible Web Push encryption/VAPID, mock delivery and deletion');
} finally { await mf.dispose(); }
