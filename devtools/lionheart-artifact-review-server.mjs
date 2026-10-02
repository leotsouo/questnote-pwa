/** Read-only review of pinned artifacts on a fresh loopback origin. */
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
  artifacts.push({ ...pin, profile, root: await fs.realpath(pin.artifactDir), manifest });
}
const preview = artifacts[0];
const catalog = JSON.parse(await fs.readFile(path.join(preview.root, preview.manifest.profile.contentBundleUrl), 'utf8'));
const pool = catalog.poolsData.pools.find(p => p.id === 'lionheart_inverse_oath');
const pets = catalog.petsData.pets.filter(p => p.seriesId === 'lionheart_inverse_oath');
if (!pool || pets.length !== 12) throw Error('Pinned artifact must contain this approved 12-pet pool');
const configuration = { artifactId: preview.artifactId, sourceCommit: preview.manifest.sourceCommit,
  scopePath: preview.scopePath, pool, pets, catalog };
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const reviewPage = process.argv[3] || 'reports/lionheart/artifact-animation-review.html';
if (!/^reports\/lionheart\/[a-z0-9-]+\.html$/.test(reviewPage)) throw Error('Review page must be a Lionheart report');
const pages = { '/review/': reviewPage,
  '/wings/': 'devtools/lionheart-wings-check.html',
  '/checks/': 'devtools/lionheart-artifact-check.html' };
const server = http.createServer(async (request, response) => {
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (request.method !== 'GET' || request.headers.host !== new URL(origin).host) { response.writeHead(403).end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, origin).pathname);
    if (pathname.includes('\\') || pathname.split('/').some(part => part === '..' || part === '.')) throw Error('Unsafe path');
    response.setHeader('Cache-Control', 'no-store');
    if (pathname === '/review-config.json') {
      response.setHeader('Content-Type', mime['.json']); response.end(JSON.stringify(configuration)); return;
    }
    if (pages[pathname]) {
      response.setHeader('Content-Type', mime['.html']); response.end(await fs.readFile(path.join(root, pages[pathname]))); return;
    }
    const artifact = artifacts.find(a => pathname.startsWith(a.scopePath));
    if (!artifact) { response.writeHead(404).end(); return; }
    const relative = pathname.slice(artifact.scopePath.length) || 'index.html';
    const target = await fs.realpath(path.resolve(artifact.root, relative));
    const contained = path.relative(artifact.root, target);
    if (!contained || contained.startsWith('..') || path.isAbsolute(contained)) throw Error('Outside artifact');
    const bytes = await fs.readFile(target);
    const expected = artifact.manifest.files[relative];
    if (relative !== 'release-artifact.json' && (!expected || expected.sha256 !== createHash('sha256').update(bytes).digest('hex'))) throw Error('Artifact changed');
    response.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream'); response.end(bytes);
  } catch (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 400).end(error.message); }
});
server.listen(0, '127.0.0.1', () => console.log(`http://127.0.0.1:${server.address().port}/review/`));
