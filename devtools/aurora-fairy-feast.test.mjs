import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizePoolDefinition } from '../src/poolContentContract.js';
import { shouldUseThemedSummon } from '../src/poolPresentation.js';
import { createAuroraFairyScene, fairyPreludeDurations } from '../src/auroraFairyScene.js';
import { FAIRY_AWAKENING_IDS, getAwakeningProfile } from '../src/petAwakeningProfiles.js';
import { validateAwakeningCatalog } from '../src/petAwakeningCatalog.js';
import { beginPetAwakening, advancePetAwakening } from '../src/petAwakeningCore.js';
import { checkAreaUnlock, MATERIAL_LABELS } from '../src/expeditionService.js';
import { AREA_STORIES, AREA_EXPLORATION_DEFS } from '../src/explorationService.js';
import { planExpeditionResult } from '../src/expeditionGameplay.js';

const proposal = JSON.parse(fs.readFileSync(new URL('../content/pool-proposals/aurora_fairy_feast/proposal.json', import.meta.url)));
const catalog = JSON.parse(fs.readFileSync(new URL('../data/pet-awakening.json', import.meta.url)));
const area = { ...proposal.region, rewards: { ...proposal.region.rewards, material: { ...proposal.region.rewards.material } } };

test('new presentation uses shared clocks and collision-free SVG paint IDs', () => {
  const pool = normalizePoolDefinition({ id:proposal.poolId, name:proposal.name, active:true, cost:100,
    rates:{ N:.55, R:.3, SR:.1, SSR:.03, UR:.02 }, pity:{ ssr:30, ur:100 }, petFilter:{ poolTags:[proposal.poolId] },
    presentation:{ themeKey:proposal.poolId, animationKey:proposal.poolId } });
  assert.equal(shouldUseThemedSummon(pool), true);
  assert.deepEqual(fairyPreludeDurations(false), [650,750,900,700]);
  assert.equal(fairyPreludeDurations(true).reduce((a,b)=>a+b), 500);
  const previous = globalThis.document;
  globalThis.document = { createElement:()=>({ dataset:{}, setAttribute(){} }) };
  try {
    const a=createAuroraFairyScene('hearth'), b=createAuroraFairyScene('mist');
    const ids=a.innerHTML.match(/id="([^"]+)"/g);
    for (const id of ids) assert.ok(!b.innerHTML.includes(id));
    assert.equal((a.innerHTML.match(/<svg /g)||[]).length, 1);
  } finally { globalThis.document=previous; }
});

test('region accepts only this pool base or expansion pets and supplies real story/material', () => {
  assert.equal(checkAreaUnlock(area, []).unlocked, false);
  assert.equal(checkAreaUnlock(area, [{ name:'霓霞仙女', element:'木', poolTags:['harvest_fields'] }]).unlocked, false);
  for(const tag of area.unlock.poolTags) assert.equal(checkAreaUnlock(area, [{ poolTags:[tag] }]).unlocked, true);
  const definition=AREA_EXPLORATION_DEFS[area.id];
  assert.deepEqual(definition.milestones.map(m=>m.percent), [10,25,50,75,100]);
  for(const m of definition.milestones) assert.ok(AREA_STORIES[m.storyId]);
  const result=planExpeditionResult(area, [{ id:'test', rarity:'SR', expeditionSpecialty:'scholar' }], 'gather', ()=>0);
  assert.equal(result.rewards.materials.aurora_flower_dew, 3);
  assert.ok(result.event.text.includes('舊食譜'));
  assert.equal(MATERIAL_LABELS.aurora_flower_dew, '霓霞花露');
});

test('only the four allocated SSR/UR accept fairy awakening; trial requires its own region', () => {
  const start='2026-10-10T00:00:00Z', after='2026-10-10T01:00:00Z';
  for(const id of FAIRY_AWAKENING_IDS) {
    const state=beginPetAwakening(null,id,start);
    const daily=[0,1,2].map(n=>({key:`task:${n}`,at:after}));
    const journey={key:'expedition:x',at:after,startedAt:after,petIds:[id],areaId:'cloudrest_trail'};
    assert.equal(advancePetAwakening(state,[...daily,journey]).byPet[id].tokenGrantedAt,null);
    assert.ok(advancePetAwakening(state,[...daily,{...journey,areaId:area.id}]).byPet[id].tokenGrantedAt);
    assert.equal(getAwakeningProfile(id).foodId, proposal.food.id);
  }
  for(const id of ['pet_n53','pet_r62','pet_sr56','pet_sr58']) assert.throws(()=>beginPetAwakening(null,id,start));
});

test('old awakening catalogs still validate; fairy expansion fails closed for partial/invalid pairs', () => {
  assert.deepEqual(validateAwakeningCatalog(catalog), []);
  const legacy = catalog.pets.filter(pet => !FAIRY_AWAKENING_IDS.includes(pet.petId));
  const entries=FAIRY_AWAKENING_IDS.map((petId,i)=>({ ...catalog.pets[0],petId,rarity:petId.startsWith('pet_ur')?'UR':'SSR',visual:['fairy_petal','fairy_mist','fairy_dew','fairy_hearth'][i],
    awakenedImage:catalog.pets.find(p=>p.awakenedImage).awakenedImage,awakenedSha256:'a'.repeat(64) }));
  assert.ok(validateAwakeningCatalog({...catalog,pets:[...legacy,entries[0]]}).length);
  assert.deepEqual(validateAwakeningCatalog({...catalog,pets:[...legacy,...entries]}), []);
  entries[0].rarity='SR';
  assert.ok(validateAwakeningCatalog({...catalog,pets:[...legacy,...entries]}).length);
});
