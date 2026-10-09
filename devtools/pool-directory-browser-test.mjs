// Isolated loopback server and fresh browser contexts; never access player storage or remote services.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE
  ? createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE)
  : await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(process.argv[2] || '.dev-backups/test-runs/pool-directory-browser');
assert.ok(output.startsWith(path.join(root, '.dev-backups', 'test-runs') + path.sep));
await fs.mkdir(output, { recursive:true });
const types = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const bytes = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(bytes);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel:'msedge', headless:true });
const evidence = [];
let diagnosticPage;
const errors = [];
try {
  const context = await browser.newContext({ viewport:{ width:393, height:852 }, reducedMotion:'reduce' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  diagnosticPage = page;
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin + '/index.html');
  await page.locator('#app-loader').waitFor({ state:'hidden' });
  const skipTutorial = page.locator('[data-guided-action="skip"]');
  if (await skipTutorial.isVisible()) {
    await skipTutorial.click();
    await page.locator('[data-guided-action="confirm-skip"]').click();
  }
  await page.locator('.bottom-nav [data-view="gacha"]').click();
  const settle = async (id) => {
    const end = Date.now() + 20000;
    while (Date.now() < end) {
      const skip = page.locator('.dream-debut-overlay [data-role="skip"]');
      // Entry can finish naturally while a temporary teaching toast covers Skip.
      if (await skip.isVisible()) await skip.click({ timeout:500 }).catch(() => {});
      if (await page.evaluate((id) => !document.querySelector('.dream-debut-overlay') &&
        !document.querySelector('[data-identity-action="series-directory"]')?.disabled &&
        (!id || document.querySelector('.summon-sanctuary')?.dataset.poolId === id), id)) return;
      await page.waitForTimeout(50);
    }
    throw new Error('Pool entry did not settle: ' + id);
  };
  await settle('standard');
  const dismissTour = page.getByRole('button', { name:'我知道了', exact:true });
  if (await dismissTour.isVisible()) await dismissTour.click();
  assert.equal(await page.locator('.pool-navigation button').count(), 3);
  const snapshot = () => page.evaluate(async () => {
    const db = await import('/src/db.js');
    const stats = await db.dbGet(db.STORES.META, 'gachaStats');
    return JSON.stringify({ wallet:await db.dbGet(db.STORES.META, 'wallet'), collection:await db.dbGetAll(db.STORES.COLLECTION),
      unlock:await db.dbGet(db.STORES.META, 'poolUnlockState'), pity:stats?.poolPity });
  });
  const before = await snapshot();
  await page.locator('[data-identity-action="series-directory"]').click();
  const rows = page.locator('#identity-series-results [data-directory-pool]');
  const ids = await rows.evaluateAll((nodes) => nodes.map((node) => node.dataset.directoryPool));
  assert.equal(ids.length, 8);
  await page.locator('#identity-series-search').fill('花海');
  assert.equal(await rows.count(), 1);
  assert.match(await rows.innerText(), /12 位可相遇/);
  await page.locator('#identity-series-search').fill('不存在的系列');
  assert.equal(await rows.count(), 0);
  assert.ok(await page.locator('.series-directory-empty').isVisible());
  await page.locator('#identity-series-search').fill('花海');
  await rows.click();
  await settle('eternal_slumber_bloom');
  assert.equal(await snapshot(), before, 'Changing directory selection does not change wallet, collection, unlock or pity');
  await page.reload();
  await page.locator('.bottom-nav [data-view="gacha"]').click();
  await settle('eternal_slumber_bloom');
  assert.match(await page.locator('.pool-selection-note').innerText(), /永眠花海/);
  evidence.push('8 series available; name/empty search; flower lock count; persisted selection and no economic/collection writes');

  await page.locator('.pool-navigation [data-directory-pool="darkcrown_court_release"]').click();
  await settle('darkcrown_court_release');
  await page.locator('.pool-navigation [data-directory-pool="standard"]').click();
  await settle('standard');
  assert.equal(await snapshot(), before);
  evidence.push('Latest and standard shortcuts preserve the existing complete pool entry flow');

  for (const width of [320, 393, 1280]) {
    await page.setViewportSize({ width, height:900 });
    for (const theme of ['default', 'sweet', 'twilight']) {
      for (const fontSize of ['standard', 'extra-large', '200%']) {
        await page.evaluate(async ({ theme, fontSize }) => {
          const preferences = await import('/src/preferencesService.js');
          preferences.applyThemeToDocument(theme);
          preferences.applyFontSizeToDocument(fontSize);
          document.documentElement.style.fontSize = fontSize === '200%' ? '32px' : '';
        }, { theme, fontSize });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}/${theme}/${fontSize}: page overflow`);
        await page.locator('[data-identity-action="series-directory"]').click();
        assert.ok(await page.evaluate(() => {
          const node = document.getElementById('identity-detail-dialog');
          return node.scrollWidth <= node.clientWidth + 1;
        }), `${width}/${theme}/${fontSize}: dialog overflow`);
        if (theme === 'default' && fontSize === 'standard') {
          await page.screenshot({ path:path.join(output, `directory-${width}.png`) });
        }
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => document.activeElement?.dataset.identityAction), 'series-directory');
      }
    }
  }
  evidence.push('320/393/1280px, 3 themes, standard/extra-large/200% text: no horizontal overflow; Escape restores focus');
  await page.evaluate(async () => {
    document.documentElement.style.fontSize = '';
    const preferences = await import('/src/preferencesService.js');
    await preferences.setReadingMode('senior');
  });
  await page.reload();
  await page.locator('.bottom-nav [data-view="gacha"]').click();
  await settle('standard');
  assert.ok(await page.locator('.summon-dock').isVisible());
  await page.locator('[data-identity-action="series-directory"]').click();
  assert.equal(await rows.count(), 8);
  await page.keyboard.press('Escape');
  await page.evaluate(async () => { await (await import('/src/preferencesService.js')).setReadingMode('normal'); });
  await page.reload();
  await page.locator('.bottom-nav [data-view="gacha"]').click();
  await settle('standard');
  evidence.push('Senior reading mode keeps summon controls and every series available');

  // Offline navigation uses cached runtime modules and native persisted selection.
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  await page.reload();
  await page.locator('.bottom-nav [data-view="gacha"]').click();
  await settle('standard');
  await page.locator('[data-identity-action="series-directory"]').click();
  await page.locator('#identity-series-results [data-directory-pool="eternal_slumber_bloom"]').click();
  await settle('eternal_slumber_bloom');
  evidence.push('Offline reload keeps directory module and allows switching to a previously available series');
  await context.setOffline(false);
  await page.evaluate(async () => {
    const db = await import('/src/db.js');
    const wallet = await db.dbGet(db.STORES.META, 'wallet');
    await db.dbPut(db.STORES.META, { ...wallet, stardust:1000 });
  });
  await page.reload();
  await page.locator('.bottom-nav [data-view="gacha"]').click();
  await settle('eternal_slumber_bloom');
  await page.locator('[data-identity-action="summon"]').click();
  await page.waitForFunction(() => document.querySelector('[data-identity-action="series-directory"]')?.disabled);
  assert.ok(await page.locator('.pool-navigation button').evaluateAll((nodes) => nodes.every((node) => node.disabled)));
  await page.locator('.pool-navigation [data-directory-pool="standard"]').evaluate((node) => node.dispatchEvent(new MouseEvent('click', { bubbles:true })));
  assert.equal(await page.evaluate(async () => {
    const db = await import('/src/db.js');
    return (await db.dbGet(db.STORES.META, 'gachaStats')).selectedPoolId;
  }), 'eternal_slumber_bloom');
  await page.locator('#identity-reveal-dialog').waitFor({ state:'visible' });
  await page.locator('[data-identity-action="skip-reveal"]').click();
  if (await page.locator('#identity-reveal-dialog').isVisible()) await page.locator('[data-identity-action="skip-reveal"]').click();
  await settle('eternal_slumber_bloom');
  evidence.push('Native draw disables all navigation; forced click cannot change saved selection; controls recover');
  assert.deepEqual(errors, []);
  await context.close();
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ ok:true, evidence }, null, 2));
  console.log(evidence.map((row) => 'PASS ' + row).join('\n'));
} catch (error) {
  await fs.writeFile(path.join(output, 'failure.txt'), error.stack || String(error));
  if (diagnosticPage) {
    await diagnosticPage.screenshot({ path:path.join(output, 'failure.png') });
    await fs.writeFile(path.join(output, 'failure-state.json'), JSON.stringify({ errors, text:await diagnosticPage.locator('body').innerText() }, null, 2));
  }
  throw error;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
