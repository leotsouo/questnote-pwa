/** Ephemeral loopback-only server for native worker lifecycle tests. No user storage or catalog writes. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';

const runId = randomUUID();
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const states = new Map(['preview', 'production'].map((scope) => [scope, { version: 1, fail: '', corrupt: '' }]));
const source = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
const assets = (scope, version) => ({
  'index.html': `<!doctype html><html><head><title>${scope} ${version}</title></head><body><p id="generation">${version}</p><label>Unsaved input <input id="edit"></label><script src="./main.js"></script></body></html>`,
  'main.js': `window.loadedGeneration=${version};window.readCatalog=()=>fetch('./catalog.json').then(r=>r.text());`,
  'catalog.json': JSON.stringify({ scope, version }),
});
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/test/control' && request.method === 'POST') {
      // Only same-origin test code may change this ephemeral fixture server.
      const origin = request.headers.origin;
      if (origin !== `http://127.0.0.1:${server.address().port}`) { response.writeHead(403).end(); return; }
      let text = '';
      for await (const bytes of request) { text += bytes; if (text.length > 2048) throw new Error('Too large'); }
      const value = JSON.parse(text);
      if (!states.has(value.scope) || !Number.isInteger(value.version) || value.version < 1) throw new Error('Invalid fixture');
      states.set(value.scope, { version: value.version, fail: value.fail || '', corrupt: value.corrupt || '' });
      response.writeHead(200, { 'Content-Type': 'application/json' }).end('{}'); return;
    }
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    response.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/test/') {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><title>Native SW tests</title><h1>QuestNote native SW acceptance</h1><pre id="results">Running…</pre><div id="clients"></div><script type="module" src="./suite.js"></script>'); return;
    }
    if (url.pathname === '/test/suite.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(await readFile(new URL('./release-browser-test.js', import.meta.url))); return;
    }
    const match = /^\/(preview|production)\/(.*)$/.exec(url.pathname);
    if (!match) { response.writeHead(404).end(); return; }
    const [, scope, relative] = match; const state = states.get(scope);
    const files = assets(scope, state.version);
    if (relative === 'service-worker.js') {
      const profile = { schemaVersion: 1, profile: scope, scopePath: `/${scope}/`, cacheNamespace: `questnote-${scope}-` };
      const replacements = {
        CACHE_NAME: `questnote-${scope}-shell-native-${runId}-${state.version}`,
        PET_IMAGE_CACHE: `questnote-${scope}-images-native-${runId}`,
        MAILBOX_RUNTIME_CACHE: `questnote-${scope}-mailbox-native-${runId}`,
      };
      let worker = source.replace('const BUILD_PROFILE = null;', `const BUILD_PROFILE = ${JSON.stringify(profile)};`)
        .replace('const PRECACHE_HASHES = null;', `const PRECACHE_HASHES = ${JSON.stringify(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, hash(text)])))};`)
        .replace(/const PRECACHE_URLS = \[[\s\S]*?\];/, `const PRECACHE_URLS = ${JSON.stringify(Object.keys(files))};`);
      for (const [name, value] of Object.entries(replacements)) worker = worker.replace(new RegExp(`const ${name} = '[^']+';`), `const ${name} = '${value}';`);
      response.setHeader('Content-Type', 'text/javascript'); response.end(worker); return;
    }
    const name = relative || 'index.html';
    if (!Object.hasOwn(files, name)) { response.writeHead(404).end(); return; }
    if (state.fail === name || state.fail === '*') { response.writeHead(503).end('Fixture offline'); return; }
    response.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : name.endsWith('.json') ? 'application/json' : 'text/html');
    response.end(files[name] + (state.corrupt === name ? ' corrupted' : ''));
  } catch (error) { response.writeHead(400).end(error.message); }
});
server.listen(0, '127.0.0.1', () => console.log(`Native SW tests: http://127.0.0.1:${server.address().port}/test/`));
