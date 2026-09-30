import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { PIPELINE_STAGES, createPipelineWorkspace, loadPipelineStatus, validatePipelineWorkspace,
  approvePipelineStage, stagePoolCandidate } from '../scripts/cardPoolPipeline.mjs';
import { buildPetImages, getPetImageVariants } from './build-pet-images.mjs';
import { ECOSYSTEM_CATALOGS, ECOSYSTEM_RUNTIME } from '../scripts/poolEcosystem.mjs';
import { getPetSpecialty } from '../src/expeditionGameplay.js';

const exec = promisify(execFile);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const read = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const write = async (file, value) => fs.writeFile(file, json(value));
const rarities = ['N', 'R', 'SR', 'SSR', 'UR'];
const rates = { N: .55, R: .3, SR: .1, SSR: .03, UR: .02 };
const png = (width = 512, height = width, color = '#537cab') => sharp({ create: { width, height, channels: 4, background: color } }).png().toBuffer();
function brief(id = 'fixture_one') {
  return { schemaVersion: 1, purpose: 'synthetic', seriesId: id, poolId: id, seriesName: `${id} Garden`, concept: 'A synthetic garden for isolated release pipeline tests.',
    rarityPlan: { N: 1, R: 2, SR: 1, SSR: 1, UR: 1 }, cost: 100, rates: { ...rates }, pity: { ssr: 30, ur: 100 },
    presentationTemplate: 'default', unlock: { key: 'sunrise', threshold: 20, rewardDraftId: 'r_2' }, releaseVersion: '3.4.5' };
}
function lore(id) {
  const dialogues = Object.fromEntries(Object.entries({ normal: 5, urgent: 5, important: 5, praise: 5, idle: 3, bondUp: 2 })
    .map(([kind, length]) => [kind, Array.from({ length }, (_, index) => `${id} ${kind} line ${index + 1}`)]));
  return { id, title: 'Keeper of the test garden', personality: ['kind', 'patient', 'curious'], element: 'Light',
    lore: `The garden keeper ${id} tends a small flower and quietly helps a tired traveler find the way home.`,
    dialogues: { ...dialogues, summon: 'Welcome to the garden.' }, bondUnlocks: { 2: 'A seed', 3: 'A sprout', 4: 'A flower', 5: 'A garden' } };
}
function pet(id, rarity, seriesId, name, tags) {
  return { id, rarity, seriesId, name, poolTags: tags, image: `assets/pets/${id}.png`,
    description: 'A friendly synthetic garden creature used only for isolated test fixtures.', speciesType: 'garden',
    element: 'light', visualTheme: `${seriesId} ${id} silver petals` };
}
async function snapshot(root, relative = '') {
  const out = {};
  for (const entry of (await fs.readdir(path.join(root, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) out[file] = `link:${await fs.readlink(path.join(root, file))}`;
    else if (entry.isDirectory()) { out[`${file}/`] = 'directory'; Object.assign(out, await snapshot(root, file)); }
    else out[file] = hash(await fs.readFile(path.join(root, file)));
  }
  return out;
}
async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'questnote-pipeline-test-'));
  t.after(async () => {
    const absolute = path.resolve(root);
    assert.equal(path.dirname(absolute), path.resolve(os.tmpdir()));
    assert.ok(path.basename(absolute).startsWith('questnote-pipeline-test-'));
    await fs.rm(absolute, { recursive: true, force: true });
  });
  await fs.mkdir(path.join(root, 'data'));
  await fs.mkdir(path.join(root, 'assets/pets'), { recursive: true });
  await fs.mkdir(path.join(root, 'content/pet-series'), { recursive: true });
  const originals = await png();
  const pets = rarities.map((rarity) => pet(`pet_${rarity.toLowerCase()}01`, rarity, 'legacy', `Legacy ${rarity}`, ['standard']));
  await write(path.join(root, 'data/pets.json'), { pets });
  await write(path.join(root, 'data/pools.json'), { pools: [{ id: 'standard', name: 'Standard', active: true, cost: 100,
    rates: { ...rates }, pity: { ssr: 30, ur: 100 }, petFilter: { poolTags: ['standard'] } }] });
  await write(path.join(root, 'data/pets-lore.json'), { version: 1, lore: pets.map((item) => lore(item.id)) });
  await write(path.join(root, 'data/pet-series.json'), { schemaVersion: 1, series: [{ id: 'legacy', name: 'Legacy', enabled: true, order: 0 }] });
  for (const item of pets) await fs.writeFile(path.join(root, item.image), originals);
  return root;
}
async function fill(root, definition = brief()) {
  await createPipelineWorkspace(root, definition);
  const dir = path.join(root, 'content/pet-series', definition.seriesId);
  const plan = await read(path.join(dir, 'plan.json'));
  for (const slot of plan.pets) { slot.name = `${definition.seriesId} ${slot.draftId}`; slot.design = `A ${slot.rarity} garden creature with ${slot.draftId} petal markings.`; }
  await write(path.join(dir, 'plan.json'), plan);
  const pets = plan.pets.map((slot) => pet(slot.petId, slot.rarity, definition.seriesId, slot.name,
    [slot.phase === 'unlock' ? `${definition.poolId}_expanded` : definition.poolId]));
  await write(path.join(dir, 'pets.json'), { pets });
  await write(path.join(dir, 'pets-lore.json'), { version: 1, lore: pets.map((item) => lore(item.id)) });
  await write(path.join(dir, 'prompts.json'), { schemaVersion: 1, prompts: Object.fromEntries(pets.map((item) => [item.id,
    { prompt: `Square illustration of ${item.name}, a gentle creature in a garden.`, negativePrompt: 'text, watermark', provenance: 'synthetic test fixture' }])) });
  const bytes = await png();
  for (const item of pets) await fs.writeFile(path.join(dir, 'images', `${item.id}.png`), bytes);
  return { dir, plan, pets, definition };
}
async function approveAll(root, id, start = 0) {
  for (const stage of PIPELINE_STAGES.slice(start)) {
    const status = await loadPipelineStatus(root, id);
    await approvePipelineStage(root, id, stage, status.stages.find((item) => item.stage === stage).outputHash,
      { acknowledgeWarnings: true, reviewer: 'synthetic-test' });
  }
  assert.equal((await loadPipelineStatus(root, id)).readyToStage, true);
}

