import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dailyEncounterReceipt, applyDailyEncounter, validateDailyEncounterReceipt, dailyEncounterMessage } from '../src/dailyEncounterCore.js';
const dbUrl = new URL('../src/db.js', import.meta.url).href;
const memoryUrl = new URL('./companion-session-db.js', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  const resolved = next(specifier, context);
  return resolved.url === dbUrl ? { ...resolved, url:memoryUrl } : resolved;
} });
const db = await import('./companion-session-db.js');
const { putWithAwakeningProgress } = await import('../src/petAwakeningService.js');
const otherClient = await import('../src/petAwakeningService.js?daily-other-client');
const { normalizeEncounterEconomy, validateEncounterEconomy, planEncounterMigration, planCompanionInvitation } = await import('../src/encounterEconomyCore.js');
const { normalizeBackupPayload, migrateImportedData, validateBackup } = await import('../src/backupService.js');
const { SNAPSHOT_KEYS } = await import('../src/backupSchema.js');
const { createPoolContentFixtures } = await import('./fixtures/pool-content-fixtures.mjs');
const { getTodayDateString } = await import('../src/taskFilterService.js');
const day = '2026-10-10';
const at = (date = day) => new Date(date + 'T12:00:00').toISOString();
const economy = (balance = 0) => ({ key:'encounterEconomy', schemaVersion:1, migrationVersion:1, balance, migrationReceipt:null });
const receipt = (date = day, source = 'task') => ({ date, source, sourceId:source + '-1', amount:10 });
const task = { id:'task-1', completed:false, rewardClaimed:false };
const habit = { id:'habit-1', isActive:true, logs:{} };
const doneTask = (date = day) => ({ ...task, completed:true, completedAt:at(date) });
const doneHabit = (date = day) => ({ ...habit, logs:{ [date]:{ completed:true, completedAt:at(date) } } });

test('task and habit share one daily award; later dates advance without resetting accumulated progress', () => {
  const state = economy(17);
  for (const source of ['task','habit']) {
    const current = source === 'task' ? task : habit;
    const next = source === 'task' ? doneTask() : doneHabit();
    assert.equal(applyDailyEncounter(state, dailyEncounterReceipt({ source,current,next,date:day })), source === 'task');
  }
  assert.equal(state.balance,27);
  assert.equal(applyDailyEncounter(state,receipt('2026-10-11','habit')),true);
  assert.equal(applyDailyEncounter(state,receipt('2026-10-09')),false);
  assert.equal(state.balance,37);
  assert.match(dailyEncounterMessage(state,'2026-10-10'),/早於上次/);
  assert.match(dailyEncounterMessage(state,'2026-10-11'),/已存下/);
});

test('tutorial, completed, claimed and changed-identity tasks cannot mint a new receipt', () => {
  for (const [current,next] of [
    [{...task,isTutorial:true},doneTask()], [task,{...doneTask(),isTutorial:true}],
    [{...task,completed:true},doneTask()], [{...task,rewardClaimed:true},doneTask()],
    [task,task], [task,{...doneTask(),id:'different'}], [null,doneTask()],
  ]) assert.equal(dailyEncounterReceipt({source:'task',current,next,date:day}),null);
});

test('archived, inactive, tutorial and already rewarded habit logs cannot award', () => {
  for (const [current,next] of [
    [{...habit,isActive:false},doneHabit()], [habit,{...doneHabit(),isActive:false}],
    [{...habit,archivedAt:at()},doneHabit()], [habit,{...doneHabit(),archivedAt:at()}],
    [{...habit,isTutorial:true},doneHabit()], [habit,{...doneHabit(),isTutorial:true}],
    [{...habit,logs:{[day]:{completed:true}}},doneHabit()],
    [{...habit,logs:{[day]:{rewardClaimed:true}}},doneHabit()],
  ]) assert.equal(dailyEncounterReceipt({source:'habit',current,next,date:day}),null);
});

