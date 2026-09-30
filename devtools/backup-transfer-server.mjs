/** Two fresh origins running the exact deployed artifact, plus an isolated safety suite. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const [artifactRoot, evidenceRoot] = process.argv.slice(2);
if (!artifactRoot || !evidenceRoot) throw Error('Usage: node devtools/backup-transfer-server.mjs <artifact> <evidence-dir>');
const manifestBytes = await fs.readFile(path.join(artifactRoot, 'release-artifact.json'));
if (createHash('sha256').update(manifestBytes).digest('hex') !== 'b7d1d28a9e0cc287cdae31bf6b6752e25d8b61fd98aef5aae540a0156a0d2c4f') throw Error('Production manifest pin mismatch');
const manifest = JSON.parse(manifestBytes);
if (manifest.profile.profile !== 'production' || manifest.artifactId !== 'fbb07931fc76df36bef063435230a8ecfe1dc264613af6c3d85adebb1831b017') throw Error('Expected current production V3.4.32 artifact');
const files = new Map();
for (const [file, pin] of Object.entries(manifest.files)) {
  if (file.includes('..') || file.includes('\\') || path.isAbsolute(file)) throw Error('Unsafe artifact path');
  const bytes = await fs.readFile(path.join(artifactRoot, file));
  if (bytes.length !== pin.bytes || createHash('sha256').update(bytes).digest('hex') !== pin.sha256) throw Error('Artifact mismatch: ' + file);
  files.set(file, bytes);
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
for (const role of ['source', 'destination', 'safety']) {
  const server = http.createServer(async (request, response) => {
    try {
      const origin = `http://127.0.0.1:${server.address().port}`;
      if (request.headers.host !== new URL(origin).host || request.method !== 'GET') { response.writeHead(403).end(); return; }
      const url = new URL(request.url, origin);
      response.setHeader('Cache-Control', 'no-store');
      let bytes;
      if (url.pathname === '/test/config') {
        bytes = JSON.stringify({ origin, role, artifactId: manifest.profile.artifactId, appVersion: '3.4.32', contentBundleUrl: manifest.profile.contentBundleUrl, purpose: 'synthetic-backup-transfer-only' });
      } else if (url.pathname === '/test/expected.json') {
        bytes = await fs.readFile(path.join(evidenceRoot, 'transfer.json'));
      } else if (url.pathname === '/test/') {
        bytes = '<!doctype html><meta charset="utf-8"><title>QuestNote backup transfer verification</title><style>body{font:16px system-ui;background:#f5f0e5;color:#172330}iframe{width:393px;height:852px;border:1px solid #999}pre{white-space:pre-wrap}button{padding:12px;margin:8px}</style><h1>JSON 備份／寵物移轉驗證</h1><p>正式版 V3.4.32 · 隔離測試存檔</p><button id="compare" disabled>比對下載檔與目前存檔</button><button id="safety" disabled>驗證錯誤備份與交易回滾</button><pre id="results">初始化…</pre><div id="clients"></div><script type="module" src="./suite.js"></script>';
      } else if (url.pathname === '/test/suite.js') {
        bytes = await fs.readFile(new URL('./backup-transfer-browser-test.js', import.meta.url));
      } else if (url.pathname.startsWith('/devtools/fixtures/backups/')) {
        const name = url.pathname.split('/').at(-1);
        if (!['legacy-1.8.1.json', 'legacy-3.0.1.json', 'legacy-3.4.4.json'].includes(name)) throw Error('Unknown fixture');
        bytes = await fs.readFile(new URL('./fixtures/backups/' + name, import.meta.url));
      } else if (url.pathname === '/devtools/m1-browser-test.js' || url.pathname === '/devtools/m1-browser-test.html') {
        bytes = await fs.readFile(new URL('.' + url.pathname.slice('/devtools'.length), import.meta.url));
      } else {
        const file = url.pathname.replace(/^\/questnote-pwa\//, '').replace(/^\//, '') || 'index.html';
        bytes = files.get(file);
      }
      if (!bytes) { response.writeHead(404).end(); return; }
      const ext = url.pathname === '/test/' ? '.html' : url.pathname.endsWith('/config') ? '.json' : path.extname(url.pathname);
      response.setHeader('Content-Type', types[ext] || 'application/octet-stream'); response.end(bytes);
    } catch (error) { response.writeHead(500).end(error.message); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  console.log(`${role}: http://127.0.0.1:${server.address().port}/${role === 'safety' ? 'devtools/m1-browser-test.html' : 'test/'}`);
}
console.log(`Verified ${files.size} immutable files; ${manifest.profile.artifactId}`);
