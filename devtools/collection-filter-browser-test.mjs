import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const output = process.env.QUESTNOTE_FILTER_REPORT_DIR;
assert.ok(output, 'Use a dedicated ignored evidence directory');
await fs.mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['devtools/onboarding-browser-server.mjs', '0'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const base = await new Promise((resolve, reject) => {
  server.stdout.on('data', bytes => { const match = String(bytes).match(/http:\/\/127\.0\.0\.1:\d+/); if (match) resolve(match[0]); });
  server.once('error', reject);
});
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const width of [320, 390, 768]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(base + '/index.html');
    await page.locator('#app-loader').waitFor({ state: 'hidden' });
    const skip = page.locator('[data-guided-action="skip"]');
    if (await skip.isVisible()) { await skip.click(); await page.locator('[data-guided-action="confirm-skip"]').click(); }
    await page.locator('.nav-item[data-view="collection"]').click();
    const surface = page.locator('#view-collection .identity-surface');
    assert.equal(await surface.locator('[data-density]').count(), 0, 'No card density controls');
    assert.equal(await surface.getByRole('button', { name: /精簡卡片|展開卡片/ }).count(), 0);
    const selectRarity = async rarity => {
      const button = surface.locator(`[data-rarity-filter="${rarity}"]`);
      await button.click();
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.equal(await button.evaluate(el => el === document.activeElement), true);
    };
    for (const rarity of ['N', 'R', 'SR', 'SSR', 'UR']) {
      await selectRarity(rarity);
      const badges = await surface.locator('.collection-grid .rarity').allTextContents();
      assert.ok(badges.length > 0, `${rarity} has cards`);
      assert.ok(badges.every(value => value === rarity), `Only ${rarity} cards`);
    }
    await surface.locator('[data-filter="owned"]').click();
    assert.equal(await surface.locator('.collection-card').count(), 0, 'Fresh collection has no owned UR');
    await surface.locator('[data-identity-action="clear-filter"]').click();
    assert.equal(await surface.locator('[data-rarity-filter="all"]').getAttribute('aria-pressed'), 'true');
    await selectRarity('UR');
    const firstName = await surface.locator('.collection-card .pet-name').first().textContent();
    await surface.locator('#identity-collection-search').fill(firstName);
    assert.ok(await surface.locator('.collection-card').count() > 0);
    assert.ok((await surface.locator('.collection-card .pet-name').allTextContents()).every(name => name.includes(firstName)));
    await surface.locator('#identity-collection-search').fill('不存在的測試名字');
    assert.equal(await surface.locator('.collection-card').count(), 0);
    await surface.locator('[data-identity-action="clear-filter"]').click();
    await selectRarity('UR');
    const scope = surface.locator('#identity-pool-select-collection');
    const options = await scope.locator('option').evaluateAll(els => els.map(el => el.value));
    await scope.selectOption(options.find(value => value !== 'all'));
    assert.ok((await surface.locator('.collection-grid .rarity').allTextContents()).every(value => value === 'UR'));
    await scope.selectOption('all');
    for (const theme of ['default', 'sweet', 'twilight']) {
      await page.evaluate(theme => { document.body.dataset.theme = theme; }, theme);
      for (const mode of ['normal', 'senior']) {
        await page.evaluate(mode => { document.body.dataset.readingMode = mode; }, mode);
        const boxes = await surface.locator('[data-rarity-filter]').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { x:r.x, right:r.right, height:r.height }; }));
        assert.ok(boxes.every(box => box.x >= 0 && box.right <= width && box.height >= 44), `${theme}/${mode}/${width}: visible touch targets`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
      }
      await page.evaluate(() => { document.body.dataset.readingMode = 'normal'; });
      await surface.locator('.collection-filter-group').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `${theme}-${width}.png`) });
    }
    assert.deepEqual(await page.evaluate(() => window.__questNoteOnboardingTest.errors), []);
    console.log(`PASS ${width}px: all rarities, state/search/series composition, reset, focus, 3 themes and 2 reading layouts`);
    await context.close();
  }
} finally { await browser.close(); server.kill(); }
