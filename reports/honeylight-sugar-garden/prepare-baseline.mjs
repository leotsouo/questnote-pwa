import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const authoringRoot = path.join(root, '.dev-backups/honeylight-authoring');
const candidateRelative = 'content/pet-series/frost_oath_fjord/staging/697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131';
const candidateRoot = path.join(root, candidateRelative);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 8 * 1024 * 1024 });
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const manifest = JSON.parse(git('show', 'origin/gh-pages:release-artifact.json'));
const publishedBytes = git('show', `origin/gh-pages:${manifest.profile.contentBundleUrl}`);
const candidateBytes = await fs.readFile(path.join(candidateRoot, 'catalog.json'));
if (sha(publishedBytes) !== manifest.profile.contentBundleSha256 || sha(candidateBytes) !== sha(publishedBytes)) {
  throw new Error('Published bundle differs from preserved approved Frost candidate; reconcile before authoring.');
}
const catalog = JSON.parse(candidateBytes);
const candidate = JSON.parse(await fs.readFile(path.join(candidateRoot, 'candidate.json')));
for (const [relative, expected] of Object.entries(candidate.files)) {
  if (sha(await fs.readFile(path.join(candidateRoot, relative))) !== expected) throw new Error(`Candidate drift: ${relative}`);
}
if (catalog.petsData.pets.length !== 84 || catalog.poolsData.pools.length !== 3) throw new Error('Unexpected cumulative baseline.');
await fs.mkdir(path.join(authoringRoot, 'data'), { recursive: true });
for (const [key, file] of Object.entries({ petsData: 'pets.json', loreData: 'pets-lore.json', poolsData: 'pools.json', seriesCatalog: 'pet-series.json' })) {
  const target = path.join(authoringRoot, 'data', file);
  const bytes = Buffer.from(json(catalog[key]));
  try { if (sha(await fs.readFile(target)) !== sha(bytes)) throw new Error('Existing isolated baseline differs'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(target, bytes, { flag: 'wx' }); }
}
let imageFiles = 0;
for (const pet of catalog.petsData.pets) {
  for (const relative of [pet.image, ...Object.values(pet.imageVariants || {})]) {
    let bytes;
    const expected = candidate.files[relative];
    if (expected) bytes = await fs.readFile(path.join(candidateRoot, relative));
    else bytes = await fs.readFile(path.join(root, relative));
    const publishedHash = manifest.files?.[relative]?.sha256;
    if (!publishedHash || sha(bytes) !== publishedHash) throw new Error(`Published image drift: ${relative}`);
    const target = path.join(authoringRoot, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    try { if (sha(await fs.readFile(target)) !== sha(bytes)) throw new Error(`Existing isolated image differs: ${relative}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(target, bytes, { flag: 'wx' }); }
    imageFiles++;
  }
}
// Retain allocations of every existing draft without editing their frozen snapshots.
const contentRoot = path.join(root, 'content/pet-series');
for (const entry of await fs.readdir(contentRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
  for (const file of ['pets.json', 'plan.json', 'pipeline.json', 'brief.json', 'pool.json']) {
    try {
      const bytes = await fs.readFile(path.join(contentRoot, entry.name, file));
      const target = path.join(authoringRoot, 'content/pet-series', entry.name, file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, bytes);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
const evidence = {
  preparedAt: new Date().toISOString(), sourceCommit: git('rev-parse', 'HEAD').toString().trim(),
  ghPagesCommit: git('rev-parse', 'origin/gh-pages').toString().trim(), artifactId: manifest.artifactId,
  bundleSha256: sha(candidateBytes), candidateRelative, candidateManifestSha256: sha(await fs.readFile(path.join(candidateRoot, 'candidate.json'))),
  authoringRoot: '.dev-backups/honeylight-authoring', pets: catalog.petsData.pets.length,
  lore: catalog.loreData.lore.length, pools: catalog.poolsData.pools.length, series: catalog.seriesCatalog.series.length,
  verifiedImageFiles: imageFiles, review: 'Agent reviewed cumulative 84-pet baseline against approved candidate and published Git artifact; isolated copy only.',
  sourcePromotion: 'NOT_PERFORMED', mainCatalogsChanged: false, mainAssetsChanged: false, legacyCompatibilityChanged: false,
};
await fs.writeFile(path.join(import.meta.dirname, 'baseline-evidence.json'), json(evidence));
console.log(json(evidence));
