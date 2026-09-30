import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const catalog = JSON.parse(await fs.readFile(process.env.QUESTNOTE_CATALOG, 'utf8'));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
 for (const width of [320, 430]) {
  const context = await browser.newContext({ viewport: {width,height:932}, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  await context.route('**/*', route=>{
   const url=new URL(route.request().url());
   if(url.origin!=='http://127.0.0.1:8775') return route.abort();
   const field={'/data/pets.json':'petsData','/data/pools.json':'poolsData','/data/pets-lore.json':'loreData','/data/pet-series.json':'seriesCatalog'}[url.pathname];
   if(field) return route.fulfill({contentType:'application/json',body:JSON.stringify(catalog[field])});
   return route.continue();
  });
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:8775/index.html');
  await page.getByRole('button',{name:'略過教學',exact:true}).click();
  await page.locator('.nav-item[data-view="collection"]').click();
  const row=page.locator('#collection-series-filters');
  await row.scrollIntoViewIfNeeded();
  const rect=await row.boundingBox();
  const y=rect.y+20;
  const cdp=await context.newCDPSession(page);
  const swipe=async (start,end)=>{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
    for(let i=1;i<=8;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+(end-start)*i/8,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(300);
  };
  await row.evaluate(el=>{el.scrollLeft=0;});
  await swipe(width-55,55);
  assert.ok(await row.evaluate(el=>el.scrollLeft)>3,'Trusted central touch scrolls horizontal filter');
  await row.evaluate(el=>{el.scrollLeft=0;});
  const beforeUrl=page.url();
  await swipe(width-2,70);
  assert.ok(await row.evaluate(el=>el.scrollLeft)>3,'Edge touch scrolls filter instead of leaving app');
  assert.equal(page.url(),beforeUrl);
  assert.equal(await page.locator('#collection-series-select').inputValue(),'all','Swipe does not accidentally select a chip');
  const guard=await page.evaluate(y=>{
    const target=document.getElementById('collection-series-filters');
    const event=(x,cy)=>new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[new Touch({identifier:1,target,clientX:x,clientY:cy})]});
    const edge=event(innerWidth-2,y);target.dispatchEvent(edge);
    target.dispatchEvent(new TouchEvent('touchcancel',{bubbles:true}));
    const center=event(innerWidth/2,y);target.dispatchEvent(center);
    const elsewhere=event(innerWidth-2,10);target.dispatchEvent(elsewhere);
    return {edge:edge.defaultPrevented,center:center.defaultPrevented,elsewhere:elsewhere.defaultPrevented};
  },y);
  assert.deepEqual(guard,{edge:true,center:false,elsewhere:false},'Edge guard is confined to the filter row');
  await page.locator('#collection-series-select').selectOption('eternal_slumber_bloom');
  assert.equal(await page.locator('#collection-series-filters .active').getAttribute('data-series-filter'),'eternal_slumber_bloom');
  assert.ok(await page.locator('.collection-card').count()>0,'Picker renders real series cards');
  await page.locator('#collection-series-filters [data-series-filter="all"]').click();
  assert.equal(await page.locator('#collection-series-select').inputValue(),'all');
  await row.evaluate(el=>{el.scrollLeft=0;});
  const boundaries=await page.evaluate(()=>({body:document.documentElement.scrollWidth, viewport:innerWidth, touch:getComputedStyle(document.body).touchAction}));
  assert.ok(boundaries.body<=width,'No page-wide horizontal overflow');
  assert.equal(boundaries.touch,'pan-x pan-y');
  await fs.mkdir('reports/collection-swipe',{recursive:true});
  await page.screenshot({path:`reports/collection-swipe/collection-${width}.png`});
  const beforeScroll=await page.evaluate(()=>scrollY);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width-2,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width-2,y:y-90}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await page.evaluate(()=>scrollY)>beforeScroll,'Edge vertical swipe still scrolls the page');
  console.log(`PASS ${width}px: native touch row swipe, edge swipe, picker/chips sync, no overflow`);
  await context.close();
 }
} finally {await browser.close();}
