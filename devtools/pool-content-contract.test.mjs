import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizePoolDefinition, normalizeUnlockExpansion, resolveEffectivePool,
  resolveDrawCost, resolveUnlockGrantId, resolveUnlockRewardSource,
  resolveActivePool, validatePoolContent, resolvePetRevealKey,
  resolvePoolPresentationModel, PoolContentError,
} from '../src/poolContentContract.js';
import { getEligiblePetsForPool } from '../src/petPoolFilter.js';
import { createPoolContentFixtures } from './fixtures/pool-content-fixtures.mjs';

const readJson = (relative) => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
const official = readJson('../data/pools.json');
const officialPets = readJson('../data/pets.json').pets;
const standard = official.pools.find((pool) => pool.id === 'standard');
const eternal = official.pools.find((pool) => pool.id === 'eternal_slumber_bloom');
const clone = (value) => structuredClone(value);
function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
function expectCode(catalog, pets, code, options = {}) {
  const result = validatePoolContent(catalog, { pets, ...options });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((entry) => entry.code === code), `${code}: ${JSON.stringify(result.errors)}`);
  assert.ok(result.errors.every((entry) => entry.level === 'error' && entry.path && entry.message));
}

test('legacy golden economics and locked/unlocked candidates are unchanged', () => {
  const result = validatePoolContent(official, { pets: officialPets });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(result.previews, [
    { poolId: 'standard', locked: 56, unlocked: 56 },
    { poolId: 'eternal_slumber_bloom', locked: 12, unlocked: 16 },
  ]);
  for (const raw of [standard, eternal]) {
    const pool = normalizePoolDefinition(raw);
    assert.deepEqual(pool.rates, { N: 0.55, R: 0.30, SR: 0.10, SSR: 0.03, UR: 0.02 });
    assert.deepEqual(pool.pity, { ssr: 30, ur: 100 });
    assert.equal(resolveDrawCost(pool, 1), 100);
    assert.equal(resolveDrawCost(pool, 10), 1000);
    assert.deepEqual(normalizePoolDefinition(pool), pool, 'normalization is idempotent');
  }
});

test('legacy presentation preserves identity, heroes, cast order, and Chinese copy', () => {
  const before = resolvePoolPresentationModel(eternal, officialPets, { lifetimeDraws: 19 });
  assert.equal(before.presentation.themeKey, 'dream_bloom');
  assert.equal(before.cssTheme, 'eternal_slumber_bloom');
  assert.equal(before.presentation.debutLabel, '永眠花海登場');
  assert.deepEqual(before.presentation.debutLines, ['月皇花', '已於長夜中', '甦醒']);
  assert.equal(before.hero.id, 'pet_ur05');
  assert.deepEqual(before.featured.map((pet) => pet.id), ['pet_ssr05', 'pet_ssr06']);
  assert.deepEqual(before.unlock.previewPets.map((pet) => pet.id), ['pet_r16', 'pet_sr12', 'pet_ssr07', 'pet_ur06']);
  assert.equal(before.unlock.progressText, '夢塵共鳴 19／20');
  assert.equal(before.unlock.description, '完成 20 次永眠花海召喚，解鎖 4 位晨醒角色，並固定獲得曉露花蝟。');
  assert.equal(before.unlock.countsText, '目前候選：12　解鎖後候選：16');
  assert.equal(before.unlock.grantId, 'awakening_reward:eternal_slumber_bloom:20');
  assert.equal(before.unlock.rewardSource, 'morning_garden_unlock_reward');
  const after = resolvePoolPresentationModel(eternal, officialPets, { lifetimeDraws: 20, unlocked: true });
  assert.deepEqual(after.heroes.map((pet) => pet.id), ['pet_ur05', 'pet_ur06']);
  assert.deepEqual(after.featured.map((pet) => pet.id), ['pet_ssr07', 'pet_sr12', 'pet_r16']);
  assert.equal(after.unlock.progressText, '晨醒花庭已解鎖');
  assert.equal(after.unlock.description, '沉眠有歸，甦醒有時。');
});

