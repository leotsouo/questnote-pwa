import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { planGachaTransaction, normalizeGachaStats } from '../src/gachaTransactionCore.js';
import { createCollectionEntry } from '../src/collectionService.js';
import { normalizePoolUnlockState, normalizeIdempotentGrants, applyUnlockGift } from '../src/poolUnlockCore.js';
import { normalizeUnlockExpansion, resolveUnlockGrantId } from '../src/poolContentContract.js';
import { createPoolContentFixtures } from './fixtures/pool-content-fixtures.mjs';

const fixedNow = '2026-09-23T00:00:00.000Z';
function scenario(overrides = {}) {
  const fixture = createPoolContentFixtures();
  return { allPets: fixture.pets, poolsData: fixture.catalog, selectedPoolId: fixture.alpha.id,
    count: 1, wallet: { key: 'wallet', stardust: 10000, adventureEnergy: 7, materials: { forest_leaf: 9 } },
    stats: null, unlockState: null, grants: null, collection: [], rng: () => 0, now: fixedNow, ...overrides };
}
function nextInput(input, plan, overrides = {}) {
  return { ...input, wallet: plan.wallet, stats: plan.stats, unlockState: plan.unlockState,
    grants: plan.grants, collection: plan.collection, ...overrides };
}
const freeze = (value) => {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
};

test('single and ten preserve public result shapes, wallet fields, and within-ten duplicates', () => {
  const input = scenario();
  const one = planGachaTransaction(input);
  assert.equal(one.wallet.stardust, 9900);
  assert.equal(one.wallet.adventureEnergy, 7);
  assert.equal(one.wallet.materials.forest_leaf, 9);
  assert.deepEqual(Object.keys(one.result).sort(), ['pet', 'rarity', 'isNew', 'fragmentsGained', 'triggeredPity', 'pool', 'stats', 'unlockProgress'].sort());
  const ten = planGachaTransaction(scenario({ count: 10 }));
  assert.equal(ten.wallet.stardust, 9000);
  assert.equal(ten.stats.totalPulls, 10);
  assert.equal(ten.stats.tenPullCount, 1);
  assert.equal(ten.result.results[0].isNew, true);
  assert.ok(ten.result.results.slice(1).every((pull) => !pull.isNew && pull.duplicateFragments === 1));
  assert.deepEqual(ten.result.summary, { newCount: 1, duplicateCount: 9, totalFragments: 9, highestRarity: 'N' });
  assert.equal(ten.result.updatedGachaStats, ten.stats);
  assert.equal(ten.result.updatedWallet, ten.wallet);
});

test('SSR and UR pity boundaries, resets, legacy standard mirrors, and other pools stay independent', () => {
  const input = scenario();
  const stats = normalizeGachaStats({ totalPulls: 50, ssrPity: 8, urPity: 19,
    poolPity: { fixture_alpha: { ssrPity: 29, urPity: 60 }, fixture_beta: { ssrPity: 2, urPity: 3 } } });
  const ssr = planGachaTransaction({ ...input, stats, rng: () => 0.9 });
  assert.equal(ssr.result.rarity, 'SSR');
  assert.equal(ssr.result.triggeredPity, true);
  assert.deepEqual(ssr.stats.poolPity.fixture_alpha, { ssrPity: 0, urPity: 61 });
  assert.deepEqual(ssr.stats.poolPity.fixture_beta, { ssrPity: 2, urPity: 3 });
  assert.equal(ssr.stats.ssrPity, 8);
  assert.equal(ssr.stats.urPity, 19);
  stats.poolPity.fixture_alpha.urPity = 99;
  const ur = planGachaTransaction({ ...input, stats });
  assert.equal(ur.result.rarity, 'UR');
  assert.deepEqual(ur.stats.poolPity.fixture_alpha, { ssrPity: 0, urPity: 0 });
  const standardInput = scenario();
  standardInput.poolsData.pools[0].id = 'standard';
  const standard = planGachaTransaction({ ...standardInput, selectedPoolId: 'standard', stats: { ssrPity: 29, urPity: 99 } });
  assert.equal(standard.stats.ssrPity, 0);
  assert.equal(standard.stats.urPity, 0);
});

test('every rarity uses its existing duplicate compensation without erasing progression fields', () => {
  for (const [rarity, roll, fragments] of [['N', 0, 1], ['R', 0.6, 2], ['SR', 0.9, 5], ['SSR', 0.96, 10], ['UR', 0.99, 20]]) {
    const input = scenario({ rng: () => roll });
    const pet = input.allPets.find((pet) => pet.rarity === rarity && pet.poolTags.includes('fixture_alpha'));
    const entry = { ...createCollectionEntry(pet.id, fixedNow), stars: 4, fragments: 12, nickname: '名字', bondExp: 300,
      bondLevel: 4, isCompanion: true, lastPettedAt: fixedNow };
    const plan = planGachaTransaction({ ...input, collection: [entry] });
    assert.equal(plan.result.fragmentsGained, fragments);
    assert.equal(plan.collection[0].fragments, 12 + fragments);
    for (const key of ['stars', 'nickname', 'bondExp', 'bondLevel', 'isCompanion', 'lastPettedAt', 'obtainedAt']) {
      assert.equal(plan.collection[0][key], entry[key]);
    }
  }
});

