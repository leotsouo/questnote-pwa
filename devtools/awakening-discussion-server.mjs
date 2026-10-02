/** Read-only local viewer for an unimplemented awakening proposal. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const inventory = JSON.parse(await fs.readFile(path.join(root, 'reports/awakening-discussion/art-inventory.json')));
const allowed = new Set([
  'reports/awakening-discussion/review.html',
  'reports/awakening-discussion/art-inventory.json',
  'docs/pet-awakening-system.md',
  'reports/swordwild-release/production-release.md',
  ...inventory.pairs.flatMap((p) => [p.earlierPath, p.currentPath]),
]);
const mime = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.md': 'text/plain; charset=utf-8' };
const server = http.createServer(async (request, response) => {
  try {
    const file = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname).slice(1);
    if (request.method !== 'GET' || !allowed.has(file)) throw Error('Not a discussion resource');
    const resolved = await fs.realpath(path.resolve(root, file));
    if (!resolved.startsWith(root + path.sep)) throw Error('Unsafe resource');
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    response.end(await fs.readFile(resolved));
  } catch { response.writeHead(404).end('Discussion resource not found'); }
});
server.listen(0, '127.0.0.1', () => console.log(`http://127.0.0.1:${server.address().port}/reports/awakening-discussion/review.html`));
