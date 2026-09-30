import fs from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { authoringRoot } from './revise.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const staging = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'staging-final.json')));
if (!staging.repeated.reused || staging.counts.pets !== 96) throw new Error('Unverified final candidate');
const candidateDir = staging.built.candidateDir;
const manifest = JSON.parse(await fs.readFile(path.join(candidateDir, 'candidate.json')));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const [file, expected] of Object.entries(manifest.files)) {
  if (sha(await fs.readFile(path.join(candidateDir, file))) !== expected) throw new Error('Candidate bytes changed: ' + file);
}
const catalog = JSON.parse(await fs.readFile(path.join(candidateDir, 'catalog.json')));
const definitions = { petsData: ['pets', 'data/pets.json'], loreData: ['lore', 'data/pets-lore.json'], poolsData: ['pools', 'data/pools.json'], seriesCatalog: ['series', 'data/pet-series.json'] };
const changes = {};
for (const [key, [rows, file]] of Object.entries(definitions)) {
  const existing = JSON.parse(await fs.readFile(path.join(root, file)));
  const next = catalog[key];
  for (const old of existing[rows]) {
    if (!isDeepStrictEqual(old, next[rows].find((item) => item.id === old.id))) throw new Error('Existing authoring data changed: ' + old.id);
  }
  changes[file] = { before: existing[rows].length, after: next[rows].length, addedIds: next[rows].filter((item) => !existing[rows].some((old) => old.id === item.id)).map((item) => item.id) };
}
const assets = [];
for (const pet of catalog.petsData.pets) {
  for (const file of [pet.image, pet.imageVariants?.card, pet.imageVariants?.stage].filter(Boolean)) {
    let bytes;
    if (manifest.files[file]) bytes = await fs.readFile(path.join(candidateDir, file));
    else bytes = await fs.readFile(path.join(authoringRoot, file));
    const destination = path.resolve(root, file);
    if (!destination.startsWith(path.join(root, 'assets') + path.sep)) throw new Error('Unsafe asset');
    try {
      const prior = await fs.readFile(destination);
      if (!bytes.equals(prior)) throw new Error('Existing image bytes changed: ' + file);
      continue;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes, { flag: 'wx' });
    assets.push({ path: file, sha256: sha(bytes) });
  }
}
for (const [key, [, file]] of Object.entries(definitions)) await fs.writeFile(path.join(root, file), JSON.stringify(catalog[key], null, 2) + '\n');
const buildTime = new Date().toISOString();
const versionFile = path.join(root, 'src/version.js');
let version = await fs.readFile(versionFile, 'utf8');
version = version.replace("APP_VERSION = '3.4.32'", "APP_VERSION = '3.4.33'").replaceAll('questnote-preview-cache-v3432-one-tap-update', 'questnote-preview-cache-v3433-honeylight').replace(/BUILD_TIME = '[^']+'/, `BUILD_TIME = '${buildTime}'`);
await fs.writeFile(versionFile, version);
const workerFile = path.join(root, 'service-worker.js');
const worker = await fs.readFile(workerFile, 'utf8');
await fs.writeFile(workerFile, worker.replaceAll('questnote-preview-cache-v3432-one-tap-update', 'questnote-preview-cache-v3433-honeylight'));
const attributesFile = path.join(root, '.gitattributes');
const attributes = await fs.readFile(attributesFile, 'utf8');
await fs.writeFile(attributesFile, attributes + '\n# Honeylight authoring receipts and source PNGs retain exact bytes.\ncontent/pet-series/honeylight_sugar_garden/** -text\ncontent/pet-series/honeylight_sugar_garden_v2/** -text\n');
await fs.writeFile(path.join(import.meta.dirname, 'source-promotion.json'), JSON.stringify({ preparedAt: buildTime, localFeatureBranchOnly: true, candidateId: manifest.candidateId, candidateManifestSha256: sha(await fs.readFile(path.join(candidateDir, 'candidate.json'))), changes, newImageFiles: assets, preservedExistingImageBytes: true, legacyCompatibilityModified: false, productionPush: 'PENDING_USER_FINAL_GO_AHEAD', note: 'Source main originally contained only 72 pets. This reviewed feature source promotes the previously published Frost twelve plus the new Honeylight twelve, preserving the complete published 84-pet baseline. Canonical pipeline baseline remains isolated and unchanged.' }, null, 2) + '\n');
console.log(JSON.stringify({ changes, newImageFiles: assets.length, version: '3.4.33', productionUntouched: true }));
