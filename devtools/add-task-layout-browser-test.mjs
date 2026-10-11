/** Real homepage geometry and create-task entry checks on a synthetic-only origin. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const playwright = require(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const engine = process.env.QUESTNOTE_BROWSER_ENGINE || 'chromium';
const reportDir = process.env.QUESTNOTE_ADD_TASK_REPORT_DIR;
const results = [];
const errors = [];
const server = spawn(process.execPath, ['devtools/onboarding-browser-server.mjs', '0'], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
let page;
const base = await new Promise((resolve, reject) => {
  let output = '';
  const timer = setTimeout(() => reject(new Error('Synthetic server startup timed out')), 15000);
  server.stdout.on('data', (bytes) => {
    output += bytes;
    const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
    if (match) { clearTimeout(timer); resolve(match[0]); }
  });
  server.once('error', reject);
});

async function measureButtons() {
  return page.locator('#view-tasks button[aria-label="新增任務"], #view-tasks [data-action="empty-add-task"]').evaluateAll((buttons) => buttons
    .filter((button) => button.getClientRects().length && getComputedStyle(button).visibility !== 'hidden')
    .map((button) => {
      const style = getComputedStyle(button);
      const after = getComputedStyle(button, '::after');
      const rect = button.getBoundingClientRect();
      const icon = button.querySelector('.qn-icon');
      return {
        selector: button.id ? `#${button.id}` : button.className,
        text: button.textContent.trim(), after: after.content,
        width: rect.width, height: rect.height,
        clientWidth: button.clientWidth, scrollWidth: button.scrollWidth,
        clientHeight: button.clientHeight, scrollHeight: button.scrollHeight,
        display: style.display, fontSize: style.fontSize, lineHeight: style.lineHeight,
        padding: style.padding, overflow: style.overflow,
        icon: icon ? { width: icon.getBoundingClientRect().width, height: icon.getBoundingClientRect().height } : null,
        afterWidth: after.width, afterHeight: after.height,
        fitsViewport: rect.left >= 0 && rect.right <= innerWidth,
      };
    }));
}

async function checkButtons(name, click = true) {
  const buttons = await measureButtons();
  assert.ok(buttons.length, `${name}: no visible add-task entry`);
  results.push({ name, buttons });
  for (const button of buttons) {
    assert.ok(button.scrollWidth <= button.clientWidth + 1 && button.scrollHeight <= button.clientHeight + 1,
      `${name}: button content overflows ${JSON.stringify(button)}`);
    assert.ok(button.fitsViewport, `${name}: button outside viewport ${JSON.stringify(button)}`);
  }
  if (!click) return; // The active tutorial deliberately makes non-target actions inert.
  const visible = page.locator('#view-tasks button[aria-label="新增任務"], #view-tasks [data-action="empty-add-task"]').filter({ visible: true });
  for (let i = 0; i < await visible.count(); i += 1) {
    await visible.nth(i).click();
    await page.locator('#task-form #task-content').waitFor({ state: 'visible' });
    await page.locator('#modal-close').click();
    await page.locator('#modal-overlay.open').waitFor({ state: 'hidden' });
  }
}

try {
  const guard = await (await fetch(`${base}/__onboarding_test_guard__`)).json();
  assert.equal(guard.purpose, 'questnote-onboarding-synthetic-only');
  assert.match(guard.databaseName, /^QuestNoteTest-Onboarding-/);
  browser = await playwright[engine].launch({ headless: true,
    ...(engine === 'chromium' ? { channel: process.env.QUESTNOTE_BROWSER_CHANNEL || 'chrome' } : {}) });
  const context = await browser.newContext({ viewport: { width: 430, height: 637 },
    locale: 'zh-TW', isMobile: true, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/index.html`);
  await page.locator('#app-loader').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.body.classList.contains('guided-active'));
  await checkButtons('430x637 / active tutorial / empty', false);
  await page.locator('[data-guided-action="skip"]').click();
  await page.locator('[data-guided-action="confirm-skip"]').click();
  await page.locator('.guided-coach').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.body.classList.contains('guided-learned'));
  // This persisted, real tutorial state adds the label that originally overflowed.
  await checkButtons('430x637 / default / standard / normal / skipped tutorial / empty');
  for (const readingMode of ['normal', 'senior']) {
    await page.evaluate(async (mode) => {
      const prefs = await import('/src/preferencesService.js');
      await prefs.setReadingMode(mode);
    }, readingMode);
    await page.reload();
    await page.locator('#app-loader').waitFor({ state: 'hidden' });
    for (const populated of [false, true]) {
      if (populated) {
        await page.evaluate(async () => {
          const task = await import('/src/taskService.js');
          const db = await import('/src/db.js');
          assertSafeDatabase(await db.openDB());
          await task.createTask({ content: '排版測試任務', isPlannedToday: true });
          const ui = await import('/src/ui.js');
          await ui.renderAll();
          function assertSafeDatabase(database) {
            if (!database.name.startsWith('QuestNoteTest-Onboarding-')) throw new Error('Unsafe database');
          }
        });
      }
      for (const width of [430, 320, 1280]) {
        await page.setViewportSize({ width, height: width === 1280 ? 900 : 637 });
        for (const theme of ['default', 'sweet', 'twilight']) {
          for (const fontSize of ['standard', 'large', 'extra-large', 'stress-200']) {
            await page.evaluate(async ({ theme, fontSize }) => {
              const prefs = await import('/src/preferencesService.js');
              prefs.applyThemeToDocument(theme);
              prefs.applyFontSizeToDocument(fontSize === 'stress-200' ? 'standard' : fontSize);
              document.documentElement.style.fontSize = fontSize === 'stress-200' ? '32px' : '';
            }, { theme, fontSize });
            const name = `${width} / ${theme} / ${fontSize} / ${readingMode} / ${populated ? 'populated' : 'empty'}`;
            await checkButtons(name);
            if (reportDir && width === 430 && theme === 'default' && fontSize === 'standard' && !populated) {
              await fs.mkdir(reportDir, { recursive: true });
              await page.locator('.twilight-add-task').screenshot({ path: path.join(reportDir, `${readingMode}-button.png`) });
              await page.screenshot({ path: path.join(reportDir, `${readingMode}-home.png`), fullPage: true });
            }
          }
        }
      }
      if (populated) {
        await page.evaluate(async () => {
          const db = await import('/src/db.js');
          await db.dbClear(db.STORES.TASKS);
          await (await import('/src/ui.js')).renderAll();
        });
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(`PASS ${results.length} homepage layout combinations; visible entries open task form outside the locked tutorial (${engine}).`);
} catch (error) {
  errors.push(error.stack || String(error));
  throw error;
} finally {
  if (reportDir) {
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(path.join(reportDir, 'results.json'), JSON.stringify({ engine, results, errors }, null, 2));
    await page?.screenshot({ path: path.join(reportDir, 'last-state.png'), fullPage: true }).catch(() => {});
  }
  await browser?.close();
  server.kill();
}
