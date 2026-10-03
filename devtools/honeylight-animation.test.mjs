import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePoolDefinition, resolvePetRevealKey, validatePoolContent } from '../src/poolContentContract.js';
import { shouldUseThemedSummon } from '../src/poolPresentation.js';
import { collectSsrPlusRevealQueue } from '../src/summonRevealService.js';
import { sugarPreludeDurations } from '../src/honeylightSugarScene.js';
import { readFileSync } from 'node:fs';

test('sugar template dispatches with arbitrary pool identity; old default stays unthemed', () => {
  const pool = { id: 'another_sugar_region', name: 'Sugar region', cost: 100, active: true,
    rates: { N: .55, R: .30, SR: .10, SSR: .03, UR: .02 }, pity: { ssr: 30, ur: 100 },
    petFilter: { poolTags: ['another_sugar_region'] }, presentation: { themeKey: 'honeylight_sugar', animationKey: 'honeylight_sugar' } };
  assert.equal(normalizePoolDefinition(pool).presentation.animationKey, 'honeylight_sugar');
  assert.equal(shouldUseThemedSummon(pool), true);
  assert.equal(shouldUseThemedSummon({ ...pool, presentation: { themeKey: 'default', animationKey: 'none' } }), false);
});

test('each UR reveal resolves from data and cannot be attached to a low rarity', () => {
  for (const revealKey of ['caramel', 'cream']) {
    assert.equal(resolvePetRevealKey({ id: 'pet_ur99', rarity: 'UR', presentation: { revealKey } }), revealKey);
    assert.throws(() => resolvePetRevealKey({ id: 'pet_r99', rarity: 'R', presentation: { revealKey } }));
  }
});

test('ten-pull queue preserves both URs, repeated characters and original positions', () => {
  const pet = (id, rarity, revealKey) => ({ id, rarity, presentation: revealKey ? { revealKey } : undefined });
  const results = [pet('pet_n99', 'N'), pet('pet_ur99', 'UR', 'cream'), pet('pet_ssr99', 'SSR'),
    pet('pet_ur98', 'UR', 'caramel'), pet('pet_ur99', 'UR', 'cream')].map((item) => Object.freeze({ pet: Object.freeze(item), rarity: item.rarity }));
  const before = JSON.stringify(results);
  const queue = collectSsrPlusRevealQueue(Object.freeze(results));
  assert.deepEqual(queue.map((item) => [item.index, item.theme]), [[1, 'cream'], [2, 'ssr'], [3, 'caramel'], [4, 'cream']]);
  assert.equal(JSON.stringify(results), before);
});

test('sugar prelude is one bounded sequence per pull, with short reduced motion', () => {
  for (const mode of ['single', 'ten']) for (const rarity of ['N', 'R', 'SR', 'SSR', 'UR']) {
    const ms = sugarPreludeDurations(rarity, mode, false).reduce((a, b) => a + b, 0);
    assert.equal(ms, 3000);
    assert.equal(sugarPreludeDurations(rarity, mode, true).reduce((a, b) => a + b, 0), 500);
  }
});

test('real 12-pet pool is registered and complete without unlock or altered economics', () => {
  const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url)));
  const catalog = read('pools.json'), pets = read('pets.json').pets;
  const pool = catalog.pools.find((item) => item.id === 'honeylight_sugar_garden_v2');
  assert.ok(pool);
  assert.equal(validatePoolContent(catalog, { pets }).ok, true);
  assert.equal(shouldUseThemedSummon(pool), true);
  assert.equal(pool.unlockExpansion, undefined);
  assert.equal(pool.cost, 100);
  assert.deepEqual(pool.pity, { ssr: 30, ur: 100 });
  const sugarPets = pets.filter((pet) => pet.poolTags.includes(pool.id));
  assert.equal(sugarPets.length, 12);
  assert.deepEqual(sugarPets.filter((pet) => pet.rarity === 'UR').map(resolvePetRevealKey).sort(), ['caramel', 'cream']);
});
