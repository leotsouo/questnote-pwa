/** Launch defaults and manual selection on an isolated synthetic save. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const server = spawn(process.execPath, ['devtools/onboarding-browser-server.mjs', '0'], {
  windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
try {
  const origin = await new Promise((resolve, reject) => {
    server.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) resolve(match[0]);
    });
    server.on('error', reject);
    server.on('exit', (code) => reject(new Error(`Server exited: ${code}`)));
  });
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'block' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(`${origin}/index.html`);
  await page.locator('[data-onboarding-action="skip"]').click();
  await page.evaluate(async () => (await import('/src/ui.js')).switchView('gacha'));
  const select = page.locator('#gacha-pool-select');
  await page.waitForFunction(() => document.getElementById('gacha-pool-select')?.value === 'standard');
  const otherPool = await select.locator('option').evaluateAll((options) => options.find((option) => option.value !== 'standard').value);
  await select.selectOption(otherPool);
  await page.waitForFunction(async (id) => (await (await import('/src/gachaService.js')).getGachaStats()).selectedPoolId === id, otherPool);
  const before = await page.evaluate(async () => (await import('/src/gachaService.js')).getGachaStats());
  await page.evaluate(async () => {
    const ui = await import('/src/ui.js');
    ui.switchView('tasks');
    ui.switchView('gacha');
  });
  assert.equal(await select.inputValue(), otherPool, 'Manual selection survives navigation');
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#gacha-pool-select option').length > 1);
  await page.waitForFunction(async () => (await (await import('/src/gachaService.js')).getGachaStats()).selectedPoolId === 'standard');
  await page.evaluate(async () => (await import('/src/ui.js')).switchView('gacha'));
  assert.equal(await select.inputValue(), 'standard', 'Relaunch resets saved limited-pool selection');
  assert.equal(await page.locator('#gacha-pool-name').innerText(), '標準');
  const after = await page.evaluate(async () => (await import('/src/gachaService.js')).getGachaStats());
  assert.deepEqual({ ...after, selectedPoolId: otherPool }, before, 'Counters and per-pool pity are preserved');
  await fs.mkdir('reports/default-standard-summon', { recursive: true });
  await page.screenshot({ path: 'reports/default-standard-summon/standard-default.png' });
  console.log('PASS: fresh launch, manual switching, navigation, relaunch and saved pity preservation');
} finally {
  await browser?.close();
  server.kill();
}
