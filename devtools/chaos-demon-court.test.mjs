import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePoolDefinition, resolvePetRevealKey } from '../src/poolContentContract.js';
import { shouldUseThemedSummon } from '../src/poolPresentation.js';
import { CHAOS_MOTIFS, createChaosDemonCourtScene } from '../src/chaosDemonCourtScene.js';
const pool = { id:'chaos_demon_court', name:'黯冠王庭', active:true, cost:100,
  rates:{N:.55,R:.30,SR:.1,SSR:.03,UR:.02}, pity:{ssr:30,ur:100},
  petFilter:{poolTags:['chaos_demon_court']},
  presentation:{themeKey:'chaos_demon_court',animationKey:'chaos_demon_court',featuredPetIds:[]} };
test('dark court routes through the shared contract and themed summon', () => {
  assert.equal(normalizePoolDefinition(pool).presentation.themeKey, 'chaos_demon_court');
  assert.equal(shouldUseThemedSummon(pool), true);
  for (const motif of CHAOS_MOTIFS) assert.equal(resolvePetRevealKey({id:'pet_ur99',rarity:['thorn','mirror','law','star'].includes(motif)?'SSR':'UR',presentation:{revealKey:'chaos_'+motif}}), 'chaos_'+motif);
});
test('all seven original motifs render with resisting routes and reject arbitrary markup', () => {
  const previous = globalThis.document;
  globalThis.document = {createElement:()=>({dataset:{},setAttribute(){}})};
  try {
    for (const motif of CHAOS_MOTIFS) {
      const scene = createChaosDemonCourtScene(motif);
      assert.equal(scene.dataset.motif,motif);
      assert.equal((scene.innerHTML.match(/<path stroke=/g)||[]).length,7);
      assert.ok(scene.innerHTML.includes('chaos-crown'));
    }
    const scene = createChaosDemonCourtScene('<script>');
    assert.equal(scene.dataset.motif,'crown');
    assert.ok(!scene.innerHTML.includes('<script>'));
  } finally { globalThis.document=previous; }
});

test('new SSR motifs cannot leak to low rarities or replace UR identity', () => {
  assert.throws(() => resolvePetRevealKey({rarity:'SR',presentation:{revealKey:'chaos_thorn'}}));
  assert.throws(() => resolvePetRevealKey({rarity:'UR',presentation:{revealKey:'chaos_thorn'}}));
  assert.throws(() => resolvePetRevealKey({rarity:'SSR',presentation:{revealKey:'chaos_crown'}}));
});

import { AREA_STORIES as DARKCROWN_STORIES, AREA_EXPLORATION_DEFS } from '../src/explorationService.js';
const DARKCROWN_EXPLORATION = AREA_EXPLORATION_DEFS.darkcrown_border;
import { planExpeditionResult } from '../src/expeditionGameplay.js';
import { createDefaultExplorationProgress, advanceExplorationRecord } from '../src/explorationService.js';
test('darkcrown real planner and five milestone stories preserve separate old regions', () => {
  assert.deepEqual(DARKCROWN_EXPLORATION.milestones.map(m=>m.percent),[10,25,50,75,100]);
  for(const m of DARKCROWN_EXPLORATION.milestones) assert.ok(DARKCROWN_STORIES[m.storyId].length>80);
  const state=createDefaultExplorationProgress();const old=structuredClone(state.areas.cloudrest_trail);
  const result=advanceExplorationRecord(state,'darkcrown_border',100);
  assert.equal(result.record.areas.darkcrown_border.progress,100);
  assert.deepEqual(result.record.areas.cloudrest_trail,old);
  const planned=planExpeditionResult({id:'darkcrown_border',rewards:{stardust:{min:30,max:60},material:{id:'forest_leaf',min:1,max:2},bondExp:10}},[{id:'pet_sr99',name:'固定魔獸',rarity:'SR',expeditionSpecialty:'scholar'}],'explore',()=>0);
  assert.ok(planned.event.text.includes('七地'));
});


import { beginPetAwakening, advancePetAwakening, validatePetAwakening } from '../src/petAwakeningCore.js';
import { DARKCOURT_AWAKENING_IDS, getAwakeningProfile } from '../src/petAwakeningProfiles.js';
import { awakeningWizardStep, renderAwakeningReader, renderAwakeningGuide, awakeningPortrait } from '../src/petAwakeningView.js';
test('exactly seven allocated high-rank IDs use darkcrown; wrong area and low ranks cannot count', () => {
  const at='2026-10-08T00:00:00.000Z',later='2026-10-08T00:01:00.000Z';
  assert.equal(DARKCOURT_AWAKENING_IDS.length,7);
  for(const id of DARKCOURT_AWAKENING_IDS) {
    const started=beginPetAwakening(null,id,at);
    const event={key:'expedition:test',at:later,startedAt:at,petIds:[id]};
    assert.equal(advancePetAwakening(started,[{...event,areaId:'cloudrest_trail'}]).byPet[id].expeditionKey,null);
    const right=advancePetAwakening(started,[{...event,areaId:'darkcrown_border'}]);
    assert.equal(right.byPet[id].expeditionKey,event.key);
    assert.deepEqual(validatePetAwakening(right),[]);
    assert.equal(getAwakeningProfile(id).foodId,'item_chaos_ember_tart');
  }
  for(const id of ['pet_sr51','pet_r57','pet_n50']) assert.throws(()=>beginPetAwakening(null,id,at));
});
test('dark wizard requires its own food and leaves initial canonical draw appearance intact', () => {
  const id='pet_ur28',at='2026-10-08T00:00:00.000Z',later='2026-10-08T00:01:00.000Z';
  const ready=advancePetAwakening(beginPetAwakening(null,id,at),[1,2,3].map(n=>({key:'task:'+n,at:later})).concat({key:'expedition:1',at:later,startedAt:at,areaId:'darkcrown_border',petIds:[id]}));
  const pet={id,name:'黯冠',rarity:'UR',owned:true,bondLevel:5,image:'beast.png'};
  const entry={petId:id,name:'黯冠',tokenName:'裂冠信物',trialTitle:'七路之約',initialImage:{original:'beast.png'},awakenedImage:{original:'human.png'},story:['one','two'],dialogue:['one','two','three']};
  const state={petAwakening:ready,bondJourney:{byPet:{[id]:{chapters:{5:{claimedAt:at}}}}},inventory:{items:{item_pine_trail_riceball:1}},awakeningCatalog:{pets:[entry]}};
  assert.equal(awakeningWizardStep(pet,state),'food');
  assert.ok(renderAwakeningReader(pet,state).includes('黯莓餘燼塔'));
  state.inventory.items.item_chaos_ember_tart=1;
  assert.equal(awakeningWizardStep(pet,state),'ritual');
  assert.equal(awakeningPortrait(pet,ready,state.awakeningCatalog).image,'beast.png');
  assert.ok(renderAwakeningGuide({compact:true,poolId:'darkcrown_court_release'}).includes('七位 UR／SSR'));
  assert.ok(!renderAwakeningGuide({compact:true,poolId:'darkcrown_court_release'}).includes('松香行旅糰'));
});
