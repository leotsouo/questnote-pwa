/** Dedicated synthetic-data origin. Run: node devtools/ui-polish-server.mjs [port]. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const instance = randomUUID();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const server = http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/__ui-polish_test_guard__') {
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
        purpose: 'questnote-ui-polish-synthetic-only', instance,
      }));
      return;
    }
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'devtools/ui-polish-test.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) || relative.split(/[\\/]/).some((part) => part.startsWith('.'))
      || path.basename(target) === 'service-worker.js' || request.headers['service-worker']) {
      response.writeHead(403).end('Service workers and private paths are disabled on this test origin.');
      return;
    }
    const bytes = await fs.readFile(target);
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' }).end(bytes);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
server.listen(Number(process.argv[2] || 0), '127.0.0.1', () => {
  console.log(`Synthetic UI tests: http://127.0.0.1:${server.address().port}/devtools/ui-polish-test.html`);
  console.log('Use a fresh origin. No existing databases are erased; the harness refuses to initialize over them.');
});
