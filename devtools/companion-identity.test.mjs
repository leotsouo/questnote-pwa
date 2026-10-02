import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mergeAllPetsWithLore } from '../src/loreService.js';
import { RARITIES, MAX_DISPLAY_STARS, poolCandidates, identityLabel, basePetRate, displayResult, applyDisplayResult, seedDisplayCollection, prepareDisplayBatch, tenPreviewPets, setDisplayCompanion, duplicateNote, publicIntro, normalGreeting } from './companion-identity-model.js';

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
  const source = fs.readFileSync(new URL('./companion-app-identity.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:pullOnce|performTenPull|planGachaTransaction|dbPut|dbMutateRecords|indexedDB|localStorage|Math\.random)\b/);
  assert.doesNotMatch(source,/serviceWorker|feedbackService|POST/);
});

test('fixed ten preview uses eligible pets in every pool and recognizes same-batch duplicates', () => {
  for (const pool of pools) {
    const candidates = poolCandidates(pets, pool);
    const ten = tenPreviewPets(candidates);
    assert.equal(ten.length, 10);
    assert.ok(ten.every((pet) => candidates.some((candidate) => candidate.id === pet.id)));
    const before = seedDisplayCollection();
    const batch = prepareDisplayBatch(before, ten);
    const repeatedId = ten[1].id;
    assert.equal(batch.results[4].isNew, false);
    assert.equal(batch.results[4].fragmentsGained, 1);
    assert.equal(batch.collection.get(repeatedId).fragments, before.has(repeatedId) ? 2 : 1);
    assert.equal(before.get(repeatedId)?.fragments || 0, 0);
  }
  const lion = pools.find((pool) => pool.id === 'lionheart_inverse_oath');
  const batch = prepareDisplayBatch(seedDisplayCollection(), tenPreviewPets(poolCandidates(pets, lion)));
  assert.deepEqual(batch.results.filter((result) => ['SSR', 'UR'].includes(result.pet.rarity)).map((result) => result.pet.id), ['pet_ssr25', 'pet_ur19', 'pet_ssr26', 'pet_ur20']);
  assert.equal(batch.results.filter((result) => result.isNew).length, 5);
});

test('max-star repeats accumulate actual fragments while preserving stars and explaining the limit', () => {
  const pet = pets.find((pet) => pet.id === 'pet_ur20');
  const before = seedDisplayCollection();
  const batch = prepareDisplayBatch(before, [pet, pet]);
  assert.equal(batch.collection.get(pet.id).stars, MAX_DISPLAY_STARS);
  assert.equal(batch.collection.get(pet.id).fragments, 40);
  assert.equal(before.get(pet.id).fragments, 0);
  assert.ok(batch.results.every((result) => duplicateNote(result).includes('已達最高星級')));
  assert.doesNotMatch(duplicateNote(batch.results[0]), /用於.*升星/);
});

test('encounters do not replace a companion; explicit switching keeps nickname and other progress', () => {
  const before = seedDisplayCollection();
  const griffin = pets.find((pet) => pet.id === 'pet_ur19');
  const batch = prepareDisplayBatch(before, [griffin]);
  assert.equal(batch.collection.get('pet_n01').isCompanion, true);
  assert.ok(!batch.collection.get(griffin.id).isCompanion);
  const switched = setDisplayCompanion(batch.collection, griffin.id);
  assert.equal([...switched.values()].filter((entry) => entry.isCompanion).length, 1);
  assert.equal(switched.get(griffin.id).isCompanion, true);
  assert.equal(switched.get('pet_n01').nickname, '小灰');
  assert.equal(before.get('pet_n01').isCompanion, true);
  const unowned = setDisplayCompanion(before, 'pet_n40');
  assert.deepEqual(unowned, before);
});

test('greetings use existing normal dialogue only and curated public introductions omit title repetition', () => {
  assert.equal(normalGreeting(pets.find((pet) => pet.id === 'pet_n01')), '我會跟著你，別走太快。');
  assert.equal(normalGreeting({ dialogues: { bond2: ['尚未解鎖的台詞'] } }), '');
  assert.equal(normalGreeting({ dialogues: { normal: [] } }), '');
  for (const id of ['pet_n01', 'pet_ur19', 'pet_ssr25']) {
    const pet = pets.find((pet) => pet.id === id);
    assert.ok(publicIntro(pet));
    assert.ok(!publicIntro(pet).startsWith(pet.title));
    assert.ok(publicIntro(pet).length < 100);
  }
});
