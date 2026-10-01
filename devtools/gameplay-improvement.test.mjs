import test from 'node:test';
import assert from 'node:assert/strict';
import { getDispatchTerms, getPetSpecialty, planExpeditionResult, getExpeditionRecommendations } from '../src/expeditionGameplay.js';
import { EXPLORATION_AREA_IDS, AREA_EXPLORATION_DEFS, createDefaultExplorationProgress,
  advanceExplorationRecord } from '../src/explorationService.js';
import { CAMP_UPGRADES, normalizeCampProgress } from '../src/campService.js';
import fs from 'node:fs/promises';
const areas = JSON.parse(await fs.readFile(new URL('../data/expeditions.json', import.meta.url), 'utf8')).areas;
const materials = JSON.parse(await fs.readFile(new URL('../data/materials.json', import.meta.url), 'utf8'));

const area = { id: 'mist_forest', energyCost: 3, durationMinutes: 15,
  rewards: { stardust: { min: 20, max: 20 }, material: { id: 'forest_leaf', min: 1, max: 2 }, bondExp: 5 } };
const forestPet = { id: 'pet_n01', name: '森林芽芽', element: '木', rarity: 'N', stars: 1, bondLevel: 1 };
const scoutPet = { id: 'pet_r01', name: '雪狐', element: '冰', rarity: 'R', stars: 3, bondLevel: 2 };

test('recommendations match each objective and outrank a stronger nonmatching companion', () => {
  const pets = [forestPet, scoutPet,
    { id: 'light', name: '星光', element: '光', rarity: 'N', stars: 1 },
    { id: 'companion', name: '火龍', element: '火', rarity: 'UR', stars: 5 }]
    .map((pet) => ({ ...pet, owned: true }));
  for (const [objective, id] of [['explore', scoutPet.id], ['gather', forestPet.id], ['bond', 'light']]) {
    const recommendation = getExpeditionRecommendations(pets, objective, { companionId: 'companion' });
    assert.deepEqual(recommendation.teamPetIds, [id]);
    assert.equal(recommendation.recommended[0].id, id);
    const pet = recommendation.recommended[0];
    const result = planExpeditionResult(area, [pet], objective, () => 0);
    const baseline = planExpeditionResult(area, [pets[3]], objective, () => 0);
    if (objective === 'explore') assert.ok(result.explorationGain > baseline.explorationGain);
    if (objective === 'gather') assert.ok(result.rewards.materials.forest_leaf > baseline.rewards.materials.forest_leaf);
    if (objective === 'bond') assert.ok(result.rewards.bondExp > baseline.rewards.bondExp);
  }
});

test('recommendations exclude unowned and busy pets, cap at three, and prioritize specialty level', () => {
  const pets = Array.from({ length: 6 }, (_, index) => ({ ...forestPet, id: `forest-${index}`,
    stars: index + 1, owned: index !== 5 }));
  const snapshot = structuredClone(pets);
  const options = { companionId: 'forest-0', unavailablePetIds: ['forest-4'] };
  assert.deepEqual(getExpeditionRecommendations(pets, 'gather', options).teamPetIds,
    ['forest-3', 'forest-2', 'forest-1']);
  assert.deepEqual(pets, snapshot);
  assert.deepEqual(getExpeditionRecommendations([...pets].reverse(), 'gather', options).teamPetIds,
    ['forest-3', 'forest-2', 'forest-1']);
});

test('empty matches do not claim other specialties are recommended; ties remain deterministic', () => {
  const pets = [{ ...forestPet, owned: true }];
  const recommendation = getExpeditionRecommendations(pets, 'explore');
  assert.deepEqual(recommendation.recommended, []);
  assert.deepEqual(recommendation.teamPetIds, []);
  assert.equal(recommendation.others[0].id, forestPet.id);
  assert.deepEqual(getExpeditionRecommendations([], 'bond').teamPetIds, []);
  const tied = [{ ...forestPet, id: 'b', owned: true }, { ...forestPet, id: 'a', owned: true }];
  assert.deepEqual(getExpeditionRecommendations(tied, 'gather').teamPetIds, ['a', 'b']);
  assert.deepEqual(getExpeditionRecommendations(tied, 'gather', { companionId: 'b' }).teamPetIds, ['b', 'a']);
  assert.throws(() => getExpeditionRecommendations(pets, '__proto__'), /目標不存在/);
});

test('first forest journey uses one energy and three minutes only once', () => {
  assert.deepEqual(getDispatchTerms(area, true), { energyCost: 1, durationMinutes: 3, firstJourney: true });
  assert.equal(getDispatchTerms(area, false).energyCost, 3);
});

test('one-star ordinary pet is useful and objectives make recognizable differences', () => {
  assert.equal(getPetSpecialty(forestPet).role, 'gatherer');
  const random = () => 0;
  const explore = planExpeditionResult(area, [forestPet], 'explore', random);
  const gather = planExpeditionResult(area, [forestPet], 'gather', random);
  const bond = planExpeditionResult(area, [forestPet], 'bond', random);
  const untrainedGatherer = planExpeditionResult(area, [{ ...forestPet, element: '火' }], 'gather', random);
  assert.ok(explore.rewards.materials.forest_leaf >= 1);
  assert.ok(gather.rewards.materials.forest_leaf > explore.rewards.materials.forest_leaf);
  assert.ok(gather.rewards.materials.forest_leaf > untrainedGatherer.rewards.materials.forest_leaf);
  assert.ok(bond.rewards.bondExp > explore.rewards.bondExp);
  assert.ok(explore.explorationGain > gather.explorationGain);
  assert.equal(explore.rewards.fragmentGained, 0);
  assert.throws(() => planExpeditionResult(area, [], 'explore'), /1～3/);
  assert.throws(() => planExpeditionResult(area, Array(4).fill(forestPet), 'explore'), /1～3/);
});

test('stars and team specialties improve the result without requiring high rarity', () => {
  const random = () => 0;
  const one = planExpeditionResult(area, [forestPet], 'gather', random);
  const trained = planExpeditionResult(area, [{ ...forestPet, stars: 5 }], 'gather', random);
  const team = planExpeditionResult(area, [{ ...forestPet, stars: 5 }, scoutPet], 'gather', random);
  assert.ok(trained.rewards.materials.forest_leaf > one.rewards.materials.forest_leaf);
  assert.ok(team.rewards.stardust > trained.rewards.stardust);
  assert.deepEqual(Object.keys(team.bondByPet).sort(), ['pet_n01', 'pet_r01']);
});

test('every published region has the same milestone ladder and valid camp material references', () => {
  for (const area of areas) assert.ok(EXPLORATION_AREA_IDS.includes(area.id), `Missing published region: ${area.id}`);
  for (const id of EXPLORATION_AREA_IDS) {
    assert.deepEqual(AREA_EXPLORATION_DEFS[id].milestones.map((m) => m.percent), [10, 25, 50, 75, 100]);
  }
  const progress = createDefaultExplorationProgress();
  const advanced = advanceExplorationRecord(progress, 'polar_shore', 10);
  assert.equal(advanced.area.progress, 10);
  assert.equal(advanced.newlyReachedMilestones[0].percent, 10);
  assert.equal(advanced.newlyUnlockedStories.length, 1);
  const spent = new Set(CAMP_UPGRADES.flatMap((level) => Object.keys(level.materials)));
  assert.ok([...spent].every((id) => materials.some((m) => m.id === id)));
  assert.equal(normalizeCampProgress(null).level, 0);
});
