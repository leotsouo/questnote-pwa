import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateExpeditionImages } from './validate-expedition-images.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'content/pet-series/aurora_fairy_feast');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const review = await read(path.join(dir, 'art-review-set.json'));
const verified = [];
for (const name of await fs.readdir(path.join(dir, 'generation-log'))) {
  const log = await read(path.join(dir, 'generation-log', name));
  if (!log.asset || !log.sourcePath) throw new Error(`Missing provenance: ${name}`);
  const [source, saved] = await Promise.all([fs.readFile(log.sourcePath), fs.readFile(path.join(dir, log.asset))]);
  if (hash(source) !== hash(saved)) throw new Error(`Source mismatch: ${name}`);
  verified.push({ log: name, asset: log.asset, sha256: hash(saved), selected: log.selected !== false });
}
for (const file of review.files) {
  if (hash(await fs.readFile(path.join(dir, file.file))) !== file.sha256) throw new Error(`Review mismatch: ${file.file}`);
}
const catalog = await read(path.join(root, 'data/expeditions.json'));
catalog.areas.push({ id: 'aurora_feast_garden' });
const regions = await validateExpeditionImages({ catalog, readBytes: file => fs.readFile(path.join(root, file)) });
const worker = await fs.readFile(path.join(root, 'service-worker.js'), 'utf8');
for (const region of regions) {
  if (!worker.includes(`'${region.file}'`) && !worker.includes(`'./${region.file}'`)) throw new Error(`Missing precache: ${region.file}`);
}
console.log(JSON.stringify({ ok: true, artSetHash: review.artSetHash, reviewedFiles: review.files.length, exactSourceCopies: verified, effectiveRegions: regions.length }, null, 2));
