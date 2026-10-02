import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mergeAllPetsWithLore } from '../src/loreService.js';
import { RARITIES, poolCandidates, identityLabel, basePetRate, displayResult, applyDisplayResult } from './companion-identity-model.js';

const read = (file) => JSON.parse(fs.readFileSync(new URL('../data/' + file, import.meta.url)));
const pets = mergeAllPetsWithLore(read('pets.json').pets, read('pets-lore.json'));
const pools = read('pools.json').pools;

test('every public catalog identity preserves its canonical name before its epithet and ownership', () => {
  for (const pet of pets) {
    const label = identityLabel(pet, false);
    assert.ok(label.startsWith(pet.name + '，'));
    assert.ok(label.includes(pet.title));
    assert.ok(label.includes(pet.rarity));
    assert.ok(label.endsWith('尚未相遇'));
  }
  const griffin = pets.find((pet) => pet.id === 'pet_ur19');
  const nickname = identityLabel(griffin, true, '小翼');
  assert.ok(nickname.startsWith('天律之冕・格里芬，'));
  assert.ok(nickname.includes('你的暱稱：小翼'));
});

test('pool preview respects real eligibility including the existing locked expansion', () => {
  const expected = { standard:56, eternal_slumber_bloom:12, frost_oath_fjord:12, honeylight_sugar_garden_v2:12, swordwild_shanhe_v3:20, lionheart_inverse_oath:12 };
  for (const pool of pools) assert.equal(poolCandidates(pets,pool).length,expected[pool.id]);
  const bloom = pools.find((pool) => pool.id === 'eternal_slumber_bloom');
  const locked = poolCandidates(pets,bloom);
  const unlocked = poolCandidates(pets,bloom,true);
  assert.equal(unlocked.length,16);
  assert.ok(!locked.some((pet) => pet.id === 'pet_ur06'));
  assert.ok(unlocked.some((pet) => pet.id === 'pet_ur06'));
});

test('per-pet transparency matches existing equal selection, sums to base rates, and has no featured boost', () => {
  for (const pool of pools) {
    for (const unlocked of [false,true]) {
      const list = poolCandidates(pets,pool,unlocked);
      for (const rarity of RARITIES) {
        const cohort = list.filter((pet) => pet.rarity === rarity);
        assert.ok(cohort.length > 0);
        const sum = cohort.reduce((total,pet) => total + basePetRate(pet,list,pool),0);
        assert.ok(Math.abs(sum-pool.rates[rarity]) < 1e-12);
        assert.equal(new Set(cohort.map((pet) => basePetRate(pet,list,pool))).size,1);
      }
    }
  }
});

test('a repeat encounter produces the actual rarity-specific pet fragments without mutating the input', () => {
  const expected = {N:1,R:2,SR:5,SSR:10,UR:20};
  for (const rarity of RARITIES) {
    const pet = pets.find((row) => row.rarity === rarity);
    const before = new Map([[pet.id,{stars:3,bondLevel:2,fragments:7}]]);
    const result = displayResult(pet,true);
    const after = applyDisplayResult(before,result);
    assert.equal(after.get(pet.id).fragments,7+expected[rarity]);
    assert.equal(after.get(pet.id).stars,3);
    assert.equal(before.get(pet.id).fragments,7);
    const fresh = applyDisplayResult(new Map(),displayResult(pet));
    assert.equal(fresh.get(pet.id).fragments,0);
    assert.equal(fresh.get(pet.id).bondLevel,1);
  }
});

test('prototype has no production writes, network reports, random rolls, or service-worker registration', () => {
  const source = fs.readFileSync(new URL('./companion-identity.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:pullOnce|performTenPull|planGachaTransaction|dbPut|dbMutateRecords|indexedDB|localStorage|Math\.random)\b/);
  assert.doesNotMatch(source,/serviceWorker|feedbackService|POST/);
});
