import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { loadGiftAffinities, getGiftAffinityTags, getFavoriteBonus, getGiftRecommendations,
  GIFT_TAG_LABELS, normalizeInventory, companionLikesAnyGift } from '../src/workshopService.js';
import { buildWorkshopGiftView } from '../src/workshopGiftView.js';

const read = async (name) => JSON.parse(await fs.readFile(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const [items, materials, pets, lore, affinities] = await Promise.all(
  ['craftables', 'materials', 'pets', 'pets-lore', 'gift-affinities'].map(read));
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  assert.equal(url, './data/gift-affinities.json');
  return new Response(JSON.stringify(affinities));
};
try { await loadGiftAffinities(); } finally { globalThis.fetch = nativeFetch; }
const item = (id) => items.find((row) => row.id === id);
const pet = (id, overrides = {}) => ({ ...pets.pets.find((row) => row.id === id), owned: true, bondExp: 0, bondLevel: 1, ...overrides });
const fire = item('item_fire_meat');
const date = '2026-10-01';
const inventory = { items: { item_fire_meat: 2, item_small_spirit_food: 1 }, itemUsageLogs: {} };
const model = (overrides = {}) => buildWorkshopGiftView({ items, pets: [pet('pet_n04'), pet('pet_sr04')], inventory, date, ...overrides });

test('six gift themes consume every available material; every recipe and affinity reference is valid', () => {
  assert.equal(items.length, 10);
  assert.equal(new Set(items.map((row) => row.id)).size, items.length);
  const themed = items.filter((row) => row.type === 'favorite_bond_item');
  assert.deepEqual(themed.flatMap((row) => row.favoriteTags).sort(), Object.keys(GIFT_TAG_LABELS).sort());
  const knownMaterials = new Set(materials.map((row) => row.id));
  const usedMaterials = new Set();
  for (const row of themed) {
    assert.deepEqual(row.effect, { bondExp: 75, favoriteBonusBondExp: 150 });
    for (const [id, quantity] of Object.entries(row.recipe)) {
      assert.ok(knownMaterials.has(id));
      assert.ok(Number.isInteger(quantity) && quantity > 0);
      usedMaterials.add(id);
    }
  }
  assert.deepEqual([...usedMaterials].sort(), [...knownMaterials].sort());
  assert.deepEqual(Object.keys(affinities.giftAffinityTags).sort(), pets.pets.map((row) => row.id).sort());
  const elementTags = { 木: 'nature', 火: 'fire', 機械: 'machine', 星: 'astral', 冰: 'frost' };
  for (const row of lore.lore) {
    if (elementTags[row.element]) assert.ok(affinities.giftAffinityTags[row.id].includes(elementTags[row.element]));
  }
});

test('original six IDs, effects and recipes preserve existing inventory economics', () => {
  const expected = [
    ['item_small_spirit_food', 10, { forest_leaf: 2 }],
    ['item_warm_snack', 25, { forest_leaf: 4, lava_core: 1 }],
    ['item_stardust_candy', 50, { forest_leaf: 3, machine_part: 2, star_shard: 1 }],
    ['item_fire_meat', 75, { lava_core: 3, forest_leaf: 2 }],
    ['item_machine_biscuit', 75, { machine_part: 4, star_shard: 1 }],
    ['item_astral_honey', 100, { star_shard: 3, forest_leaf: 8, machine_part: 2 }],
  ];
  for (const [id, exp, recipe] of expected) {
    assert.equal(item(id).effect.bondExp, exp);
    assert.deepEqual(item(id).recipe, recipe);
  }
});

test('fire affinity grants 150; dogs and misleading names cannot infer affinity', () => {
  assert.equal(getFavoriteBonus(fire, pet('pet_n04')).bondExp, 150);
  const dog = pet('pet_sr04', { name: '火焰犬', nickname: '火花', description: '最愛熔岩', speciesType: 'dog', element: '火' });
  assert.equal(getFavoriteBonus(fire, dog).bondExp, 75);
  assert.equal(getFavoriteBonus(fire, dog).isFavorite, false);
  assert.equal(getFavoriteBonus(fire, pet('pet_n04', { name: '冰犬', description: '', nickname: '機器' })).bondExp, 150);
});

test('multi-affinity partners match multiple gifts without stacking; ordinary honey stays universal', () => {
  const eve = pet('pet_sp06');
  assert.deepEqual(getGiftAffinityTags(eve), ['machine', 'astral']);
  assert.equal(getFavoriteBonus(item('item_machine_biscuit'), eve).bondExp, 150);
  assert.equal(getFavoriteBonus(item('item_star_crisp'), eve).bondExp, 150);
  const match = getFavoriteBonus({ ...fire, favoriteTags: ['machine', 'astral', 'machine'] }, eve);
  assert.equal(match.bondExp, 150);
  assert.deepEqual(match.matchedTags, ['machine', 'astral']);
  assert.equal(getFavoriteBonus(item('item_astral_honey'), eve).bondExp, 100);
  assert.equal(getFavoriteBonus(item('item_astral_honey'), eve).isFavorite, false);
});

test('recommendations prioritize eligible non-max partners then levels/exp/ID; daily limits stay last', () => {
  const partners = [pet('pet_sr02', { bondLevel: 3, bondExp: 150 }), pet('pet_ssr01', { bondLevel: 5, bondExp: 500 }),
    pet('pet_sp03', { bondLevel: 2, bondExp: 51 }), pet('pet_r12', { bondLevel: 2, bondExp: 51 }),
    pet('pet_r02'), pet('pet_n04'), pet('pet_sr04'), pet('pet_n01', { owned: false })];
  const limited = { ...inventory, itemUsageLogs: { [date]: { pet_n04: { bondItemsUsed: 5 } } } };
  const result = getGiftRecommendations(fire, partners, limited, date);
  assert.deepEqual(result.recommended.map((row) => row.pet.id), ['pet_r02', 'pet_r12', 'pet_sp03', 'pet_sr02', 'pet_ssr01', 'pet_n04']);
  assert.deepEqual(result.others.map((row) => row.pet.id), ['pet_sr04']);
  assert.equal(result.recommended.at(-1).atDailyLimit, true);
  assert.equal(result.recommended.at(-2).atMaxLevel, true);
});

test('unknown affinity and zero favorite partners still allow basic gifts; universal lists never claim favorites', () => {
  assert.deepEqual(getGiftAffinityTags({ id: 'new_future_pet' }), []);
  assert.equal(getFavoriteBonus(fire, { id: 'new_future_pet' }).bondExp, 75);
  const basic = getGiftRecommendations(item('item_small_spirit_food'), [pet('pet_n04'), pet('pet_sr04')], inventory, date);
  assert.equal(basic.themed, false);
  assert.equal(basic.recommended.length, 2);
  assert.equal(basic.others.length, 0);
  const view = model({ pets: [pet('pet_sr04')], itemId: fire.id });
  assert.match(view.html, /尚未擁有喜歡這份禮物/);
  assert.match(view.html, /其他夥伴/);
});

test('item-first view requires explicit item and recipient selections', () => {
  const start = model();
  assert.equal(start.itemId, null);
  assert.equal(start.petId, null);
  assert.doesNotMatch(start.html, /data-action="select-gift-pet"|data-action="gift-item"/);
  const recommendations = model({ itemId: fire.id });
  assert.match(recommendations.html, /喜歡火系禮物/);
  assert.doesNotMatch(recommendations.html, /data-action="gift-item"/);
  const confirm = model({ itemId: fire.id, petId: 'pet_n04' });
  assert.match(confirm.html, /確認贈送 1 份/);
  assert.match(confirm.html, /消耗：1 份/);
  assert.match(confirm.html, /預計升級至 Lv.3/);
});

test('exhaustion resets choices and preserves success; unowned recipient is discarded', () => {
  const exhausted = model({ itemId: fire.id, petId: 'pet_n04', inventory: { items: { item_fire_meat: 0 }, itemUsageLogs: {} }, message: '親密度提升 +150' });
  assert.equal(exhausted.itemId, null);
  assert.equal(exhausted.petId, null);
  assert.match(exhausted.html, /role="status"/);
  assert.match(exhausted.html, /親密度提升 \+150/);
  assert.doesNotMatch(model({ itemId: fire.id, petId: 'unowned' }).html, /data-action="gift-item"/);
});

test('limited/busy confirmation is disabled; max-level and basic effects are explicit', () => {
  const limited = model({ itemId: fire.id, petId: 'pet_n04', inventory: { ...inventory, itemUsageLogs: { [date]: { pet_n04: { bondItemsUsed: 5 } } } } });
  assert.match(limited.html, /今日已達收禮上限/);
  assert.match(limited.html, /data-action="gift-item"[^>]+disabled/s);
  const busy = model({ itemId: fire.id, petId: 'pet_n04', busy: true });
  assert.match(busy.html, /aria-busy="true"/);
  assert.match(busy.html, /data-action="gift-item"[^>]+disabled/s);
  const max = model({ itemId: fire.id, petId: 'pet_n04', pets: [pet('pet_n04', { bondExp: 500, bondLevel: 5 })] });
  assert.match(max.html, /已達最高等級，本次仍會消耗禮物/);
  const basic = model({ itemId: fire.id, petId: 'pet_sr04' });
  assert.match(basic.html, /使用後增加：\+75/);
  assert.match(basic.html, /<details[^>]+open/);
});

test('nickname HTML is escaped and old inventories/usage logs survive normalization', () => {
  const view = model({ itemId: fire.id, petId: 'pet_n04', pets: [pet('pet_n04', { nickname: '<img src=x onerror=alert(1)>' })] });
  assert.doesNotMatch(view.html, /<img src=x/);
  assert.match(view.html, /&lt;img/);
  const old = { key: 'inventory', items: { item_fire_meat: 4, future_unknown_item: 7 }, itemUsageLogs: { [date]: { pet_n04: { bondItemsUsed: 3 } } } };
  assert.deepEqual(normalizeInventory(old), old);
  assert.equal(companionLikesAnyGift(pet('pet_n04'), old, items), true);
  assert.equal(companionLikesAnyGift(pet('pet_sr04'), old, items), false);
});

test('actual source worker installs all real assets and serves gift modules/data with the network unavailable', async () => {
  const source = await fs.readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
  const base = 'https://questnote-test.invalid/';
  const handlers = {};
  const entries = new Map();
  let offline = false;
  let networkCalls = 0;
  const cache = {
    match: async (request) => entries.get(typeof request === 'string' ? request : request.url)?.clone(),
    put: async (request, response) => entries.set(typeof request === 'string' ? request : request.url, response.clone()),
  };
  runInNewContext(source, { URL, Request, Response, Uint8Array, crypto: webcrypto, setTimeout, clearTimeout, AbortController,
    caches: { open: async () => cache },
    fetch: async (request) => {
      networkCalls += 1;
      if (offline) throw new Error('Network unavailable');
      const url = new URL(typeof request === 'string' ? request : request.url);
      return new Response(await fs.readFile(new URL('..' + url.pathname, import.meta.url)));
    },
    self: { location: { href: base + 'service-worker.js' }, addEventListener: (name, handler) => { handlers[name] = handler; } },
  });
  let installing;
  handlers.install({ waitUntil: (promise) => { installing = promise; } });
  await installing;
  offline = true;
  const installedCalls = networkCalls;
  for (const path of ['src/workshopGiftView.js', 'src/workshopService.js', 'data/gift-affinities.json', 'data/craftables.json']) {
    let response;
    handlers.fetch({ request: new Request(base + path), respondWith: (promise) => { response = promise; } });
    const cached = await response;
    assert.equal(cached.status, 200);
    assert.equal(await cached.text(), await fs.readFile(new URL('../' + path, import.meta.url), 'utf8'));
  }
  let navigation;
  handlers.fetch({ request: { url: base + 'index.html?offline=1', method: 'GET', mode: 'navigate' },
    respondWith: (promise) => { navigation = promise; } });
  assert.equal((await navigation).status, 200);
  assert.equal(networkCalls, installedCalls, 'Gift offline reads must come from the installed generation');
});
