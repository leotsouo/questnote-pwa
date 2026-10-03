import test from 'node:test';
import assert from 'node:assert/strict';
import { planGachaTransaction, normalizeGachaStats } from '../src/gachaTransactionCore.js';
import { createCollectionEntry } from '../src/collectionService.js';
import { validatePoolContent } from '../src/poolContentContract.js';
import { createPoolContentFixtures } from './fixtures/pool-content-fixtures.mjs';

function scenario(rolls = Array(10).fill(0)) {
  const fixture = createPoolContentFixtures();
  fixture.catalog.pools[0].tenPullGuarantee = 'SR';
  let calls = 0;
  return { input:{ allPets:fixture.pets, poolsData:fixture.catalog, selectedPoolId:fixture.alpha.id,
    count:10, wallet:{ key:'wallet', stardust:10000 }, collection:[],
    rng:() => { const index = calls++; return index % 2 ? 0 : rolls[index / 2]; },
    now:'2026-10-03T00:00:00.000Z' }, calls:() => calls };
}

test('a configured ten replaces only its final N/R with SR, with the same cost, RNG budget and pity credit', () => {
  const { input, calls } = scenario();
  const before = JSON.stringify(input);
  const plan = planGachaTransaction(input);
  assert.deepEqual(plan.result.results.map((row) => row.rarity), [...Array(9).fill('N'), 'SR']);
  assert.equal(plan.wallet.stardust, 9000);
  assert.equal(plan.stats.totalPulls, 10);
  assert.deepEqual(plan.stats.poolPity[input.selectedPoolId], { ssrPity:10, urPity:10 });
  assert.equal(calls(), 20);
  assert.equal(JSON.stringify(input), before);
  assert.equal(plan.result.results.at(-1).triggeredPity, false);
});

test('a natural SR, SSR or UR is retained and prevents any low-rarity promotion', () => {
  for (const roll of [0.9, 0.96, 0.99]) {
    const rolls = Array(10).fill(0); rolls[3] = roll;
    const { input } = scenario(rolls);
    const plan = planGachaTransaction(input);
    assert.equal(plan.result.results.at(-1).rarity, 'N');
    assert.ok(['SR','SSR','UR'].includes(plan.result.results[3].rarity));
  }
  for (const roll of [0.96, 0.99]) {
    const rolls = Array(10).fill(0); rolls[9] = roll;
    const { input } = scenario(rolls);
    assert.ok(['SSR','UR'].includes(planGachaTransaction(input).result.results.at(-1).rarity));
  }
});

test('both existing pity boundaries outrank the SR floor and reset only their own counters', () => {
  for (const [counters, rarity, expected] of [
    [{ ssrPity:20, urPity:0 }, 'SSR', { ssrPity:0, urPity:10 }],
    [{ ssrPity:0, urPity:90 }, 'UR', { ssrPity:0, urPity:0 }],
  ]) {
    const { input } = scenario();
    // SSR pity chooses UR below 0.4 and SSR above it; pet selection stays uniform.
    let call = 0;
    input.rng = () => (call++ === 18 && rarity === 'SSR') ? 0.9 : 0;
    input.stats = normalizeGachaStats({ poolPity:{ [input.selectedPoolId]:counters } });
    const plan = planGachaTransaction(input);
    assert.equal(plan.result.results.at(-1).rarity, rarity);
    assert.equal(plan.result.results.at(-1).triggeredPity, true);
    assert.deepEqual(plan.stats.poolPity[input.selectedPoolId], expected);
  }
});

test('a promoted duplicate grants its actual SR fragments once and leaves progression intact', () => {
  const { input } = scenario();
  const pet = input.allPets.find((pet) => pet.rarity === 'SR' && pet.poolTags.includes(input.selectedPoolId));
  input.collection = [{ ...createCollectionEntry(pet.id, input.now), encounterMigrationVersion:0, stars:5, fragments:42, nickname:'留住名字', bondExp:500, bondLevel:5 }];
  const plan = planGachaTransaction(input);
  const result = plan.result.results.at(-1);
  const saved = plan.collection.find((row) => row.petId === pet.id);
  assert.equal(result.isNew, false);
  assert.equal(result.duplicateFragments, 5);
  assert.equal(plan.encounterEconomy.balance, 155); // 142 migration + 8 N reencounters + 5 SR.
  assert.equal(saved.fragments, undefined);
  assert.equal(saved.legacySpecialtyFloor, 5);
  assert.equal(saved.stars, undefined);
  assert.equal(saved.nickname, '留住名字');
  assert.equal(saved.bondLevel, 5);
});

test('single draws and unconfigured legacy pools retain their existing behavior', () => {
  const { input } = scenario();
  assert.equal(planGachaTransaction({ ...input, count:1 }).result.rarity, 'N');
  const fresh = scenario().input;
  delete fresh.poolsData.pools[0].tenPullGuarantee;
  assert.ok(planGachaTransaction(fresh).result.results.every((row) => row.rarity === 'N'));
});

test('invalid guarantee types and missing SR candidates cannot enter a draw', () => {
  const { input } = scenario();
  const pool = input.poolsData.pools[0];
  pool.tenPullGuarantee = 'UR';
  assert.equal(validatePoolContent({ pools:[pool] }, { pets:input.allPets }).ok, false);
  pool.tenPullGuarantee = 'SR'; pool.rates.N += pool.rates.SR; pool.rates.SR = 0;
  input.allPets = input.allPets.filter((pet) => pet.rarity !== 'SR');
  assert.throws(() => planGachaTransaction(input), /No SR candidate/);
});
