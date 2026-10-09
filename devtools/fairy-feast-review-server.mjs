/** Exact pinned artifacts, fresh loopback origin, no write/upload endpoint. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { verifyReleaseArtifact } from '../scripts/verify-release-artifact.mjs';
const root = path.resolve(import.meta.dirname, '..');
const pins = JSON.parse(await fs.readFile(path.resolve(process.argv[2]), 'utf8'));
const artifacts = [];
for (const profile of ['preview', 'production']) {
  const pin = pins[profile];
  await verifyReleaseArtifact({ ...pin, profile });
  const manifest = JSON.parse(await fs.readFile(path.join(pin.artifactDir, 'release-artifact.json'), 'utf8'));
  artifacts.push({ ...pin, profile, manifest, root: await fs.realpath(pin.artifactDir) });
}
const preview = artifacts[0];
const catalog = JSON.parse(await fs.readFile(path.join(preview.root, preview.manifest.profile.contentBundleUrl), 'utf8'));
const pool = catalog.poolsData.pools.find(pool => pool.id === 'aurora_fairy_feast');
const pets = catalog.petsData.pets.filter(pet => pet.seriesId === pool.id);
if (!pool || pets.length !== 12) throw Error('Missing reviewed fairy pool');
const awakening = JSON.parse(await fs.readFile(path.join(preview.root, 'data/pet-awakening.json'), 'utf8'));
const html = await fs.readFile(path.join(preview.root, 'index.html'), 'utf8');
const styles = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map(match => match[1]);
const config = { artifactId: preview.artifactId, sourceCommit: preview.manifest.sourceCommit,
  scopePath: preview.scopePath, pool, pets, catalog, styles, awakenings: awakening.pets.filter(pet => pets.some(row => row.id === pet.petId)) };
const pages = { '/review/': 'devtools/fairy-feast-animation-review.html', '/checks/': 'devtools/fairy-feast-artifact-check.html' };
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer(async (request, response) => {
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (request.headers.host !== new URL(origin).host || request.method !== 'GET') throw Error('Wrong host/method');
    const pathname = decodeURIComponent(new URL(request.url, origin).pathname);
    if (pathname.includes('\\') || pathname.split('/').some(part => part === '..' || part === '.')) throw Error('Unsafe path');
    response.setHeader('Cache-Control', 'no-store');
    if (pathname === '/review-config.json') {
      response.setHeader('Content-Type', mime['.json']); response.end(JSON.stringify(config)); return;
    }
    if (pages[pathname]) {
      response.setHeader('Content-Type', mime['.html']); response.end(await fs.readFile(path.join(root, pages[pathname]))); return;
    }
    const artifact = artifacts.find(artifact => pathname.startsWith(artifact.scopePath));
    if (!artifact) throw Error('Outside artifact scope');
    const file = pathname.slice(artifact.scopePath.length) || 'index.html';
    const target = await fs.realpath(path.join(artifact.root, file));
    const relative = path.relative(artifact.root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Outside artifact');
    const bytes = await fs.readFile(target);
    if (file !== 'release-artifact.json' && createHash('sha256').update(bytes).digest('hex') !== artifact.manifest.files[file]?.sha256) throw Error('Artifact changed');
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); response.end(bytes);
  } catch (error) { response.writeHead(404).end(error.message); }
});
server.listen(0, '127.0.0.1', () => console.log(`http://127.0.0.1:${server.address().port}/review/`));
