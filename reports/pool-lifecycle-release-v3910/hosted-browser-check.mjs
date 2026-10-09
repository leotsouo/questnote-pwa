import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const [out,pinsFile]=process.argv.slice(2),pin=JSON.parse(await fs.readFile(pinsFile)).production;
const {chromium}=createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE);
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:393,height:852},timezoneId:'Asia/Taipei',reducedMotion:'reduce'});
const errors=[];await fs.mkdir(out,{recursive:true});
try {
 await context.route('**/*',r=>r.request().method()==='GET'&&new URL(r.request().url()).origin==='https://leotsouo.github.io'?r.continue():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://leotsouo.github.io/questnote-pwa/');
 await page.waitForFunction(()=>document.querySelector('#guide-tutorial-status')?.textContent&&navigator.serviceWorker.controller,null,{timeout:120000});
 assert.equal(await page.locator('meta[name="questnote-artifact"]').getAttribute('content'),pin.artifactId);
 if(await page.locator('[data-onboarding-action="skip"]').isVisible())await page.locator('[data-onboarding-action="skip"]').click();
 await page.waitForFunction(()=>document.body.classList.contains('guided-learned')||document.querySelector('[data-guided-action="skip"]'));
 if(await page.locator('[data-guided-action="skip"]').isVisible()){
  await page.locator('[data-guided-action="skip"]').click();await page.locator('[data-guided-action="confirm-skip"]').click();await page.locator('.guided-coach').waitFor({state:'detached'});
 }
 const result=await page.evaluate(async()=>{
  const db=await import('./src/db.js'),tasks=await import('./src/taskService.js');
  const before=await db.dbGet('meta','encounterEconomy'),task=await tasks.createTask({content:'隔離正式發布驗收'});
  await tasks.toggleTaskComplete(task.id);const saved=await db.dbGet('meta','encounterEconomy');
  await tasks.toggleTaskComplete(task.id);await tasks.toggleTaskComplete(task.id);
  return {version:(await import('./src/version.js')).APP_VERSION,before,saved,retried:await db.dbGet('meta','encounterEconomy')};
 });
 assert.equal(result.version,'3.9.10');assert.equal(result.saved.balance,(result.before?.balance||0)+10);assert.deepEqual(result.retried,result.saved);
 await page.reload();await page.waitForFunction(()=>document.querySelector('#guide-tutorial-status')?.textContent);
 await page.locator('.bottom-nav [data-view="gacha"]').click();
 for(let i=0;i<100;i++){
  const skip=page.locator('.dream-debut-overlay [data-role="skip"]');if(await skip.isVisible())await skip.click({timeout:500}).catch(()=>{});
  if(await page.evaluate(()=>!document.querySelector('.dream-debut-overlay')&&document.querySelector('[data-identity-action="series-directory"]')&&!document.querySelector('[data-identity-action="series-directory"]').disabled))break;
  await page.waitForTimeout(100);
 }
 const hint=page.getByRole('button',{name:'我知道了',exact:true});if(await hint.isVisible())await hint.click();
 assert.ok(await page.locator('[data-identity-action="series-directory"]').isEnabled());
 assert.match(await page.locator('.invitation-entry .daily-encounter-note').innerText(),/已存下.*10/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:path.join(out,'hosted-summon-phone.png'),fullPage:true});
 await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#guide-tutorial-status')?.textContent);
 assert.deepEqual(await page.evaluate(async()=>await(await import('./src/db.js')).dbGet('meta','encounterEconomy')),result.saved);assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'hosted-browser.json'),JSON.stringify({ok:true,checkedAt:new Date().toISOString(),artifactId:pin.artifactId,version:result.version,dailyAwardOnce:true,visualPoolEntry:true,offlineReceiptPreserved:true,pageErrors:errors,environment:'Fresh disposable Chromium on formal HTTPS; no existing player data or backend writes'},null,2));
 console.log('PASS formal HTTPS fresh install, daily reward once, visual entry and offline receipt');
} finally {await context.close();await browser.close();}