import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.argv[2] || 'http://127.0.0.1:8793';
assert.equal(new URL(origin).hostname, '127.0.0.1');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
 await fs.mkdir('.dev-backups/mailbox-check', { recursive: true });
 const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
 await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
 const page = await context.newPage();
 const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.goto(origin + '/index.html');
 await page.waitForTimeout(2500);  await page.screenshot({path:'.dev-backups/mailbox-check/startup.png'}); const skip=page.getByRole('button',{name:'略過教學',exact:true}); if(await skip.isVisible()) { await skip.click(); const confirm=page.getByRole('button',{name:'確認略過教學',exact:true}); if(await confirm.isVisible()) await confirm.click(); }
 await page.evaluate(async () => { const ui = await import('/src/ui.js'); await ui.syncGlobalMailbox({force:true}); await ui.openGlobalMailbox(); });
 await page.locator('[data-action="mailbox-filter"][data-filter="all"]').click();
 assert.equal(await page.locator('.mailbox-list > li').count(), 3);
 for (const viewport of [{width:390,height:844},{width:320,height:568},{width:1280,height:900}]) {
  await page.setViewportSize(viewport);
  await page.screenshot({ path: `.dev-backups/mailbox-check/list-${viewport.width}.png` });
  await page.locator('[data-action="mailbox-open-message"][data-message-id="mailbox-bundle-updates"]').click(); await page.getByRole('heading',{name:'近期更新贈禮',exact:true}).waitFor();
  assert.equal(await page.locator('.mailbox-detail > .mailbox-reward-preview').count(), 6);
  assert.equal(await page.locator('.mailbox-detail__claim-btn').count(), 6);
  await page.locator('#mailbox-modal-body').evaluate(el => {el.scrollTop=el.scrollHeight;});
  const last = page.locator('.mailbox-detail__claim-btn').last();
  await last.scrollIntoViewIfNeeded();
  const rect = await last.boundingBox();
  assert.ok(rect && rect.y >= 0 && rect.y + rect.height <= viewport.height);
  await page.screenshot({path:`.dev-backups/mailbox-check/detail-${viewport.width}.png`});
  await page.locator('[data-action="mailbox-back-list"]').click();
  console.log(`PASS list and attachment layout ${viewport.width}x${viewport.height}`);
 }
 await page.locator('[data-action="mailbox-open-message"][data-message-id="mailbox-bundle-welcome"]').click(); await page.getByRole('heading',{name:'歡迎與常駐贈禮',exact:true}).waitFor();
 await page.locator('.mailbox-detail__claim-btn').first().click();
 await page.waitForFunction(() => document.querySelectorAll('.mailbox-detail__claim-btn').length === 1);
 await page.locator('[data-action="mailbox-back-list"]').click();
 const before = await page.evaluate(async () => (await import('/src/db.js')).dbGet('meta','wallet'));
 await page.locator('[data-claim-all="mailbox"]').click();
 await page.waitForFunction(() => document.querySelector('#mailbox-claim-actions').hidden);
 const state = await page.evaluate(async () => { const db=await import('/src/db.js'); return {wallet:await db.dbGet('meta','wallet'),mail:await db.dbGet('meta','globalMailboxState'),economy:await db.dbGet('meta','encounterEconomy'),inventory:await db.dbGet('meta','inventory')}; });
 assert.equal(state.mail.claimedIds.length,8);
 assert.equal(state.wallet.stardust-before.stardust,4300);
 assert.equal(state.wallet.adventureEnergy-before.adventureEnergy,23);
 assert.equal(state.inventory.items.item_small_spirit_food,5);
 assert.equal(state.mail.claimedIds.some(id=>id.startsWith('mailbox-bundle-')),false);
 await page.reload();
 await page.evaluate(async () => { const ui=await import('/src/ui.js');await ui.syncGlobalMailbox({force:true});await ui.openGlobalMailbox(); });
 await page.locator('[data-action="mailbox-filter"][data-filter="all"]').click();
 assert.equal(await page.locator('.mailbox-list > li').count(),3);
 assert.equal(await page.locator('[data-claim-all="mailbox"]').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS single claim, bulk remaining claims, persisted reload and no duplicate reward');
 await context.close();
} finally { await browser.close(); }