test('reviewed animation choice is hash-bound and cannot silently fall back to none', async (t) => {
  const root = await setup(t);
  try {
    const definition = { ...brief(), presentationTemplate: 'honeylight_sugar', animationPlan: {
      decision: 'dedicated', storyboard: 'Sugar gate, then cream bloom', rarityNotes: 'Two distinct UR reveals', motionNotes: 'Skippable; reduced motion stays static',
    } };
    const { dir } = await fill(root, definition);
    await approveAll(root, definition.seriesId);
    const poolPath = path.join(dir, 'pool.json');
    const pool = await read(poolPath); pool.presentation.animationKey = 'none'; await write(poolPath, pool);
    await assertValidationError(root, definition.seriesId, 'CONTENT_BRIEF_MISMATCH');
    const status = await loadPipelineStatus(root, definition.seriesId);
    assert.equal(status.stages.find((stage) => stage.stage === 'content').approved, false);
    await assert.rejects(createPipelineWorkspace(root, { ...brief('bad_animation'), animationPlan: { decision: 'dedicated', storyboard: 'Incomplete' } }), /Animation decision/);
    const reused = { ...brief('default_reuse'), animationPlan: { decision: 'reuse', storyboard: 'Reuse the generic reveal', rarityNotes: 'Existing SSR/UR queue', motionNotes: 'Existing reduced motion' } };
    await fill(root, reused);
    await approveAll(root, reused.seriesId);
  } finally { /* setup registers checked temporary-root cleanup with the test runner. */ }
});
async function assertValidationError(root, id, code) {
  const result = await validatePipelineWorkspace(root, id);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === code), json(result.errors));
}

test('glacier scaffold carries its reviewed animation and no expansion through staging', async (t) => {
  const root = await setup(t);
  const definition = { ...brief('fixture_glacier'), presentationTemplate: 'glacier_arrival', unlock: null };
  const { dir } = await fill(root, definition);
  const pool = await read(path.join(dir, 'pool.json'));
  assert.equal(pool.presentation.themeKey, 'glacier_arrival');
  assert.equal(pool.presentation.animationKey, 'glacier_arrival');
  assert.equal(pool.unlockExpansion, undefined);
  assert.ok((await read(path.join(dir, 'plan.json'))).pets.every((pet) => pet.phase === 'base'));
  assert.equal((await validatePipelineWorkspace(root, definition.seriesId)).ok, true);
  await approveAll(root, definition.seriesId);
  const staged = await stagePoolCandidate(root, definition.seriesId);
  assert.equal(staged.releaseReady, false);
  const catalog = await read(path.join(staged.candidateDir, 'catalog.json'));
  assert.equal(catalog.poolsData.pools.at(-1).presentation.animationKey, 'glacier_arrival');
});

