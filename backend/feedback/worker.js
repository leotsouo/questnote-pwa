/** Anonymous, write-only intake. Administration uses authenticated Cloudflare D1 APIs. */
const MAX_BYTES = 32768;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const LIMITS = { title: 100, description: 4000, steps: 2000, expected: 1000 };
const DIAGNOSTICS = ['appVersion', 'buildTime', 'cacheName', 'releaseProfile', 'artifactId',
  'userAgent', 'language', 'viewport', 'online', 'displayMode', 'serviceWorkerControlled'];

class IntakeError extends Error {
  constructor(status, code) { super(code); this.status = status; }
}

async function readBoundedJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new IntakeError(415, 'json_required');
  if (Number(request.headers.get('content-length')) > MAX_BYTES) throw new IntakeError(413, 'too_large');
  if (!request.body) throw new IntakeError(400, 'invalid_payload');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new IntakeError(413, 'too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new IntakeError(400, 'invalid_json'); }
}

export function validatePayload(input) {
  if (!input || !UUID.test(input.id) || !['bug', 'suggestion', 'other'].includes(input.type)
    || input.website) throw new IntakeError(400, 'invalid_payload');
  const report = { id: input.id.toLowerCase(), type: input.type };
  for (const [key, limit] of Object.entries(LIMITS)) {
    if (typeof input[key] !== 'string' || input[key].length > limit
      || (['title', 'description'].includes(key) && !input[key].trim())) throw new IntakeError(400, 'invalid_payload');
    report[key] = input[key].trim();
  }
  report.diagnostics = null;
  if (input.diagnostics !== null && input.diagnostics !== undefined) {
    if (typeof input.diagnostics !== 'object' || Array.isArray(input.diagnostics)) throw new IntakeError(400, 'invalid_payload');
    report.diagnostics = {};
    for (const key of DIAGNOSTICS) {
      const value = input.diagnostics[key];
      if (value === null || typeof value === 'boolean') report.diagnostics[key] = value;
      else if (typeof value === 'string' && value.length <= 400) report.diagnostics[key] = value;
      else if (value !== undefined) throw new IntakeError(400, 'invalid_payload');
    }
  }
  return report;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin');
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').includes(origin);
    const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff', Vary: 'Origin' };
    if (allowed) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type';
    }
    const reply = (status, data) => new Response(JSON.stringify(data), { status, headers });
    if (new URL(request.url).pathname !== '/v1/feedback') return reply(404, { error: 'not_found' });
    if (!allowed) return reply(403, { error: 'origin_not_allowed' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
    try {
      // IP is only used by the short-lived rate limiter, never stored with a report.
      const rate = await env.INTAKE_RATE.limit({ key: `intake:${request.headers.get('cf-connecting-ip') || 'unknown'}` });
      if (!rate.success) { headers['Retry-After'] = '60'; return reply(429, { error: 'rate_limited' }); }
      const report = validatePayload(await readBoundedJson(request));
      const hashBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(report)));
      const hash = Array.from(new Uint8Array(hashBytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const submittedAt = new Date().toISOString();
      // One atomic INSERT enforces a daily storage cap. Conflict cannot overwrite an existing report.
      await env.DB.prepare(`INSERT INTO feedback
        (id, submitted_at, type, title, description, steps, expected, diagnostics_json, payload_hash)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE (SELECT COUNT(*) FROM feedback WHERE submitted_at >= ?) < 1000
        ON CONFLICT(id) DO NOTHING`).bind(report.id, submittedAt, report.type, report.title,
        report.description, report.steps, report.expected,
        report.diagnostics === null ? null : JSON.stringify(report.diagnostics), hash,
        submittedAt.slice(0, 10)).run();
      const stored = await env.DB.prepare('SELECT payload_hash FROM feedback WHERE id = ?').bind(report.id).first();
      if (!stored) { headers['Retry-After'] = '3600'; return reply(429, { error: 'daily_capacity' }); }
      if (stored.payload_hash !== hash) return reply(409, { error: 'id_conflict' });
      return reply(200, { accepted: true, id: report.id });
    } catch (error) {
      if (error instanceof IntakeError) return reply(error.status, { error: error.message });
      console.error(JSON.stringify({ event: 'feedback_intake_failed' }));
      return reply(503, { error: 'temporarily_unavailable' });
    }
  },
};