test('two unpublished pools with the same expansion key have independent grants and economics', () => {
  const { catalog, pets, alpha, beta } = createPoolContentFixtures();
  assert.equal(validatePoolContent(catalog, { pets }).ok, true);
  assert.equal(normalizeUnlockExpansion(alpha).key, 'first_expansion');
  assert.equal(normalizeUnlockExpansion(beta).key, 'first_expansion');
  assert.equal(resolveDrawCost(alpha, 10), 1000);
  assert.equal(resolveDrawCost(beta, 10), 750);
  assert.equal(resolveUnlockGrantId(alpha.id, alpha.unlockExpansion), 'awakening_reward:fixture_alpha:first_expansion');
  assert.equal(resolveUnlockGrantId(beta.id, beta.unlockExpansion), 'awakening_reward:fixture_beta:first_expansion');
  const first = resolvePoolPresentationModel(alpha, pets, { unlocked: true, lifetimeDraws: 20 });
  const second = resolvePoolPresentationModel(beta, pets, { unlocked: false, lifetimeDraws: 2 });
  assert.equal(first.unlock.rewardPet.rarity, 'R');
  assert.equal(second.unlock.rewardPet.rarity, 'SSR');
  assert.equal(first.counts.effective, 7);
  assert.equal(second.counts.effective, 5);
  assert.equal(second.presentation, null, 'an unthemed pool retains an unlock view');
  assert.equal(second.unlock.previewPets.length, 2);
  assert.equal(second.unlock.rewardSource, 'pool_unlock_reward:fixture_beta:first_expansion');
});

test('identity survives threshold changes and different pools cannot inherit legacy grants', () => {
  assert.equal(resolveUnlockGrantId(eternal.id, { ...eternal.unlockExpansion, threshold: 25 }), 'awakening_reward:eternal_slumber_bloom:20');
  assert.equal(resolveUnlockRewardSource(eternal.id, eternal.unlockExpansion), 'morning_garden_unlock_reward');
  assert.equal(resolveUnlockGrantId('fixture_alpha', eternal.unlockExpansion), 'awakening_reward:fixture_alpha:morning_garden');
});

test('effective filtering is OR with no duplicates and never changes the input snapshot', () => {
  const { alpha, pets } = createPoolContentFixtures();
  pets[0].poolTags.push('fixture_alpha_expanded');
  deepFreeze(alpha);
  deepFreeze(pets);
  const before = getEligiblePetsForPool(pets, resolveEffectivePool(alpha, { unlocked: false }));
  const after = getEligiblePetsForPool(pets, resolveEffectivePool(alpha, { unlocked: true }));
  assert.equal(before.length, 5);
  assert.equal(after.length, 7);
  assert.deepEqual(alpha.petFilter.poolTags, ['fixture_alpha']);
  assert.equal(resolveEffectivePool(null, {}), null);
});

test('visual lock delays only presentation after a committed unlock', () => {
  const model = resolvePoolPresentationModel(eternal, officialPets,
    { unlocked: true, lifetimeDraws: 20 }, { visualLocked: true });
  assert.equal(model.unlocked, true);
  assert.equal(model.awakened, false);
  assert.equal(model.phase, 'slumber');
  assert.equal(model.eligiblePets.length, 16);
  assert.deepEqual(model.heroes.map((pet) => pet.id), ['pet_ur05']);
  assert.deepEqual(model.featured.map((pet) => pet.id), ['pet_ssr05', 'pet_ssr06']);
});

test('zero active pools do not fall back to inactive content', () => {
  const { catalog } = createPoolContentFixtures();
  assert.equal(resolveActivePool(catalog, 'fixture_beta').id, 'fixture_beta');
  assert.equal(resolveActivePool(catalog, 'missing').id, 'fixture_alpha');
  catalog.pools.forEach((pool) => { pool.active = false; });
  assert.equal(resolveActivePool(catalog, 'fixture_alpha'), null);
  assert.equal(resolveActivePool({ schemaVersion: 1, pools: [] }), null);
});

test('legacy special reveals and explicit templates are reusable without pool identity', () => {
  assert.equal(resolvePetRevealKey({ id: 'pet_ur05', rarity: 'UR' }), 'moon');
  assert.equal(resolvePetRevealKey({ id: 'pet_ur06', rarity: 'UR' }), 'petal');
  assert.equal(resolvePetRevealKey({ id: 'pet_ur900', rarity: 'UR', presentation: { revealKey: 'moon' } }), 'moon');
  assert.equal(resolvePetRevealKey({ id: 'pet_ur900', rarity: 'UR' }), 'ur');
  assert.equal(resolvePetRevealKey({ id: 'pet_ssr900', rarity: 'SSR' }), 'ssr');
  assert.equal(resolvePetRevealKey({ id: 'pet_r900', rarity: 'R' }), null);
  assert.equal(resolvePetRevealKey({ id: 'constructor', rarity: 'UR' }), 'ur');
  assert.throws(() => resolvePetRevealKey({ rarity: 'R', presentation: { revealKey: 'moon' } }), PoolContentError);
});

