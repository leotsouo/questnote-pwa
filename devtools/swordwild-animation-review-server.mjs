/** Serve the reviewed artifact's actual animation modules; no app or save mutations. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyReleaseArtifact } from '../scripts/verify-release-artifact.mjs';
const root = path.resolve(import.meta.dirname, '..');
const pins = JSON.parse(await fs.readFile(path.join(root, 'reports/swordwild-release/artifacts.json'))).preview;
await verifyReleaseArtifact({ ...pins, profile: 'preview' });
const manifest = JSON.parse(await fs.readFile(path.join(pins.artifactDir, 'release-artifact.json')));
if (pins.scopePath !== '/questnote-pwa-preview/') throw Error('Unexpected reviewed scope');
const catalog = JSON.parse(await fs.readFile(path.join(pins.artifactDir, manifest.profile.contentBundleUrl)));
const pool = catalog.poolsData.pools.find((p) => p.id === 'swordwild_shanhe_v3');
const pets = catalog.petsData.pets.filter((p) => p.seriesId === pool.id);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer(async (request, response) => {
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (request.headers.host !== new URL(origin).host || request.method !== 'GET') { response.writeHead(403).end(); return; }
    const pathname = new URL(request.url, origin).pathname;
    response.setHeader('Cache-Control', 'no-store');
    if (pathname === '/animation-review/' || pathname === '/animation-review/index.html') {
      response.setHeader('Content-Type', mime['.html']);
      response.end(await fs.readFile(path.join(root, 'reports/swordwild-release/animation-review.html'))); return;
    }
    if (pathname === '/animation-review/config.json') {
      response.setHeader('Content-Type', mime['.json']);
      response.end(JSON.stringify({ artifactId: pins.artifactId, pool, pets })); return;
    }
    if (!pathname.startsWith(pins.scopePath)) throw Error('Not a reviewed artifact resource');
    const file = decodeURIComponent(pathname.slice(pins.scopePath.length));
    if (!manifest.files[file] || file.includes('\\') || file.split('/').some((s) => !s || s === '.' || s === '..')) throw Error('Invalid resource');
    const target = await fs.realpath(path.join(pins.artifactDir, file));
    if (!target.startsWith(path.resolve(pins.artifactDir) + path.sep)) throw Error('Resource leaves artifact');
    const bytes = await fs.readFile(target);
    if (createHash('sha256').update(bytes).digest('hex') !== manifest.files[file].sha256) throw Error('Artifact resource changed');
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    response.end(bytes);
  } catch { response.writeHead(404).end('Reviewed animation resource not found'); }
});
server.listen(0, '127.0.0.1', () => console.log(`http://127.0.0.1:${server.address().port}/animation-review/`));
