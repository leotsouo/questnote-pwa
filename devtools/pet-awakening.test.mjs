import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createPetAwakening, validatePetAwakening, normalizePetAwakening, beginPetAwakening, advancePetAwakening, awakeningEvents, AWAKENING_PET_IDS } from '../src/petAwakeningCore.js';
import { validateAwakeningCatalog } from '../src/petAwakeningCatalog.js';
import { awakeningPortrait, initialAwakeningPortrait, renderAwakeningGuide, renderAwakeningReader } from '../src/petAwakeningView.js';
import { awakeningDuration, awakeningSceneHtml } from '../src/petAwakeningScene.js';
import { validateBackup, migrateImportedData, normalizeBackupPayload } from '../src/backupService.js';
import { SNAPSHOT_KEYS } from '../src/backupSchema.js';
import { APP_VERSION } from '../src/version.js';
const catalog = JSON.parse(readFileSync(new URL('../data/pet-awakening.json', import.meta.url)));
const pets = JSON.parse(readFileSync(new URL('../data/pets.json', import.meta.url))).pets;
const at = '2026-10-02T02:00:00.000Z';
const later = '2026-10-02T03:00:00.000Z';
const start = () => beginPetAwakening(null, 'pet_ur17', at);
const daily = (n, when = later) => Array.from({ length: n }, (_, i) => ({ key: `task:t${i}`, at: when }));
const expedition = (props = {}) => ({ key: 'expedition:e1', at: later, startedAt: at, areaId: 'cloudrest_trail', petIds: ['pet_n36', 'pet_ur17'], ...props });
const ready = () => advancePetAwakening(start(), [...daily(3), expedition()]);
const awake = () => { const s = ready(); Object.assign(s.byPet.pet_ur17, { status: 'awakened', awakenedAt: later, tokenConsumedAt: later }); return s; };