test('synthetic pool SOP approves exact bytes, stages all catalogs and 512px variants, and deterministically resumes', async (t) => {
  const root = await setup(t);
  const officialBefore = await snapshot(path.join(root, 'data'));
  const originalBefore = await snapshot(path.join(root, 'assets'));
  const { dir, plan, pets } = await fill(root);
  const validation = await validatePipelineWorkspace(root, 'fixture_one');
  assert.equal(validation.ok, true, json(validation.errors));
  assert.deepEqual(validation.previews.find((item) => item.poolId === 'fixture_one'), { poolId: 'fixture_one', locked: 5, unlocked: 6 });
  await approveAll(root, 'fixture_one');
  const beforeReadOnly = await snapshot(root);
  await loadPipelineStatus(root, 'fixture_one');
  await validatePipelineWorkspace(root, 'fixture_one');
  const dry = await stagePoolCandidate(root, 'fixture_one', { dryRun: true });
  assert.equal(dry.releaseReady, false);
  assert.deepEqual(await snapshot(root), beforeReadOnly, 'read-only commands must create no directories or reports');
  const candidate = await stagePoolCandidate(root, 'fixture_one');
  assert.equal(candidate.candidateId, dry.candidateId);
  const catalog = await read(path.join(candidate.candidateDir, 'catalog.json'));
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.petsData.pets.length, 11);
  assert.equal(catalog.poolsData.pools.length, 2);
  assert.equal(catalog.loreData.lore.length, 11);
  assert.equal(catalog.seriesCatalog.series.length, 2);
  const approvals = await read(path.join(candidate.candidateDir, 'approvals.json'));
  assert.deepEqual(approvals.plan, plan);
  assert.equal(approvals.receipts.length, 5);
  assert.equal(approvals.snapshots.length, 5);
  const promptSnapshot = approvals.snapshots.find((item) => item.stage === 'prompts').files['prompts.json'];
  assert.deepEqual(Buffer.from(promptSnapshot.content, 'base64'), await fs.readFile(path.join(dir, 'prompts.json')));
  assert.equal(approvals.receipts[1].files['plan.json'], hash(await fs.readFile(path.join(dir, 'plan.json'))));
  const inventory = await snapshot(candidate.candidateDir);
  const files = Object.keys(inventory).filter((file) => !file.endsWith('/') && file !== 'candidate.json');
  assert.deepEqual(files.sort(), Object.keys(candidate.manifest.files).sort());
  for (const file of files) assert.equal(inventory[file], candidate.manifest.files[file]);
  assert.equal(files.filter((file) => file.endsWith('.png')).length, 6);
  assert.equal(files.filter((file) => file.endsWith('.webp')).length, 12);
  for (const item of catalog.petsData.pets.filter((item) => pets.some((added) => added.id === item.id))) {
    const card = await sharp(await fs.readFile(path.join(candidate.candidateDir, item.imageVariants.card))).metadata();
    const stage = await sharp(await fs.readFile(path.join(candidate.candidateDir, item.imageVariants.stage))).metadata();
    assert.equal(card.width, 384); assert.equal(stage.width, 512);
  }
  const repeated = await stagePoolCandidate(root, 'fixture_one');
  assert.equal(repeated.reused, true);
  assert.equal(repeated.candidateId, candidate.candidateId);
  assert.deepEqual(await snapshot(candidate.candidateDir), inventory);
  const repeatedInit = await createPipelineWorkspace(root, brief());
  assert.equal(repeatedInit.readyToStage, true);
  assert.deepEqual((await read(path.join(dir, 'plan.json'))), plan, 'init must not overwrite approved plan');
  assert.deepEqual(await snapshot(path.join(root, 'data')), officialBefore);
  assert.deepEqual(await snapshot(path.join(root, 'assets')), originalBefore);
});

test('hash approval requires ordered reviews, preserves history and invalidates changed downstream content', async (t) => {
  const root = await setup(t);
  const { dir } = await fill(root);
  let status = await loadPipelineStatus(root, 'fixture_one');
  await assert.rejects(approvePipelineStage(root, 'fixture_one', 'plan', status.stages[1].outputHash), { code: 'UPSTREAM_UNAPPROVED' });
  await assert.rejects(approvePipelineStage(root, 'fixture_one', 'brief', '0'.repeat(64)), { code: 'HASH_MISMATCH' });
  await approveAll(root, 'fixture_one');
  status = await loadPipelineStatus(root, 'fixture_one');
  await approvePipelineStage(root, 'fixture_one', 'content', status.stages[2].outputHash);
  assert.equal((await read(path.join(dir, 'pipeline.json'))).history.length, 5, 'identical approval is idempotent');
  const oldCandidate = await stagePoolCandidate(root, 'fixture_one');
  const oldPromptBytes = await fs.readFile(path.join(dir, 'prompts.json'));
  const oldPromptReceipt = (await read(path.join(dir, 'pipeline.json'))).history.find((item) => item.stage === 'prompts');
  const prompts = await read(path.join(dir, 'prompts.json'));
  prompts.prompts[Object.keys(prompts.prompts)[0]].prompt += ' Revised by a human.';
  await write(path.join(dir, 'prompts.json'), prompts);
  status = await loadPipelineStatus(root, 'fixture_one');
  assert.deepEqual(status.stages.map((item) => item.approved), [true, true, true, false, false]);
  await assert.rejects(stagePoolCandidate(root, 'fixture_one'), { code: 'UNAPPROVED' });
  await approveAll(root, 'fixture_one', 3);
  const revised = await stagePoolCandidate(root, 'fixture_one');
  assert.notEqual(revised.candidateId, oldCandidate.candidateId);
  assert.equal((await read(path.join(dir, 'pipeline.json'))).history.length, 7);
  assert.equal((await read(path.join(oldCandidate.candidateDir, 'approvals.json'))).history.length, 5);
  assert.deepEqual(await fs.readFile(path.join(dir, oldPromptReceipt.snapshot, 'prompts.json')), oldPromptBytes);
  const allSnapshots = (await read(path.join(revised.candidateDir, 'approvals.json'))).snapshots;
  assert.deepEqual(Buffer.from(allSnapshots.find((item) => item.outputHash === oldPromptReceipt.outputHash).files['prompts.json'].content, 'base64'), oldPromptBytes);
});