const malformed = [
  ['POOL_COST_INVALID', (pool) => { delete pool.cost; }],
  ['POOL_COST_INVALID', (pool) => { pool.cost = 0; }],
  ['POOL_COST_INVALID', (pool) => { pool.cost = Number.MAX_SAFE_INTEGER; }],
  ['POOL_COST_INVALID', (pool) => { pool.cost = '100'; }],
  ['POOL_RATE_INVALID', (pool) => { pool.rates.UR = Infinity; }],
  ['POOL_RATE_INVALID', (pool) => { pool.rates.N = NaN; }],
  ['POOL_RATE_SUM', (pool) => { pool.rates = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 }; }],
  ['POOL_RATE_SUM', (pool) => { pool.rates.N = 0.5; }],
  ['POOL_PITY_INVALID', (pool) => { delete pool.pity; }],
  ['POOL_PITY_INVALID', (pool) => { pool.pity.ur = 1.5; }],
  ['POOL_ACTIVE_INVALID', (pool) => { pool.active = 'true'; }],
  ['POOL_ID_INVALID', (pool) => { pool.id = 'constructor'; }],
  ['POOL_LIST_INVALID', (pool) => { pool.petFilter.poolTags = []; }],
  ['POOL_LIST_DUPLICATE', (pool) => { pool.petFilter.poolTags.push(pool.petFilter.poolTags[0]); }],
  ['POOL_LIST_ENTRY', (pool) => { pool.petFilter.poolTags = ['x"><img>']; }],
  ['POOL_THEME_UNKNOWN', (pool) => { pool.presentation.themeKey = 'custom_script'; }],
  ['POOL_ANIMATION_UNKNOWN', (pool) => { pool.presentation.animationKey = 'constructor'; }],
  ['POOL_THRESHOLD_INVALID', (pool) => { pool.unlockExpansion.threshold = 0.5; }],
  ['POOL_PROGRESS_SCOPE', (pool) => { pool.unlockExpansion.progressScope = 'all_pool_draws'; }],
  ['POOL_EXPANSION_KEY', (pool) => { pool.unlockExpansion.key = '__proto__'; }],
  ['POOL_UNLOCK_ANIMATION', (pool) => { pool.unlockExpansion.animationKey = 'unknown'; }],
  ['POOL_REFERENCE_MISSING', (pool) => { pool.unlockExpansion.rewardPetId = 'pet_r9999'; }],
  ['POOL_REFERENCE_PHASE', (pool) => { pool.unlockExpansion.rewardPetId = 'pet_r900'; }],
  ['POOL_REFERENCE_PHASE', (pool) => { pool.presentation.heroPetId = 'pet_ur901'; }],
  ['POOL_EXPANSION_EMPTY', (pool) => { pool.unlockExpansion.extraPoolTags = ['fixture_alpha']; }],
];
for (const [index, [code, mutate]] of malformed.entries()) {
  test(`malformed pool ${index + 1}: ${code}`, () => {
    const { catalog, pets, alpha } = createPoolContentFixtures();
    mutate(alpha);
    expectCode(catalog, pets, code);
  });
}

test('draw count, malformed direct normalization, schema version, and catalog failures', () => {
  const { catalog, pets, alpha } = createPoolContentFixtures();
  for (const count of [0, -1, 2, 1.5, '10', NaN]) assert.throws(() => resolveDrawCost(alpha, count), PoolContentError);
  assert.throws(() => normalizePoolDefinition(null), PoolContentError);
  assert.throws(() => resolveUnlockGrantId('__proto__', alpha.unlockExpansion), PoolContentError);
  assert.throws(() => normalizePoolDefinition({ ...alpha, cost: -1 }), PoolContentError);
  expectCode({ ...catalog, schemaVersion: 99 }, pets, 'POOL_SCHEMA_VERSION');
  expectCode({ pools: null }, pets, 'POOL_CATALOG_INVALID');
  expectCode({ pools: [null] }, pets, 'POOL_INVALID');
  expectCode({ pools: [alpha, alpha] }, pets, 'POOL_ID_DUPLICATE');
  expectCode(catalog, undefined, 'POOL_PETS_REQUIRED');
  expectCode(catalog, [...pets, pets[0]], 'POOL_PET_ID_DUPLICATE');
});

