import test from 'node:test';
import assert from 'node:assert/strict';
import { planEncounterMigration, planCompanionInvitation, invitationCandidates, ENCOUNTER_FRAGMENTS_BY_RARITY } from '../src/encounterEconomyCore.js';
import { createCollectionEntry } from '../src/collectionService.js';
import { planGachaTransaction } from '../src/gachaTransactionCore.js';
import { getPetSpecialty, planExpeditionResult } from '../src/expeditionGameplay.js';
import { createPoolContentFixtures } from './fixtures/pool-content-fixtures.mjs';
const now = '2026-10-03T12:00:00.000Z';
const economy = (balance = 0) => ({ key:'encounterEconomy', schemaVersion:1, migrationVersion:1, balance, migrationReceipt:null });
const legacy = (stars, fragments = 0, id = 'pet_n01') => ({ ...createCollectionEntry(id, now), encounterMigrationVersion:0, stars, fragments });
test('reviewed refund cases and mixed collection convert exactly once without inventing bond', () => {
  const before = [legacy(1,0,'pet_n01'),legacy(2,7,'pet_r01'),legacy(3,0,'pet_sr01'),legacy(4,17,'pet_ssr01'),legacy(5,3,'pet_ur01')];
  const original = structuredClone(before);
  const after = planEncounterMigration({ collection:before, now });
  assert.equal(after.economy.balance,202);
  assert.deepEqual(after.economy.migrationReceipt.items.map((row) => row.total),[0,12,20,67,103]);
  assert.deepEqual(after.collection.map((row) => row.legacySpecialtyFloor),[1,2,3,4,5]);
  assert.ok(after.collection.every((row) => row.bondExp===0 && row.bondLevel===1 && !('stars' in row) && !('fragments' in row)));
  assert.deepEqual(before,original);
  const retry = planEncounterMigration({ economy:after.economy, collection:after.collection, now });
  assert.deepEqual(retry.economy,after.economy);
  assert.deepEqual(retry.changedCollection,[]);
});
test('fresh users have no conversion message; legacy 1-star users do', () => {
  assert.equal(planEncounterMigration({ collection:[], now }).economy.migrationReceipt,null);
  assert.equal(planEncounterMigration({ collection:[createCollectionEntry('pet_n01',now)], now }).economy.migrationReceipt,null);
  assert.equal(planEncounterMigration({ collection:[legacy(1)], now }).economy.migrationReceipt.total,0);
});
test('unknown catalog identities retain resources, nickname and story identity', () => {
  const row = { ...legacy(4,17,'pet_ur999'), nickname:'記得你', obtainedSource:'original_reward' };
  const after = planEncounterMigration({ collection:[row], now });
  assert.equal(after.economy.balance,67);
  assert.equal(after.collection[0].nickname,'記得你');
  assert.equal(after.collection[0].obtainedSource,'original_reward');
});
test('invalid, overflowing and inconsistent transitions fail without mutating inputs', () => {
  for (const row of [legacy(6),legacy(2,-1),legacy(4,Number.MAX_SAFE_INTEGER),{...legacy(2),encounterMigrationVersion:1}]) {
    const original=structuredClone(row); assert.throws(()=>planEncounterMigration({collection:[row],now})); assert.deepEqual(row,original);
  }
  assert.throws(()=>planEncounterMigration({collection:[legacy(1)],economy:economy(),now}),/未轉換/);
  assert.throws(()=>planEncounterMigration({economy:{...economy(),schemaVersion:2},now}),/不相容/);
});
test('SSR/UR invitation is a selected first encounter; owned, locked and other rarities cannot spend', () => {
  const f=createPoolContentFixtures();
  const input={allPets:f.pets,poolsData:f.catalog,collection:[],economy:economy(300),now};
  const ur=f.pets.find((p)=>p.rarity==='UR'&&p.poolTags.includes(f.alpha.id));
  const after=planCompanionInvitation({...input,petId:ur.id});
  assert.equal(after.result.balance,100); assert.equal(after.result.cost,200);
  assert.equal(after.result.entry.obtainedSource,'specified_invitation');
  assert.equal(after.result.entry.bondLevel,1); assert.equal(after.result.entry.bondExp,0);
  assert.throws(()=>planCompanionInvitation({...input,collection:after.collection,economy:after.economy,petId:ur.id}),/已相遇/);
  const locked=f.pets.find((p)=>p.rarity==='UR'&&p.poolTags.includes('fixture_alpha_expanded'));
  assert.throws(()=>planCompanionInvitation({...input,petId:locked.id}),/開啟/);
  assert.throws(()=>planCompanionInvitation({...input,petId:f.pets.find((p)=>p.rarity==='N').id}),/名單/);
  assert.throws(()=>planCompanionInvitation({...input,economy:economy(199),petId:ur.id}),/再累積 1/);
  assert.equal(input.economy.balance,300);
});
test('cross-pool candidates respect formal activation and real expansion unlocks', () => {
  const f=createPoolContentFixtures();const unlocked={byPool:{[f.alpha.id]:{unlocked:true}}};
  const rows=invitationCandidates(f.pets,f.catalog,unlocked);
  assert.ok(rows.some((row)=>row.seriesId===f.beta.id&&row.available));
  assert.ok(rows.some((row)=>row.pet.poolTags.includes('fixture_alpha_expanded')&&row.available));
  f.beta.active=false;
  assert.ok(!invitationCandidates(f.pets,f.catalog,unlocked).some((row)=>row.seriesId===f.beta.id));
});
test('all five duplicate rarities pay the shared balance without changing bond or specialty', () => {
  const f=createPoolContentFixtures();
  for (const [rarity,gain] of Object.entries(ENCOUNTER_FRAGMENTS_BY_RARITY)) {
    const pet=f.pets.find((p)=>p.rarity===rarity&&p.poolTags.includes(f.alpha.id));
    const roll={N:0,R:.6,SR:.9,SSR:.96,UR:.99}[rarity];
    let calls=0; const before=createCollectionEntry(pet.id,now);
    const after=planGachaTransaction({allPets:f.pets,poolsData:f.catalog,selectedPoolId:f.alpha.id,count:1,wallet:{stardust:1000},collection:[before],encounterEconomy:economy(),rng:()=>calls++%2?0:roll,now});
    assert.equal(after.encounterEconomy.balance,gain);
    assert.equal(after.result.encounterBalanceAfter,gain);
    assert.deepEqual(after.collection[0],before);
    assert.equal(after.result.isNew,false);
  }
});
test('ten-pull SR floor and both pity boundaries survive economy integration', () => {
  const f=createPoolContentFixtures();f.alpha.tenPullGuarantee='SR';
  const base={allPets:f.pets,poolsData:f.catalog,selectedPoolId:f.alpha.id,count:10,wallet:{stardust:10000},collection:[],encounterEconomy:economy(),rng:()=>0,now};
  const after=planGachaTransaction(base);
  assert.deepEqual(after.result.results.map((p)=>p.rarity),[...Array(9).fill('N'),'SR']);
  assert.equal(after.encounterEconomy.balance,8);
  const ur=planGachaTransaction({...base,count:1,stats:{poolPity:{[f.alpha.id]:{ssrPity:0,urPity:99}}}});
  assert.equal(ur.result.rarity,'UR');assert.equal(ur.stats.poolPity[f.alpha.id].urPity,0);
  const ssr=planGachaTransaction({...base,count:1,stats:{poolPity:{[f.alpha.id]:{ssrPity:29,urPity:50}}}});
  assert.ok(['SSR','UR'].includes(ssr.result.rarity));
});
test('intimacy owns specialty growth and legacy capabilities are a protected floor', () => {
  assert.equal(getPetSpecialty({id:'a',bondLevel:4,encounterMigrationVersion:1,legacySpecialtyFloor:1}).level,4);
  assert.equal(getPetSpecialty({id:'a',bondLevel:1,encounterMigrationVersion:1,legacySpecialtyFloor:5}).level,5);
  const area={id:'mist_forest',rewards:{stardust:{min:10,max:10},material:{id:'forest_leaf',min:1,max:1},bondExp:3}};
  const old={id:'a',rarity:'N',expeditionSpecialty:'scout',stars:4,bondLevel:1};
  const migrated={...old,stars:undefined,encounterMigrationVersion:1,legacySpecialtyFloor:4};
  assert.deepEqual(planExpeditionResult(area,[old],'explore',()=>0),planExpeditionResult(area,[migrated],'explore',()=>0));
});