test('missing or modified approval snapshot blocks staging and is never silently recreated or overwritten', async (t) => {
  const root = await setup(t);
  const { dir } = await fill(root); await approveAll(root, 'fixture_one');
  const receipt = (await read(path.join(dir, 'pipeline.json'))).history.find((item) => item.stage === 'plan');
  const file = path.join(dir, receipt.snapshot, 'plan.json');
  const bytes = await fs.readFile(file);
  await fs.writeFile(file, 'changed immutable review');
  const status = await loadPipelineStatus(root, 'fixture_one');
  assert.equal(status.readyToStage, false);
  assert.equal(status.errors[0].code, 'APPROVAL_SNAPSHOT_INVALID');
  await assert.rejects(stagePoolCandidate(root, 'fixture_one'), { code: 'UNAPPROVED' });
  assert.equal(await fs.readFile(file, 'utf8'), 'changed immutable review');
  await fs.writeFile(file, bytes);
  assert.equal((await loadPipelineStatus(root, 'fixture_one')).readyToStage, true);
  await fs.unlink(file);
  assert.equal((await loadPipelineStatus(root, 'fixture_one')).errors[0].code, 'APPROVAL_SNAPSHOT_INVALID');
});

test('invalid economics, missing unlock, wrong gift, conflicting tags and pet IDs block approval', async (t) => {
  const root = await setup(t);
  const { dir } = await fill(root);
  const poolPath = path.join(dir, 'pool.json');
  const originalPool = await read(poolPath);
  await write(poolPath, { ...originalPool, rates: { ...rates, N: .9 } });
  await assertValidationError(root, 'fixture_one', 'CONTENT_BRIEF_MISMATCH');
  const noUnlock = structuredClone(originalPool); delete noUnlock.unlockExpansion;
  await write(poolPath, noUnlock);
  await assertValidationError(root, 'fixture_one', 'UNLOCK_MISSING');
  await write(poolPath, { ...originalPool, unlockExpansion: { ...originalPool.unlockExpansion, rewardPetId: 'pet_r01' } });
  await assertValidationError(root, 'fixture_one', 'UNLOCK_MISMATCH');
  await write(poolPath, { ...originalPool, petFilter: { poolTags: ['standard'] } });
  await assertValidationError(root, 'fixture_one', 'POOL_TAG_SCOPE');
  await write(poolPath, originalPool);
  const pets = await read(path.join(dir, 'pets.json'));
  pets.pets[0].id = 'pet_n01';
  await write(path.join(dir, 'pets.json'), pets);
  await assertValidationError(root, 'fixture_one', 'CONTENT_ROSTER_MISMATCH');
  await assert.rejects(createPipelineWorkspace(root, { ...brief('bad_rates'), rates: { ...rates, N: .9 } }));
});

test('unreachable rarity, missing Lore and incomplete prompts block the candidate', async (t) => {
  const root = await setup(t);
  const { dir, plan } = await fill(root);
  const ur = plan.pets.find((item) => item.rarity === 'UR'); ur.phase = 'unlock';
  await write(path.join(dir, 'plan.json'), plan);
  const pets = await read(path.join(dir, 'pets.json'));
  pets.pets.find((item) => item.id === ur.petId).poolTags = ['fixture_one_expanded'];
  await write(path.join(dir, 'pets.json'), pets);
  await assertValidationError(root, 'fixture_one', 'POOL_EMPTY_RARITY');
  ur.phase = 'base'; await write(path.join(dir, 'plan.json'), plan);
  pets.pets.find((item) => item.id === ur.petId).poolTags = ['fixture_one']; await write(path.join(dir, 'pets.json'), pets);
  await write(path.join(dir, 'prompts.json'), { schemaVersion: 1, prompts: {} });
  await assertValidationError(root, 'fixture_one', 'PROMPT_REQUIRED');
  const loreData = await read(path.join(dir, 'pets-lore.json')); loreData.lore.pop();
  await write(path.join(dir, 'pets-lore.json'), loreData);
  assert.equal((await validatePipelineWorkspace(root, 'fixture_one')).ok, false);
});

test('assets require real complete square PNGs at least 512px and image changes revoke approval', async (t) => {
  const root = await setup(t);
  const { dir, pets } = await fill(root);
  const imagePath = path.join(dir, 'images', `${pets[0].id}.png`);
  await approveAll(root, 'fixture_one');
  const original = await fs.readFile(imagePath);
  await fs.unlink(imagePath);
  assert.equal((await validatePipelineWorkspace(root, 'fixture_one')).ok, false);
  assert.equal((await loadPipelineStatus(root, 'fixture_one')).stages[4].status, 'missing');
  for (const bytes of [Buffer.from('not an image'), original.subarray(0, 100), await png(512, 256), await png(256)]) {
    await fs.writeFile(imagePath, bytes);
    assert.equal((await validatePipelineWorkspace(root, 'fixture_one')).ok, false);
  }
  await fs.writeFile(imagePath, await png(512, 512, '#d98931'));
  assert.equal((await validatePipelineWorkspace(root, 'fixture_one')).ok, true);
  assert.equal((await loadPipelineStatus(root, 'fixture_one')).stages[4].approved, false);
});

