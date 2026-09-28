/** Browser acceptance on an isolated loopback origin; never touches a user's save. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.argv[2] || 'http://127.0.0.1:8769';
assert.equal(new URL(origin).hostname, '127.0.0.1');
const browser = await chromium.launch({ channel: 'msedge', headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'block' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error('Page error:', error.message));
  await page.goto(`${origin}/index.html`);
  await page.locator('[data-onboarding-action="skip"]').click();
  await page.evaluate(async () => {
    const collection = await import('/src/collectionService.js');
    const reward = await import('/src/rewardService.js');
    await collection.addPetToCollection('pet_ur01');
    await collection.addPetToCollection('pet_ur02');
    await collection.setCompanion('pet_ur01');
    await reward.addInventoryItem('item_small_spirit_food', 2);
  });
  await page.reload();
  await page.locator('.companion-feed-btn').waitFor();
  await fs.mkdir('reports/companion-feeding', { recursive: true });
  await page.locator('.companion-card').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 180));
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'reports/companion-feeding/home.png' });

  await page.locator('.companion-feed-btn').click();
  assert.ok(await page.locator('#companion-feed-btn').isVisible(), 'Companion entry opens feeding');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'reports/companion-feeding/feed.png' });
  await page.evaluate(() => { document.body.dataset.theme = 'sweet'; });
  await page.screenshot({ path: 'reports/companion-feeding/feed-sweet.png' });
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
  await page.locator('.collection-card[data-pet-id="pet_ur02"] [data-action="view-detail"]').click();
  assert.ok(await page.locator('[data-action="detail-feed-pet"]').isVisible(), 'Owned pet detail has a feed entry');
  await page.waitForTimeout(3400);
  await page.screenshot({ path: 'reports/companion-feeding/collection-detail.png' });
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
  await page.locator('.collection-card[data-pet-id="pet_n01"] [data-action="view-detail"]').click();
  assert.equal(await page.locator('[data-action="detail-feed-pet"]').count(), 0, 'Unowned pet has no feed entry');
  await context.close();
  console.log('PASS: companion and collection feed the intended pet, consume one item each, and handle empty stock');
} finally {
  await browser.close();
}