test('backdated, future, invalid and missing completion timestamps do not count for today', () => {
  for (const completedAt of [at('2026-10-09'),at('2026-10-11'),'invalid',undefined,null]) {
    assert.equal(dailyEncounterReceipt({source:'task',current:task,next:{...doneTask(),completedAt},date:day}),null);
    assert.equal(dailyEncounterReceipt({source:'habit',current:habit,next:{...habit,logs:{[day]:{completed:true,completedAt}}},date:day}),null);
  }
  assert.equal(dailyEncounterReceipt({source:'habit',current:habit,next:doneHabit('2026-10-09'),date:day}),null);
  assert.equal(dailyEncounterReceipt({source:'other',current:task,next:doneTask(),date:day}),null);
});

test('invalid receipts and overflow reject atomically; copied receipt cannot be mutated by its caller', () => {
  for (const bad of [ {...receipt(),date:'2026-02-30'}, {...receipt(),date:'2026-2-01'}, {...receipt(),amount:20}, {...receipt(),amount:'10'}, {...receipt(),source:'login'}, {...receipt(),sourceId:''}, {...receipt(),extra:true}, [] ]) {
    const state = economy(9);
    assert.equal(validateDailyEncounterReceipt(bad),false);
    assert.throws(() => applyDailyEncounter(state,bad));
    assert.deepEqual(state,economy(9));
    assert.ok(validateEncounterEconomy({...state,dailyReceipt:bad}).length);
    assert.throws(() => normalizeEncounterEconomy({...state,dailyReceipt:bad}));
  }
  for (const balance of [-1,0.5,NaN,Number.MAX_SAFE_INTEGER - 9]) {
    const state = economy(balance); const before = structuredClone(state);
    assert.throws(() => applyDailyEncounter(state,receipt())); assert.deepEqual(state,before);
  }
  const state = economy(); const token = receipt();
  applyDailyEncounter(state,token); token.date = '2026-10-11';
  assert.equal(state.dailyReceipt.date,day);
  assert.equal(applyDailyEncounter(state,null),false);
});

test('local midnight and daylight saving dates are resolved in each device timezone', () => {
  const moduleUrl = new URL('../src/dailyEncounterCore.js',import.meta.url).href;
  for (const [tz,timestamps,dates] of [
    ['Asia/Taipei',['2026-10-09T15:59:59Z','2026-10-09T16:00:00Z'],['2026-10-09','2026-10-10']],
    ['UTC',['2026-10-09T23:59:59Z','2026-10-10T00:00:00Z'],['2026-10-09','2026-10-10']],
    ['America/New_York',['2026-11-01T05:30:00Z','2026-11-01T06:30:00Z'],['2026-11-01','2026-11-01']],
  ]) {
    const script = `import {dailyEncounterReceipt,applyDailyEncounter} from ${JSON.stringify(moduleUrl)};
      const timestamps=${JSON.stringify(timestamps)}, dates=${JSON.stringify(dates)}, state={balance:0};
      const results=timestamps.map((completedAt,i)=>applyDailyEncounter(state,dailyEncounterReceipt({source:'task',current:{id:'t'},next:{id:'t',completed:true,completedAt},date:dates[i]})));
      console.log(JSON.stringify({results,balance:state.balance}));`;
    const output = JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,TZ:tz},encoding:'utf8'}));
    assert.deepEqual(output,{results:[true,dates[0] !== dates[1]],balance:dates[0] === dates[1] ? 10 : 20},tz);
  }
});

