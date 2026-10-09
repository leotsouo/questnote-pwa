import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { POOL_NAVIGATION, poolNavigation, searchPoolDirectory } from '../src/poolDirectory.js';
import { normalizePoolDefinition } from '../src/poolContentContract.js';
import { poolCandidates } from '../src/encounterViewModel.js';

const pools = JSON.parse(fs.readFileSync(new URL('../data/pools.json', import.meta.url), 'utf8')).pools;
const pets = JSON.parse(fs.readFileSync(new URL('../data/pets.json', import.meta.url), 'utf8')).pets;

test('Every active series stays available without changing catalog or saved draw rules', () => {
  const before = JSON.stringify(pools);
  const model = poolNavigation(pools);
  assert.deepEqual(model.entries.map((row) => row.id), pools.filter((row) => row.active).map((row) => row.id));
  assert.equal(model.featured.id, POOL_NAVIGATION.featuredPoolId);
  assert.equal(model.standard.id, 'standard');
  assert.equal(JSON.stringify(pools), before);
  for (const row of model.entries) {
    const normalized = normalizePoolDefinition(row);
    assert.deepEqual(poolCandidates(pets, normalized, false).map((pet) => pet.id), poolCandidates(pets, row, false).map((pet) => pet.id));
  }
});

test('Missing or inactive featured series is not replaced by an arbitrary catalog entry', () => {
  const inactive = pools.map((row) => ({ ...row, active: row.id !== POOL_NAVIGATION.featuredPoolId && row.id !== 'standard' }));
  const model = poolNavigation(inactive);
  assert.equal(model.featured, null);
  assert.equal(model.standard, null);
  assert.ok(!model.entries.some((row) => row.id === POOL_NAVIGATION.featuredPoolId));
  assert.deepEqual(poolNavigation([]), { featured:null, standard:null, entries:[] });
});

test('Directory search supports names, story terms and normalized spaces without filtering draw candidates', () => {
  const rows = poolNavigation(pools).entries;
  assert.equal(searchPoolDirectory(rows, '  花海  ')[0].id, 'eternal_slumber_bloom');
  assert.deepEqual(searchPoolDirectory(rows, ''), rows);
  assert.deepEqual(searchPoolDirectory(rows, '不存在的系列'), []);
  const fixture = [{ name:'ＡＢＣ 花庭', presentation:{ tagline:'月光下的故事' } }];
  assert.deepEqual(searchPoolDirectory(fixture, 'abc　月光'), fixture);
  assert.deepEqual(searchPoolDirectory(fixture, 'abc 沙漠'), []);
});

test('Flower garden directory counts respect its existing expansion gate', () => {
  const bloom = normalizePoolDefinition(pools.find((row) => row.id === 'eternal_slumber_bloom'));
  assert.equal(poolCandidates(pets, bloom, false).length, 12);
  assert.equal(poolCandidates(pets, bloom, true).length, 16);
});
