/** Filter-row gestures (src/filterGestureController.js): touch/mouse drag scrolls the row, edge swipes stay in the app.
 * Originally exercised the collection series strip; V3.5.20 (6fb9615) replaced that strip with the identity surface
 * (covered by collection-filter-browser-test.mjs), so the gestures are now checked on the task category row,
 * the remaining .filter-bar that overflows on narrow phones.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { startTestOrigin, evidenceDir, skipGuidedTour } from './browser-test-origin.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = evidenceDir('collection-swipe');
const server = await startTestOrigin();
const origin = server.origin;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
 for (const width of [320, 360]) {
  const context = await browser.newContext({ viewport: {width,height:700}, isMobile:true, hasTouch:true, serviceWorkers:'block' });
  await context.route('**/*', route=>new URL(route.request().url()).origin===origin ? route.continue() : route.abort());
  const page=await context.newPage();
  await page.goto(origin + '/index.html');
  await skipGuidedTour(page);
  await page.waitForFunction(()=>!document.querySelector('#toast-container > *'), null, {timeout:15000});
  const row=page.locator('#task-category-filters');
  await row.scrollIntoViewIfNeeded();
  assert.ok(await row.evaluate(el=>el.scrollWidth>el.clientWidth+20), 'Category row overflows at this width');
  const rect=await row.boundingBox();
  const y=rect.y+rect.height/2;
  const active=()=>row.locator('.active').getAttribute('data-cat-filter');
  const cdp=await context.newCDPSession(page);
  const swipe=async (start,end)=>{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
    for(let i=1;i<=8;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+(end-start)*i/8,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(300);
  };
  await row.evaluate(el=>{el.scrollLeft=0;});
  await page.mouse.move(rect.x + rect.width - 45, y);
  await page.mouse.down();
  await page.mouse.move(rect.x + 20, y, {steps:12});
  await page.mouse.up();
  assert.ok(await row.evaluate(el=>el.scrollLeft)>3, 'Row supports mouse drag');
  assert.equal(await active(), 'all', 'Dragging does not select a chip');
  const last=row.locator('.filter-btn').last();
  await last.click();
  assert.ok(await last.evaluate(el=>el.classList.contains('active')), 'Regular click after drag still works');
  await row.locator('[data-cat-filter="all"]').click();
  await row.evaluate(el=>{el.scrollLeft=0;});
  await swipe(width-55,55);
  assert.ok(await row.evaluate(el=>el.scrollLeft)>3,'Trusted central touch scrolls horizontal filter');
  await row.evaluate(el=>{el.scrollLeft=0;});
  const beforeUrl=page.url();
  await swipe(width-2,70);
  assert.ok(await row.evaluate(el=>el.scrollLeft)>3,'Edge touch scrolls filter instead of leaving app');
  assert.equal(page.url(),beforeUrl);
  assert.equal(await active(),'all','Swipe does not accidentally select a chip');
  const guard=await page.evaluate(y=>{
    const target=document.getElementById('task-category-filters');
    const event=(x,cy)=>new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[new Touch({identifier:1,target,clientX:x,clientY:cy})]});
    const edge=event(innerWidth-2,y);target.dispatchEvent(edge);
    target.dispatchEvent(new TouchEvent('touchcancel',{bubbles:true}));
    const center=event(innerWidth/2,y);target.dispatchEvent(center);
    const elsewhere=event(innerWidth-2,10);target.dispatchEvent(elsewhere);
    return {edge:edge.defaultPrevented,center:center.defaultPrevented,elsewhere:elsewhere.defaultPrevented};
  },y);
  assert.deepEqual(guard,{edge:true,center:false,elsewhere:false},'Edge guard is confined to the filter row');
  await row.evaluate(el=>{el.scrollLeft=0;});
  const boundaries=await page.evaluate(()=>({body:document.documentElement.scrollWidth, touch:getComputedStyle(document.body).touchAction}));
  assert.ok(boundaries.body<=width,'No page-wide horizontal overflow');
  assert.equal(boundaries.touch,'pan-x pan-y');
  await fs.mkdir(output,{recursive:true});
  await page.screenshot({path:`${output}/tasks-${width}.png`});
  const beforeScroll=await page.evaluate(()=>scrollY);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width-2,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width-2,y:y-90}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await page.evaluate(()=>scrollY)>beforeScroll,'Edge vertical swipe still scrolls the page');
  console.log(`PASS ${width}px: mouse drag, touch and edge swipe on the category row, no accidental selection, no overflow`);
  await context.close();
 }
} finally {await browser.close(); server.close();}
