import { getEligiblePetsForPool } from '../src/petPoolFilter.js';
import { resolveEffectivePool } from '../src/poolContentContract.js';
import { FRAGMENT_BY_RARITY, STAR_UPGRADE_COST } from '../src/collectionService.js';

export const RARITIES = ['N', 'R', 'SR', 'SSR', 'UR'];
export const MAX_DISPLAY_STARS = Math.max(...Object.keys(STAR_UPGRADE_COST).map(Number));

const PUBLIC_INTROS = {
  pet_n01: '棲息於迷霧森林的幼狼，雙眼在夜間泛著幽藍微光。',
  pet_ur19: '生於獅心城外高崖的格里芬，鷹首、巨翼與獅身的力量在牠體內達成平衡。牠以天然羽翼感知風向，守護自己的領域。',
  pet_ssr25: '負責試飛塔與城市高架受力結構的夥伴，厚皮外覆著黃銅工作支架。牠願意支持試飛，也始終留意下方街道的安全。',
};

export function publicIntro(pet) {
  return PUBLIC_INTROS[pet.id] || (pet.description || '').split(/(?<=[。！？])/).slice(0, 2).join('');
}

export function normalGreeting(pet) {
  return Array.isArray(pet.dialogues?.normal) ? pet.dialogues.normal.find((line) => typeof line === 'string' && line.trim()) || '' : '';
}

export function seedDisplayCollection() {
  const collection = new Map(['pet_n01', 'pet_n09', 'pet_n39', 'pet_r41', 'pet_ssr25', 'pet_ur20'].map((id) => [id, { stars: 1, bondLevel: 1, fragments: 0 }]));
  collection.set('pet_n01', { ...collection.get('pet_n01'), nickname: '小灰', isCompanion: true });
  collection.set('pet_ur20', { ...collection.get('pet_ur20'), stars: MAX_DISPLAY_STARS });
  return collection;
}

export function poolCandidates(pets, pool, unlocked = false) {
  return getEligiblePetsForPool(pets, resolveEffectivePool(pool, { unlocked }));
}

export function identityLabel(pet, owned, nickname = '') {
  return [pet.name, pet.title, pet.rarity, owned ? '已擁有' : '尚未相遇', nickname ? `你的暱稱：${nickname}` : ''].filter(Boolean).join('，');
}

export function basePetRate(pet, candidates, pool) {
  const count = candidates.filter((row) => row.rarity === pet.rarity).length;
  return count ? (pool.rates[pet.rarity] || 0) / count : 0;
}

export function displayResult(pet, duplicate = false, entry = null) {
  return { pet, isNew: !duplicate, fragmentsGained: duplicate ? FRAGMENT_BY_RARITY[pet.rarity] : 0,
    starsAtEncounter: entry?.stars || 1 };
}

export function applyDisplayResult(collection, result) {
  const next = new Map(collection);
  const old = next.get(result.pet.id);
  next.set(result.pet.id, { stars: 1, bondLevel: 1, fragments: 0, ...old,
    fragments: (old?.fragments || 0) + result.fragmentsGained });
  return next;
}

// All ten outcomes are computed in order before presentation. The same pet's
// second appearance is a duplicate even when its first appearance was new.
export function prepareDisplayBatch(collection, pets) {
  let next = new Map(collection);
  const results = pets.map((pet) => {
    const result = displayResult(pet, next.has(pet.id), next.get(pet.id));
    next = applyDisplayResult(next, result);
    return result;
  });
  return { results, collection: next };
}

export function tenPreviewPets(candidates) {
  const cohort = (rarity) => candidates.filter((pet) => pet.rarity === rarity);
  const n = cohort('N');
  const r = cohort('R');
  const sr = cohort('SR');
  const ssr = cohort('SSR');
  const ur = cohort('UR');
  return [n[0], n[1] || n[0], r[1] || r[0], sr[0], n[1] || n[0], ssr[0], r[0], ur[0], ssr[1] || ssr[0], ur[1] || ur[0]];
}

export function duplicateNote(result) {
  return result.starsAtEncounter >= MAX_DISPLAY_STARS ? '已達最高星級，碎片繼續累積。' : '碎片可用於這位夥伴的升星。';
}

export function setDisplayCompanion(collection, petId) {
  if (!collection.has(petId)) return new Map(collection);
  return new Map([...collection].map(([id, entry]) => [id, { ...entry, isCompanion: id === petId }]));
}
