import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { poolAwakeningArtwork, renderPoolAwakeningPreview } from '../src/poolAwakeningPreview.js';
import { initialAwakeningPortrait, renderAwakeningGuide } from '../src/petAwakeningView.js';
import { AWAKENING_PROFILES } from '../src/petAwakeningProfiles.js';

const catalog = JSON.parse(readFileSync(new URL('../data/pet-awakening.json', import.meta.url)));
const pets = JSON.parse(readFileSync(new URL('../data/pets.json', import.meta.url))).pets;

test('every opened awakening partner resolves both real forms without modifying draw art', () => {
  assert.equal(catalog.pets.length, 31);
  for (const entry of catalog.pets) {
    const pet = pets.find((row) => row.id === entry.petId);
    const before = JSON.stringify(pet);
    const pair = poolAwakeningArtwork(pet, catalog);
    assert.equal(pair.initial.original, entry.initialImage.original);
    assert.equal(pair.awakened.original, entry.awakenedImage?.original || pet.image);
    for (const form of Object.values(pair)) {
      for (const image of Object.values(form)) assert.ok(existsSync(new URL('../' + image, import.meta.url)), image);
    }
    assert.notEqual(pair.initial.original, pair.awakened.original);
    assert.equal(JSON.stringify(pet), before);
    assert.equal(initialAwakeningPortrait(pet, catalog).image, pair.initial.original);
    const html = renderPoolAwakeningPreview(pet, catalog);
    assert.ok(html.includes('造型預覽'));
    assert.ok(html.includes('aria-pressed="false"'));
    assert.ok(!html.includes('awakening-art-preview'));
    assert.ok(!html.includes(` src="${new URL('../' + pair.awakened.stage, import.meta.url).href}"`));
  }
});

test('partners without awakening keep their ordinary card and no flip affordance', () => {
  for (const pet of pets.filter((pet) => !catalog.pets.some((row) => row.petId === pet.id))) {
    assert.equal(poolAwakeningArtwork(pet, catalog), null);
    assert.equal(renderPoolAwakeningPreview(pet, catalog), '');
  }
  assert.equal(poolAwakeningArtwork(null, catalog), null);
  assert.equal(poolAwakeningArtwork(pets[0], null), null);
});

test('preview labels escape catalog copy and every awakening guide matches the public preview', () => {
  const pet = { ...pets.find((row) => row.id === catalog.pets[0].petId), name: '<img onerror="bad">' };
  const html = renderPoolAwakeningPreview(pet, catalog);
  assert.ok(!html.includes('<img onerror='));
  assert.ok(html.includes('&lt;img onerror=&quot;bad&quot;&gt;'));
  for (const profile of AWAKENING_PROFILES) {
    assert.ok(renderAwakeningGuide({ poolId: profile.poolId }).includes('翻面預覽全彩覺醒造型'));
  }
});
