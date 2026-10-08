import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(import.meta.dirname,'..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/json');res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});const checks=[];
try{
 const context=await browser.newContext();await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/reports/chaos-demon-court/source-art-review.html');await page.waitForFunction(()=>window.artReview?.count===27);
 for(const width of [320,393,1280]){
  await page.setViewportSize({width,height:900});
  await page.locator('.collection-card').last().scrollIntoViewIfNeeded();await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForFunction(()=>[...document.querySelectorAll('.collection-card img')].every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await page.locator('.collection-card').count(),27);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.collection-card img')].every(i=>getComputedStyle(i).objectFit==='contain')));
  await page.screenshot({path:path.join(root,'reports/chaos-demon-court/source-art-'+width+'.png'),fullPage:true});
  checks.push({width,completeImages:27,overflow:false,objectFit:'contain'});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>indexedDB.databases()),[]);
 fs.writeFileSync(path.join(root,'reports/chaos-demon-court/source-art-ui-checks.json'),JSON.stringify({status:'pass',scope:'exact source collection renderer/styles; pinned artifact acceptance pending',checks,pageErrors:errors,noGameDatabase:true},null,2)+'\n');
 console.log(JSON.stringify(checks));
}finally{await browser.close();await new Promise(r=>server.close(r));}