test('all twenty authored entries preserve original hashes and have distinct stories, titles and tokens', () => {
  assert.deepEqual(validateAwakeningCatalog(catalog), []);
  assert.deepEqual(catalog.pets.map((p) => p.petId).sort(), [...AWAKENING_PET_IDS].sort());
  for (const field of ['title', 'tokenName', 'trialTitle']) assert.equal(new Set(catalog.pets.map((p) => p[field])).size, 20);
  for (const p of catalog.pets) {
    for (const [image, digest] of [[p.initialImage, p.initialSha256], [p.awakenedImage, p.awakenedSha256]]) {
      if (!image) continue;
      assert.equal(createHash('sha256').update(readFileSync(new URL(`../${image.original}`, import.meta.url))).digest('hex'), digest);
      for (const k of ['card', 'stage']) assert.ok(readFileSync(new URL(`../${image[k]}`, import.meta.url)).length > 1000);
    }
    assert.equal(awakeningDuration(p), p.rarity === 'UR' ? 5000 : 3000);
    assert.equal(awakeningDuration(p, true), 600);
  }
});
test('no history or events at acceptance count; reducer does not mutate input', () => {
  const s = start();
  assert.deepEqual(advancePetAwakening(s, daily(3, at)), s);
  const excluded = beginPetAwakening(null, 'pet_ur17', at, ['task:t0']);
  assert.equal(advancePetAwakening(excluded, daily(3)).byPet.pet_ur17.eventKeys.length, 2);
  assert.deepEqual(s, start());
});
test('task ID and habit ID/date remain globally unique after undo, replay and switching pets', () => {
  let s = advancePetAwakening(start(), [{ key: 'task:t1', at: later }, { key: 'habit:h1:2026-10-02', at: later }]);
  assert.equal(s.byPet.pet_ur17.eventKeys.length, 2);
  s = advancePetAwakening(s, [{ key: 'task:t1', at: later }, { key: 'habit:h1:2026-10-02', at: later }]);
  assert.equal(s.byPet.pet_ur17.eventKeys.length, 2);
  s.byPet.pet_ur17.status = 'paused'; s.activePetId = null;
  s = beginPetAwakening(s, 'pet_ur16', at);
  s = advancePetAwakening(s, [{ key: 'task:t1', at: later }, { key: 'habit:h1:2026-10-03', at: later }]);
  assert.deepEqual(s.byPet.pet_ur16.eventKeys, ['habit:h1:2026-10-03']);
  assert.deepEqual(validatePetAwakening(s), []);
});
test('only cloudrest claims with participant and a trial-era departure count', () => {
  for (const e of [expedition({ areaId: 'mist_forest' }), expedition({ petIds: ['pet_n36'] }), expedition({ startedAt: '2026-10-02T01:00:00Z' })]) {
    assert.equal(advancePetAwakening(start(), [e]).byPet.pet_ur17.expeditionKey, null);
  }
  assert.equal(advancePetAwakening(start(), [expedition()]).byPet.pet_ur17.expeditionKey, 'expedition:e1');
});
test('token guaranteed once, completion frees active slot and pause/resume preserves partial progress', () => {
  const r = ready();
  assert.equal(r.byPet.pet_ur17.status, 'ready'); assert.equal(r.activePetId, null);
  assert.equal(r.byPet.pet_ur17.tokenGrantedAt, later);
  assert.deepEqual(advancePetAwakening(r, daily(3)), r);
  let s = advancePetAwakening(start(), daily(1));
  s.byPet.pet_ur17.status = 'paused'; s.activePetId = null;
  assert.deepEqual(advancePetAwakening(s, daily(3)), s);
  s = beginPetAwakening(s, 'pet_ur17', '2026-10-02T04:00:00Z', ['task:t1']);
  assert.equal(advancePetAwakening(s, daily(3)).byPet.pet_ur17.eventKeys.length, 1);
  assert.throws(() => beginPetAwakening(s, 'pet_ur16', later));
});
test('malformed states reject duplicated credit, missing token, multiple active pets or unauthorised forms', () => {
  for (const mutate of [(s) => s.usedEventKeys.push(s.usedEventKeys[0]), (s) => { s.byPet.pet_ur17.tokenGrantedAt = null; },
    (s) => { s.byPet.pet_ur17.form = 'initial'; }, (s) => { s.schemaVersion = 2; }, (s) => { s.byPet.pet_ur17.eventKeys[0] = 'expedition:fake'; }]) {
    const s = ready(); mutate(s); assert.ok(validatePetAwakening(s).length); assert.throws(() => normalizePetAwakening(s));
  }
});
test('unawakened toad uses initial art; awakened forms never mutate canonical draw art', () => {
  const pet = { ...pets.find((p) => p.id === 'pet_ur17'), owned: true };
  assert.equal(awakeningPortrait(pet, ready(), catalog).image, catalog.pets.find((p) => p.petId === pet.id).initialImage.original);
  const s = awake();
  assert.deepEqual(validatePetAwakening(s), []);
  const display = awakeningPortrait(pet, s, catalog);
  assert.equal(display.image, catalog.pets.find((p) => p.petId === pet.id).awakenedImage.original);
  assert.notEqual(display.image, pet.image);
  s.byPet.pet_ur17.form = 'initial';
  assert.equal(awakeningPortrait(pet, s, catalog).image, catalog.pets.find((p) => p.petId === pet.id).initialImage.original);
  assert.ok(awakeningSceneHtml(catalog.pets.find((p) => p.petId === pet.id), pet).includes('pet_ur17-awakened-'));
});
test('all twenty previews and unawakened portraits use initial art, regardless of ownership; other pools unchanged', () => {
  for (const entry of catalog.pets) {
    const pet = pets.find((p) => p.id === entry.petId);
    const original = structuredClone(pet);
    for (const owned of [true, false]) {
      const display = awakeningPortrait({ ...pet, owned }, createPetAwakening(), catalog);
      assert.equal(display.image, entry.initialImage.original);
      assert.deepEqual(display.imageVariants, { card: entry.initialImage.card, stage: entry.initialImage.stage });
      assert.equal(display.fallbackImage, entry.initialImage.original);
    }
    assert.equal(initialAwakeningPortrait(pet, catalog).image, entry.initialImage.original);
    assert.deepEqual(pet, original);
    const state = { byPet: { [pet.id]: { awakenedAt: later, form: 'awakened' } } };
    assert.equal(awakeningPortrait({ ...pet, owned: true }, state, catalog).image, entry.awakenedImage?.original || pet.image);
    // Even a duplicate draw of an awakened pet still presents the initial encounter.
    assert.equal(initialAwakeningPortrait(pet, catalog).image, entry.initialImage.original);
    assert.equal(awakeningPortrait({ ...pet, owned: false }, state, catalog).image, entry.initialImage.original);
  }
  const other = pets.find((p) => !catalog.pets.some((e) => e.petId === p.id));
  assert.equal(initialAwakeningPortrait(other, catalog), other);
  assert.equal(awakeningPortrait(other, createPetAwakening(), catalog), other);
  assert.equal(initialAwakeningPortrait(null, catalog), null);
});
test('pool and full guide explain gates, trial-era departure and ritual without revealing awakened portraits', () => {
  for (const compact of [true, false]) {
    const html = renderAwakeningGuide({ compact });
    for (const text of ['Lv.5', '三筆任務／習慣', '接下後出發', '領取派遣獎勵', '信物一枚', '松香行旅糰一份', '可選', '抽卡機率']) assert.ok(html.includes(text), text);
    assert.ok(!html.includes('<img'));
  }
});
test('old backups default unawakened; current backups require and roundtrip progress/forms and reject malformed record', () => {
  const old = JSON.parse(readFileSync(new URL('./fixtures/backups/legacy-3.4.4.json', import.meta.url)));
  const normalized = migrateImportedData(normalizeBackupPayload(old));
  assert.deepEqual(normalized.petAwakening, createPetAwakening());
  const data = Object.fromEntries(SNAPSHOT_KEYS.map((k) => [k, normalized[k]]));
  data.petAwakening = awake(); data.petAwakening.byPet.pet_ur17.form = 'initial';
  const current = { app: 'QuestNote', version: 2, appVersion: APP_VERSION, data };
  assert.equal(validateBackup(current).valid, true);
  assert.deepEqual(migrateImportedData(normalizeBackupPayload(current)).petAwakening, data.petAwakening);
  delete data.petAwakening;
  assert.equal(validateBackup(current).valid, false);
  assert.equal(validateBackup({ ...current, appVersion: '3.5.3' }).valid, true);
  assert.equal(validateBackup({ ...current, appVersion: '3.5.4' }).valid, true);
  data.petAwakening = { broken: true };
  assert.equal(validateBackup(current).valid, false);
});
test('reader previews costs, rewards and workbench when food missing; escapes user nickname', () => {
  const pet = { id: 'pet_ur17', name: '<script>bad</script>', owned: true, bondLevel: 5 };
  const html = renderAwakeningReader(pet, { awakeningCatalog: catalog, petAwakening: ready(), inventory: { items: {} } }, '');
  assert.ok(html.includes('前往工坊製作')); assert.ok(html.includes('松香行旅糰')); assert.ok(html.includes('disabled'));
  assert.ok(!html.includes('<script>')); assert.ok(html.includes('覺醒篇章'));
});
