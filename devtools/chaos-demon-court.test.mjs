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

import { DARKCROWN_EXPLORATION, DARKCROWN_STORIES } from '../src/darkcrownExploration.js';
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

