// Run against browser-test-server.mjs on loopback; each case uses disposable storage.
// PLAYWRIGHT_MODULE may point to an installed Playwright module URL.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.argv[2] || 'http://127.0.0.1:8768';
assert.equal(new URL(origin).hostname, '127.0.0.1');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, serviceWorkers: 'block' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error(error.message));
  await page.goto(origin + '/index.html');
  await page.locator('#onboarding-root [data-onboarding-action="skip"]').click();
  await page.evaluate(async () => {
    document.body.dataset.theme = 'sweet';
    document.documentElement.style.setProperty('--safe-top', '59px');
    document.documentElement.style.setProperty('--safe-bottom', '34px');
    const ui = await import('/src/ui.js');
    await ui.syncGlobalMailbox({ force: true });
    await ui.openGlobalMailbox();
  });
  await page.locator('[data-action="mailbox-filter"][data-filter="all"]').click();
  await page.locator('[data-message-id="2026-09-v3413-growth-lessons-gift"]').click();
  await page.locator('.mailbox-detail__title').waitFor();
  await fs.mkdir('reports/mailbox-layout', { recursive: true });
  await page.screenshot({ path: 'reports/mailbox-layout/after.png' });
  for (const viewport of [{ width: 430, height: 932 }, { width: 320, height: 568 }, { width: 932, height: 430 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const theme of ['sweet', 'default']) {
      await page.evaluate((theme) => { document.body.dataset.theme = theme; }, theme);
      for (const id of ['2026-09-v3413-growth-lessons-gift', '2026-09-v3411-frost-release']) {
        await page.locator('[data-action="mailbox-back-list"]').click();
        await page.locator(`[data-message-id="${id}"]`).click();
        await page.locator('.mailbox-detail__title').waitFor();
        const check = async () => page.evaluate(() => {
          const sheet = document.querySelector('.global-mailbox-modal__sheet');
          const header = document.querySelector('.global-mailbox-modal__header');
          const filters = document.querySelector('.global-mailbox-modal__filters');
          const body = document.querySelector('.global-mailbox-modal__body');
          const sr = sheet.getBoundingClientRect(), hr = header.getBoundingClientRect(), fr = filters.getBoundingClientRect(), br = body.getBoundingClientRect();
          return {
            paddingTop: getComputedStyle(sheet).paddingTop,
            sheetFits: sr.top >= 0 && sr.bottom <= innerHeight,
            toolbarFits: hr.bottom <= fr.top && fr.bottom <= br.top,
            chipsFit: [...filters.children].every((chip) => chip.getBoundingClientRect().bottom <= fr.bottom),
            bodyHeight: br.height, scrollTop: body.scrollTop, headerTop: hr.top,
          };
        });
        const before = await check();
        assert.equal(before.paddingTop, '12px', 'No repeated top safe inset');
        assert.ok(before.sheetFits && before.toolbarFits && before.chipsFit, 'Toolbar and chips remain fully visible');
        assert.ok(before.bodyHeight > 80, 'Letter retains a usable reading area');
        await page.locator('.global-mailbox-modal__body').hover();
        await page.mouse.wheel(0, 3000);
        await page.waitForTimeout(150);
        const after = await check();
        assert.equal(after.headerTop, before.headerTop, 'Scrolling a letter must not move the toolbar');
        if (id.includes('growth')) {
          assert.ok(after.scrollTop > 0, 'Long letter scrolls');
          const claim = await page.locator('.mailbox-detail__claim-btn').boundingBox();
          assert.ok(claim && claim.y >= 0 && claim.y + claim.height <= viewport.height, 'Gift button remains reachable');
        }
        console.log(`PASS ${viewport.width}x${viewport.height} ${theme} ${id}`);
      }
    }
  }
  await context.close();
} finally { await browser.close(); }
