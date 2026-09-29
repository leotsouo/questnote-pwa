import test from 'node:test';
import assert from 'node:assert/strict';
import { getDispatchTerms, getPetSpecialty, planExpeditionResult } from '../src/expeditionGameplay.js';
import { EXPLORATION_AREA_IDS, AREA_EXPLORATION_DEFS, createDefaultExplorationProgress,
  advanceExplorationRecord } from '../src/explorationService.js';
import { CAMP_UPGRADES, normalizeCampProgress } from '../src/campService.js';

const area = { id: 'mist_forest', energyCost: 3, durationMinutes: 15,
  rewards: { stardust: { min: 20, max: 20 }, material: { id: 'forest_leaf', min: 1, max: 2 }, bondExp: 5 } };
const forestPet = { id: 'pet_n01', name: '森林芽芽', element: '木', rarity: 'N', stars: 1, bondLevel: 1 };
const scoutPet = { id: 'pet_r01', name: '雪狐', element: '冰', rarity: 'R', stars: 3, bondLevel: 2 };

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

test('six regions have the same milestone ladder and camp materials span all regions', () => {
  assert.equal(EXPLORATION_AREA_IDS.length, 6);
  for (const id of EXPLORATION_AREA_IDS) {
    assert.deepEqual(AREA_EXPLORATION_DEFS[id].milestones.map((m) => m.percent), [10, 25, 50, 75, 100]);
  }
  const progress = createDefaultExplorationProgress();
  const advanced = advanceExplorationRecord(progress, 'polar_shore', 10);
  assert.equal(advanced.area.progress, 10);
  assert.equal(advanced.newlyReachedMilestones[0].percent, 10);
  assert.equal(advanced.newlyUnlockedStories.length, 1);
  const spent = new Set(CAMP_UPGRADES.flatMap((level) => Object.keys(level.materials)));
  assert.equal(spent.size, 6);
  assert.equal(normalizeCampProgress(null).level, 0);
});
