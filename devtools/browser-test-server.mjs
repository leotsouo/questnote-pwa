/** Local-only static server for browser acceptance tests. No package dependencies. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'devtools/m1-browser-test.html';
    const target = path.resolve(root, relative);
    if (request.method !== 'GET' || !target.startsWith(root + path.sep)
      || relative.split(/[\\/]/).some((part) => part.startsWith('.'))) {
      response.writeHead(403).end(); return;
    }
    const bytes = await fs.readFile(target);
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream',
      'Cache-Control': 'no-store' }).end(bytes);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
server.listen(Number(process.argv[2] || 8765), '127.0.0.1', () => {
  console.log(`Browser tests: http://127.0.0.1:${server.address().port}/devtools/m1-browser-test.html`);
});
