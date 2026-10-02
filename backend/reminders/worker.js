import { REMINDER_DEFAULTS, nextReminderAt, zonedParts, buildDailyDigest } from '../../src/reminderRules.js';
import { sendPush } from './push.js';

const MAX_BYTES = 512 * 1024;
const LIFETIME = 30 * 86400000;
const SCHEDULER_MAX_AGE = 5 * 60000;
const fail = (status, message) => Object.assign(new Error(message), { status });
const hash = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map((b) => b.toString(16).padStart(2, '0')).join('');
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
function date(value) {
  if (value == null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T12:00:00Z`)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value) throw fail(400, '日期格式錯誤');
  return value;
}
function identifier(value) {
  if (typeof value !== 'string' || !value || value.length > 100) throw fail(400, '項目識別碼錯誤');
  return value;
}
export function validateSubscription(raw) {
  let url;
  try { url = new URL(raw?.endpoint); } catch { throw fail(400, '推播訂閱格式錯誤'); }
  const allowed = url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com'
    || url.hostname === 'web.push.apple.com' || url.hostname.endsWith('.push.apple.com') || url.hostname.endsWith('.notify.windows.com');
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !allowed || url.href.length > 3000) throw fail(400, '不支援此推播服務');
  const { p256dh, auth } = raw.keys || {};
  if (!/^[A-Za-z0-9_-]{87}$/.test(p256dh || '') || !/^[A-Za-z0-9_-]{22}$/.test(auth || '')) throw fail(400, '推播金鑰格式錯誤');
  return { endpoint: url.href, keys: { p256dh, auth } };
}
export function sanitizeState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw fail(400, '同步格式錯誤');
  if (!Number.isSafeInteger(raw.revision) || raw.revision < 1) throw fail(400, '同步版本錯誤');
  const s = raw.settings || {};
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time || '') || typeof s.timeZone !== 'string' || s.timeZone.length > 80) throw fail(400, '提醒時間格式錯誤');
  try { zonedParts(Date.now(), s.timeZone); } catch { throw fail(400, '時區格式錯誤'); }
  const settings = { time: s.time, timeZone: s.timeZone };
  for (const key of Object.keys(REMINDER_DEFAULTS).filter((k) => k !== 'time')) settings[key] = s[key] === true;
  if (!Array.isArray(raw.tasks) || raw.tasks.length > 1000 || !Array.isArray(raw.habits) || raw.habits.length > 200) throw fail(400, '提醒項目過多');
  if ([...raw.tasks, ...raw.habits].some((item) => !item || typeof item !== 'object' || Array.isArray(item))) throw fail(400, '提醒項目格式錯誤');
  const tasks = raw.tasks.map((t) => ({ id: identifier(t.id), plannedDate: date(t.plannedDate), startDate: date(t.startDate), dueDate: date(t.dueDate),
    priority: ['normal', 'important', 'urgent'].includes(t.priority) ? t.priority : 'normal', ...(settings.showTitles ? { title: String(t.title || '').slice(0, 60) } : {}) }));
  const habits = raw.habits.map((h) => {
    if (!['daily', 'weekly'].includes(h.frequency) || !Number.isInteger(h.targetPerWeek) || h.targetPerWeek < 1 || h.targetPerWeek > 7 || !Array.isArray(h.completedDates) || h.completedDates.length > 32 || h.completedDates.some((value) => typeof value !== 'string')) throw fail(400, '習慣格式錯誤');
    return { id: identifier(h.id), frequency: h.frequency, targetPerWeek: h.targetPerWeek,
      completedDates: [...new Set(h.completedDates.map(date))], ...(settings.showTitles ? { name: String(h.name || '').slice(0, 60) } : {}) };
  });
  if (new Set(tasks.map((t) => t.id)).size !== tasks.length || new Set(habits.map((h) => h.id)).size !== habits.length) throw fail(400, '重複項目');
  return { settings, tasks, habits, subscription: validateSubscription(raw.subscription) };
}
async function readBody(request) {
  if (!request.headers.get('Content-Type')?.includes('application/json')) throw fail(415, '請使用 JSON');
  const reader = request.body?.getReader();
  if (!reader) throw fail(400, '缺少內容');
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw fail(413, '內容過大'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { const body = JSON.parse(new TextDecoder().decode(bytes)); if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error(); return body; }
  catch { throw fail(400, 'JSON 格式錯誤'); }
}
async function authenticate(request, env) {
  const id = request.headers.get('X-Installation-Id');
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!/^[\da-f-]{36}$/.test(id || '') || !/^[\da-f]{64}$/.test(token || '')) throw fail(401, '提醒身分無效，請重新啟用');
  const row = await env.DB.prepare('SELECT * FROM installations WHERE id = ? AND token_hash = ?').bind(id, await hash(token)).first();
  if (!row || row.updated_at < Date.now() - LIFETIME) throw fail(401, '提醒身分已過期，請重新啟用');
  return row;
}
async function schedulerHealth(env, now) {
  const row = await env.DB.prepare('SELECT scheduled_at, started_at, completed_at, status FROM scheduler_health WHERE singleton = ?').bind(1).first();
  return {
    healthy: !!row?.completed_at && row.status !== 'failed' && row.completed_at >= now - SCHEDULER_MAX_AGE,
    lastScheduledAt: row?.scheduled_at || null, lastStartedAt: row?.started_at || null,
    lastCompletedAt: row?.completed_at || null, lastStatus: row?.status || 'unverified',
  };
}
async function route(request, env) {
  const path = new URL(request.url).pathname; const now = Date.now();
  if (path === '/health' && request.method === 'GET') return json({ service: 'questnote-reminders', version: 2, ready: !!env.VAPID_PRIVATE_KEY, scheduler: await schedulerHealth(env, now) });
  if (path === '/v1/push/public-key' && request.method === 'GET') return json({ publicKey: env.VAPID_PUBLIC_KEY });
  if (env.API_RATE && !(await env.API_RATE.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' })).success) throw fail(429, '操作太頻繁，請稍後重試');
  if (path === '/v1/reminder-installations' && request.method === 'POST') {
    const id = crypto.randomUUID(); const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, '0')).join('');
    const inserted = await env.DB.prepare('INSERT INTO installations(id, token_hash, updated_at) SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM installations) < 10000 RETURNING id').bind(id, await hash(token), now).first();
    if (!inserted) throw fail(429, '目前提醒名額已滿');
    return json({ installationId: id, token }, 201);
  }
  if (!path.startsWith('/v1/reminder-installation/')) throw fail(404, '找不到此功能');
  const row = await authenticate(request, env);
  if (path.endsWith('/state') && request.method === 'PUT') {
    const body = await readBody(request); const state = sanitizeState(body); const encoded = JSON.stringify(state);
    if (body.revision < row.revision || (body.revision === row.revision && encoded !== row.state_json)) throw fail(409, '收到舊的提醒資料，請重試同步');
    let next = nextReminderAt(now, state.settings);
    const previous = row.state_json ? JSON.parse(row.state_json) : null;
    const sameSchedule = previous && previous.settings.time === state.settings.time && previous.settings.timeZone === state.settings.timeZone;
    if (sameSchedule
      && row.next_at && row.next_at > now - 3600000) next = row.next_at;
    const priorDelivery = previous && !sameSchedule && body.revision > row.revision && row.last_day === zonedParts(next, state.settings.timeZone).date
      ? await env.DB.prepare('SELECT status FROM deliveries WHERE installation_id = ? AND local_date = ?').bind(row.id, row.last_day).first() : null;
    const rescheduleSkipped = priorDelivery?.status === 'skipped';
    if (row.last_day === zonedParts(next, state.settings.timeZone).date && !rescheduleSkipped) next = nextReminderAt(next + 1, state.settings);
    const updates = [env.DB.prepare('UPDATE installations SET revision = ?, state_json = ?, enabled = 1, next_at = ?, updated_at = ?, last_status = ?, last_day = ? WHERE id = ? AND (revision < ? OR (revision = ? AND state_json = ?)) AND last_day IS ? RETURNING id')
      .bind(body.revision, encoded, body.revision === row.revision ? row.next_at : next, now, rescheduleSkipped ? 'enabled' : row.last_status || 'enabled', rescheduleSkipped ? null : row.last_day, row.id, body.revision, body.revision, encoded, row.last_day)];
    if (rescheduleSkipped) updates.push(env.DB.prepare("UPDATE deliveries SET status = 'pending', attempts = 0, lease_until = 0, retry_at = 0 WHERE installation_id = ? AND local_date = ? AND status = 'skipped' AND EXISTS (SELECT 1 FROM installations WHERE id = ? AND revision = ? AND state_json = ? AND next_at = ?)")
      .bind(row.id, row.last_day, row.id, body.revision, encoded, next));
    // Publish the new future schedule and reset only its unsent delivery atomically.
    const changed = (await env.DB.batch(updates))[0].results?.[0];
    if (!changed) throw fail(409, '同步版本已更新');
    return json({ revision: body.revision, syncedAt: now, nextAt: body.revision === row.revision ? row.next_at : next });
  }
  if (path.endsWith('/status') && request.method === 'GET') return json({ revision: row.revision, enabled: !!row.enabled, nextAt: row.next_at, lastStatus: row.last_status, expiresAt: row.updated_at + LIFETIME, scheduler: await schedulerHealth(env, now) });
  if (path.endsWith('/test') && request.method === 'POST') {
    if (!row.enabled || !row.state_json) throw fail(400, '請先啟用每日提醒');
    const allowed = await env.DB.prepare('UPDATE installations SET last_test_at = ? WHERE id = ? AND last_test_at < ? RETURNING id').bind(now, row.id, now - 60000).first();
    if (!allowed) throw fail(429, '每分鐘可發送一次測試通知');
    const state = JSON.parse(row.state_json);
    const result = await sendPush(state.subscription, { type: 'daily-reminder', title: 'QuestNote 測試通知', body: '通知連線正常。每天會在你設定的時間提醒今日任務與習慣。', tag: `test-${now}`, expiresAt: now + 60000 }, env, 60);
    if (result.status === 404 || result.status === 410) await env.DB.prepare('UPDATE installations SET enabled = 0, last_status = ? WHERE id = ?').bind('subscription-expired', row.id).run();
    if (result.status < 200 || result.status >= 300) throw fail(503, '推播服務未接受通知，請重新啟用或稍後重試');
    return json({ accepted: true });
  }
  if (path.endsWith('/state') && request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM deliveries WHERE installation_id = ?').bind(row.id).run();
    await env.DB.prepare('DELETE FROM installations WHERE id = ?').bind(row.id).run();
    return json({ disabled: true });
  }
  throw fail(405, '不支援此操作');
}
function nextAfterDelivery(now, settings, processedDate) {
  // Recover today's unprocessed occurrence after a missed earlier day, within its delivery window.
  const next = nextReminderAt(now - 3600000, settings);
  return zonedParts(next, settings.timeZone).date > processedDate ? next : nextReminderAt(Math.max(now, next), settings);
}
export async function runSchedule(env, now = Date.now(), push = sendPush) {
  const rows = (await env.DB.prepare('SELECT * FROM installations WHERE enabled = 1 AND next_at <= ? AND updated_at > ? ORDER BY next_at LIMIT 4').bind(now, now - LIFETIME).all()).results;
  for (const candidate of rows) {
    const date = zonedParts(candidate.next_at, JSON.parse(candidate.state_json).settings.timeZone).date;
    await env.DB.prepare('INSERT OR IGNORE INTO deliveries(installation_id, local_date, created_at) VALUES(?, ?, ?)').bind(candidate.id, date, now).run();
    const claim = await env.DB.prepare("UPDATE deliveries SET lease_until = ?, attempts = attempts + 1, status = 'sending' WHERE installation_id = ? AND local_date = ? AND status IN ('pending','sending','retry') AND lease_until <= ? AND retry_at <= ? AND attempts < 3 RETURNING attempts")
      .bind(now + 30000, candidate.id, date, now, now).first();
    if (!claim) {
      const previous = await env.DB.prepare('SELECT status, attempts, lease_until FROM deliveries WHERE installation_id = ? AND local_date = ?').bind(candidate.id, date).first();
      if (previous && (['accepted', 'skipped', 'failed', 'subscription-expired'].includes(previous.status) || (previous.attempts >= 3 && previous.lease_until <= now))) {
        const state = JSON.parse(candidate.state_json);
        await env.DB.prepare('UPDATE installations SET next_at = ?, last_day = ?, last_status = ? WHERE id = ? AND next_at = ?')
          .bind(nextAfterDelivery(now, state.settings, date), date, previous.status === 'sending' ? 'failed' : previous.status, candidate.id, candidate.next_at).run();
      }
      continue;
    }
    const row = await env.DB.prepare('SELECT * FROM installations WHERE id = ?').bind(candidate.id).first();
    if (!row || !row.enabled || row.next_at !== candidate.next_at) {
      const rescheduledToday = row?.enabled && row.next_at > now
        && zonedParts(row.next_at, JSON.parse(row.state_json).settings.timeZone).date === date;
      await env.DB.prepare('UPDATE deliveries SET status = ?, lease_until = 0, attempts = MAX(0, attempts - 1), retry_at = 0 WHERE installation_id = ? AND local_date = ?')
        .bind(rescheduledToday ? 'pending' : 'skipped', candidate.id, date).run(); continue;
    }
    const state = JSON.parse(row.state_json); const digest = buildDailyDigest(state, now);
    const deadline = Math.min(candidate.next_at + 3600000, nextReminderAt(candidate.next_at, { ...state.settings, time: '00:00' }));
    let status = 'skipped'; let retry = 0;
    if (digest.count && digest.date === date && now < deadline) {
      try {
        const result = await push(state.subscription, { type: 'daily-reminder', title: digest.title, body: digest.body, tag: `daily-${date}`, expiresAt: deadline }, env, (deadline - now) / 1000);
        status = result.status >= 200 && result.status < 300 ? 'accepted' : result.status === 404 || result.status === 410 ? 'subscription-expired' : result.status === 429 || result.status >= 500 ? 'retry' : 'failed';
        retry = result.retrySeconds || 60;
      } catch { status = 'retry'; retry = 60; }
    }
    if (status === 'retry' && claim.attempts >= 3) status = 'failed';
    await env.DB.prepare('UPDATE deliveries SET status = ?, lease_until = 0, retry_at = ? WHERE installation_id = ? AND local_date = ?').bind(status, now + Math.max(60, retry) * 1000, row.id, date).run();
    if (status !== 'retry') await env.DB.prepare('UPDATE installations SET next_at = ?, last_day = ?, last_status = ?, enabled = CASE WHEN ? = ? THEN 0 ELSE enabled END WHERE id = ? AND next_at = ?')
      .bind(nextAfterDelivery(now, state.settings, date), date, status, status, 'subscription-expired', row.id, candidate.next_at).run();
  }
  await env.DB.prepare('DELETE FROM deliveries WHERE created_at < ? OR installation_id IN (SELECT id FROM installations WHERE updated_at < ?)').bind(now - LIFETIME, now - LIFETIME).run();
  await env.DB.prepare('DELETE FROM installations WHERE updated_at < ?').bind(now - LIFETIME).run();
}
export async function runScheduled(env, scheduledAt, push = sendPush, clock = Date.now) {
  const startedAt = clock();
  try {
    await env.DB.prepare("INSERT INTO scheduler_health(singleton, scheduled_at, started_at, status) VALUES(1, ?, ?, 'running') ON CONFLICT(singleton) DO UPDATE SET scheduled_at = excluded.scheduled_at, started_at = excluded.started_at, status = 'running' WHERE scheduler_health.started_at <= excluded.started_at")
      .bind(scheduledAt, startedAt).run();
    // Use the actual execution time for deadlines; a delayed trigger must not send expired content.
    await runSchedule(env, startedAt, push);
    await env.DB.prepare("UPDATE scheduler_health SET completed_at = ?, status = 'ok' WHERE singleton = 1 AND started_at = ?").bind(clock(), startedAt).run();
    console.info(JSON.stringify({ event: 'reminder-schedule-completed', scheduledAt }));
  } catch (error) {
    console.error(JSON.stringify({ event: 'reminder-schedule-failed', scheduledAt }));
    try { await env.DB.prepare("UPDATE scheduler_health SET status = 'failed' WHERE singleton = 1 AND started_at = ?").bind(startedAt).run(); } catch {}
    throw error;
  }
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin'); const allowed = (env.ALLOWED_ORIGINS || '').split(',').includes(origin);
    const publicGet = request.method === 'GET' && ['/health', '/v1/push/public-key'].includes(new URL(request.url).pathname);
    if (!allowed && !publicGet) return json({ error: '來源不允許' }, 403);
    let response;
    try { response = request.method === 'OPTIONS' ? new Response(null, { status: 204 }) : await route(request, env); }
    catch (error) {
      if (!error.status) console.error(JSON.stringify({ event: 'reminder-api-failed' }));
      response = json({ error: error.status ? error.message : '提醒服務暫時無法連線，請稍後重試' }, error.status || 503);
      if (error.status === 429) response.headers.set('Retry-After', '60');
    }
    if (allowed) {
      response.headers.set('Access-Control-Allow-Origin', origin); response.headers.set('Vary', 'Origin');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Installation-Id');
    }
    return response;
  },
  async scheduled(event, env) { await runScheduled(env, event.scheduledTime); },
};
