/** Loopback-only acceptance server. Isolated IndexedDB and in-memory SQL; never calls production. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import worker from '../backend/feedback/worker.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const db = new DatabaseSync(':memory:');
db.exec(await fs.readFile(new URL('../backend/feedback/schema.sql', import.meta.url), 'utf8'));
const databaseName = `QuestNoteTest-Feedback-${crypto.randomUUID()}`;
const binding = { prepare(sql) { return { bind(...values) { return {
  run: async () => db.prepare(sql).run(...values), first: async () => db.prepare(sql).get(...values) || null,
}; } }; } };
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
let loseNextReceipt = false;
const server = http.createServer(async (req, res) => {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const url = new URL(req.url, origin);
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (url.pathname === '/__feedback-test/results') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(db.prepare('SELECT id,title,status FROM feedback').all())); return;
    }
    if (url.pathname === '/__feedback-test/lose-receipt' && req.method === 'POST') {
      loseNextReceipt = true; res.writeHead(204).end(); return;
    }
    if (url.pathname === '/v1/feedback') {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 32768) { res.writeHead(413).end(); return; } }
      const request = new Request(url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? body : undefined });
      const response = await worker.fetch(request, { DB: binding, ALLOWED_ORIGINS: origin, INTAKE_RATE: { limit: async () => ({ success: true }) } });
      if (loseNextReceipt && response.ok && req.method === 'POST') {
        loseNextReceipt = false;
        res.writeHead(503, { 'Content-Type': 'application/json' }).end('{"error":"simulated_lost_receipt"}'); return;
      }
      res.writeHead(response.status, Object.fromEntries(response.headers)).end(Buffer.from(await response.arrayBuffer())); return;
    }
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    if (url.pathname === '/src/feedbackConfig.js') {
      res.writeHead(200, { 'Content-Type': types['.js'] }).end(`export const FEEDBACK_ENDPOINT = ${JSON.stringify(origin + '/v1/feedback')};`); return;
    }
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root) || relative.split(/[\\/]/).some((part) => part.startsWith('.'))
      || relative.startsWith('backend/') || path.basename(target) === 'service-worker.js') { res.writeHead(403).end(); return; }
    let bytes = await fs.readFile(target);
    if (relative === 'index.html') bytes = Buffer.from(bytes.toString('utf8').replace('<head>', `<head><script>
      const open = indexedDB.open.bind(indexedDB);
      indexedDB.open = (_name, version) => open(${JSON.stringify(databaseName)}, version);
      </script>`));
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' }).end(bytes);
  } catch { res.writeHead(500).end('Test server error'); }
});
server.listen(0, '127.0.0.1', () => console.log(`Feedback acceptance: http://127.0.0.1:${server.address().port}/index.html`));
