import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const root = path.resolve(import.meta.dirname, '..'); const report = path.join(root, 'reports/awakening-implementation');
const artifact = JSON.parse(await fs.readFile(path.join(report, 'artifacts.json'))).preview;
const child = spawn(process.execPath, ['devtools/pet-awakening-review-server.mjs', artifact.artifactDir], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const viewer = await new Promise((resolve, reject) => { let out = ''; child.stdout.on('data', (b) => { out += b; const m = out.match(/http:\/\/127\.0\.0\.1:\d+\/[^\s]+/); if (m) resolve(m[0]); }); child.once('error', reject); });
const { chromium } = createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
let context; const results = [];
try {
  context = await browser.newContext({ viewport: { width: 1280, height: 960 } });
  await context.route('**/*', (r) => new URL(r.request().url()).origin === new URL(viewer).origin ? r.continue() : r.abort());
  const page = await context.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(viewer); await page.locator('article').last().waitFor(); assert.equal(await page.locator('article').count(), 20);
  assert.ok((await page.locator('#artifact').innerText()).includes(artifact.artifactId));
  await page.waitForFunction(() => [...document.querySelectorAll('.pair img')].every((i) => i.complete && i.naturalWidth > 0));
  for (const card of process.argv.includes('--demo-only') ? [] : await page.locator('article').all()) {
    const name = await card.locator('h2').innerText();
    await card.locator('[data-play="normal"]').click(); await page.locator('.awakening-scene').waitFor();
    assert.ok((await page.locator('.awakening-after').getAttribute('src')).includes(name === '丹砂鎮嶺蛤' ? 'pet_ur17-awakened-2bf6' : 'stage'));
    await page.locator('.awakening-scene').waitFor({ state: 'detached', timeout: 8000 });
    await card.locator('[data-play="reduced"]').click(); await page.locator('.awakening-scene').waitFor({ state: 'detached', timeout: 3000 });
    results.push({ name, normal: 'passed', reduced: 'passed' }); console.log(`PASS normal/reduced ${name}`);
  }
  assert.deepEqual(await page.evaluate(() => indexedDB.databases()), [], 'Read-only viewer must not create a game database');
  await page.locator('article').filter({ hasText: '丹砂鎮嶺蛤' }).screenshot({ path: path.join(report, 'toad-open-mouth-comparison.png') });
  await page.locator('#map-review').screenshot({ path: path.join(report, 'cloudrest-map-review.png') });
  await page.setViewportSize({ width: 320, height: 800 }); await page.reload(); await page.locator('article').last().waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.goto(viewer.replace('awakening-review/', 'awakening-demo/'));
  await page.locator('iframe').waitFor(); const frame = page.frameLocator('iframe');
  await frame.locator('#app-loader').waitFor({ state: 'hidden' }); await frame.locator('.bottom-nav [data-view="collection"]').click();
  await frame.locator('.collection-card[data-pet-id="pet_ur17"] [data-action="view-detail"]').click();
  await frame.locator('[data-awake-open="pet_ur17"]').click(); await frame.locator('[data-awake-action="initial"]').waitFor();
  await frame.locator('[data-awake-action="initial"]').click(); await frame.locator('.awakening-reader').filter({ hasText: '目前：初遇相' }).waitFor();
  await frame.locator('[data-awake-action="awakened"]').click(); await frame.locator('.awakening-reader').filter({ hasText: '目前：覺醒相' }).waitFor();
  await page.screenshot({ path: path.join(report, 'isolated-demo-320.png'), fullPage: true });
  await frame.locator('[data-awake-action="close"]').click();
  await frame.locator('.collection-card[data-pet-id="pet_ur16"] [data-action="view-detail"]').click(); await frame.locator('[data-awake-open="pet_ur16"]').click();
  await frame.locator('[data-awake-action="awaken"]').click(); await frame.locator('.awakening-scene').waitFor(); await frame.locator('.awakening-scene__skip').click();
  await frame.locator('.awakening-reader').filter({ hasText: '目前：覺醒相' }).waitFor();
  assert.deepEqual(errors, []);
  await page.goto(viewer); await page.locator('article').last().waitFor();
  assert.equal(await page.locator('article').count(), 20, 'App worker cannot replace the review shell on reopening');
  await fs.writeFile(path.join(report, process.argv.includes('--demo-only') ? 'demo-acceptance.json' : 'viewer-acceptance.json'), JSON.stringify({ status: 'passed', artifactId: artifact.artifactId, testedAt: new Date().toISOString(),
    scenarios: results, readonlyViewerDatabaseCount: 0, width320Overflow: false, isolatedDemo: 'actual app dual-form switch and ritual passed', reviewShellOutsideWorkerScope: true, viewerReloadAfterDemo: true, pageErrors: errors }, null, 2) + '\n');
  console.log('PASS pinned viewer: all twenty normal/reduced, no DB, 320px; actual isolated demo ritual');
} finally { await context?.close(); await browser.close(); child.kill(); }
