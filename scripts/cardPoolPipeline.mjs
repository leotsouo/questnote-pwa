/** Local authoring pipeline. Never publishes or writes official catalogs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { mergePets, mergeLore, mergeSeriesCatalog } from './petSeriesPublishService.mjs';
import { validatePetPackage, validatePetCatalog, validateLoreCatalog, validateSeriesCatalog,
  validatePetAndLoreConsistency, getNextPetId, PET_ID_TYPES } from '../src/petDataSchema.js';
import { normalizePoolDefinition, resolveEffectivePool, validatePoolContent, POOL_RARITIES, POOL_THEME_REGISTRY } from '../src/poolContentContract.js';
import { getEligiblePetsForPool } from '../src/petPoolFilter.js';
import { buildPetImages, inspectPetImage, PET_IMAGE_BUILD_VERSION, PET_IMAGE_OPTIONS } from '../devtools/build-pet-images.mjs';

export const PIPELINE_VERSION = 1;
export const PIPELINE_STAGES = Object.freeze(['brief', 'plan', 'content', 'prompts', 'images']);
const CATALOGS = Object.freeze({ petsData: 'data/pets.json', poolsData: 'data/pools.json',
  loreData: 'data/pets-lore.json', seriesCatalog: 'data/pet-series.json' });
const STAGE_FILES = Object.freeze({ brief: ['brief.json'], plan: ['plan.json'],
  content: ['series.json', 'pets.json', 'pets-lore.json', 'pool.json'], prompts: ['prompts.json'] });
const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const plain = (value) => typeof value === 'string' && value.trim().length > 0;
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const problem = (code, message, source = '') => ({ level: 'error', code, message, path: source });
const warning = (code, message, source = '') => ({ level: 'warning', code, message, path: source });

export class PipelineError extends Error {
  constructor(code, message) { super(message); this.name = 'PipelineError'; this.code = code; }
}
function assert(condition, code, message) { if (!condition) throw new PipelineError(code, message); }
function safeId(id) {
  assert(typeof id === 'string' && /^[a-z][a-z0-9_]*$/.test(id)
    && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9]|constructor|prototype|__proto__)$/i.test(id),
  'INVALID_ID', 'Use a safe lowercase series/pool identifier');
  return id;
}
function relativeFile(value) {
  assert(typeof value === 'string' && value.length && !value.includes('\\') && !path.isAbsolute(value)
    && !value.split('/').some((part) => !part || part === '.' || part === '..') && !value.includes(':'),
  'UNSAFE_PATH', `Unsafe relative path: ${value}`);
  return value;
}

/** Check actual ancestors as well as lexical paths, including Windows junctions. */
async function contained(root, relative, { allowMissing = false } = {}) {
  relativeFile(relative);
  const rootPath = path.resolve(root);
  const realRoot = await fs.realpath(rootPath);
  const target = path.resolve(rootPath, relative);
  assert(target.startsWith(rootPath + path.sep), 'UNSAFE_PATH', 'Path escapes root');
  let component = rootPath;
  for (const part of path.relative(rootPath, target).split(path.sep)) {
    component = path.join(component, part);
    try { assert(!(await fs.lstat(component)).isSymbolicLink(), 'UNSAFE_PATH', 'Symlinks and junctions are not permitted in authoring paths'); }
    catch (error) { if (!allowMissing || error.code !== 'ENOENT') throw error; }
  }
  let ancestor = target;
  while (true) {
    try {
      const actual = await fs.realpath(ancestor);
      assert(actual.startsWith(realRoot + path.sep) || actual === realRoot, 'UNSAFE_PATH', 'Symlink/junction escapes root');
      return target;
    } catch (error) {
      if (!allowMissing || error.code !== 'ENOENT') throw error;
      ancestor = path.dirname(ancestor);
    }
  }
}
async function readJson(root, relative) { return JSON.parse(await fs.readFile(await contained(root, relative), 'utf8')); }
async function writeJson(root, relative, value) {
  const target = await contained(root, relative, { allowMissing: true });
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, jsonText(value), { flag: 'wx' });
  await fs.rename(temporary, target);
}
function workspaceRelative(id) { return `content/pet-series/${safeId(id)}`; }
async function workspacePath(root, id) { return contained(root, workspaceRelative(id)); }
async function toolFingerprint() {
  const files = ['./cardPoolPipeline.mjs', './petSeriesPublishService.mjs', '../src/petDataSchema.js',
    '../src/poolContentContract.js', '../src/petPoolFilter.js', '../devtools/build-pet-images.mjs'];
  const entries = {};
  for (const file of files) entries[file] = hash(await fs.readFile(new URL(file, import.meta.url)));
  return hash(jsonText({ pipelineVersion: PIPELINE_VERSION, files: entries, imageBuild: PET_IMAGE_BUILD_VERSION,
    imageOptions: PET_IMAGE_OPTIONS, encoder: sharp.versions }));
}
async function readOfficial(root) {
  const data = {};
  for (const [key, file] of Object.entries(CATALOGS)) data[key] = await readJson(root, file);
  assert(Array.isArray(data.petsData?.pets) && Array.isArray(data.poolsData?.pools)
    && Array.isArray(data.loreData?.lore) && Array.isArray(data.seriesCatalog?.series), 'BASELINE_INVALID', 'Baseline catalogs are incomplete');
  return data;
}
async function hashFiles(root, files) {
  const out = {};
  for (const relative of [...new Set(files)].sort()) out[relative] = hash(await fs.readFile(await contained(root, relative)));
  return out;
}
async function readApprovalSnapshot(dir, receipt) {
  assert(receipt.snapshot === `approvals/${receipt.outputHash}`, 'APPROVAL_SNAPSHOT_INVALID', 'Approval snapshot reference is invalid');
  const snapshot = await contained(dir, receipt.snapshot);
  const files = await listFiles(snapshot);
  assert(equal(files, Object.keys(receipt.files).sort()), 'APPROVAL_SNAPSHOT_INVALID', 'Approval snapshot inventory changed');
  const result = {};
  for (const file of files) {
    const bytes = await fs.readFile(await contained(snapshot, file));
    assert(hash(bytes) === receipt.files[file], 'APPROVAL_SNAPSHOT_INVALID', 'Approved output bytes changed');
    result[file] = bytes;
  }
  return result;
}
async function archiveStage(dir, stage) {
  const receipt = { ...stage, snapshot: `approvals/${stage.outputHash}` };
  const parent = await contained(dir, 'approvals', { allowMissing: true });
  await fs.mkdir(parent, { recursive: true });
  const final = await contained(dir, receipt.snapshot, { allowMissing: true });
  let exists = false;
  try { await fs.access(final); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (exists) { await readApprovalSnapshot(dir, receipt); return receipt.snapshot; }
  const temporary = await contained(parent, `.archiving-${randomUUID()}`, { allowMissing: true });
  await fs.mkdir(temporary);
  try {
    for (const [file, expectedHash] of Object.entries(stage.files)) {
      const bytes = await fs.readFile(await contained(dir, file));
      assert(hash(bytes) === expectedHash, 'INPUT_CHANGED', 'Stage changed while archiving approval');
      const destination = await contained(temporary, file, { allowMissing: true });
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, bytes, { flag: 'wx' });
    }
    await fs.rename(temporary, final);
    return receipt.snapshot;
  } catch (error) {
    const checked = await contained(parent, path.basename(temporary));
    assert(checked === temporary && path.basename(checked).startsWith('.archiving-'), 'UNSAFE_PATH', 'Unsafe snapshot cleanup');
    await fs.rm(checked, { recursive: true, force: true });
    throw error;
  }
}
async function captureBaseline(root, official) {
  const files = [...Object.values(CATALOGS)];
  for (const pet of official.petsData.pets) {
    for (const file of [pet.image, ...Object.values(pet.imageVariants || {})]) {
      assert(typeof file === 'string' && /^assets\/pets\/[a-z0-9_/-]+\.(png|webp)$/i.test(file), 'BASELINE_INVALID', 'Invalid existing pet image path');
      files.push(file);
    }
  }
  const hashes = await hashFiles(root, files);
  return { hash: hash(jsonText(hashes)), files: hashes };
}
async function verifyBaseline(root, baseline) {
  const current = await hashFiles(root, Object.keys(baseline.files));
  assert(equal(current, baseline.files), 'BASELINE_DRIFT', 'Official catalogs or referenced assets changed; create a new reviewed baseline');
}

