/** Isolated journal acceptance: native app plus the memory-only design viewer. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const server = http.createServer(async (req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root) || relative.split('/').some((part) => part.startsWith('.'))) return res.writeHead(403).end();
  try {
    const type = { '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp' }[path.extname(file)];
    res.writeHead(200, { 'Content-Type': type || 'application/octet-stream' }).end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const origin of [`http://127.0.0.1:${server.address().port}`, 'http://127.0.0.1:4193']) {
    const context = await browser.newContext({ viewport: { width: 909, height: 764 }, serviceWorkers: 'block' });
    await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin + '/');
    await page.waitForFunction(() => document.querySelector('.identity-surface'));
    await page.evaluate(async () => {
      const { dbPut, STORES } = await import('/src/db.js');
      const { createCollectionEntry } = await import('/src/collectionService.js');
      await dbPut(STORES.META, { key: 'onboardingV1', schemaVersion: 2, status: 'dismissed' });
      await dbPut(STORES.META, { key: 'guidedOnboarding', schemaVersion: 1, status: 'skipped' });
      await dbPut(STORES.COLLECTION, { ...createCollectionEntry('pet_ur17'), bondExp: 40 });
      await dbPut(STORES.META, { key: 'inventory', items: { item_small_spirit_food: 3 } });
    });
    // The local viewer reseeds the same review fixture on reload; native uses isolated IndexedDB.
    await page.reload();
    await page.locator('#app-loader').waitFor({ state: 'hidden', timeout: 60000 });
    const skip = page.locator('[data-onboarding-action="skip"]');
    if (await skip.isVisible()) await skip.click();
    await page.locator('.nav-item[data-view="collection"]').click();
    await page.locator('.collection-card button[data-pet="pet_ur17"]').click();
    const dialog = page.locator('#identity-detail-dialog');
    await dialog.locator('#companion-feed-btn').waitFor();
    assert.equal(await dialog.getByText('養成與餵食', { exact: true }).count(), 0);
    const read = () => page.evaluate(async () => {
      const db = await import('/src/db.js');
      return { inventory: await db.dbGet(db.STORES.META, 'inventory'), pet: await db.dbGet(db.STORES.COLLECTION, 'pet_ur17'), other: await db.dbGet(db.STORES.COLLECTION, 'pet_n01') };
    });
    const before = await read();
    await dialog.locator('#companion-feed-btn').click();
    await dialog.locator('.journal-care-status').filter({ hasText: '親密度 +' }).waitFor();
    const after = await read();
    assert.equal(after.inventory.items.item_small_spirit_food, before.inventory.items.item_small_spirit_food - 1);
    assert.ok(after.pet.bondExp > before.pet.bondExp);
    if (before.pet.bondExp === 40) {
      assert.equal(after.pet.bondLevel, 2);
      assert.equal(await dialog.getByText('親密度 Lv.2 · 故事尚未解鎖', { exact: true }).count(), 0, 'Newly unlocked text refreshes with care');
    }
    assert.deepEqual(after.other, before.other, 'Gift targets selected pet, not companion');
    assert.equal(await dialog.evaluate((el) => el.open), true);
    assert.equal(await page.locator('#modal-overlay').isVisible(), false);
    for (const width of [909, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const theme of ['default', 'sweet', 'twilight']) {
        await page.evaluate((value) => { document.body.dataset.theme = value; }, theme);
        assert.equal(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), true, `${theme} ${width}: horizontal fit`);
        assert.ok(await dialog.locator('#companion-feed-btn').isVisible());
      }
    }
    await dialog.locator('[data-bond-open]').click();
    await page.locator('#modal-body .bond-reader').waitFor();
    assert.equal(await dialog.evaluate((el) => el.open), false, 'Story reader is not trapped behind journal');
    await page.locator('#modal-close').click();
    await page.locator('.collection-card button[data-pet="pet_ur17"]').click();
    await dialog.locator('[data-awake-open]').click();
    await page.locator('#modal-overlay').waitFor({ state: 'visible' });
    assert.equal(await dialog.evaluate((el) => el.open), false);
    await page.locator('#modal-close').click();
    await page.locator('.collection-card button[data-pet="pet_ur17"]').click();
    for (let i = 0; i < 2; i += 1) {
      await dialog.locator('#companion-feed-btn').click();
      await page.waitForFunction((expected) => document.querySelector('#companion-feed-select')?.textContent.includes(`×${expected}`) || !!document.querySelector('#companion-feed-workshop-btn'), 1 - i);
    }
    await dialog.locator('#companion-feed-workshop-btn').waitFor();
    assert.equal((await read()).inventory.items.item_small_spirit_food || 0, 0);
    await dialog.locator('#companion-feed-workshop-btn').click();
    assert.equal(await dialog.evaluate((el) => el.open), false);
    await page.locator('#view-workshop.active').waitFor();
    assert.deepEqual(errors, []);
    console.log(`PASS ${origin}: inline gift, stock, recipient, refresh, 6 layouts, story, awakening and empty-stock workshop`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
