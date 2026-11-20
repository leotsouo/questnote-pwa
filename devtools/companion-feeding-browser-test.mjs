/** Browser acceptance on an isolated loopback origin; never touches a user's save. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { startTestOrigin, evidenceDir, skipGuidedTour } from './browser-test-origin.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = process.argv[2]?.startsWith('http') ? null : await startTestOrigin();
const origin = server?.origin || process.argv[2];
assert.equal(new URL(origin).hostname, '127.0.0.1');
const browser = await chromium.launch({ channel: 'msedge', headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'block' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error('Page error:', error.message));
  await page.goto(`${origin}/index.html`);
  await skipGuidedTour(page);
  await page.evaluate(async () => {
    const collection = await import('/src/collectionService.js');
    const reward = await import('/src/rewardService.js');
    await collection.addPetToCollection('pet_ur01');
    await collection.addPetToCollection('pet_ur02');
    await collection.setCompanion('pet_ur01');
    await reward.addInventoryItem('item_small_spirit_food', 2);
  });
  await page.reload();
  // Since V3.4.26 (1e8e4e9) the home feed entry is the hero's .qn-companion-feed; the old companion card is hidden.
  const homeFeed = page.locator('[data-action="companion-feed"]:visible');
  await homeFeed.waitFor();
  const output = evidenceDir('companion-feeding');
  await fs.mkdir(output, { recursive: true });
  await homeFeed.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${output}/home.png` });

  await homeFeed.click();
  assert.ok(await page.locator('#companion-feed-btn').isVisible(), 'Companion entry opens feeding');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${output}/feed.png` });
  await page.evaluate(() => { document.body.dataset.theme = 'sweet'; });
  await page.screenshot({ path: `${output}/feed-sweet.png` });
  await page.evaluate(() => { document.body.dataset.theme = 'default'; });
  await page.locator('#companion-feed-btn').click();
  await page.waitForFunction(async () => (await (await import('/src/workshopService.js')).getInventory()).items.item_small_spirit_food === 1);
  await page.locator('#companion-feed-select option').filter({ hasText: '×1' }).waitFor({ state: 'attached' });
  const afterCompanion = await page.evaluate(async () => {
    const collection = await import('/src/collectionService.js');
    const pet1 = await collection.getPetCollection('pet_ur01');
    const pet2 = await collection.getPetCollection('pet_ur02');
    return { pet1: pet1.bondExp, pet2: pet2.bondExp };
  });
  assert.ok(afterCompanion.pet1 > 0 && afterCompanion.pet2 === 0, 'Companion receives the first item');

  await page.locator('#modal-close').click();
  await page.locator('.nav-item[data-view="collection"]').click();
  // V3.5.20 (6fb9615) collection is the identity surface; owned pets reach the app detail (and feeding) from its dialog.
  await page.locator('#view-collection [data-pet="pet_ur02"]').click();
  await page.locator('[data-identity-action="app-pet-detail"][data-pet-id="pet_ur02"]').click();
  assert.ok(await page.locator('[data-action="detail-feed-pet"]').isVisible(), 'Owned pet detail has a feed entry');
  await page.waitForTimeout(3400);
  await page.screenshot({ path: `${output}/collection-detail.png` });
  await page.locator('[data-action="detail-feed-pet"]').click();
  await page.locator('#companion-feed-btn').click();
  await page.waitForFunction(async () => (await (await import('/src/workshopService.js')).getInventory()).items.item_small_spirit_food === 0);
  await page.locator('#companion-feed-workshop-btn').waitFor();
  const afterCollection = await page.evaluate(async () => {
    const collection = await import('/src/collectionService.js');
    const pet1 = await collection.getPetCollection('pet_ur01');
    const pet2 = await collection.getPetCollection('pet_ur02');
    return { pet1: pet1.bondExp, pet2: pet2.bondExp };
  });
  assert.equal(afterCollection.pet1, afterCompanion.pet1, 'Collection feed does not target the active companion');
  assert.ok(afterCollection.pet2 > 0, 'Selected collection pet receives the item');
  assert.ok(await page.locator('#companion-feed-workshop-btn').isVisible(), 'Empty inventory explains where to craft');
  await page.locator('#companion-feed-workshop-btn').click();
  assert.ok(await page.locator('#view-workshop').getAttribute('class').then((value) => value.includes('active')));
  assert.equal(await page.locator('[data-workshop-tab="craft"]').getAttribute('aria-selected'), 'true');

  await page.locator('.nav-item[data-view="collection"]').click();
  await page.locator('#view-collection [data-pet="pet_n01"]').click();
  await page.locator('#identity-detail-dialog[open]').waitFor();
  assert.equal(await page.locator('[data-identity-action="app-pet-detail"]:visible').count(), 0, 'Unowned pet has no feed entry');
  await context.close();
  console.log('PASS: companion and collection feed the intended pet, consume one item each, and handle empty stock');
} finally {
  await browser.close();
  server?.close();
}