test('normal rates and pity reachable rarities each need valid candidates, including inactive pools', () => {
  const { catalog, pets, alpha } = createPoolContentFixtures();
  alpha.active = false;
  expectCode(catalog, pets.filter((pet) => pet.id !== 'pet_n900'), 'POOL_EMPTY_RARITY');
  alpha.rates.N += alpha.rates.UR;
  alpha.rates.UR = 0;
  expectCode(catalog, pets.filter((pet) => pet.id !== 'pet_ur900'), 'POOL_EMPTY_RARITY');
  alpha.rates.N += alpha.rates.SSR;
  alpha.rates.SSR = 0;
  expectCode(catalog, pets, 'POOL_SSR_PITY_RATE');
});

test('presentation input remains inert plain text and unknown pet reveal templates are rejected', () => {
  const { catalog, pets, alpha } = createPoolContentFixtures();
  alpha.presentation.eyebrow = '<img src=x onerror=alert(1)>';
  const model = resolvePoolPresentationModel(alpha, pets);
  assert.equal(model.presentation.eyebrow, '<img src=x onerror=alert(1)>');
  // The pure model deliberately returns text; DOM integration must use textContent, not HTML.
  pets[0].presentation = { revealKey: 'script' };
  expectCode(catalog, pets, 'PET_REVEAL_INVALID');
  pets[0].presentation = { revealKey: 'ssr' };
  expectCode(catalog, pets, 'PET_REVEAL_INVALID');
});

test('published identity cannot disappear or silently change its gift; disabling is allowed', () => {
  const { catalog, pets } = createPoolContentFixtures();
  const previousPoolsData = clone(catalog);
  catalog.pools[0].active = false;
  catalog.pools[0].unlockExpansion.threshold = 25;
  assert.equal(validatePoolContent(catalog, { pets, previousPoolsData }).ok, true);
  catalog.pools[0].unlockExpansion.key = 'second';
  expectCode(catalog, pets, 'POOL_EXPANSION_IDENTITY_CHANGED', { previousPoolsData });
  catalog.pools[0] = clone(previousPoolsData.pools[0]);
  catalog.pools[0].unlockExpansion.rewardPetId = 'pet_ur901';
  expectCode(catalog, pets, 'POOL_EXPANSION_IDENTITY_CHANGED', { previousPoolsData });
  catalog.pools.shift();
  expectCode(catalog, pets, 'POOL_REMOVED', { previousPoolsData });
});

test('all public model builders accept deeply frozen content and leave original catalog unchanged', () => {
  const { catalog, pets, alpha } = createPoolContentFixtures();
  const snapshot = clone({ catalog, pets });
  deepFreeze(catalog);
  deepFreeze(pets);
  assert.equal(validatePoolContent(catalog, { pets }).ok, true);
  resolvePoolPresentationModel(alpha, pets, Object.freeze({ unlocked: true, lifetimeDraws: 20 }));
  resolveEffectivePool(alpha, { unlocked: true });
  assert.deepEqual({ catalog, pets }, snapshot);
});

test('validator returns issues, without throwing, for malformed JSON-shaped field types', () => {
  const invalidValues = [null, [], {}, { toString: {} }, true, 0, 'bad'];
  for (const value of invalidValues) {
    for (const field of ['rates', 'presentation', 'unlockExpansion']) {
      const { catalog, pets, alpha } = createPoolContentFixtures();
      alpha[field] = value;
      assert.doesNotThrow(() => validatePoolContent(catalog, { pets }));
    }
    const { catalog, pets, alpha } = createPoolContentFixtures();
    alpha.presentation.themeKey = value;
    alpha.presentation.animationKey = value;
    alpha.unlockExpansion.animationKey = value;
    pets[0].presentation = { revealKey: value };
    assert.doesNotThrow(() => validatePoolContent(catalog, { pets }));
  }
  const { catalog, pets, alpha } = createPoolContentFixtures();
  alpha.rates.N = 1n;
  assert.doesNotThrow(() => expectCode(catalog, pets, 'POOL_RATE_INVALID'));
});

test('an unused tag is an error even when another tag supplies valid candidates', () => {
  const { catalog, pets, alpha } = createPoolContentFixtures();
  alpha.petFilter.poolTags.push('misspelled_tag');
  expectCode(catalog, pets, 'POOL_TAG_UNUSED');
  alpha.petFilter.poolTags.pop();
  alpha.unlockExpansion.extraPoolTags.push('misspelled_expansion');
  expectCode(catalog, pets, 'POOL_TAG_UNUSED');
});

