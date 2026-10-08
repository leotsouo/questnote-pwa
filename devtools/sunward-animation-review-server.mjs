/** Serves exact preview artifact modules for an internal, visual-only review. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyReleaseArtifact } from '../scripts/verify-release-artifact.mjs';

const root = path.resolve(import.meta.dirname, '..');
const pins = JSON.parse(await fs.readFile(path.join(root, 'reports/sunward-letters/artifacts.json'))).preview;
await verifyReleaseArtifact({ ...pins, profile: 'preview' });
const manifest = JSON.parse(await fs.readFile(path.join(pins.artifactDir, 'release-artifact.json')));
const catalog = JSON.parse(await fs.readFile(path.join(pins.artifactDir, manifest.profile.contentBundleUrl)));
const pool = catalog.poolsData.pools.find(row => row.id === 'sunward_letters');
if (!pool || pins.scopePath !== '/questnote-pwa-preview/') throw Error('Wrong reviewed pool or scope');
const pets = catalog.petsData.pets.filter(row => row.seriesId === pool.id);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml' };
const server = http.createServer(async (request,response) => {
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (request.headers.host !== new URL(origin).host || request.method !== 'GET') throw Error('Wrong host/method');
    const pathname = new URL(request.url, origin).pathname;
    response.setHeader('Cache-Control','no-store');
    if (pathname === '/animation-review/' || pathname === '/animation-review/index.html') {
      response.setHeader('Content-Type',mime['.html']); response.end(await fs.readFile(path.join(root,'reports/sunward-letters/animation-review.html'))); return;
    }
    if (pathname === '/animation-review/config.json') {
      response.setHeader('Content-Type',mime['.json']); response.end(JSON.stringify({ artifactId:pins.artifactId,pool,pets })); return;
    }
    if (!pathname.startsWith(pins.scopePath)) throw Error('Outside artifact scope');
    const relative = decodeURIComponent(pathname.slice(pins.scopePath.length));
    if (!manifest.files[relative] || relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..')) throw Error('Invalid path');
    const target = await fs.realpath(path.join(pins.artifactDir,relative));
    if (!target.startsWith(path.resolve(pins.artifactDir)+path.sep)) throw Error('Path leaves artifact');
    const bytes = await fs.readFile(target);
    if (createHash('sha256').update(bytes).digest('hex') !== manifest.files[relative].sha256) throw Error('Artifact bytes changed');
    response.setHeader('Content-Type',mime[path.extname(relative)] || 'application/octet-stream'); response.end(bytes);
  } catch { response.writeHead(404).end('Reviewed resource unavailable'); }
});
server.listen(0,'127.0.0.1',()=>console.log(`http://127.0.0.1:${server.address().port}/animation-review/`));
