import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(import.meta.dirname,'..');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);
  if (!file.startsWith(root+path.sep)||!fs.existsSync(file)) {res.writeHead(404);res.end();return;}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'};
  res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
 const context=await browser.newContext();
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/reports/chaos-demon-court/runtime-slice.html');await page.waitForFunction(()=>window.darkCourtTest);
 for (const width of [393,1280]) {
  await page.setViewportSize({width,height:852});
  await page.evaluate(()=>{window.darkCourtTest.controller.playPoolDebutPresentation({poolName:'黯冠王庭',presentation:{animationKey:'chaos_demon_court',debutLines:['七色星路','裂冠吞光','王庭降臨']}});});
  await page.waitForSelector('.chaos-court-scene');
  assert.equal(await page.locator('.chaos-routes path').count(),7);
  await page.waitForTimeout(1100);
  await page.screenshot({path:path.join(root,'reports/chaos-demon-court/entry-'+width+'.png')});
  await page.keyboard.press('Escape');await page.waitForSelector('.dream-debut-overlay',{state:'detached'});
  results.push({check:'entry and keyboard cleanup',width,status:'pass'});
 }
 for (const motif of ['crown','moon','bell','thorn','mirror','law','star']) {
  const rarity=['thorn','mirror','law','star'].includes(motif)?'SSR':'UR';
  const result=await page.evaluate(({motif,rarity})=>{
    const overlay=window.darkCourtTest.reveal.createSummonRevealOverlay({rarity,pet:{id:'pet_ur99',name:'固定展示',rarity,presentation:{revealKey:'chaos_'+motif}},reduceMotion:true,presentationKey:'chaos_demon_court'});
    document.body.append(overlay);const scene=overlay.querySelector('.chaos-court-scene');
    const value={motif:scene?.dataset.motif,routes:scene?.querySelectorAll('.chaos-routes path').length};overlay.remove();return value;
  },{motif,rarity});
  assert.deepEqual(result,{motif,routes:7});results.push({check:'rare reveal',motif,rarity,status:'pass'});
 }
 assert.deepEqual(errors,[]);
 const report={status:'preliminary runtime slice only; not pinned artifact acceptance',checks:results,pageErrors:errors};
 fs.writeFileSync(path.join(root,'reports/chaos-demon-court/runtime-slice-checks.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
} finally {await browser.close();await new Promise(r=>server.close(r));}
