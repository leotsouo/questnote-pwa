import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { getPetSpecialty, planExpeditionResult, getDispatchTerms } from '../src/expeditionGameplay.js';
import { validatePet } from '../src/petDataSchema.js';
import { normalizePoolDefinition, resolvePetRevealKey, validatePoolContent } from '../src/poolContentContract.js';
import { shouldUseThemedSummon } from '../src/poolPresentation.js';
import { getMaterialSourceLabel } from '../src/workshopService.js';
import { lionheartPreludeDurations } from '../src/lionheartScene.js';

const oldSource = execFileSync('git', ['show', 'ed81995648ba9b60c27207ba1ab3148afa6b2688:src/expeditionGameplay.js'], { encoding: 'utf8' }).replace(/^export /gm, '');
const pets = JSON.parse(fs.readFileSync(new URL('../data/pets.json', import.meta.url))).pets;
const publishedPets = JSON.parse(execFileSync('git', ['show', 'e17be761f61b7480ae663e1be5cef3f9baa2efec:data/pets.json'], { encoding: 'utf8' })).pets;
const pool = { id: 'lionheart_inverse_oath', name: '逆造之誓召喚', active: true, cost: 100,
  rates: { N: .55, R: .3, SR: .1, SSR: .03, UR: .02 }, pity: { ssr: 30, ur: 100 },
  petFilter: { poolTags: ['lionheart_inverse_oath'] },
  presentation: { themeKey: 'lionheart_inverse_oath', animationKey: 'lionheart_inverse_oath', featuredPetIds: [] } };
const area = { id: 'lionheart_city', energyCost: 5, durationMinutes: 60,
  rewards: { stardust: { min: 30, max: 60 }, material: { id: 'machine_part', min: 1, max: 2 }, bondExp: 10 } };

test('explicit specialties work without changing any published pet at every star level', () => {
  for (const pet of publishedPets) for (const stars of [1, 3, 5]) {
    const current = { ...pet, stars };
    const old = JSON.parse(JSON.stringify(runInNewContext(oldSource + `\ngetPetSpecialty(${JSON.stringify(current)});`)));
    const actual = getPetSpecialty(current);
    assert.deepEqual({ role:actual.role, label:actual.label, level:actual.level }, { role:old.role, label:old.label, level:old.level }, pet.id);
  }
  for (const role of ['scout', 'gatherer', 'companion', 'scholar', 'guardian']) {
    assert.equal(getPetSpecialty({ id: 'new', element: 'fire_machine', expeditionSpecialty: role }).role, role);
  }
});

test('invalid explicit specialties are rejected by both shared catalog validators', () => {
  const pet = { ...pets[0], expeditionSpecialty: 'light_god' };
  assert.ok(validatePet(pet).errors.some((e) => e.code === 'PET_SPECIALTY_INVALID'));
  assert.ok(validatePoolContent({ pools: [pool] }, { pets: [pet] }).errors.some((e) => e.code === 'PET_SPECIALTY_INVALID'));
  assert.equal(getPetSpecialty(pet).role, getPetSpecialty(pets[0]).role);
});

test('pure biological wind griffin can actually scout and improve exploration', () => {
  const griffin = { id: 'griffin', name: '天律之冕・格里芬', element: 'wind', speciesType: 'griffin', rarity: 'UR', expeditionSpecialty: 'scout' };
  const result = planExpeditionResult(area, [griffin], 'explore', () => .99);
  assert.equal(result.specialtySummary[0].role, 'scout');
  assert.equal(result.explorationGain, 3);
  assert.equal(result.event.text, '隊伍巡查獅心城公共管線，帶回回收零件；研究區的壓力仍在升高。');
  assert.deepEqual(getDispatchTerms(area, true), { energyCost: 5, durationMinutes: 60, firstJourney: false });
});

test('city discovery and specialist material bonus reach the real planner', () => {
  const result = planExpeditionResult(area, [{ id: 'owl', rarity: 'SR', expeditionSpecialty: 'scholar' }], 'gather', () => 0);
  assert.match(result.event.text, /從模仿格里芬轉向突破格里芬/);
  assert.equal(result.rewards.materials.machine_part, 3);
});

test('dedicated template and both UR reveal keys are accepted by actual presentation routing', () => {
  assert.equal(normalizePoolDefinition(pool).presentation.animationKey, 'lionheart_inverse_oath');
  assert.equal(shouldUseThemedSummon(pool), true);
  for (const revealKey of ['lionheart_griffin', 'lionheart_chimera']) {
    assert.equal(resolvePetRevealKey({ id: 'pet_ur99', rarity: 'UR', presentation: { revealKey } }), revealKey);
  }
  assert.equal(lionheartPreludeDurations(false).reduce((a, b) => a + b), 3000);
  assert.equal(lionheartPreludeDurations(true).reduce((a, b) => a + b), 500);
});

test('workshop shows new gear source without mutating the original catalog row', () => {
  const material = { id: 'machine_part', sourceArea: '古代機械遺跡' };
  const areas = [{ name: '古代機械遺跡', rewards: { material: { id: material.id } } }, { name: '獅心城', rewards: { material: { id: material.id } } }];
  assert.equal(getMaterialSourceLabel(material, areas), '古代機械遺跡、獅心城');
  assert.deepEqual(material, { id: 'machine_part', sourceArea: '古代機械遺跡' });
});


test('new pool authored chapters merge additively and reject attempts to replace published stories', async () => {
  const { mergeBondStorySupplements, validateBondStories } = await import('../src/bondStoryCatalog.js');
  const { validateLoreEntry } = await import('../src/petDataSchema.js');
  const catalog = JSON.parse(fs.readFileSync(new URL('../data/bond-stories.json', import.meta.url)));
  const draft = JSON.parse(fs.readFileSync(new URL('../content/pet-series/lionheart_inverse_oath/pets-lore.json', import.meta.url)));
  const newPets = JSON.parse(fs.readFileSync(new URL('../content/pet-series/lionheart_inverse_oath/pets.json', import.meta.url))).pets;
  const original = JSON.stringify(catalog);
  const merged = mergeBondStorySupplements(catalog, draft);
  const coveredIds = new Set([...catalog.stories.map(story => story.petId), ...newPets.map(pet => pet.id)]);
  assert.deepEqual(validateBondStories(merged, pets.filter(pet => coveredIds.has(pet.id))), []);
  assert.equal(JSON.stringify(catalog), original);
  assert.equal(merged.stories.length, catalog.stories.length + newPets.length);
  assert.throws(() => mergeBondStorySupplements(catalog, { lore: [{ id: pets[0].id, bondJourneyStory: catalog.stories[0] }] }));
  const broken = structuredClone(draft.lore[0]); broken.bondJourneyStory.chapters[0].choices = [];
  assert.ok(validateLoreEntry(broken).errors.some(x => x.code === 'LORE_BOND_STORY_INVALID'));
});

test('city has five real stories with the authored one-time rewards and readable badge', async () => {
  const { getExplorationMilestones, AREA_STORIES, formatMilestoneReward } = await import('../src/explorationService.js');
  const milestones = getExplorationMilestones('lionheart_city');
  assert.deepEqual(milestones.map(x => x.percent), [10, 25, 50, 75, 100]);
  assert.deepEqual(milestones.map(x => x.reward.stardust), [30, 50, 80, 120, 200]);
  assert.ok(milestones.every(x => AREA_STORIES[x.storyId].length > 40));
  assert.match(formatMilestoneReward(milestones[4].reward), /逆造見證者/);
  assert.equal(milestones[4].reward.title, '獅心城見證者');
});
