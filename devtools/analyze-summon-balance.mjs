import fs from 'node:fs/promises';
import path from 'node:path';
import { APP_VERSION } from '../src/version.js';
import { getEligiblePetsForPool } from '../src/petPoolFilter.js';
import { resolveEffectivePool } from '../src/poolContentContract.js';
const project = path.resolve(import.meta.dirname, '..');
const pools = JSON.parse(await fs.readFile(path.join(project, 'data/pools.json'))).pools;
const pets = JSON.parse(await fs.readFile(path.join(project, 'data/pets.json'))).pets;
// Exact finite-state first-UR waiting distribution. SSR resets its counter only.
// No simulated player habits or arbitrary daily-income assumptions are used.
function firstUr(pool) {
  let survival = new Map([[0, 1]]);
  let mean = 0;
  const cumulative = [];
  for (let draw = 0; draw < pool.pity.ur; draw++) {
    mean += [...survival.values()].reduce((a, b) => a + b, 0);
    const next = new Map();
    const add = (counter, probability) => next.set(counter, (next.get(counter) || 0) + probability);
    for (const [ssrCounter, probability] of survival) {
      if (draw === pool.pity.ur - 1) continue;
      if (ssrCounter >= pool.pity.ssr - 1) {
        add(0, probability * pool.rates.SSR / (pool.rates.SSR + pool.rates.UR));
      } else {
        add(0, probability * pool.rates.SSR);
        add(ssrCounter + 1, probability * (1 - pool.rates.SSR - pool.rates.UR));
      }
    }
    survival = next;
    cumulative.push(1 - [...survival.values()].reduce((a, b) => a + b, 0));
  }
  const quantile = (p) => cumulative.findIndex((value) => value >= p) + 1;
  return { expectedDraws:mean, expectedStardust:mean * pool.cost,
    medianDraws:quantile(.5), p90Draws:quantile(.9), p95Draws:quantile(.95), hardMaximum:pool.pity.ur,
    probabilityBy30:cumulative[29], probabilityBy100:cumulative[99] };
}
const rows = pools.filter((pool) => pool.active).map((pool) => {
  const candidates = getEligiblePetsForPool(pets, resolveEffectivePool(pool, { unlocked:false }));
  const counts = Object.fromEntries(['N','R','SR','SSR','UR'].map((rarity) => [rarity, candidates.filter((pet) => pet.rarity === rarity).length]));
  const lowOnlyTen = (pool.rates.N + pool.rates.R) ** 10;
  return { id:pool.id, name:pool.name, cost:pool.cost, rates:pool.rates, pity:pool.pity, candidateCounts:counts,
    tenPullGuarantee:pool.tenPullGuarantee, freshPityLowOnlyTenBefore:lowOnlyTen, freshPityLowOnlyTenAfter:0,
    freshPityExpectedSrPerTenBefore:10 * pool.rates.SR,
    freshPityExpectedSrPerTenAfter:10 * pool.rates.SR + lowOnlyTen,
    fullyOwnedFragmentsPerFreshTenBefore:10 * (pool.rates.N + 2 * pool.rates.R + 5 * pool.rates.SR + 10 * pool.rates.SSR + 20 * pool.rates.UR),
    fullyOwnedFragmentsPerFreshTenGain:lowOnlyTen * (5 - (pool.rates.N + 2 * pool.rates.R) / (pool.rates.N + pool.rates.R)),
    tenAtLeastSsr:1 - (1 - pool.rates.SSR - pool.rates.UR) ** 10,
    tenAtLeastUr:1 - (1 - pool.rates.UR) ** 10,
    singleSpecificUrBase:pool.rates.UR / counts.UR,
    firstUr:firstUr(pool), expectedCompleteUrSetDraws:firstUr(pool).expectedDraws * counts.UR * Array.from({ length:counts.UR }, (_, i) => 1 / (i + 1)).reduce((a,b) => a+b,0) };
});
const result = { version:APP_VERSION, method:'Exact probability and finite-state calculation from zero pity; ten SR floor cannot affect SSR/UR counters or probability. Set completion is the equal-weight coupon-collector expectation, not a guarantee.',
  decision:'Keep all base rates, costs, SSR/UR pity and duplicate fragments; add an SR-only ten floor to avoid all-N/R batches. No individual-pet guarantee or rate-up is introduced.', pools:rows };
const report = path.join(project, 'reports/summon-production-v' + APP_VERSION.replaceAll('.', ''));
await fs.mkdir(report, { recursive:true });
await fs.writeFile(path.join(report, 'balance.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
