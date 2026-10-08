import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(import.meta.dirname,'..'),report=path.join(root,'reports/chaos-demon-court'),pins=JSON.parse(fs.readFileSync(path.join(report,'artifacts.json')));
const child=spawn(process.execPath,['devtools/darkcrown-review-server.mjs'],{cwd:root,stdio:['ignore','pipe','inherit']});
const url=await new Promise(r=>child.stdout.on('data',b=>r(b.toString().trim())));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:393,height:852}});await ctx.route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():r.abort());
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.viewer?.high.length===7);
 await page.evaluate(async()=>{window.ceremony=await import('/questnote-pwa-preview/src/encounterCeremony.js');document.querySelector('main').id='app';});
 const high=await page.evaluate(()=>window.viewer.high.map(p=>p.id));const checks=[];
 // Current App handoff: ritual completes separately, character reveal auto-finishes.
 await page.locator('#single').focus();
 await page.evaluate(()=>{window.handoffDone=false;window.ceremony.playCeremonyRitual(window.viewer.pool,window.viewer.fixed(),false).then(()=>window.handoffDone=true);});
 await page.locator('.dream-bloom-overlay').waitFor();assert.equal(await page.locator('#app').evaluate(el=>el.inert),true);
 await page.waitForFunction(()=>window.handoffDone,{},{timeout:10000});assert.equal(await page.locator('#app').evaluate(el=>el.inert),false);
 checks.push({check:'actual encounter ritual-only handoff and inert cleanup',status:'pass'});
 for(const id of high){
  await page.evaluate(id=>{window.handoffDone=false;window.ceremony.playCeremonyCharacter(window.viewer.pool,{pet:window.viewer.pets.find(p=>p.id===id)},{reduceMotion:false}).then(()=>window.handoffDone=true);},id);
  await page.locator('.summon-reveal-overlay').waitFor();assert.equal(await page.locator('#app').evaluate(el=>el.inert),true);
  await page.waitForFunction(()=>window.handoffDone,{},{timeout:10000});assert.equal(await page.locator('.summon-reveal-overlay').count(),0);assert.equal(await page.locator('#app').evaluate(el=>el.inert),false);
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'single');
  checks.push({check:'actual encounter character automatic handoff and focus restore',petId:id,status:'pass'});console.log('PASS encounter handoff '+id);
 }
 await page.evaluate(()=>{
  const v=window.viewer,u=v.high.find(p=>p.rarity==='UR'),s=v.high.find(p=>p.rarity==='SSR'),low=v.pets.filter(p=>!['UR','SSR'].includes(p.rarity)).slice(0,6);
  window.repeatResults=[u,s,u,s,...low].map((pet,index)=>({pet,rarity:pet.rarity,isNew:index<2,fragmentsGained:index===2?20:index===3?10:0}));
  window.repeatBefore=JSON.stringify(window.repeatResults);window.repeatDone=false;
  v.summon.playThemedSummon({animationKey:'chaos_demon_court',results:window.repeatResults,mode:'ten',reduceMotion:true}).then(()=>window.repeatDone=true);
 });
 const names=[];
 for(let i=0;i<4;i++){await page.locator('.summon-reveal-overlay.is-ready').waitFor();names.push(await page.locator('.summon-reveal-name').innerText());await page.locator('.summon-reveal-skip').click();await page.waitForTimeout(50);}
 assert.equal(names[0],names[2]);assert.equal(names[1],names[3]);
 await page.locator('.dream-bloom-summary:not([hidden])').waitFor();assert.equal(await page.locator('.dream-bloom-summary__grid > *').count(),10);
 await page.locator('.dream-bloom-overlay [data-action="close"]').click();await page.waitForFunction(()=>window.repeatDone);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.repeatResults)===window.repeatBefore),true);
 checks.push({check:'repeated UR/SSR ten results preserve order, queue count and fixed immutable compensation data',status:'pass'});
 assert.deepEqual(await page.evaluate(()=>indexedDB.databases()),[]);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(report,'pinned-encounter-handoff-acceptance.json'),JSON.stringify({status:'pass',artifactId:pins.preview.artifactId,sourceCommit:pins.preview.sourceCommit,viewer:url,environment:'Windows Chrome isolated loopback; actual current encounterCeremony module, fixed display results, no game database',checks,pageErrors:errors},null,2)+'\n');
 console.log('PASS current encounter handoff and duplicate queue');
}finally{await browser.close();child.kill();}

