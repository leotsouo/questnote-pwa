/** Ephemeral, synthetic-only origin for the real UI acceptance harness. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const instance = randomUUID();
const databaseName = `QuestNoteTest-Onboarding-${instance}`;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript',
  '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };

// The served test document installs this before the unchanged app module loads.
// Only this ephemeral HTTP response is instrumented; no product source is rewritten.
const bootstrap = `(() => {
  const databaseName = ${JSON.stringify(databaseName)};
  const handles = new Set();
  const nativeOpen = indexedDB.open.bind(indexedDB);
  indexedDB.open = (name, version) => {
    if (!['QuestNoteDB', 'QuestNotePreviewDB'].includes(name)) throw new Error('Unexpected app database request');
    const request = nativeOpen(databaseName, version);
    request.addEventListener('success', () => handles.add(request.result));
    return request;
  };
  const blobs = new Map();
  const downloads = [];
  const create = URL.createObjectURL.bind(URL);
  const revoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (blob) => { const url = create(blob); blobs.set(url, blob); return url; };
  URL.revokeObjectURL = (url) => { blobs.delete(url); revoke(url); };
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && blobs.has(this.href)) {
      downloads.push({ filename: this.download, blob: blobs.get(this.href) });
      return; // Capture the real app-generated Blob; do not save unsolicited local files.
    }
    return click.call(this);
  };
  const errors = [];
  addEventListener('error', (event) => { if (event.error) errors.push(event.error.stack || event.message); });
  addEventListener('unhandledrejection', (event) => errors.push(String(event.reason?.stack || event.reason)));
  Object.defineProperty(window, '__questNoteOnboardingTest', { value: Object.freeze({
    databaseName, downloads, errors, close: () => { for (const db of handles) db.close(); handles.clear(); }
  }) });
})();`;

const server = http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/__onboarding_test_guard__') {
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
        purpose: 'questnote-onboarding-synthetic-only', instance, databaseName,
      }));
      return;
    }
    if (url.pathname === '/__onboarding_db_guard__.js') {
      response.writeHead(200, { 'Content-Type': types['.js'] }).end(bootstrap); return;
    }
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'devtools/onboarding-browser-test.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) || relative.split(/[\\/]/).some((part) => part.startsWith('.'))
      || path.basename(target) === 'service-worker.js' || request.headers['service-worker']) {
      response.writeHead(403).end('Private paths and service workers are disabled on this synthetic test origin.'); return;
    }
    let bytes = await fs.readFile(target);
    if (relative === 'index.html') {
      const html = bytes.toString('utf8');
      if (!html.includes('<head>')) throw new Error('Expected app head before module scripts');
      bytes = Buffer.from(html.replace('<head>', '<head>\n<script src="/__onboarding_db_guard__.js"></script>'));
    }
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' }).end(bytes);
  } catch { response.writeHead(404).end('Not found'); }
});
server.listen(Number(process.argv[2] || 0), '127.0.0.1', () => {
  console.log(`Onboarding acceptance: http://127.0.0.1:${server.address().port}/devtools/onboarding-browser-test.html`);
  console.log(`Synthetic database only: ${databaseName}`);
});
