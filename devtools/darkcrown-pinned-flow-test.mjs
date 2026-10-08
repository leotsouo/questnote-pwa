import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(import.meta.dirname,'..'),report=path.join(root,'reports/chaos-demon-court');
const pins=JSON.parse(fs.readFileSync(path.join(report,'artifacts.json')));
const child=spawn(process.execPath,[path.join(root,'devtools/darkcrown-review-server.mjs')],{cwd:root,stdio:['ignore','pipe','inherit']});
const viewer=await new Promise(r=>child.stdout.on('data',b=>{const m=b.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(m)r(m[0]);}));
const base=viewer+pins.preview.scopePath;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:393,height:852}});await ctx.route('**/*',r=>new URL(r.request().url()).origin===viewer?r.continue():r.abort());
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'index.html');await page.locator('#app-loader').waitFor({state:'hidden'});
 const skip=page.locator('.onboarding-dialog [data-onboarding-action="skip"]');if(await skip.isVisible())await skip.click();
 await page.waitForFunction(()=>document.body.classList.contains('guided-learned')||document.querySelector('[data-guided-action="skip"]')||document.querySelector('.today-habit-card'));
 if(await page.locator('[data-guided-action="skip"]').isVisible()){await page.locator('[data-guided-action="skip"]').click();await page.locator('[data-guided-action="confirm-skip"]').click();await page.locator('.guided-coach').waitFor({state:'detached'});}
 await page.locator('.bottom-nav [data-view="collection"]').click();
 await page.selectOption('#identity-pool-select-collection','darkcrown_court_release');
 await page.locator('button[data-pet="pet_ur28"]').click();
 assert.equal(await page.locator('[data-identity-action="awakening-form"][data-form="awakened"]').count(),0);
 assert.ok((await page.locator('.identity-dialog .detail-art').getAttribute('src')).includes('initial'));
 await page.locator('[data-identity-action="close-dialog"]').first().click();
 const result=await page.evaluate(async()=>{
  const scope='/questnote-pwa-preview/src/';
  const names=['db','releaseCatalog','petAwakeningService','petAwakeningCatalog','petAwakeningCore','collectionService','taskService','expeditionService','workshopService','rewardService','bondJourneyCore','backupService'];
  const s=Object.fromEntries(await Promise.all(names.map(async n=>[n,await import(scope+n+'.js')])));window.actualTest=s;
  const bundle=await s.releaseCatalog.loadCatalogBundle(),pets=bundle.petsData.pets, dark=pets.filter(p=>p.poolTags.includes('darkcrown_court_release')),high=dark.filter(p=>['UR','SSR'].includes(p.rarity));
  const a=await s.petAwakeningCatalog.loadAwakeningCatalog();if(a.pets.length!==27)throw Error('catalog');
  const at=new Date(Date.now()-3600000).toISOString(),journey=s.bondJourneyCore.createBondJourney();
  for(const pet of dark){await s.collectionService.addPetToCollection(pet.id);if(high.includes(pet)){const row=await s.collectionService.getPetCollection(pet.id);await s.db.dbPut('collection',{...row,bondLevel:5,bondExp:500});journey.byPet[pet.id]={chapters:Object.fromEntries([2,3,4,5].map(lv=>[lv,{choiceId:'steady',readAt:at,completedAt:at,claimedAt:at}]))};}}
  await s.db.dbPut('meta',journey);
  await s.db.dbPut('meta',s.rewardService.normalizeWallet({stardust:10000,adventureEnergy:100,materials:{forest_leaf:100,lava_core:100}}));
  await s.workshopService.initWorkshop();
  const beforeCraft=await s.rewardService.getWallet(),crafted=await s.workshopService.craftItem('item_chaos_ember_tart',9),afterCraft=await s.rewardService.getWallet();
  if(!crafted.success)throw Error(crafted.message);
  const item=s.workshopService.getCraftableInfo('item_chaos_ember_tart');
  const bonuses=dark.map(p=>({petId:p.id,...s.workshopService.getFavoriteBonus(item,p)}));
  const receiver=dark.find(p=>!high.includes(p)&&s.workshopService.getFavoriteBonus(item,p).isFavorite);
  const gift=await s.workshopService.useBondItem(item.id,receiver.id,pets);
  const areas=await s.expeditionService.loadExpeditionAreas();const area=areas.find(a=>a.id==='darkcrown_border');if(!area)throw Error('new area missing');
  const tests=[];
  for(const pet of high){
   await s.petAwakeningService.startPetAwakening(pet.id);
   for(let n=0;n<3;n++){await new Promise(r=>setTimeout(r,5));const t=await s.taskService.createTask({content:'隔離驗收日常 '+pet.id+' '+n,priority:'normal'});await s.taskService.toggleTaskComplete(t.id);}
   const exp=await s.expeditionService.startExpedition([pet.id],area.id,areas,pets);
   await s.expeditionService.forceCompleteActiveExpedition();await s.expeditionService.claimExpeditionRewards(exp.id,areas,pets);
   const ready=await s.petAwakeningService.syncPetAwakening();if(ready.byPet[pet.id].status!=='ready')throw Error('not ready '+pet.id);
   const inv=await s.workshopService.getInventory(),wallet=await s.rewardService.getWallet(),collection=await s.collectionService.getPetCollection(pet.id);
   const attempts=await Promise.allSettled([s.petAwakeningService.awakenPet(pet.id),s.petAwakeningService.awakenPet(pet.id)]);
   const after=await s.petAwakeningService.getPetAwakening(),endInv=await s.workshopService.getInventory();
   await s.petAwakeningService.setAwakeningForm(pet.id,'initial');await s.petAwakeningService.setAwakeningForm(pet.id,'awakened');
   tests.push({petId:pet.id,status:after.byPet[pet.id].status,attempts:attempts.map(a=>a.status),consumed:inv.items[item.id]-endInv.items[item.id],walletUnchanged:JSON.stringify(wallet)===JSON.stringify(await s.rewardService.getWallet()),collectionUnchanged:JSON.stringify(collection)===JSON.stringify(await s.collectionService.getPetCollection(pet.id))});
  }
  const backup=await s.backupService.exportBackup(),validation=s.backupService.validateBackup(backup);
  return {database:(await s.db.openDB()).name,initialCount:dark.length,awakenableCount:high.length,crafted,materialsUsed:{forest_leaf:beforeCraft.materials.forest_leaf-afterCraft.materials.forest_leaf,lava_core:beforeCraft.materials.lava_core-afterCraft.materials.lava_core},gift,bonuses,trials:tests,backupValidation:validation};
 });
 assert.equal(result.database,'QuestNotePreviewDB');assert.equal(result.initialCount,20);assert.equal(result.awakenableCount,7);assert.deepEqual(result.materialsUsed,{forest_leaf:27,lava_core:27});
 assert.ok(result.gift.success);for(const b of result.bonuses)assert.equal(b.bondExp,b.isFavorite?150:75);
 for(const t of result.trials){assert.equal(t.status,'awakened');assert.deepEqual(t.attempts.slice().sort(),['fulfilled','rejected']);assert.equal(t.consumed,1);assert.equal(t.walletUnchanged,true);assert.equal(t.collectionUnchanged,true);}
 console.log(JSON.stringify(result.backupValidation)); assert.equal(result.backupValidation.valid,true);
 await page.reload();await page.locator('#app-loader').waitFor({state:'hidden'});
 // Actual map and dispatch use the release's generated landscape.
 const regionChecks=[];
 for(const width of [393,1280]){
  await page.setViewportSize({width,height:900});await page.locator('.bottom-nav [data-view="expedition"]').click();
  const card=page.locator('.expedition-area-card[data-area-id="darkcrown_border"]');await card.scrollIntoViewIfNeeded();
  await card.locator('img').waitFor();assert.ok(await card.locator('img').evaluate(i=>i.complete&&i.naturalWidth>=960));await card.screenshot({path:path.join(report,'pinned-region-card-'+width+'.png')});
  await card.locator('[data-action="open-dispatch"]').click();const img=page.locator('.expedition-dispatch-area__image');await img.waitFor();assert.ok(await img.evaluate(i=>i.complete&&i.naturalWidth>=960));
  await page.waitForTimeout(400);await page.screenshot({path:path.join(report,'pinned-region-dispatch-'+width+'.png')});await page.keyboard.press('Escape');
  regionChecks.push({width,mapImage:'loaded',dispatchImage:'loaded'});
 }
 await page.locator('.bottom-nav [data-view="collection"]').click();
 await page.selectOption('#identity-pool-select-collection','darkcrown_court_release');
 const collectionChecks=[];
 for(const width of [393,1280]){
  await page.setViewportSize({width,height:900});
  const cards=page.locator('#identity-collection-results .collection-card');assert.equal(await cards.count(),20);
  await cards.last().scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('#identity-collection-results .collection-card img')].every(i=>i.complete&&i.naturalWidth>0));
  assert.ok(await page.locator('#identity-collection-results .collection-card img').evaluateAll(images=>images.every(i=>getComputedStyle(i).objectFit==='contain')));
  await page.locator('#identity-collection-results').screenshot({path:path.join(report,'pinned-collection-'+width+'.png')});
  collectionChecks.push({width,imagesLoaded:20,objectFit:'contain'});
 }
 await page.locator('button[data-pet="pet_ur28"]').click();await page.locator('[data-identity-action="app-pet-detail"]').click();await page.locator('[data-awake-open="pet_ur28"]').click();
 await page.locator('[data-awake-action="initial"]').click();await page.locator('.awakening-reader').filter({hasText:'目前：初遇相'}).waitFor();
 await page.locator('[data-awake-action="awakened"]').click();await page.locator('.awakening-reader').filter({hasText:'目前：覺醒相'}).waitFor();
 await page.screenshot({path:path.join(report,'pinned-form-switch.png')});
 await page.locator('[data-awake-action="close"]').click();
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.locator('.bottom-nav [data-view="gacha"]').click();
 const backgroundChecks=[];
 const allPools=await page.locator('#identity-pool-select-pool option').evaluateAll(options=>options.map(o=>o.value));
 assert.ok(allPools.length > 1); assert.ok(allPools.includes('darkcrown_court_release'));
 for(const theme of ['default','sweet','twilight']){
  await page.evaluate(async theme=>(await import('/questnote-pwa-preview/src/preferencesService.js')).applyThemeToDocument(theme),theme);
  for(const poolId of allPools){
   await page.selectOption('#identity-pool-select-pool',poolId);
   await page.waitForTimeout(150);await page.keyboard.press('Escape');
   await page.locator('.dream-debut-overlay').waitFor({state:'detached',timeout:5000});
   await page.waitForFunction(id=>document.querySelector('.summon-sanctuary')?.dataset.poolId===id,poolId);
   const dark=await page.locator('.sanctuary-scenery .chaos-court-scene').count();
   assert.equal(dark,poolId==='darkcrown_court_release'?1:0);
   backgroundChecks.push({theme,poolId,darkCourtScene:!!dark});
   if(dark)await page.locator('.summon-sanctuary').screenshot({path:path.join(report,'pinned-pool-background-'+theme+'.png')});
  }
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(report,'pinned-native-flow-acceptance.json'),JSON.stringify({status:'pass',artifactId:pins.preview.artifactId,sourceCommit:pins.preview.sourceCommit,environment:'Windows Chrome native IndexedDB isolated loopback preview; fixture ownership and sped-up expedition clock, actual catalogs and services',result,regionChecks,collectionChecks,backgroundChecks,unawakenedHumanPreviewHidden:true,pageErrors:errors},null,2)+'\n');
 console.log('PASS real catalogs: craft/gift, seven trials and concurrent rituals, backup, actual region UI and form switch');
}finally{await browser.close();child.kill();}