test('pool and pet reservations survive separate drafts and concurrent init; dead lock is never stolen', async (t) => {
  const root = await setup(t);
  await createPipelineWorkspace(root, brief());
  await assert.rejects(createPipelineWorkspace(root, { ...brief('other_series'), poolId: 'fixture_one' }), { code: 'POOL_RESERVED' });
  await createPipelineWorkspace(root, brief('fixture_two'));
  const first = (await read(path.join(root, 'content/pet-series/fixture_one/pipeline.json'))).allocation;
  const second = (await read(path.join(root, 'content/pet-series/fixture_two/pipeline.json'))).allocation;
  assert.ok(second.every((item) => !first.some((prior) => prior.petId === item.petId)));
  const results = await Promise.allSettled([createPipelineWorkspace(root, brief('fixture_three')), createPipelineWorkspace(root, brief('fixture_four'))]);
  assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
  assert.equal(results.find((item) => item.status === 'rejected').reason.code, 'PIPELINE_LOCKED');
  const lock = path.join(root, 'content/pet-series/.card-pool.lock');
  await write(lock, { pid: 999999999, createdAt: '2000-01-01T00:00:00.000Z' });
  await assert.rejects(createPipelineWorkspace(root, brief('fixture_five')), { code: 'PIPELINE_LOCKED' });
  assert.equal((await read(lock)).pid, 999999999);
  // Explicit operator recovery after confirming this test owns the dead lock.
  await fs.unlink(lock);
  await createPipelineWorkspace(root, brief('fixture_five'));
});

test('baseline drift blocks stale workspaces and a reviewed source promotion preserves first pool in the next candidate', async (t) => {
  const root = await setup(t);
  await fill(root); await approveAll(root, 'fixture_one');
  const first = await stagePoolCandidate(root, 'fixture_one');
  const catalog = await read(path.join(first.candidateDir, 'catalog.json'));
  // Test-only simulation of a separately reviewed source promotion. Pipeline has no promote/deploy API.
  for (const [key, file] of Object.entries({ petsData: 'pets.json', poolsData: 'pools.json', loreData: 'pets-lore.json', seriesCatalog: 'pet-series.json' })) {
    await write(path.join(root, 'data', file), catalog[key]);
  }
  for (const file of Object.keys(first.manifest.files).filter((file) => file.startsWith('assets/'))) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.copyFile(path.join(first.candidateDir, file), path.join(root, file));
  }
  const stale = await loadPipelineStatus(root, 'fixture_one');
  assert.equal(stale.errors[0].code, 'BASELINE_DRIFT');
  await assert.rejects(stagePoolCandidate(root, 'fixture_one'), { code: 'UNAPPROVED' });
  await fill(root, brief('fixture_two')); await approveAll(root, 'fixture_two');
  const second = await stagePoolCandidate(root, 'fixture_two');
  const next = await read(path.join(second.candidateDir, 'catalog.json'));
  assert.deepEqual(next.poolsData.pools.map((pool) => pool.id), ['standard', 'fixture_one', 'fixture_two']);
  for (const item of catalog.petsData.pets) assert.deepEqual(next.petsData.pets.find((pet) => pet.id === item.id), item);
  for (const item of catalog.loreData.lore) assert.deepEqual(next.loreData.lore.find((entry) => entry.id === item.id), item);
});

test('reused candidate must match reproduced approved bytes, even if an altered catalog updates its self-hashes', async (t) => {
  const root = await setup(t);
  await fill(root); await approveAll(root, 'fixture_one');
  const staged = await stagePoolCandidate(root, 'fixture_one');
  const catalogPath = path.join(staged.candidateDir, 'catalog.json');
  const originalCatalog = await fs.readFile(catalogPath);
  const catalog = JSON.parse(originalCatalog);
  catalog.poolsData.pools.at(-1).cost = 1;
  await write(catalogPath, catalog);
  const manifestPath = path.join(staged.candidateDir, 'candidate.json');
  const manifest = await read(manifestPath);
  manifest.files['catalog.json'] = hash(await fs.readFile(catalogPath));
  await write(manifestPath, manifest);
  const corrupt = await snapshot(staged.candidateDir);
  await assert.rejects(stagePoolCandidate(root, 'fixture_one'), { code: 'CANDIDATE_CHANGED' });
  assert.deepEqual(await snapshot(staged.candidateDir), corrupt, 'corrupted existing candidate must not be overwritten');
  await fs.writeFile(catalogPath, originalCatalog);
  manifest.files['catalog.json'] = hash(originalCatalog); await write(manifestPath, manifest);
  const variant = Object.keys(manifest.files).find((file) => file.endsWith('.webp'));
  const metadata = await sharp(await fs.readFile(path.join(staged.candidateDir, variant))).metadata();
  await fs.writeFile(path.join(staged.candidateDir, variant), await sharp(await png(metadata.width, metadata.height, '#b3328e')).webp().toBuffer());
  manifest.files[variant] = hash(await fs.readFile(path.join(staged.candidateDir, variant))); await write(manifestPath, manifest);
  await assert.rejects(stagePoolCandidate(root, 'fixture_one'), { code: 'CANDIDATE_CHANGED' });
});

