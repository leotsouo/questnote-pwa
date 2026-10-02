/** Isolated loopback draft review. No publication, final artifact or production DB. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ECOSYSTEM_CATALOGS, ECOSYSTEM_RUNTIME, validateEcosystem } from '../scripts/poolEcosystem.mjs';
const root = path.resolve(import.meta.dirname, '..');
const draft = path.join(root, 'content/pet-series/lionheart_inverse_oath');
const read = async (base, name) => JSON.parse(await fs.readFile(path.join(base, name), 'utf8'));
const [pets, lore, pool, ecosystem, pipeline] = await Promise.all(['pets.json','pets-lore.json','pool.json','ecosystem.json','pipeline.json'].map((file) => read(draft, file)));
const baseline = Object.fromEntries(await Promise.all(ECOSYSTEM_CATALOGS.map(async (file) => [file, await read(root, file)])));
const runtime = Object.fromEntries(await Promise.all(ECOSYSTEM_RUNTIME.map(async (file) => [file, await fs.readFile(path.join(root, file), 'utf8')])));
const runtimeHashes = Object.fromEntries(Object.entries(runtime).map(([file, text]) => [file, createHash('sha256').update(text).digest('hex')]));
const validation = validateEcosystem({ ecosystem, pets: pets.pets, baseline, runtime, runtimeHashes });
if (validation.errors.length) throw Error(JSON.stringify(validation.errors));
const overrides = { ...validation.catalogs,
  'data/pets.json': { pets: [...(await read(root, 'data/pets.json')).pets, ...pets.pets] },
  'data/pets-lore.json': { ...(await read(root, 'data/pets-lore.json')), lore: [...(await read(root, 'data/pets-lore.json')).lore, ...lore.lore] },
};
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml' };
const server = http.createServer(async (request, response) => {
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (request.method !== 'GET' || request.headers.host !== new URL(origin).host) { response.writeHead(403).end(); return; }
    const name = decodeURIComponent(new URL(request.url, origin).pathname).slice(1);
    if (name.includes('\\') || name.split('/').some((part) => part === '.' || part === '..') || name.startsWith('.')) throw Error('Unsafe path');
    response.setHeader('Cache-Control','no-store');
    if (overrides[name]) { response.setHeader('Content-Type',mime['.json']); response.end(JSON.stringify(overrides[name])); return; }
    if (name === 'review-config.json') { response.setHeader('Content-Type',mime['.json']); response.end(JSON.stringify({ draft:true, artifactId:null, baselineHash:pipeline.baseline.hash, pool, pets:pets.pets.map((pet)=>({...pet,image:`/art/images/${pet.id}.png`})) })); return; }
    let base = root, relative = name;
    if (name === 'art' || name === 'art/') { base = draft; relative = 'art-review.html'; }
    else if (name.startsWith('art/')) { base = draft; relative = name.slice(4); if (!/^(images|generations)\/pet_[a-z0-9]+(?:-v\d+)?\.png$/.test(relative)) throw Error('Invalid artwork'); }
    else if (name === 'animation' || name === 'animation/') relative = 'reports/lionheart/animation-review.html';
    else if (name === 'checks' || name === 'checks/') relative = 'devtools/lionheart-browser-check.html';
    else if (/^assets\/pets\/pet_[a-z0-9]+\.png$/.test(name) && pets.pets.some((pet)=>pet.image===name)) { base = draft; relative = `images/${path.basename(name)}`; }
    else if (!/^(src|assets|data)\//.test(name)) throw Error('Resource not allowed');
    const target = await fs.realpath(path.join(base,relative));
    if (!target.startsWith(path.resolve(base)+path.sep)) throw Error('Resource leaves workspace');
    response.setHeader('Content-Type',mime[path.extname(target)] || 'application/octet-stream'); response.end(await fs.readFile(target));
  } catch { response.writeHead(404).end('Draft review resource not found'); }
});
server.listen(0,'127.0.0.1',()=>console.log(`http://127.0.0.1:${server.address().port}/art/`));
