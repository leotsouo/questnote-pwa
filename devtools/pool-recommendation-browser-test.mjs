// Synthetic dates are served only by this isolated loopback test. Production policy stays unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { POOL_NAVIGATION } from '../src/poolDirectory.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(process.argv[2] || '.dev-backups/test-runs/pool-recommendation-browser');
assert.ok(output.startsWith(path.join(root, '.dev-backups', 'test-runs') + path.sep));
await fs.mkdir(output, { recursive: true });
const fixture = { startsAt: '2026-10-10T00:00:00+08:00', endsAt: '2026-10-24T00:00:00+08:00' };
const start = Date.parse(fixture.startsAt);
const end = Date.parse(fixture.endsAt);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    let bytes = await fs.readFile(file);
    if (pathname === '/src/poolDirectory.js') {
      bytes = Buffer.from(bytes.toString('utf8').replace(/export const POOL_NAVIGATION = Object\.freeze\([\s\S]*?\);/, `export const POOL_NAVIGATION = Object.freeze(${JSON.stringify({ ...POOL_NAVIGATION, recommendation: fixture })});`));
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(bytes);
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const evidence = [];
const errors = [];
let page;
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, timezoneId: 'America/New_York', reducedMotion: 'reduce' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.setFixedTime(start - 60_000);
  await page.goto(origin);
  await page.locator('#app-loader').waitFor({ state: 'hidden' });
  if (await page.locator('[data-guided-action="skip"]').isVisible()) {
    await page.locator('[data-guided-action="skip"]').click();
    await page.locator('[data-guided-action="confirm-skip"]').click();
  }
  const settle = async (id) => {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const skip = page.locator('.dream-debut-overlay [data-role="skip"]');
      if (await skip.isVisible()) await skip.click({ timeout: 500 }).catch(() => {});
      if (await page.evaluate((id) => !document.querySelector('.dream-debut-overlay') &&
        !document.querySelector('[data-identity-action="series-directory"]')?.disabled &&
        document.querySelector('.summon-sanctuary')?.dataset.poolId === id, id)) return;
      await page.waitForTimeout(50);
    }
    throw new Error('Entry did not settle: ' + id);
  };
  const resumeAt = async (time, event = 'visibilitychange') => {
    await page.clock.setFixedTime(time);
    await page.evaluate((event) => (event === 'visibilitychange' ? document : window).dispatchEvent(new Event(event)), event);
  };
  const snapshot = () => page.evaluate(async () => {
    const db = await import('/src/db.js');
    return JSON.stringify({ wallet: await db.dbGet(db.STORES.META, 'wallet'), stats: await db.dbGet(db.STORES.META, 'gachaStats'),
      collection: await db.dbGetAll(db.STORES.COLLECTION), unlock: await db.dbGet(db.STORES.META, 'poolUnlockState') });
  });
  await page.locator('.bottom-nav [data-view="gacha"]').click();
  await settle('standard');
  const dismiss = page.getByRole('button', { name: '我知道了', exact: true });
  if (await dismiss.isVisible()) await dismiss.click();
  await page.locator(`.pool-navigation [data-directory-pool="${POOL_NAVIGATION.featuredPoolId}"]`).click();
  await settle(POOL_NAVIGATION.featuredPoolId);
  const label = page.locator('.pool-selection-note');
  const note = page.locator('.pool-recommendation-note');
  assert.equal(await label.innerText(), '推薦即將開始');
  assert.match(await note.innerText(), /現在即可抽取/);
  assert.equal(await note.locator('time').getAttribute('datetime'), new Date(start).toISOString());
  const before = await snapshot();
  await resumeAt(start);
  assert.equal(await label.innerText(), '推薦期剩餘 14 天 0 小時');
  assert.equal(await label.getAttribute('role'), 'timer');
  assert.equal(await label.getAttribute('aria-live'), 'off');
  assert.match(await note.innerText(), /2026\/10\/24\s00:00/);
  assert.match(await note.innerText(), /台灣時間 UTC\+8/);
  assert.match(await note.innerText(), /保底累積保留/);
  assert.equal(await snapshot(), before);
  evidence.push('Unchanged real app loads synthetic schedule; upcoming and active states preserve access; New York device displays exact Taipei deadline without live-region spam');

  await resumeAt(end - 25 * 60 * 60_000, 'pageshow');
  assert.equal(await label.innerText(), '推薦期剩餘 1 天 1 小時');
  await resumeAt(end - 65 * 60_000, 'pageshow');
  assert.equal(await label.innerText(), '推薦期剩餘 1 小時 5 分鐘');
  await page.locator('#toast-container .toast').first().waitFor({ state: 'hidden' });
  await page.screenshot({ path: path.join(output, 'active-preview-393.png'), fullPage: true });
  await note.evaluate((node) => node.scrollIntoView({ block: 'center' }));
  await note.screenshot({ path: path.join(output, 'deadline-details-preview.png') });
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const width of [320, 393, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['default', 'sweet', 'twilight']) {
      for (const fontSize of ['standard', 'extra-large', '200%']) {
        await page.evaluate(async ({ theme, fontSize }) => {
          const prefs = await import('/src/preferencesService.js');
          prefs.applyThemeToDocument(theme);
          prefs.applyFontSizeToDocument(fontSize);
          document.documentElement.style.fontSize = fontSize === '200%' ? '32px' : '';
        }, { theme, fontSize });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}/${theme}/${fontSize}: page overflow`);
      }
    }
  }
  await page.evaluate(async () => {
    const prefs = await import('/src/preferencesService.js');
    prefs.applyThemeToDocument('default'); prefs.applyFontSizeToDocument('standard');
    document.documentElement.style.fontSize = '';
  });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.locator('[data-identity-action="series-directory"]').click();
  await page.locator('.series-search summary').click();
  await page.locator('#identity-series-search').fill('霓霞');
  await page.evaluate(() => { window.testPoolButton = document.querySelector('.pool-navigation [aria-pressed="true"]'); });
  // pageshow isolates this expiry check from the App's separate cross-day full refresh.
  await resumeAt(end - 1000, 'pageshow');
  await page.clock.setFixedTime(end);
  // The real scheduled boundary callback must update without another navigation/focus event.
  await page.waitForFunction(() => document.querySelector('.pool-selection-note')?.textContent === '持續開放', null, { timeout: 3000 });
  assert.equal(await page.locator('#identity-series-search').inputValue(), '霓霞');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'identity-series-search');
  assert.equal(await page.evaluate(() => window.testPoolButton === document.querySelector('.pool-navigation [aria-pressed="true"]')), true);
  assert.equal(await page.locator('.pool-new-label:visible').count(), 0);
  assert.match(await note.innerText(), /推薦期已結束/);
  assert.equal(await snapshot(), before);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: path.join(output, 'ended-preview-393.png'), fullPage: true });
  evidence.push('Days/hours and hours/minutes refresh after resume; exact expiry updates text only, retaining open-gallery search, focus, DOM controls and all saved draw state');

  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  await page.reload();
  await page.locator('.bottom-nav [data-view="gacha"]').click();
  await settle(POOL_NAVIGATION.featuredPoolId);
  assert.equal(await page.locator('.pool-navigation button').first().getAttribute('data-directory-pool'), 'standard');
  assert.equal(await page.locator('.pool-new-label:visible').count(), 0);
  assert.match(await note.innerText(), /推薦期已結束/);
  assert.equal(await snapshot(), before);
  await context.setOffline(false);
  evidence.push('Expired recommendation drops from the lead position on normal redraw; offline reload preserves selected series, wallet, collection, unlock and pity');

  await page.evaluate(async () => {
    const db = await import('/src/db.js');
    const wallet = await db.dbGet(db.STORES.META, 'wallet');
    await db.dbPut(db.STORES.META, { ...wallet, stardust: 3000 });
  });
  for (const count of [1, 10]) {
    await page.clock.setFixedTime(start);
    await page.reload();
    await page.locator('.bottom-nav [data-view="gacha"]').click();
    await settle(POOL_NAVIGATION.featuredPoolId);
    await page.locator(`[data-identity-action="${count === 1 ? 'summon' : 'summon-ten'}"]`).click();
    await page.locator('#identity-reveal-dialog').waitFor({ state: 'visible' });
    const committed = await snapshot();
    await resumeAt(end, 'pageshow');
    assert.ok(await page.locator('#identity-reveal-dialog').isVisible());
    assert.equal(await snapshot(), committed, 'Expiry never changes a committed draw');
    assert.ok(await page.locator('[data-identity-action="series-directory"]').isDisabled());
    const skipReveal = page.locator('[data-identity-action="skip-reveal"]');
    if (await skipReveal.isVisible()) await skipReveal.click();
    if (count === 10) {
      assert.equal(await page.locator('.batch-summary .batch-card').count(), 10);
      await page.locator('[data-identity-action="close-reveal"]').first().click();
    } else if (await page.locator('#identity-reveal-dialog').isVisible()) await skipReveal.click();
    await settle(POOL_NAVIGATION.featuredPoolId);
    assert.equal(await label.innerText(), '持續開放');
  }
  assert.equal(await page.evaluate(async () => {
    const db = await import('/src/db.js');
    return (await db.dbGet(db.STORES.META, 'wallet')).stardust;
  }), 1900, 'One single and one ten draw debit exactly 1100 stardust');
  evidence.push('Expiry during both native single and ten draws leaves reveal, committed results and selected pool intact; controls recover afterward');
  await page.evaluate(async () => { await (await import('/src/preferencesService.js')).setReadingMode('senior'); });
  await page.reload();
  await page.locator('.bottom-nav [data-view="gacha"]').click();
  await settle(POOL_NAVIGATION.featuredPoolId);
  assert.ok(await note.isVisible());
  assert.ok(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.pool-recommendation-note')).fontSize) >= 16));
  await page.screenshot({ path: path.join(output, 'senior-ended-preview.png'), fullPage: true });
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ ok: true, fixtureOnly: true, fixture, evidence }, null, 2));
  console.log(evidence.map((row) => 'PASS ' + row).join('\n'));
  await context.close();
} catch (error) {
  await fs.writeFile(path.join(output, 'failure.txt'), error.stack || String(error));
  if (page) {
    await page.screenshot({ path: path.join(output, 'failure.png') });
    await fs.writeFile(path.join(output, 'failure-state.json'), JSON.stringify({ errors, text: await page.locator('body').innerText() }, null, 2));
  }
  throw error;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
