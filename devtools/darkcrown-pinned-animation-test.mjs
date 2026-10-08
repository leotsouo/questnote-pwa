import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(import.meta.dirname,'..'),report=path.join(root,'reports/chaos-demon-court');
const pins=JSON.parse(fs.readFileSync(path.join(report,'artifacts.json')));
const child=spawn(process.execPath,[path.join(root,'devtools/darkcrown-review-server.mjs')],{cwd:root,stdio:['ignore','pipe','inherit']});
const viewer=await new Promise((resolve,reject)=>{child.stdout.on('data',b=>{const m=b.toString().match(/http:\/\/127\.0\.0\.1:\d+\/darkcrown-review\//);if(m)resolve(m[0]);});child.on('exit',code=>reject(Error('server '+code)));});
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[];
try{
 const ctx=await browser.newContext();await ctx.route('**/*',r=>new URL(r.request().url()).origin===new URL(viewer).origin?r.continue():r.abort());
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(viewer);await page.waitForFunction(()=>window.viewer?.high.length===7);
 assert.equal(await page.locator('#artifact').innerText(),pins.preview.artifactId);
 await page.waitForFunction(()=>[...document.querySelectorAll('.pair img')].every(i=>i.complete&&i.naturalWidth>0));
 const high=await page.evaluate(()=>window.viewer.high.map(p=>({id:p.id,name:p.name,rarity:p.rarity,key:p.presentation?.revealKey})));
 const clean=async()=>{assert.equal(await page.locator('.dream-debut-overlay,.dream-bloom-overlay,.summon-reveal-overlay,.awakening-scene').count(),0);assert.equal(await page.evaluate(()=>document.body.style.overflow),'');assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');};
 const closeSummary=async()=>{await page.locator('.dream-bloom-overlay [data-action="close"]:not([hidden])').waitFor();await page.locator('.dream-bloom-overlay [data-action="close"]').click();await page.waitForFunction(()=>window.viewer.lastResult!==null);await clean();};
 for(const width of [393,1280]){
  await page.setViewportSize({width,height:900});await page.locator('#entry').click();
  await page.locator('.dream-debut-overlay.is-ready').waitFor({timeout:10000});
  assert.equal(await page.locator('.chaos-routes path').count(),7);
  await page.screenshot({path:path.join(report,'pinned-entry-'+width+'.png')});
  await page.locator('.dream-debut-skip').click();await page.locator('.dream-debut-overlay').waitFor({state:'detached'});await clean();
  await page.locator('#switch').click();await page.locator('.dream-debut-overlay.is-ready').waitFor({timeout:10000});await page.keyboard.press('Enter');await page.locator('.dream-debut-overlay').waitFor({state:'detached'});await clean();
  checks.push({check:'complete debut and pool-switch entry',width,status:'pass'});console.log('PASS complete entry '+width);
 }
 await page.setViewportSize({width:393,height:852});
 for(const pet of high){
  await page.selectOption('#pick',pet.id);await page.locator('#single').click();
  await page.locator('.summon-reveal-overlay.is-ready').waitFor({timeout:30000});
  assert.ok((await page.locator('.summon-reveal-name').innerText()).includes(pet.name));
  assert.equal(await page.locator('.summon-reveal-overlay .chaos-court-scene').getAttribute('data-motif'),pet.key.replace('chaos_',''));
  assert.equal(await page.locator('.summon-reveal-overlay').evaluate((el)=>el.classList.contains('is-ur')),pet.rarity==='UR');
  assert.ok(await page.locator('.summon-reveal-pet-frame img').evaluate(i=>i.complete&&i.naturalWidth>0));
  await page.screenshot({path:path.join(report,'pinned-single-'+pet.id+'.png')});
  await page.keyboard.press('Enter');await closeSummary();
  checks.push({check:'complete single rare reveal',petId:pet.id,status:'pass'});console.log('PASS full single '+pet.id);
 }
 // Intro skip must still play every SSR+/UR result, including duplicates.
 await page.evaluate(()=>{window.viewer.ten(true);});
 for(let i=0;i<7;i++){
  await page.locator('.summon-reveal-overlay.is-ready').waitFor({timeout:10000});
  const progress=await page.locator('.summon-reveal-progress').innerText();assert.ok(progress.includes((i+1)+' / 7'));
  await page.locator('.summon-reveal-skip').click();await page.waitForTimeout(50);
 }
 await page.locator('.dream-bloom-summary:not([hidden])').waitFor();assert.equal(await page.locator('.dream-bloom-summary__grid > *').count(),10);
 await page.screenshot({path:path.join(report,'pinned-ten-summary.png')});await closeSummary();checks.push({check:'intro skipped, all seven rare queue items and ten summary retained',status:'pass'});console.log('PASS ten full queue');
 await page.locator('#reduced').check();
 for(const pet of high){
  await page.selectOption('#pick',pet.id);await page.locator('#single').click();await page.locator('.summon-reveal-overlay.is-ready').waitFor({timeout:6000});await page.keyboard.press(' ');await closeSummary();
  await page.evaluate(id=>window.viewer.awake(id),pet.id);await page.locator('.awakening-scene').waitFor({state:'detached',timeout:5000});await clean();
  checks.push({check:'reduced replay summon and awakening',petId:pet.id,status:'pass'});console.log('PASS reduced '+pet.id);
 }
 await page.locator('#reduced').uncheck();
 for(const pet of high){
  await page.evaluate(id=>{window.viewer.awake(id);},pet.id);await page.locator('.awakening-scene').waitFor();
  await page.waitForTimeout(pet.rarity==='UR'?3000:1900);
  assert.ok(await page.locator('.awakening-after').evaluate(i=>i.complete&&i.naturalWidth>0));
  await page.screenshot({path:path.join(report,'pinned-awakening-'+pet.id+'.png')});
  await page.locator('.awakening-scene').waitFor({state:'detached',timeout:8000});await clean();checks.push({check:'complete original to humanoid awakening',petId:pet.id,status:'pass'});console.log('PASS full awakening '+pet.id);
 }
 await page.locator('#ten').click();await page.locator('.dream-bloom-overlay [data-action="skip"]').click();await page.locator('.summon-reveal-overlay').waitFor();await page.keyboard.press('Escape');await closeSummary();checks.push({check:'skip intro preserves queue; Escape skips remaining display queue and closes cleanly',status:'pass'});
 await page.evaluate(()=>{const pet=window.viewer.high[0];window.viewer.lastResult=null;window.viewer.reveal.playSummonReveal({rarity:pet.rarity,pet,forceFallback:true,presentationKey:'chaos_demon_court'}).then(()=>window.viewer.lastResult={done:true});});
 await page.locator('.summon-reveal-overlay').waitFor();await page.keyboard.press('Escape');await page.waitForFunction(()=>window.viewer.lastResult!==null);await clean();checks.push({check:'image fallback and keyboard cleanup',status:'pass'});
 assert.deepEqual(await page.evaluate(()=>indexedDB.databases()),[]);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(report,'pinned-animation-acceptance.json'),JSON.stringify({status:'pass',reviewMode:'ai-self',artifactId:pins.preview.artifactId,sourceCommit:pins.preview.sourceCommit,viewer,environment:'Windows Chrome headless, isolated loopback; actual pinned modules/styles/images, no game database',checks,pageErrors:errors},null,2)+'\n');
 console.log('PASS pinned animation '+checks.length+' checks');
}finally{await browser.close();child.kill();}