// Integration boundaries: these tests exercise the real schema/CLI/controller exports.
const schema = await import('../src/petDataSchema.js');
const presentation = await import('../src/poolPresentation.js');
const reveal = await import('../src/summonRevealService.js');
const { resolvePetRevealPresentation } = await import('../src/poolContentContract.js');

test('legacy presentation adapters use canonical registry and reject unknown content', () => {
  assert.equal(presentation.normalizePoolPresentation(eternal).themeKey, 'dream_bloom');
  assert.equal(presentation.getPoolThemeAttr(eternal), 'eternal_slumber_bloom');
  assert.equal(presentation.shouldUseThemedSummon(eternal), true);
  assert.equal(presentation.normalizePoolPresentation(standard), null);
  assert.equal(presentation.normalizePoolPresentation({ ...eternal, cost: -1 }), null);
});

test('reveal controller reuses explicit metadata and preserves legacy captions', () => {
  const pet = { id: 'pet_ur900', rarity: 'UR', presentation: { revealKey: 'moon', revealCaption: '<b>新月</b>' } };
  assert.equal(reveal.resolveRevealTheme(pet, { pet, rarity: 'UR' }), 'moon');
  assert.deepEqual(resolvePetRevealPresentation(pet), { key: 'moon', caption: '<b>新月</b>' });
  assert.equal(resolvePetRevealPresentation({ id: 'pet_ur05', rarity: 'UR' }).caption, '月下沉眠 · 花庭主人');
  assert.equal(resolvePetRevealPresentation({ id: 'pet_ur06', rarity: 'UR' }).caption, '晨曦綻放 · 花庭主人');
  assert.equal(resolvePetRevealPresentation({ id: 'pet_ur900', rarity: 'UR', presentation: { revealKey: 'petal' } }).caption, '傳說夥伴降臨');
  assert.throws(() => resolvePetRevealPresentation({ ...pet, presentation: { revealKey: 'moon', revealCaption: {} } }), PoolContentError);
});

test('shared schema forwards all pool contract errors and preserves pet reveal metadata', () => {
  const { catalog, pets, alpha } = createPoolContentFixtures();
  alpha.cost = 0;
  assert.ok(schema.validatePoolCatalog(catalog, { pets }).errors.some((error) => error.code === 'POOL_COST_INVALID'));
  const result = schema.validatePetPackage({
    seriesMeta: { seriesId: 'fixture', seriesName: 'Fixture' }, petsData: { pets: [] }, loreData: { lore: [] },
    officialPets: pets, officialLore: [], poolsData: catalog,
  });
  assert.ok(result.errors.some((error) => error.code === 'POOL_COST_INVALID'), 'Package validation dropped a contract error when no legacy matching callback was supplied');
  const pet = { ...officialPets.find((item) => item.rarity === 'UR'), presentation: { revealKey: 'moon', revealCaption: 'Moon' } };
  assert.deepEqual(schema.normalizePetForValidation(pet).presentation, pet.presentation);
  assert.equal(schema.validatePet(pet).ok, true);
  assert.equal(schema.validatePet({ ...pet, presentation: { revealKey: 'unknown' } }).ok, false);
});

test('Builder preview keeps legacy shape and adds effective unlocked counts without throwing on errors', () => {
  const preview = schema.buildPoolPreview(official, officialPets, officialPets, getEligiblePetsForPool);
  assert.equal(preview[1].before.total, 12);
  assert.equal(preview[1].unlocked.before.total, 16);
  assert.equal(preview[1].unlocked.after.total, 16);
  const malformed = clone(official);
  malformed.pools[1].cost = -1;
  const invalid = schema.buildPoolPreview(malformed, officialPets, officialPets, getEligiblePetsForPool);
  assert.ok(invalid[1].errors.some((error) => error.code === 'POOL_COST_INVALID'));
});

test('read-only pool CLI reports valid official content and exits nonzero for wrong catalog shape', async () => {
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const cli = fileURLToPath(new URL('../scripts/validate-pool-content.mjs', import.meta.url));
  const valid = spawnSync(process.execPath, [cli], { encoding: 'utf8' });
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(JSON.parse(valid.stdout).ok, true);
  const invalid = spawnSync(process.execPath, [cli, fileURLToPath(new URL('../data/pets.json', import.meta.url))], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.equal(JSON.parse(invalid.stdout).ok, false);
});
