import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.resolve(process.env.QUESTNOTE_NODE_MODULES || 'node_modules', 'playwright/index.mjs')));
const browser = await chromium.launch({ channel: 'msedge' });
const base = process.env.QUESTNOTE_QA_URL || 'http://127.0.0.1:8891/';
const output = 'reports/share-marketing';
await fs.mkdir(output, { recursive: true });
const results = [];
try {
  for (const width of [320, 375, 393, 430, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 852 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const page = await context.newPage();
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    await page.addInitScript(() => {
      window.__shares = [];
      window.__copies = [];
      Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
        window.__shares.push(data);
        if (window.__cancelShare) throw new DOMException('Cancelled', 'AbortError');
      } });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => window.__copies.push(text) } });
    });
    await page.goto(base + 'index.html');
    await page.waitForFunction(() => document.getElementById('share-description')?.textContent.length > 0);
    const skip = page.locator('[data-onboarding-action="skip"]');
    await skip.waitFor({ state: 'visible' });
    await skip.click();
    await page.locator('.onboarding-scrim').waitFor({ state: 'hidden' });
    await page.evaluate(async () => (await import('./src/ui.js')).switchView('share'));
    for (const theme of ['default', 'twilight', 'sweet']) {
      await page.evaluate(async theme => (await import('./src/ui.js')).applyTheme(theme, { silent: true, skipSave: true }), theme);
      for (const font of [16, 24]) {
        await page.evaluate(font => document.documentElement.style.fontSize = `${font}px`, font);
        const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
        assert.equal(dimensions.scroll, dimensions.client, `${width}/${theme}/${font} overflow`);
        await page.locator('#btn-share-app').click();
        const payload = await page.evaluate(() => window.__shares.at(-1));
        assert.equal(payload.url, 'https://questnote.taste-compare.com/');
        assert.match(payload.text, /https:\/\/leotsouo.github.io\/questnote-pwa\//);
        await page.locator('#btn-copy-app-link').click();
        const copied = await page.evaluate(() => window.__copies.at(-1));
        assert.match(copied, /認識 QuestNote：https:\/\/questnote.taste-compare.com\//);
        assert.match(copied, /直接開始：https:\/\/leotsouo.github.io\/questnote-pwa\//);
        results.push({ width, theme, font, overflow: false, share: true, copy: true });
        if ((width === 393 && font === 16) || (width === 320 && font === 24) || (width === 1440 && theme === 'default' && font === 16)) {
          await page.waitForTimeout(3500);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({ path: `${output}/${width}-${theme}-${font}.png`, fullPage: true });
          await page.screenshot({ path: `${output}/${width}-${theme}-${font}-viewport.png` });
        }
      }
    }
    await page.evaluate(() => { window.__cancelShare = true; });
    const copiesBefore = await page.evaluate(() => window.__copies.length);
    await page.locator('#btn-share-app').click();
    assert.equal(await page.evaluate(() => window.__copies.length), copiesBefore, 'cancellation must not copy');
    await page.evaluate(() => Object.defineProperty(navigator, 'share', { value: undefined }));
    await page.locator('#btn-share-app').click();
    assert.equal(await page.evaluate(() => window.__copies.length), copiesBefore + 1, 'unsupported must copy invitation');
    await page.locator('.share-message summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.share-message').getAttribute('open'), '');
    await context.close();
  }
  await fs.writeFile(`${output}/browser-results.json`, JSON.stringify(results, null, 2));
  console.log(`${results.length} responsive/native-share/clipboard checks passed; cancellation, fallback and keyboard passed at all 5 widths.`);
} finally { await browser.close(); }
