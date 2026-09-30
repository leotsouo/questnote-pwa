import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { planGachaTransaction } from '../../src/gachaTransactionCore.js';
import { validatePoolContent, resolvePoolPresentationModel } from '../../src/poolContentContract.js';
import { authoringRoot, seriesId } from './revise.mjs';

const staging = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'staging-final.json')));
const bundle = JSON.parse(await fs.readFile(path.join(staging.built.candidateDir, 'catalog.json')));
const pets = bundle.petsData.pets;
const pool = bundle.poolsData.pools.find((p) => p.id === seriesId);
const validation = validatePoolContent(bundle.poolsData, { pets, previousPoolsData: JSON.parse(await fs.readFile(path.join(authoringRoot, 'data/pools.json'))) });
assert.equal(validation.ok, true);
const model = resolvePoolPresentationModel(pool, pets);
assert.equal(model.counts.locked, 12);
assert.equal(model.counts.unlocked, 12);
assert.equal(model.unlock, null);
assert.equal(model.hero.id, 'pet_ur10');
assert.deepEqual(model.featured.map((p) => p.id), ['pet_ur09', 'pet_ssr12', 'pet_ssr13']);
assert.deepEqual(model.eligiblePets.filter((p) => p.rarity === 'UR').map((p) => p.id), ['pet_ur09', 'pet_ur10']);
const input = { allPets: pets, poolsData: bundle.poolsData, selectedPoolId: seriesId, wallet: { key: 'wallet', stardust: 10000, adventureEnergy: 7 }, collection: [], count: 1 };
const rolls = [];
for (const [choice, id] of [[0, 'pet_ur09'], [0.999, 'pet_ur10']]) {
  let call = 0;
  const normal = planGachaTransaction({ ...input, rng: () => call++ === 0 ? 0.99 : choice });
  assert.equal(normal.result.pet.id, id);
  assert.equal(normal.result.rarity, 'UR');
  assert.equal(normal.result.triggeredPity, false);
  assert.equal(normal.wallet.stardust, 9900);
  const pity = planGachaTransaction({ ...input, stats: { poolPity: { [seriesId]: { ssrPity: 4, urPity: 99 } } }, rng: () => choice });
  assert.equal(pity.result.pet.id, id);
  assert.equal(pity.result.triggeredPity, true);
  assert.deepEqual(pity.stats.poolPity[seriesId], { ssrPity: 0, urPity: 0 });
  assert.equal(pity.grants.claimedIds.length, 0);
  rolls.push({ id, normalUR: 'PASS', hundredthPullUR: 'PASS' });
}
const ssr = planGachaTransaction({ ...input, stats: { poolPity: { [seriesId]: { ssrPity: 29, urPity: 10 } } }, rng: () => 0.9 });
assert.equal(ssr.result.rarity, 'SSR');
assert.equal(ssr.result.triggeredPity, true);
const ten = planGachaTransaction({ ...input, count: 10, rng: () => 0 });
assert.equal(ten.wallet.stardust, 9000);
assert.equal(ten.wallet.adventureEnergy, 7);
assert.equal(ten.result.results.length, 10);
assert.ok(ten.result.results.every((p) => p.pet.poolTags.length === 1 && p.pet.poolTags[0] === seriesId));
assert.equal(ten.grants.claimedIds.length, 0);
const baseline = { petsData: 'pets.json', loreData: 'pets-lore.json', poolsData: 'pools.json', seriesCatalog: 'pet-series.json' };
for (const [key, file] of Object.entries(baseline)) {
  const data = JSON.parse(await fs.readFile(path.join(authoringRoot, 'data', file)));
  const rows = { petsData: 'pets', loreData: 'lore', poolsData: 'pools', seriesCatalog: 'series' }[key];
  for (const old of data[rows]) assert.deepEqual(bundle[key][rows].find((p) => p.id === old.id), old);
}
const report = { checkedAt: new Date().toISOString(), realApprovedContent: true, candidateId: staging.built.candidateId, candidateCounts: staging.counts, firstDrawCandidates: model.counts, rarityPlan: { N: 3, R: 3, SR: 2, SSR: 2, UR: 2 }, unchangedPublishedBaseline: 'PASS', normalAndPityUR: rolls, thirtyPullSSR: 'PASS', singleAndTenCosts: 'PASS', noCrossPoolResults: 'PASS', noUnlockOrGifts: 'PASS', presentation: { hero: model.hero.id, featured: model.featured.map((p) => p.id) }, playerDatabaseOpened: false };
await fs.writeFile(path.join(import.meta.dirname, 'real-content-validation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