test('threshold single is locked; the next single can select an expanded candidate', () => {
  const input = scenario({ unlockState: { byPool: { fixture_alpha: { lifetimeDraws: 19 } } }, rng: () => 0.99 });
  const atThreshold = planGachaTransaction(input);
  assert.equal(atThreshold.result.pet.id, 'pet_ur900');
  assert.equal(atThreshold.result.unlockProgress.justUnlocked, true);
  assert.equal(atThreshold.result.unlockProgress.reward.petId, 'pet_r901');
  assert.equal(atThreshold.stats.totalPulls, 1);
  const next = planGachaTransaction(nextInput(input, atThreshold));
  assert.equal(next.result.pet.id, 'pet_ur901');
  assert.equal(next.result.unlockProgress.justUnlocked, false);
  assert.equal(next.result.unlockProgress.reward, null);
  assert.equal(next.grants.claimedIds.length, 1);
});

test('ten freezes every candidate before unlock and grants one actual-rarity gift after its results', () => {
  const input = scenario({ selectedPoolId: 'fixture_beta', count: 10,
    collection: [{ ...createCollectionEntry('pet_ssr911', fixedNow), fragments: 4 }], rng: () => 0.99 });
  const plan = planGachaTransaction(input);
  assert.equal(plan.result.cost, 750);
  assert.ok(plan.result.results.every((pull) => pull.petId === 'pet_ur910'));
  assert.equal(plan.result.unlockProgress.entry.lifetimeDraws, 10);
  assert.equal(plan.result.unlockProgress.reward.fragmentsGained, 10);
  assert.equal(plan.collection.find((entry) => entry.petId === 'pet_ssr911').fragments, 14);
  assert.equal(plan.stats.totalPulls, 10);
  assert.equal(plan.result.summary.totalFragments, 180);
  assert.deepEqual(plan.grants.claimedIds, ['awakening_reward:fixture_beta:first_expansion']);
});

test('two new pools sharing expansion key keep separate gifts and preserve the legacy grant identity', async () => {
  const input = scenario({ count: 10, unlockState: { byPool: { fixture_alpha: { lifetimeDraws: 19 } } } });
  const alpha = planGachaTransaction(input);
  const beta = planGachaTransaction(nextInput(input, alpha, { selectedPoolId: 'fixture_beta' }));
  assert.equal(beta.grants.claimedIds.length, 2);
  const legacy = JSON.parse(await fs.readFile(new URL('../data/pools.json', import.meta.url))).pools.find((pool) => pool.id === 'eternal_slumber_bloom');
  assert.equal(resolveUnlockGrantId(legacy.id, normalizeUnlockExpansion(legacy)), 'awakening_reward:eternal_slumber_bloom:20');
});

test('gift recovery reconciles markers once, repairs only missing pets, and never guesses lost fragments', () => {
  const input = scenario();
  const pool = input.poolsData.pools[0];
  const id = resolveUnlockGrantId(pool.id, pool.unlockExpansion);
  const state = normalizePoolUnlockState({ byPool: { [pool.id]: { lifetimeDraws: 20, unlocked: true } } });
  const grants = normalizeIdempotentGrants({ claimedIds: [id] });
  const collection = new Map([[pool.unlockExpansion.rewardPetId, { ...createCollectionEntry(pool.unlockExpansion.rewardPetId), fragments: 8 }]]);
  const context = { state, grants, collection, changed: new Set(), poolId: pool.id,
    expansion: pool.unlockExpansion, allPets: input.allPets, now: fixedNow };
  assert.equal(applyUnlockGift(context).alreadyClaimed, true);
  assert.equal(collection.get(pool.unlockExpansion.rewardPetId).fragments, 8);
  collection.clear();
  assert.equal(applyUnlockGift(context).alreadyClaimed, true);
  assert.equal(collection.get(pool.unlockExpansion.rewardPetId).fragments, 0);
  assert.equal(grants.claimedIds.length, 1);
});

test('rejected content, insufficient money, overflow and bad RNG never mutate planner inputs', () => {
  const cases = [
    (input) => { input.allPets = []; },
    (input) => { input.poolsData.pools.forEach((pool) => { pool.active = false; }); },
    (input) => { input.wallet.stardust = 0; },
    (input) => { input.poolsData.pools[0].cost = -1; },
    (input) => { input.allPets = input.allPets.filter((pet) => pet.id !== 'pet_r901'); },
    (input) => { input.rng = () => 1; },
    (input) => { input.stats = { totalPulls: Number.MAX_SAFE_INTEGER }; },
    (input) => { input.stats = { totalPulls: -1 }; },
    (input) => { input.stats = { poolPity: { fixture_alpha: { ssrPity: '2', urPity: 4 } } }; },
  ];
  for (const modify of cases) {
    const input = scenario(); modify(input);
    const before = JSON.stringify(input);
    freeze(input);
    assert.throws(() => planGachaTransaction(input));
    assert.equal(JSON.stringify(input), before);
  }
});

test('planner accepts deeply frozen snapshots and changes no original counters, catalog or collection', () => {
  const input = scenario({ stats: normalizeGachaStats({ poolPity: { fixture_alpha: { ssrPity: 2, urPity: 4 } } }),
    collection: [{ ...createCollectionEntry('pet_n900', fixedNow), fragments: 8 }] });
  const before = JSON.stringify(input);
  freeze(input);
  const plan = planGachaTransaction(input);
  assert.equal(plan.collection[0].fragments, 9);
  assert.equal(JSON.stringify(input), before);
});