test('interrupted staging leaves approved sources usable and does not reuse a partial directory', async (t) => {
  const root = await setup(t);
  const { dir } = await fill(root); await approveAll(root, 'fixture_one');
  const dry = await stagePoolCandidate(root, 'fixture_one', { dryRun: true });
  const partial = path.join(dir, 'staging', `.building-${dry.candidateId}-interrupted`);
  await fs.mkdir(partial, { recursive: true });
  await write(path.join(partial, 'catalog.json'), { incomplete: true });
  const staged = await stagePoolCandidate(root, 'fixture_one');
  assert.equal(staged.candidateId, dry.candidateId);
  assert.equal(staged.reused, false);
  assert.deepEqual(await read(path.join(partial, 'catalog.json')), { incomplete: true }, 'orphan belongs to another invocation');
  assert.equal((await read(path.join(staged.candidateDir, 'catalog.json'))).petsData.pets.length, 11);
});

test('authoring and image writers reject external and internal junctions without modifying their targets', async (t) => {
  const root = await setup(t);
  const outside = await setup(t);
  const link = path.join(root, 'content/pet-series/junction');
  await fs.symlink(path.join(outside, 'data'), link, process.platform === 'win32' ? 'junction' : 'dir');
  const externalBefore = await snapshot(outside);
  await assert.rejects(createPipelineWorkspace(root, brief('junction')), { code: 'UNSAFE_PATH' });
  assert.deepEqual(await snapshot(outside), externalBefore);
  await fs.unlink(link);
  const internal = path.join(root, 'content/pet-series/internal');
  await fs.symlink(path.join(root, 'data'), internal, process.platform === 'win32' ? 'junction' : 'dir');
  const officialBefore = await snapshot(path.join(root, 'data'));
  await assert.rejects(createPipelineWorkspace(root, brief('internal')), { code: 'UNSAFE_PATH' });
  assert.deepEqual(await snapshot(path.join(root, 'data')), officialBefore);
  await fs.unlink(internal);
  const source = (await read(path.join(root, 'data/pets.json'))).pets[0];
  const original = await fs.readFile(path.join(root, source.image));
  const variants = getPetImageVariants(source, original);
  await fs.symlink(path.join(root, 'data'), path.join(root, 'assets/pets/variants'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildPetImages({ root, catalog: { pets: [{ ...source, imageVariants: variants }] }, mode: 'build' }), /symlinks|junctions/);
  assert.deepEqual(await fs.readFile(path.join(root, source.image)), original);
  assert.deepEqual(await snapshot(path.join(root, 'data')), officialBefore);
});

test('CLI status, validation and dry-run use explicit fixture root and do not write reports or production files', async (t) => {
  const root = await setup(t);
  await fill(root); await approveAll(root, 'fixture_one');
  const before = await snapshot(root);
  const cli = path.resolve(import.meta.dirname, '../scripts/card-pool.mjs');
  for (const args of [['status', 'fixture_one'], ['validate', 'fixture_one'], ['stage', 'fixture_one', '--dry-run']]) {
    const result = await exec(process.execPath, [cli, ...args, '--root', root]);
    assert.doesNotThrow(() => JSON.parse(result.stdout));
  }
  assert.deepEqual(await snapshot(root), before);
});


function sopBrief(id = 'sop_fixture') {
  return { ...brief(id), sopVersion: 2, noExtraCost: true, unlock: null,
    productionBaseline: { deployedCommit: '1'.repeat(40), sourceCommit: '2'.repeat(40), mainCommit: '3'.repeat(40),
      artifactId: '4'.repeat(64), version: 'fixture', httpsUrl: 'https://example.invalid/',
      verifiedAt: '2026-10-01T00:00:00Z', unpublishedChanges: 'Synthetic pins; never deployment evidence' },
    animationPlan: { decision: 'none', reason: 'Synthetic fixture only', storyboard: 'No motion', rarityNotes: 'Existing result queue', motionNotes: 'Static result' } };
}
async function setupSop(t, definition = sopBrief(), transformRuntime) {
  const root = await setup(t);
  await fs.mkdir(path.join(root, 'src'));
  for (const file of [...ECOSYSTEM_CATALOGS, ...ECOSYSTEM_RUNTIME]) {
    await fs.copyFile(new URL(`../${file}`, import.meta.url), path.join(root, file));
  }
  if (transformRuntime) await transformRuntime(root);
  const result = await fill(root, definition);
  const ecosystemPath = path.join(result.dir, 'ecosystem.json');
  const e = await read(ecosystemPath);
  e.food = { id: 'item_fixture_food', name: 'Fixture food', description: 'Synthetic food only', rarity: 'R', enabled: true,
    type: 'favorite_bond_item', effect: { bondExp: 75, favoriteBonusBondExp: 150 }, recipe: { forest_leaf: 8 }, favoriteTags: ['nature'] };
  for (const p of result.pets) {
    e.affinities[p.id] = ['nature']; e.affinityNotes[p.id] = 'Synthetic reviewed preference';
    e.specialties[p.id] = { role: getPetSpecialty(p).role, reason: 'Matches actual current dispatch settings' };
  }
  e.expedition = { decision: 'reuse', reason: 'Reuse existing forest material source', reusedAreaIds: ['mist_forest'], areas: [] };
  e.releaseNotes = 'Synthetic pets, food and affinities; existing dispatch specialties and no new region or animation.';
  await write(ecosystemPath, e);
  const promptsPath = path.join(result.dir, 'prompts.json');
  const prompts = await read(promptsPath);
  for (const entry of Object.values(prompts.prompts)) entry.provenance = {
    tool: 'sharp fixture', noExtraCost: true, costBasis: 'Local synthetic PNG, no network or generation billing',
  };
  await write(promptsPath, prompts);
  return { root, ...result, e, ecosystemPath };
}
async function approveSop(root, id, start = 0) {
  for (const stage of PIPELINE_STAGES.slice(start)) {
    const status = await loadPipelineStatus(root, id);
    await approvePipelineStage(root, id, stage, status.stages.find((s) => s.stage === stage).outputHash,
      { acknowledgeWarnings: true, reviewer: 'synthetic fixture, never human acceptance', reviewerType: 'synthetic' });
  }
}

test('new real workspace requires SOP and production pins; legacy workspaces still stage in their original format', async (t) => {
  const root = await setup(t);
  const real = brief('unmarked_real'); delete real.purpose;
  await assert.rejects(createPipelineWorkspace(root, real), { code: 'SOP_REQUIRED' });
  await assert.rejects(createPipelineWorkspace(root, { ...sopBrief('bad_pins'), productionBaseline: {} }), { code: 'SOP_BRIEF_INVALID' });
  const { dir } = await fill(root);
  const b = await read(path.join(dir, 'brief.json')); delete b.purpose; await write(path.join(dir, 'brief.json'), b);
  const state = await read(path.join(dir, 'pipeline.json')); delete state.sopVersion; delete state.purpose;
  await write(path.join(dir, 'pipeline.json'), state);
  await approveAll(root, 'fixture_one');
  const candidate = await stagePoolCandidate(root, 'fixture_one');
  assert.equal(candidate.manifest.sopVersion, undefined);
  assert.equal(Object.keys(candidate.manifest.files).some((f) => f.includes('ecosystem') || f.includes('companion')), false);
});

test('SOP companion food, recipient, recipe, specialty and region assessment are hard content gates', async (t) => {
  const { root, e, ecosystemPath } = await setupSop(t);
  assert.equal((await validatePipelineWorkspace(root, 'sop_fixture')).ok, true);
  for (const [mutate, code] of [
    [(v) => { v.food = null; }, 'NEW_FOOD_REQUIRED'],
    [(v) => { v.food.id = 'constructor'; }, 'NEW_FOOD_REQUIRED'],
    [(v) => { v.expedition.decision = ''; }, 'REGION_ASSESSMENT_REQUIRED'],
    [(v) => { v.food.recipe = { nonexistent: 1 }; }, 'RECIPE_INVALID'],
    [(v) => { v.food.favoriteTags = ['unknown']; }, 'FOOD_TAG_INVALID'],
    [(v) => { for (const id of Object.keys(v.affinities)) v.affinities[id] = []; }, 'FOOD_RECIPIENT_REQUIRED'],
    [(v) => { delete v.specialties[Object.keys(v.specialties)[0]]; }, 'PET_SETTINGS_REQUIRED'],
    [(v) => { v.specialties[Object.keys(v.specialties)[0]].role = 'unsupported'; }, 'SPECIALTY_INVALID'],
    [(v) => { v.runtimeHashes['src/workshopService.js'] = '0'.repeat(64); }, 'ECOSYSTEM_RUNTIME_DRIFT'],
  ]) {
    const changed = structuredClone(e); mutate(changed); await write(ecosystemPath, changed);
    await assertValidationError(root, 'sop_fixture', code);
  }
  await write(ecosystemPath, e);
  const promptPath = path.join(path.dirname(ecosystemPath), 'prompts.json');
  const prompts = await read(promptPath); delete prompts.prompts[Object.keys(prompts.prompts)[0]].provenance.costBasis;
  await write(promptPath, prompts);
  await assertValidationError(root, 'sop_fixture', 'GENERATION_COST_UNCONFIRMED');
});

test('selecting a new region cannot stage an unimplemented story or omit its actual milestone ladder', async (t) => {
  const { root, e, ecosystemPath } = await setupSop(t);
  const forest = (await read(path.join(root, 'data/expeditions.json'))).areas[0];
  e.expedition = { decision: 'add', reason: 'Independent synthetic story and exploration', reusedAreaIds: ['mist_forest'],
    areas: [{ ...forest, id: 'new_unimplemented_region', name: 'New region' }] };
  await write(ecosystemPath, e);
  await assertValidationError(root, 'sop_fixture', 'REGION_RUNTIME_INCOMPLETE');
});

test('a complete new region uses actual runtime stories/discoveries/milestones and source-specialty behavior', async (t) => {
  const areaId = 'fixture_region';
  const storyId = 'fixture_story';
  const name = 'Fixture region';
  const definition = { areaId, name, increment: 5, milestones: [10, 25, 50, 75, 100].map((percent) => ({
    percent, title: `Milestone ${percent}`, description: 'Synthetic complete milestone', reward: { stardust: 10 },
    ...(percent === 10 ? { storyId } : {}),
  })) };
  const { root, e, ecosystemPath } = await setupSop(t, sopBrief(), async (root) => {
    const explorationPath = path.join(root, 'src/explorationService.js');
    let source = await fs.readFile(explorationPath, 'utf8');
    source = source.replace('const AREA_STORIES = {', `const AREA_STORIES = {\n  ${storyId}: 'Synthetic story',`)
      .replace('const AREA_EXPLORATION_DEFS = {', `const AREA_EXPLORATION_DEFS = {\n  ${areaId}: ${JSON.stringify(definition)},`);
    await fs.writeFile(explorationPath, source);
    const gameplayPath = path.join(root, 'src/expeditionGameplay.js');
    source = (await fs.readFile(gameplayPath, 'utf8')).replace('const AREA_DISCOVERIES = {',
      `const AREA_DISCOVERIES = {\n  ${areaId}: 'Synthetic discovery',`)
      .replace('export function getPetSpecialty(pet) {', "export function getPetSpecialty(pet) {\n  return { role: 'guardian', level: 1 };");
    await fs.writeFile(gameplayPath, source);
  });
  const forest = (await read(path.join(root, 'data/expeditions.json'))).areas[0];
  e.expedition = { decision: 'add', reason: 'Independent story with functional expedition rewards', reusedAreaIds: ['mist_forest'],
    areas: [{ ...forest, id: areaId, name }] };
  await write(ecosystemPath, e);
  await assertValidationError(root, 'sop_fixture', 'SPECIALTY_INVALID');
  for (const specialty of Object.values(e.specialties)) specialty.role = 'guardian';
  await write(ecosystemPath, e);
  assert.equal((await validatePipelineWorkspace(root, 'sop_fixture')).ok, true);
  await approveSop(root, 'sop_fixture');
  const candidate = await stagePoolCandidate(root, 'sop_fixture');
  const areas = await read(path.join(candidate.candidateDir, 'companion/data/expeditions.json'));
  assert.equal(areas.areas.at(-1).id, areaId);
});

test('companion hashes revoke downstream reviews, preserve candidates and detect baseline drift or policy downgrade', async (t) => {
  const { root, e, ecosystemPath, dir } = await setupSop(t);
  const official = await snapshot(path.join(root, 'data'));
  await approveSop(root, 'sop_fixture');
  const first = await stagePoolCandidate(root, 'sop_fixture');
  assert.equal(first.manifest.sopVersion, 2);
  for (const file of ECOSYSTEM_CATALOGS) assert.ok(first.manifest.files[`companion/${file}`]);
  const old = await snapshot(first.candidateDir);
  e.releaseNotes += ' Updated'; await write(ecosystemPath, e);
  assert.deepEqual((await loadPipelineStatus(root, 'sop_fixture')).stages.map((s) => s.approved), [true, true, false, false, false]);
  await assert.rejects(stagePoolCandidate(root, 'sop_fixture'), { code: 'UNAPPROVED' });
  await approveSop(root, 'sop_fixture', 2);
  const next = await stagePoolCandidate(root, 'sop_fixture');
  assert.notEqual(first.candidateId, next.candidateId);
  assert.deepEqual(await snapshot(first.candidateDir), old);
  assert.deepEqual(await snapshot(path.join(root, 'data')), official);
  const definition = await read(path.join(dir, 'brief.json')); delete definition.sopVersion;
  await write(path.join(dir, 'brief.json'), definition);
  await assert.rejects(loadPipelineStatus(root, 'sop_fixture'), { code: 'SOP_DOWNGRADE' });
  definition.sopVersion = 2; await write(path.join(dir, 'brief.json'), definition);
  await fs.appendFile(path.join(root, 'data/craftables.json'), '\n');
  assert.equal((await loadPipelineStatus(root, 'sop_fixture')).errors[0].code, 'BASELINE_DRIFT');
});

test('real SOP artwork requires explicit human reviewer; internal stages accept AI reviews', async (t) => {
  const definition = sopBrief('real_review_fixture'); delete definition.purpose;
  const { root } = await setupSop(t, definition);
  for (const stage of PIPELINE_STAGES.slice(0, 4)) {
    const status = await loadPipelineStatus(root, definition.seriesId);
    await approvePipelineStage(root, definition.seriesId, stage, status.stages.find((s) => s.stage === stage).outputHash,
      { acknowledgeWarnings: true, reviewer: 'AI fixture', reviewerType: 'ai' });
  }
  const status = await loadPipelineStatus(root, definition.seriesId);
  await assert.rejects(approvePipelineStage(root, definition.seriesId, 'images', status.stages[4].outputHash,
    { acknowledgeWarnings: true, reviewer: 'AI fixture', reviewerType: 'ai' }), { code: 'HUMAN_IMAGES_REQUIRED' });
  assert.equal((await loadPipelineStatus(root, definition.seriesId)).readyToStage, false);
});
