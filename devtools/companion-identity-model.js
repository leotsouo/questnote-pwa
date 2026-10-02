import { getEligiblePetsForPool } from '../src/petPoolFilter.js';
import { resolveEffectivePool } from '../src/poolContentContract.js';
import { FRAGMENT_BY_RARITY } from '../src/collectionService.js';

export const RARITIES = ['N', 'R', 'SR', 'SSR', 'UR'];

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

export function displayResult(pet, duplicate = false) {
  return { pet, isNew: !duplicate, fragmentsGained: duplicate ? FRAGMENT_BY_RARITY[pet.rarity] : 0 };
}

export function applyDisplayResult(collection, result) {
  const next = new Map(collection);
  const old = next.get(result.pet.id);
  next.set(result.pet.id, { stars: 1, bondLevel: 1, fragments: 0, ...old,
    fragments: (old?.fragments || 0) + result.fragmentsGained });
  return next;
}