test('legacy migration and invitation spending preserve the daily receipt and never duplicate its reward', () => {
  const before = {...economy(190),migrationVersion:0,dailyReceipt:receipt()};
  const migrated = planEncounterMigration({economy:before,collection:[{petId:'old',stars:2,fragments:5}],now:at()});
  assert.equal(migrated.economy.balance,200);
  assert.deepEqual(migrated.economy.dailyReceipt,receipt());
  assert.equal(applyDailyEncounter(migrated.economy,receipt()),false);
  const f = createPoolContentFixtures();
  const pet = f.pets.find(p => p.rarity === 'UR' && p.poolTags.includes(f.alpha.id));
  const invited = planCompanionInvitation({petId:pet.id,allPets:f.pets,poolsData:f.catalog,economy:migrated.economy,collection:migrated.collection,now:at()});
  assert.equal(invited.economy.balance,0);
  assert.deepEqual(invited.economy.dailyReceipt,receipt());
  assert.equal(applyDailyEncounter(invited.economy,receipt()),false);
  assert.equal(applyDailyEncounter(invited.economy,receipt('2026-10-11')),true);
});

test('old backup without a daily receipt still migrates; new backup roundtrip retains replay protection', () => {
  const legacy = JSON.parse(readFileSync(new URL('./fixtures/backups/legacy-3.4.4.json',import.meta.url),'utf8'));
  const migrated = migrateImportedData(normalizeBackupPayload(legacy));
  assert.equal(migrated.encounterEconomy.dailyReceipt,undefined);
  applyDailyEncounter(migrated.encounterEconomy,receipt());
  const backup = {app:'QuestNote',version:2,appVersion:'3.9.8',data:Object.fromEntries(SNAPSHOT_KEYS.map(key => [key,migrated[key]]))};
  assert.equal(validateBackup(backup).valid,true);
  const restored = migrateImportedData(normalizeBackupPayload(backup));
  assert.deepEqual(restored.encounterEconomy,migrated.encounterEconomy);
  assert.equal(applyDailyEncounter(restored.encounterEconomy,receipt()),false);
  backup.data.encounterEconomy.dailyReceipt.amount = 999;
  assert.equal(validateBackup(backup).valid,false);
});

test('concurrent task/habit service writes commit both completions and exactly one shared award', async () => {
  await db.clearAllData(); await db.dbPut('meta',economy());
  await db.dbPut('tasks',task); await db.dbPut('habits',habit);
  const today = getTodayDateString();
  await Promise.all([putWithAwakeningProgress('tasks',doneTask(today)),otherClient.putWithAwakeningProgress('habits',doneHabit(today))]);
  assert.equal((await db.dbGet('tasks',task.id)).completed,true);
  assert.equal((await db.dbGet('habits',habit.id)).logs[today].completed,true);
  assert.equal((await db.dbGet('meta','encounterEconomy')).balance,10);
  await otherClient.putWithAwakeningProgress('tasks',doneTask(today));
  assert.equal((await db.dbGet('meta','encounterEconomy')).balance,10);
});

test('service award and legacy refund commit together once while retaining unrelated wallet', async () => {
  await db.clearAllData(); await db.dbPut('tasks',task);
  await db.dbPut('collection',{petId:'legacy',stars:2,fragments:7});
  await db.dbPut('meta',{key:'wallet',stardust:42});
  await putWithAwakeningProgress('tasks',doneTask(getTodayDateString()));
  const saved = await db.dbGet('meta','encounterEconomy');
  assert.equal(saved.balance,22); assert.equal(saved.migrationReceipt.total,12);
  assert.equal((await db.dbGet('collection','legacy')).encounterMigrationVersion,1);
  assert.equal((await db.dbGet('meta','wallet')).stardust,42);
});

test('failed economy validation rolls back completion, receipt, and legacy collection writes', async () => {
  for (const raw of [economy(Number.MAX_SAFE_INTEGER),{...economy(),dailyReceipt:{...receipt(),amount:999}}]) {
    await db.clearAllData(); await db.dbPut('tasks',task); await db.dbPut('meta',raw);
    const before = await db.readAllStoresSnapshot();
    await assert.rejects(putWithAwakeningProgress('tasks',doneTask(getTodayDateString())));
    assert.deepEqual(await db.readAllStoresSnapshot(),before);
  }
});
