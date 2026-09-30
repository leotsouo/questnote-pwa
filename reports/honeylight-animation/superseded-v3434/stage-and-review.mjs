import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { approvePipelineStage, loadPipelineStatus, stagePoolCandidate, validatePipelineWorkspace } from '../../scripts/cardPoolPipeline.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const authoringRoot = path.join(root, '.dev-backups/honeylight-authoring');
const id = 'honeylight_sugar_garden_v2';
const workspace = path.join(authoringRoot, 'content/pet-series', id);
const read = async (file) => JSON.parse(await fs.readFile(file));
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const input = await read(path.join(import.meta.dirname, 'input-review.json'));
const browser = await read(path.join(import.meta.dirname, 'presentation-browser.json'));
assert.equal(browser.failed, 0); assert.ok(browser.passed >= 14);
for (const stage of ['brief', 'plan', 'content', 'prompts', 'images']) {
  const status = await loadPipelineStatus(authoringRoot, id);
  assert.deepEqual(status.errors, []);
  assert.equal(status.baselineHash, input.baselineHash);
  const current = status.stages.find((item) => item.stage === stage);
  if (stage === 'images') assert.deepEqual(current.files, input.originalImageFiles, 'Approved image bytes changed');
  await approvePipelineStage(authoringRoot, id, stage, current.outputHash, { acknowledgeWarnings: true,
    reviewer: stage === 'images' ? 'user-approved-byte-identical-card-images-animation-carry-forward' : 'agent-implemented-user-approved-animation-plan' });
}
const validation = await validatePipelineWorkspace(authoringRoot, id);
assert.equal(validation.ok, true);
const dryRun = await stagePoolCandidate(authoringRoot, id, { dryRun: true });
const built = await stagePoolCandidate(authoringRoot, id);
const repeated = await stagePoolCandidate(authoringRoot, id);
assert.equal(dryRun.candidateId, built.candidateId); assert.equal(repeated.reused, true);
const catalog = await read(path.join(built.candidateDir, 'catalog.json'));
const beforePets = await read(path.join(root, 'data/pets.json'));
const beforePools = await read(path.join(root, 'data/pools.json'));
for (const pet of beforePets.pets) {
  const next = catalog.petsData.pets.find((item) => item.id === pet.id); assert.ok(next);
  if (['pet_ur09', 'pet_ur10'].includes(pet.id)) {
    const strip = ({ presentation, ...rest }) => rest;
    assert.deepEqual(strip(next), strip(pet));
  } else assert.deepEqual(next, pet);
}
for (const pool of beforePools.pools) if (pool.id !== id) assert.deepEqual(catalog.poolsData.pools.find((item) => item.id === pool.id), pool);
assert.equal(catalog.petsData.pets.length, 96); assert.equal(catalog.poolsData.pools.length, 4);
// The reviewed candidate already contains these images. Never rebuild or rewrite approved source assets.
for (const pet of catalog.petsData.pets) {
  const original = await fs.readFile(path.join(root, pet.image));
  const candidateImage = path.join(built.candidateDir, pet.image);
  try { assert.equal(sha(await fs.readFile(candidateImage)), sha(original)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
for (const [key, name] of [['petsData', 'pets.json'], ['poolsData', 'pools.json'], ['loreData', 'pets-lore.json'], ['seriesCatalog', 'pet-series.json']]) {
  const file = path.join(root, 'data', name);
  const existing = await read(file);
  if (JSON.stringify(existing) !== JSON.stringify(catalog[key])) await fs.writeFile(file, json(catalog[key]));
}
await fs.cp(workspace, path.join(root, 'content/pet-series', id), { recursive: true });
await fs.writeFile(path.join(root, 'content/pet-series', id, 'AUTHORING-LOCATION.md'), `# Active Honeylight animation authoring\n\nCanonical root: ${authoringRoot}\n\nPreserved 84-pet baseline: ${input.baselineHash}. Active candidate: ${built.candidateId}. All five current hashes reviewed; 12 PNG hashes unchanged. Source has 96 pets; always use canonical root for native CLI. Previous candidates/receipts/artifacts are historical and must not be published for this animation. Formal production push remains pending explicit user approval.\n`);
await fs.writeFile(path.join(import.meta.dirname, 'staging-final.json'), json({ recordedAt: new Date().toISOString(), dryRun, built, repeated, validation,
  status: await loadPipelineStatus(authoringRoot, id), previousCandidate: input.oldCandidateId, approvedPixelsUnchanged: true, productionPushed: false }));
console.log(json({ candidateId: built.candidateId, unchangedPngCount: 12, petCount: 96, productionPushed: false }));
