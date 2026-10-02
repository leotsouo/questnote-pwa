import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { identityRevealDuration } from '../src/summonRevealService.js';
import { poolCandidates, tenPreviewPets, prepareDisplayBatch, seedDisplayCollection } from './companion-identity-model.js';

test('SSR and UR receive the same complete presentation time in every identity world', () => {
  assert.equal(identityRevealDuration('SSR'), 2500);
  assert.equal(identityRevealDuration('UR'), 4500);
  assert.equal(identityRevealDuration('SSR', true), 550);
  assert.equal(identityRevealDuration('UR', true), 750);
});

test('every pool has ten actual candidates, ordered SSR+ and same-batch duplicate compensation', async () => {
  const { pools } = JSON.parse(await fs.readFile(new URL('../data/pools.json',import.meta.url)));
  const { pets } = JSON.parse(await fs.readFile(new URL('../data/pets.json',import.meta.url)));
  for (const pool of pools.filter((p) => p.active)) {
    const candidates = poolCandidates(pets,pool);
    const ten = tenPreviewPets(candidates);
    assert.equal(ten.length,10,pool.id);
    assert.ok(ten.every((p) => p && candidates.includes(p)),pool.id);
    const batch = prepareDisplayBatch(seedDisplayCollection(),ten);
    assert.deepEqual(batch.results.map((r) => r.pet.id),ten.map((p) => p.id));
    const duplicate = batch.results[4];
    assert.equal(duplicate.pet.id,batch.results[1].pet.id);
    assert.equal(duplicate.isNew,false);
    assert.equal(duplicate.fragmentsGained,1);
    assert.deepEqual(batch.results.filter((r) => ['SSR','UR'].includes(r.pet.rarity)).map((r) => r.pet.id),[ten[5],ten[7],ten[8],ten[9]].map((p) => p.id));
  }
});

test('all twenty awakening previews have distinct existing before and after artwork', async () => {
  const { pets: entries } = JSON.parse(await fs.readFile(new URL('../data/pet-awakening.json',import.meta.url)));
  const { pets } = JSON.parse(await fs.readFile(new URL('../data/pets.json',import.meta.url)));
  assert.equal(entries.length,20);
  for(const entry of entries) {
    const pet = pets.find((p) => p.id === entry.petId);
    const after = entry.awakenedImage?.stage || pet.imageVariants.stage;
    assert.notEqual(entry.initialImage.stage,after,entry.petId);
    await fs.access(new URL('../'+entry.initialImage.stage,import.meta.url));
    await fs.access(new URL('../'+after,import.meta.url));
  }
});
