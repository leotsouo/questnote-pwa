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
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/pet-awakening.json')));
  const ids=['pet_ssr37','pet_ssr38','pet_ssr39','pet_ssr40','pet_ur28','pet_ur29','pet_ur30'];
  // Explicit synthetic story/art fixtures exercise native transactions, not production acceptance.
  catalog.pets.push(...ids.map(id=>({...catalog.pets[0],petId:id,name:'合成交易測試',rarity:id.includes('_ur')?'UR':'SSR',visual:id.includes('_ur')?'chaos_crown':'chaos_thorn',awakenedImage:catalog.pets[0].initialImage,awakenedSha256:catalog.pets[0].initialSha256})));
  await context.route('**/*',r=>{
    const u=new URL(r.request().url());
    if(u.origin!==base)return r.abort();
    if(u.pathname==='/data/pet-awakening.json')return r.fulfill({json:catalog});
    return r.continue();
  });
  const page=await context.newPage();await page.goto(base+'/reports/chaos-demon-court/runtime-slice.html');
  const result=await page.evaluate(async()=>{
    const db=await import('/src/db.js');const service=await import('/src/petAwakeningService.js');
    const id='pet_ur28';const prior=new Date(Date.now()-60000).toISOString();
    await db.dbPut('collection',{petId:id,owned:true,bondLevel:5,bondExp:500});
    await db.dbPut('meta',{key:'bondJourney',byPet:{[id]:{chapters:{5:{claimedAt:prior}}}}});
    await db.dbPut('meta',{key:'inventory',materials:{forest_leaf:5},items:{item_pine_trail_riceball:2,item_chaos_ember_tart:0}});
    await db.dbPut('meta',{key:'wallet',stardust:987,adventureEnergy:50});
    const collection=await db.dbGet('collection',id);const wallet=await db.dbGet('meta','wallet');
    const started=await service.startPetAwakening(id);const at=started.byPet[id].startedAt;
    const later=new Date(Date.parse(at)+1000).toISOString();
    for(const n of [1,2,3])await db.dbPut('tasks',{id:'synthetic-'+n,completed:true,completedAt:later});
    await db.dbPut('expeditions',{id:'wrong',claimed:true,claimedAt:later,startedAt:at,areaId:'cloudrest_trail',petIds:[id]});
    const wrong=await service.syncPetAwakening();
    await db.dbPut('expeditions',{id:'right',claimed:true,claimedAt:later,startedAt:at,areaId:'darkcrown_border',petIds:[id]});
    const ready=await service.syncPetAwakening();
    let missingFood='';try{await service.awakenPet(id);}catch(e){missingFood=e.message;}
    const afterRejected=await service.getPetAwakening();
    const inventory=await db.dbGet('meta','inventory');inventory.items.item_chaos_ember_tart=1;await db.dbPut('meta',inventory);
    const attempts=await Promise.allSettled([service.awakenPet(id),service.awakenPet(id)]);
    const after=await service.getPetAwakening();const finalInventory=await db.dbGet('meta','inventory');
    await service.setAwakeningForm(id,'initial');const form=await service.getPetAwakening();
    return {wrong:wrong.byPet[id].expeditionKey,ready:ready.byPet[id].status,missingFood,retained:afterRejected.byPet[id].status,
      attempts:attempts.map(r=>r.status),status:after.byPet[id].status,newFood:finalInventory.items.item_chaos_ember_tart,oldFood:finalInventory.items.item_pine_trail_riceball,
      tokenOnce:after.byPet[id].awakenedAt===after.byPet[id].tokenConsumedAt,form:form.byPet[id].form,
      walletPreserved:JSON.stringify(wallet)===JSON.stringify(await db.dbGet('meta','wallet')),
      collectionPreserved:JSON.stringify(collection)===JSON.stringify(await db.dbGet('collection',id)),database:(await db.openDB()).name};
  });
  assert.equal(result.wrong,null);assert.equal(result.ready,'ready');assert.ok(result.missingFood.includes('黯莓餘燼塔'));
  assert.equal(result.retained,'ready');assert.deepEqual(result.attempts.slice().sort(),['fulfilled','rejected']);
  assert.equal(result.status,'awakened');assert.equal(result.newFood,0);assert.equal(result.oldFood,2);assert.equal(result.tokenOnce,true);
  assert.equal(result.form,'initial');assert.equal(result.walletPreserved,true);assert.equal(result.collectionPreserved,true);
  fs.writeFileSync(path.join(root,'reports/chaos-demon-court/native-awakening-transactions.json'),JSON.stringify({mode:'synthetic fixtures; not final content acceptance',origin:base,status:'pass',result},null,2)+'\n');
  console.log(JSON.stringify(result));
} finally {await browser.close();await new Promise(r=>server.close(r));}
