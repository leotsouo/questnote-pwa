/** Exact old/new production artifacts on a fresh loopback origin; no live saves. */
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
const [oldRoot, newRoot] = process.argv.slice(2);
if (!oldRoot || !newRoot) throw Error('Usage: node devtools/design-rollback-server.mjs <old-artifact> <new-artifact>');
const token = randomUUID();
const artifacts = {};
for (const [name, root] of [['old', oldRoot], ['new', newRoot]]) {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'release-artifact.json')));
  if (manifest.profile.profile !== 'production' || manifest.profile.scopePath !== '/questnote-pwa/') throw Error('Expected pinned production scope');
  const files = new Map();
  for (const [file, pin] of Object.entries(manifest.files)) {
    if (file.includes('..') || file.includes('\\') || path.isAbsolute(file)) throw Error('Unsafe path');
    const bytes = await fs.readFile(path.join(root, file));
    if (createHash('sha256').update(bytes).digest('hex') !== pin.sha256 || bytes.length !== pin.bytes) throw Error('Artifact mismatch: ' + file);
    files.set(file, bytes);
  }
  artifacts[name] = { manifest, files };
}
const oldBundle=JSON.parse(artifacts.old.files.get(artifacts.old.manifest.profile.contentBundleUrl));
const newBundle=JSON.parse(artifacts.new.files.get(artifacts.new.manifest.profile.contentBundleUrl));
for(const [key,rows] of [['petsData','pets'],['loreData','lore'],['poolsData','pools'],['seriesCatalog','series']]){
 for(const old of oldBundle[key][rows])assert.deepEqual(newBundle[key][rows].find(row=>row.id===old.id),old,'Existing published content changed: '+old.id);
}
assert.equal(newBundle.petsData.pets.length,oldBundle.petsData.pets.length+12);
let active = 'old';
let offline = false;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = http.createServer(async (request, response) => {
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (request.headers.host !== new URL(origin).host) { response.writeHead(403).end(); return; }
    const url = new URL(request.url, origin);
    response.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/test/offline' && request.method === 'POST') {
      if (request.headers.origin !== origin || request.headers['x-test-token'] !== token) { response.writeHead(403).end(); return; }
      let body = ''; for await (const chunk of request) { body += chunk; if (body.length > 10) throw Error('Too long'); }
      if (!['on', 'off'].includes(body)) throw Error('Invalid offline mode');
      offline = body === 'on'; response.end('OK'); return;
    }
    if (url.pathname === '/test/switch' && request.method === 'POST') {
      if (request.headers.origin !== origin || request.headers['x-test-token'] !== token) { response.writeHead(403).end(); return; }
      let body = ''; for await (const chunk of request) { body += chunk; if (body.length > 100) throw Error('Too long'); }
      if (!['old', 'new'].includes(body)) throw Error('Unknown generation');
      active = body; response.end('OK'); return;
    }
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    if (url.pathname === '/test/config') {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ token, origin, profiles: Object.fromEntries(Object.entries(artifacts).map(([key, value]) => [key, value.manifest.profile])) })); return;
    }
    if (url.pathname === '/test/') {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><meta charset="utf-8"><title>One-tap update acceptance</title><h1>One-tap update · immutable artifacts</h1><p>Fresh loopback origin, synthetic saves only; exact immutable artifacts.</p><pre id="results">Running…</pre><div id="clients"></div><script type="module" src="./suite.js"></script>'); return;
    }
    if (url.pathname === '/test/suite.js') {
      response.setHeader('Content-Type', 'text/javascript'); response.end(await fs.readFile(new URL('./lionheart-update-browser-test.js', import.meta.url))); return;
    }
    if (!url.pathname.startsWith('/questnote-pwa/')) { response.writeHead(404).end(); return; }
    if (offline) { response.writeHead(503).end('Test network unavailable'); return; }
    const file = url.pathname.slice('/questnote-pwa/'.length) || 'index.html';
    const bytes = artifacts[active].files.get(file);
    if (!bytes) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); response.end(bytes);
  } catch (error) { response.writeHead(500).end(error.message); }
});
server.listen(0, '127.0.0.1', () => console.log(`One-tap update acceptance: http://127.0.0.1:${server.address().port}/test/`));