async function locked(root, run) {
  const contentRoot = await contained(root, 'content/pet-series', { allowMissing: true });
  await fs.mkdir(contentRoot, { recursive: true });
  const lockPath = await contained(contentRoot, '.card-pool.lock', { allowMissing: true });
  let handle;
  try { handle = await fs.open(lockPath, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') throw new PipelineError('PIPELINE_LOCKED', 'Another authoring mutation owns the lock; no files were overwritten');
    throw error;
  }
  try {
    await handle.writeFile(jsonText({ pid: process.pid, createdAt: new Date().toISOString() }));
    return await run(contentRoot);
  } finally { await handle.close(); await fs.unlink(lockPath); }
}

function checkBrief(brief) {
  assert(object(brief) && brief.schemaVersion === 1, 'BRIEF_INVALID', 'Brief schemaVersion must be 1');
  safeId(brief.seriesId); safeId(brief.poolId);
  assert(plain(brief.concept) && plain(brief.seriesName), 'BRIEF_INVALID', 'Concept and seriesName are required');
  assert(object(brief.rarityPlan) && Object.keys(brief.rarityPlan).length === POOL_RARITIES.length
    && POOL_RARITIES.every((rarity) => Number.isSafeInteger(brief.rarityPlan[rarity]) && brief.rarityPlan[rarity] >= 0),
    'BRIEF_INVALID', 'rarityPlan must contain every rarity with a nonnegative integer');
  const count = Object.values(brief.rarityPlan).reduce((sum, value) => sum + value, 0);
  assert(count > 0 && count <= 100, 'BRIEF_INVALID', 'One workspace supports 1–100 pets');
  assert(Object.hasOwn(POOL_THEME_REGISTRY, brief.presentationTemplate || 'default'), 'BRIEF_INVALID', 'Unknown presentation template');
  assert(brief.unlock === null || object(brief.unlock), 'BRIEF_INVALID', 'Explicitly choose unlock: null or an expansion');
  if (brief.unlock) {
    safeId(brief.unlock.key);
    assert(Number.isSafeInteger(brief.unlock.threshold) && brief.unlock.threshold > 0 && plain(brief.unlock.rewardDraftId),
      'BRIEF_INVALID', 'Unlock threshold and rewardDraftId are required');
  }
  normalizePoolDefinition({ id: brief.poolId, name: brief.seriesName, active: true, cost: brief.cost,
    rates: brief.rates, pity: brief.pity, petFilter: { poolTags: [brief.poolId] } });
}
async function reservedPets(root, contentRoot, official, poolId) {
  const pets = [...official.petsData.pets];
  for (const entry of await fs.readdir(contentRoot, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const dir = await contained(contentRoot, entry.name);
    for (const file of ['pets.json', 'plan.json', 'pipeline.json', 'brief.json', 'pool.json']) {
      let data;
      try { data = await readJson(dir, file); }
      catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      assert((file === 'pool.json' ? data.id : data.poolId) !== poolId, 'POOL_RESERVED', 'Pool ID is reserved by another draft');
      const list = file === 'pipeline.json' ? data.allocation : data.pets;
      if (Array.isArray(list)) for (const pet of list) if (pet.id || pet.petId) pets.push({ id: pet.id || pet.petId });
    }
  }
  return pets;
}

/** Creates only a draft and AI handoff scaffold; it never invents approved product content. */
export async function createPipelineWorkspace(root, brief) {
  checkBrief(brief);
  return locked(root, async (contentRoot) => {
    const existingPath = await contained(contentRoot, brief.seriesId, { allowMissing: true });
    try {
      const existing = await readJson(existingPath, 'brief.json');
      assert(equal(existing, brief), 'WORKSPACE_EXISTS', 'Existing workspace differs; it will not be overwritten');
      return loadPipelineStatus(root, brief.seriesId);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { await fs.access(existingPath); throw new PipelineError('WORKSPACE_EXISTS', 'Incomplete existing workspace requires explicit recovery'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const official = await readOfficial(root);
    assert(!official.poolsData.pools.some((pool) => pool.id === brief.poolId), 'POOL_COLLISION', 'Pool ID already published');
    assert(!official.seriesCatalog.series.some((series) => series.id === brief.seriesId), 'SERIES_COLLISION', 'v1 creates a new series; it does not replace published series');
    const newTags = [brief.poolId, `${brief.poolId}_expanded`];
    const usedTags = [...official.petsData.pets.flatMap((pet) => pet.poolTags || []),
      ...official.poolsData.pools.flatMap((pool) => [...(pool.petFilter?.poolTags || []), ...(pool.unlockExpansion?.extraPoolTags || [])])];
    assert(!newTags.some((tag) => usedTags.includes(tag)), 'POOL_TAG_COLLISION', 'New pool tags overlap published content');
    const reserved = await reservedPets(root, contentRoot, official, brief.poolId);
    const allocation = [];
    for (const rarity of POOL_RARITIES) {
      for (let index = 1; index <= brief.rarityPlan[rarity]; index++) {
        const petId = getNextPetId(reserved, PET_ID_TYPES.STANDARD, rarity);
        const draftId = `${rarity.toLowerCase()}_${index}`;
        allocation.push({ draftId, petId, rarity }); reserved.push({ id: petId });
      }
    }
    const reward = brief.unlock ? allocation.find((pet) => pet.draftId === brief.unlock.rewardDraftId) : null;
    assert(!brief.unlock || reward, 'BRIEF_INVALID', 'rewardDraftId must reference an allocated roster slot such as r_2');
    const baseline = await captureBaseline(root, official);
    const temporary = await contained(contentRoot, `.creating-${brief.seriesId}-${randomUUID()}`, { allowMissing: true });
    await fs.mkdir(temporary);
    const plan = { schemaVersion: 1, pets: allocation.map((pet) => ({ ...pet, name: '', design: '',
      phase: pet === reward ? 'unlock' : 'base' })) };
    const pool = { id: brief.poolId, name: brief.seriesName, active: true, cost: brief.cost,
      rates: brief.rates, pity: brief.pity, petFilter: { poolTags: [brief.poolId] } };
    if ((brief.presentationTemplate || 'default') !== 'default') pool.presentation = {
      themeKey: brief.presentationTemplate, animationKey: brief.presentationTemplate,
      heroPetId: null, featuredPetIds: [],
    };
    if (brief.unlock) pool.unlockExpansion = { key: brief.unlock.key, threshold: brief.unlock.threshold,
      progressScope: 'lifetime_pool_draws', extraPoolTags: [`${brief.poolId}_expanded`], rewardPetId: reward.petId,
      animationKey: 'pool_unlock', title: `${brief.seriesName}擴充`, unlockMessage: '' };
    const files = { 'brief.json': brief, 'plan.json': plan,
      'series.json': { schemaVersion: 1, seriesId: brief.seriesId, seriesName: brief.seriesName,
        description: brief.concept, rarityPlan: brief.rarityPlan, releaseVersion: brief.releaseVersion || '' },
      'pets.json': { pets: [] }, 'pets-lore.json': { version: 1, lore: [] }, 'prompts.json': { schemaVersion: 1, prompts: {} },
      'pool.json': pool, 'pipeline.json': { schemaVersion: 1, seriesId: brief.seriesId, poolId: brief.poolId,
        baseline, allocation, history: [] } };
    for (const [file, data] of Object.entries(files)) await writeJson(temporary, file, data);
    await fs.mkdir(path.join(temporary, 'images'));
    await fs.writeFile(path.join(temporary, 'AI-HANDOFF.md'), `# ${brief.seriesName} authoring handoff\n\n`
      + 'Review brief.json with the user, then fill plan.json names/designs and base/unlock phases. IDs are reserved: never renumber them.\n'
      + 'After exact-hash plan approval, produce pets.json, pets-lore.json and plain-text pool presentation using the approved roster.\n'
      + 'Lore requires title, 1–3 personality traits, display element, lore text, normal/urgent/important/praise ×5, idle ×3, bondUp ×2, summon and bondUnlocks 2–5.\n'
      + 'Produce prompts.json entries for every pet ID (prompt and negativePrompt), including generation provenance when available.\n'
      + 'Generate or provide square PNG images named <petId>.png under images/; minimum 512 px, maximum 5 MB. Human review must confirm visual quality and prompt alignment.\n'
      + 'Use card-pool status/approve for each current exact hash. No stage approval grants publication permission.\n');
    await verifyBaseline(root, baseline);
    await fs.rename(temporary, existingPath);
    return loadPipelineStatus(root, brief.seriesId);
  });
}

async function loadWorkspace(root, id) {
  const dir = await workspacePath(root, id);
  const state = await readJson(dir, 'pipeline.json');
  assert(state.schemaVersion === 1 && state.seriesId === id && Array.isArray(state.allocation) && Array.isArray(state.history),
    'WORKSPACE_INVALID', 'Invalid pipeline state');
  const brief = await readJson(dir, 'brief.json');
  checkBrief(brief);
  assert(brief.seriesId === id && brief.poolId === state.poolId, 'WORKSPACE_INVALID', 'Workspace identity changed');
  return { dir, state, brief };
}

/** Read-only status. Receipts are chained to exact upstream hashes, never boolean flags. */
export async function loadPipelineStatus(root, id) {
  const { dir, state } = await loadWorkspace(root, id);
  const errors = [];
  try { await verifyBaseline(root, state.baseline); }
  catch (error) { errors.push(problem(error.code || 'BASELINE_READ', error.message)); }
  const toolsHash = await toolFingerprint();
  let inputHash = hash(jsonText({ baseline: state.baseline.hash, toolsHash }));
  let predecessorsApproved = errors.length === 0;
  const stages = [];
  for (const stage of PIPELINE_STAGES) {
    const files = stage === 'images' ? state.allocation.map((pet) => `images/${pet.petId}.png`) : STAGE_FILES[stage];
    const fileHashes = {};
    const missing = [];
    for (const file of files) {
      try { fileHashes[file] = hash(await fs.readFile(await contained(dir, file))); }
      catch (error) { if (error.code === 'ENOENT') missing.push(file); else throw error; }
    }
    const outputHash = missing.length ? null : hash(jsonText({ stage, inputHash, files: fileHashes }));
    const receipt = state.history.filter((entry) => entry.stage === stage).at(-1);
    let approved = !!outputHash && predecessorsApproved && receipt?.outputHash === outputHash && receipt?.inputHash === inputHash;
    if (approved) {
      try { await readApprovalSnapshot(dir, receipt); }
      catch (error) { errors.push(problem('APPROVAL_SNAPSHOT_INVALID', error.message, stage)); approved = false; }
    }
    stages.push({ stage, inputHash, outputHash, files: fileHashes, missing, approved,
      status: missing.length ? 'missing' : approved ? 'approved' : receipt ? 'stale' : 'awaiting_review' });
    predecessorsApproved = approved;
    inputHash = outputHash;
  }
  return { schemaVersion: 1, seriesId: id, toolsHash, baselineHash: state.baseline.hash, errors, stages,
    nextStage: stages.find((stage) => !stage.approved)?.stage || 'stage_candidate', readyToStage: stages.every((stage) => stage.approved) && !errors.length };
}

function checkPlan(plan, state, brief) {
  assert(plan?.schemaVersion === 1 && Array.isArray(plan.pets) && plan.pets.length === state.allocation.length,
    'PLAN_INVALID', 'Roster must contain each reserved pet exactly once');
  const seen = new Set();
  for (const pet of plan.pets) {
    const reserved = state.allocation.find((entry) => entry.draftId === pet.draftId);
    assert(reserved && reserved.petId === pet.petId && reserved.rarity === pet.rarity && !seen.has(pet.petId),
      'PLAN_IDENTITY', 'Reserved roster IDs and rarities cannot be changed');
    seen.add(pet.petId);
    assert(plain(pet.name) && plain(pet.design) && ['base', 'unlock'].includes(pet.phase), 'PLAN_INVALID', 'Every roster pet needs name, design and phase');
    assert(brief.unlock || pet.phase === 'base', 'PLAN_UNLOCK', 'Brief has no unlock expansion');
  }
  for (const rarity of POOL_RARITIES) assert(plan.pets.filter((pet) => pet.rarity === rarity).length === brief.rarityPlan[rarity],
    'PLAN_RARITY', 'Roster differs from the approved rarity plan');
  if (brief.unlock) assert(plan.pets.find((pet) => pet.draftId === brief.unlock.rewardDraftId)?.phase === 'unlock',
    'PLAN_UNLOCK', 'The fixed reward must be an unlock-phase pet');
}

/** Validates the requested stage and prerequisites without requiring later assets to exist. */
async function validateThrough(root, id, stage) {
  const { dir, state, brief } = await loadWorkspace(root, id);
  await verifyBaseline(root, state.baseline);
  const errors = [], warnings = [];
  const index = PIPELINE_STAGES.indexOf(stage);
  assert(index >= 0, 'STAGE_INVALID', 'Unknown pipeline stage');
  if (index === 0) return { ok: true, errors, warnings };
  const plan = await readJson(dir, 'plan.json');
  checkPlan(plan, state, brief);
  if (index === 1) return { ok: true, errors, warnings };
  const [seriesMeta, petsData, loreData, pool, promptsData] = await Promise.all([
    readJson(dir, 'series.json'), readJson(dir, 'pets.json'), readJson(dir, 'pets-lore.json'), readJson(dir, 'pool.json'), readJson(dir, 'prompts.json'),
  ]);
  const official = await readOfficial(root);
  assert(pool.id === brief.poolId && !official.poolsData.pools.some((item) => item.id === pool.id), 'POOL_COLLISION', 'New pool must retain its reserved unpublished identity');
  assert(seriesMeta.seriesId === id && seriesMeta.seriesName === brief.seriesName && equal(seriesMeta.rarityPlan, brief.rarityPlan),
    'CONTENT_BRIEF_MISMATCH', 'Series metadata differs from the reviewed brief');
  assert(pool.cost === brief.cost && equal(pool.rates, brief.rates) && equal(pool.pity, brief.pity),
    'CONTENT_BRIEF_MISMATCH', 'Pool economics differ from the reviewed brief');
  assert((pool.presentation?.themeKey || 'default') === (brief.presentationTemplate || 'default'), 'CONTENT_BRIEF_MISMATCH', 'Presentation template differs from brief');
  assert(!!pool.unlockExpansion === !!brief.unlock, 'UNLOCK_MISSING', 'Pool must implement the approved unlock decision');
  assert(equal(pool.petFilter, { poolTags: [brief.poolId] }), 'POOL_TAG_SCOPE', 'v1 base tags must be the reserved pool ID');
  if (brief.unlock) {
    const expected = plan.pets.find((pet) => pet.draftId === brief.unlock.rewardDraftId);
    assert(pool.unlockExpansion.key === brief.unlock.key && pool.unlockExpansion.threshold === brief.unlock.threshold
      && pool.unlockExpansion.rewardPetId === expected.petId, 'UNLOCK_MISMATCH', 'Expansion key, threshold or gift differs from brief');
    assert(equal(pool.unlockExpansion.extraPoolTags, [`${brief.poolId}_expanded`]), 'POOL_TAG_SCOPE', 'v1 expansion tags must be the reserved pool ID plus _expanded');
  }
  assert(Array.isArray(petsData.pets) && petsData.pets.length === plan.pets.length, 'CONTENT_ROSTER_MISMATCH', 'Pet catalog differs from roster');
  for (const pet of petsData.pets) {
    const expected = plan.pets.find((entry) => entry.petId === pet.id);
    assert(expected && pet.name === expected.name && pet.rarity === expected.rarity && pet.seriesId === id,
      'CONTENT_ROSTER_MISMATCH', 'Pet identity, name or rarity differs from roster');
    const tags = expected.phase === 'base' ? pool.petFilter?.poolTags : pool.unlockExpansion?.extraPoolTags;
    assert(Array.isArray(tags) && Array.isArray(pet.poolTags) && equal([...pet.poolTags].sort(), [...tags].sort()),
      'CONTENT_PHASE_MISMATCH', 'Pet tags must match the reviewed base/unlock phase');
  }
  const merged = { petsData: mergePets(official.petsData, petsData), loreData: mergeLore(official.loreData, loreData),
    seriesCatalog: mergeSeriesCatalog(official.seriesCatalog, seriesMeta), poolsData: { ...official.poolsData,
      schemaVersion: 1, pools: [...official.poolsData.pools, pool] } };
  const knownPoolTags = new Set(merged.poolsData.pools.flatMap((item) => [...(item.petFilter?.poolTags || []), ...(item.unlockExpansion?.extraPoolTags || [])]));
  const packageResult = validatePetPackage({ seriesMeta, petsData, loreData, promptsData,
    officialPets: official.petsData.pets, officialLore: official.loreData.lore, seriesCatalog: official.seriesCatalog,
    poolsData: merged.poolsData, knownPoolTags });
  errors.push(...packageResult.errors);
  warnings.push(...packageResult.warnings.filter((item) => index >= 3 || !item.code.startsWith('PROMPT_')));
  const checks = [validatePetCatalog(merged.petsData, { mode: 'existing', seriesIds: new Set(merged.seriesCatalog.series.map((item) => item.id)), knownPoolTags }),
    validateLoreCatalog(merged.loreData, { mode: 'existing' }), validateSeriesCatalog(merged.seriesCatalog),
    validatePetAndLoreConsistency(merged.petsData, merged.loreData)];
  for (const check of checks) errors.push(...check.errors);
  const pools = validatePoolContent(merged.poolsData, { pets: merged.petsData.pets, previousPoolsData: official.poolsData });
  errors.push(...pools.errors);
  for (const previous of official.poolsData.pools) for (const unlocked of [false, true]) {
    const effective = resolveEffectivePool(previous, { unlocked });
    const ids = (pets) => getEligiblePetsForPool(pets, effective).map((pet) => pet.id).sort();
    if (!equal(ids(official.petsData.pets), ids(merged.petsData.pets))) {
      errors.push(problem('PUBLISHED_CANDIDATES_CHANGED', 'New content changed published pool candidates', previous.id));
    }
  }
  if (index >= 3) for (const pet of plan.pets) {
    const prompt = promptsData.prompts?.[pet.petId];
    if (!object(prompt) || !plain(prompt.prompt) || typeof prompt.negativePrompt !== 'string') {
      errors.push(problem('PROMPT_REQUIRED', 'Every pet needs prompt and negativePrompt strings', pet.petId));
    }
  }
  if (index >= 4) for (const pet of plan.pets) {
    const relative = `images/${pet.petId}.png`;
    try {
      const bytes = await fs.readFile(await contained(dir, relative));
      const metadata = await inspectPetImage(bytes);
      if (metadata.width < 512 || bytes.length > 5 * 1024 * 1024) errors.push(problem('IMAGE_LIMIT', 'PNG must be at least 512px and at most 5MB', relative));
      if (metadata.width > 2048 || bytes.length > 2 * 1024 * 1024) warnings.push(warning('IMAGE_LARGE', 'Review large image dimensions or byte size', relative));
      try { await fs.access(await contained(root, `assets/pets/${pet.petId}.png`)); errors.push(problem('IMAGE_COLLISION', 'Published image cannot be overwritten', pet.petId)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    } catch (error) { errors.push(problem(error.code || 'IMAGE_INVALID', error.message, relative)); }
  }
  const changes = Object.fromEntries([
    ['pets', official.petsData.pets, merged.petsData.pets], ['pools', official.poolsData.pools, merged.poolsData.pools],
    ['lore', official.loreData.lore, merged.loreData.lore], ['series', official.seriesCatalog.series, merged.seriesCatalog.series],
  ].map(([key, before, after]) => {
    const previous = new Map(before.map((item) => [item.id, item]));
    const next = new Map(after.map((item) => [item.id, item]));
    return [key, { added: after.filter((item) => !previous.has(item.id)).map((item) => item.id),
      changed: after.filter((item) => previous.has(item.id) && !equal(item, previous.get(item.id))).map((item) => item.id),
      removed: before.filter((item) => !next.has(item.id)).map((item) => item.id) }];
  }));
  return { ok: !errors.length, errors, warnings, previews: pools.previews, changes, merged, workspace: { dir, state, brief, plan, petsData } };
}

export async function validatePipelineWorkspace(root, id) {
  try {
    const result = await validateThrough(root, id, 'images');
    return { ok: result.ok, errors: result.errors, warnings: result.warnings, previews: result.previews, changes: result.changes };
  } catch (error) { return { ok: false, errors: [problem(error.code || 'VALIDATION_FAILED', error.message)], warnings: [] }; }
}

export async function approvePipelineStage(root, id, stage, exactHash, { acknowledgeWarnings = false, reviewer = 'local-author' } = {}) {
  assert(PIPELINE_STAGES.includes(stage), 'STAGE_INVALID', 'Unknown approval stage');
  return locked(root, async () => {
    const status = await loadPipelineStatus(root, id);
    const index = PIPELINE_STAGES.indexOf(stage);
    const current = status.stages[index];
    assert(!status.errors.length && status.stages.slice(0, index).every((item) => item.approved), 'UPSTREAM_UNAPPROVED', 'Approve current upstream hashes first');
    assert(current.outputHash && exactHash === current.outputHash, 'HASH_MISMATCH', 'Approval must name the exact current review hash');
    if (current.approved) return status;
    const validation = await validateThrough(root, id, stage);
    assert(validation.ok, 'STAGE_INVALID', validation.errors.map((entry) => entry.message).join('; '));
    assert(!validation.warnings.length || acknowledgeWarnings, 'WARNINGS_UNREVIEWED', 'Review and acknowledge the current warnings');
    const { dir, state } = await loadWorkspace(root, id);
    const snapshot = await archiveStage(dir, current);
    const refreshed = await loadPipelineStatus(root, id);
    assert(refreshed.stages[index].outputHash === exactHash && !refreshed.errors.length, 'INPUT_CHANGED', 'Input changed during approval');
    state.history.push({ stage, inputHash: current.inputHash, outputHash: exactHash, files: current.files,
      toolsHash: status.toolsHash, snapshot, reviewedWarnings: validation.warnings, approvedAt: new Date().toISOString(), reviewer });
    await writeJson(dir, 'pipeline.json', state);
    return loadPipelineStatus(root, id);
  });
}

async function listFiles(root, relative = '') {
  const dir = relative ? await contained(root, relative) : root;
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new PipelineError('UNSAFE_PATH', 'Candidate cannot contain symbolic links');
    if (entry.isDirectory()) files.push(...await listFiles(root, file));
    else { await contained(root, file); files.push(file); }
  }
  return files.sort();
}
async function verifyCandidate(dir, expectedId) {
  const manifest = await readJson(dir, 'candidate.json');
  assert(manifest.schemaVersion === 1 && manifest.candidateId === expectedId && manifest.releaseReady === false,
    'CANDIDATE_INVALID', 'Existing candidate manifest differs');
  const files = (await listFiles(dir)).filter((file) => file !== 'candidate.json');
  assert(equal(files, Object.keys(manifest.files).sort()), 'CANDIDATE_INVALID', 'Candidate file inventory differs');
  assert(equal(await hashFiles(dir, files), manifest.files), 'CANDIDATE_INVALID', 'Candidate bytes differ from manifest');
  return manifest;
}

/** All writes stay in a new staging directory. No publisher or official write path is called. */
export async function stagePoolCandidate(root, id, { dryRun = false } = {}) {
  const prepare = async () => {
    const status = await loadPipelineStatus(root, id);
    assert(status.readyToStage, 'UNAPPROVED', 'Every current stage must be approved and the baseline unchanged');
    const validation = await validateThrough(root, id, 'images');
    assert(validation.ok, 'VALIDATION_FAILED', validation.errors.map((entry) => entry.message).join('; '));
    const { dir, state } = validation.workspace;
    const receipts = PIPELINE_STAGES.map((stage) => state.history.filter((entry) => entry.stage === stage).at(-1));
    const candidateId = hash(jsonText({ baseline: state.baseline.hash, toolsHash: status.toolsHash, receipts }));
    const finalDir = path.join(dir, 'staging', candidateId);
    const report = { candidateId, candidateDir: finalDir, releaseReady: false, baselineHash: state.baseline.hash,
      warnings: validation.warnings, previews: validation.previews, changes: validation.changes };
    if (dryRun) return { ...report, dryRun: true };
    const staging = await contained(dir, 'staging', { allowMissing: true });
    await fs.mkdir(staging, { recursive: true });
    let exists = false;
    try { await fs.access(finalDir); await contained(dir, `staging/${candidateId}`); exists = true; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const temporary = await contained(staging, `.building-${candidateId}-${randomUUID()}`, { allowMissing: true });
    await fs.mkdir(temporary);
    try {
      const imageStage = status.stages.find((stage) => stage.stage === 'images');
      for (const pet of validation.workspace.petsData.pets) {
        const source = `images/${pet.id}.png`;
        const bytes = await fs.readFile(await contained(dir, source));
        assert(hash(bytes) === imageStage.files[source], 'INPUT_CHANGED', 'Approved image changed during staging');
        const destination = await contained(temporary, pet.image, { allowMissing: true });
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.writeFile(destination, bytes, { flag: 'wx' });
      }
      const built = await buildPetImages({ root: temporary, catalog: validation.workspace.petsData, mode: 'build' });
      await buildPetImages({ root: temporary, catalog: built.catalog, mode: 'check' });
      const newPets = new Map(built.catalog.pets.map((pet) => [pet.id, pet]));
      const merged = validation.merged;
      merged.petsData.pets = merged.petsData.pets.map((pet) => newPets.get(pet.id) || pet);
      await writeJson(temporary, 'catalog.json', { schemaVersion: 1, ...merged });
      await writeJson(temporary, 'validation.json', { schemaVersion: 1, ok: true, errors: [], warnings: validation.warnings,
        previews: validation.previews, changes: validation.changes,
        imageBuild: { version: PET_IMAGE_BUILD_VERSION, options: PET_IMAGE_OPTIONS, encoder: sharp.versions } });
      const snapshots = [];
      for (const receipt of state.history) {
        const bytes = await readApprovalSnapshot(dir, receipt);
        snapshots.push({ stage: receipt.stage, outputHash: receipt.outputHash, files: Object.fromEntries(Object.entries(bytes)
          .map(([file, data]) => [file, { sha256: hash(data), ...(receipt.stage === 'images' ? {} : { encoding: 'base64', content: data.toString('base64') }) }])) });
      }
      await writeJson(temporary, 'approvals.json', { schemaVersion: 1, baseline: state.baseline, toolsHash: status.toolsHash,
        receipts, history: state.history, snapshots, brief: validation.workspace.brief, plan: validation.workspace.plan });
      const refreshed = await loadPipelineStatus(root, id);
      assert(refreshed.readyToStage && equal(refreshed.stages.map((stage) => stage.outputHash), status.stages.map((stage) => stage.outputHash)),
        'INPUT_CHANGED', 'Workspace changed during staging');
      const files = await hashFiles(temporary, await listFiles(temporary));
      const manifest = { schemaVersion: 1, candidateId, releaseReady: false, baselineHash: state.baseline.hash, files };
      await writeJson(temporary, 'candidate.json', manifest);
      await verifyCandidate(temporary, candidateId);
      if (exists) {
        // A self-consistent manifest is insufficient: reproduce from approved inputs,
        // including encoder output, and compare every byte before reusing a candidate.
        const existing = await verifyCandidate(finalDir, candidateId);
        assert(equal(existing, manifest), 'CANDIDATE_CHANGED', 'Candidate differs from the reproduced approved inputs');
        await fs.rm(await contained(staging, path.basename(temporary)), { recursive: true });
        return { ...report, reused: true, manifest };
      }
      await fs.rename(temporary, finalDir);
      return { ...report, reused: false, manifest };
    } catch (error) {
      // Delete only this invocation's checked temporary directory, never a completed candidate.
      const checked = await contained(staging, path.basename(temporary));
      assert(checked === temporary && path.basename(checked).startsWith('.building-'), 'UNSAFE_PATH', 'Unsafe cleanup target');
      await fs.rm(checked, { recursive: true, force: true });
      throw error;
    }
  };
  return dryRun ? prepare() : locked(root, prepare);
}
