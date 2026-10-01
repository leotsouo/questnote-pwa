/** Real habit actions on a guarded, disposable local database. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.argv[2];
assert.equal(new URL(origin).hostname, '127.0.0.1');
const marker = await (await fetch(origin + '/__onboarding_test_guard__')).json();
assert.equal(marker.purpose, 'questnote-onboarding-synthetic-only');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const output = 'reports/today-habits';
await fs.mkdir(output, { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, timezoneId: 'Asia/Taipei', serviceWorkers: 'block' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(origin + '/index.html');
  await page.locator('[data-onboarding-action="skip"]').click();
  assert.equal(await page.evaluate(() => window.__questNoteOnboardingTest.databaseName), marker.databaseName);
  await page.locator('.today-habits [data-action="habit-create-first"]').click();
  await page.locator('#habit-name').fill('每天喝水，照顧自己的身體');
  await page.locator('#habit-category').selectOption('health');
  await page.locator('#habit-form button[type="submit"]').click();
  await page.locator('.today-habit-card').waitFor();
  const seed = await page.evaluate(async () => {
    const habits = await import('/src/habitService.js');
    const db = await import('/src/db.js');
    const first = (await habits.getAllHabits())[0];
    for (const row of [
      { id: 'daily-reading', name: '閱讀一本喜歡的書'.repeat(8), frequency: 'daily', categoryId: 'school' },
      { id: 'weekly', name: '每週運動三次', frequency: 'weekly', targetPerWeek: 3 },
      { id: 'archived', name: '封存習慣', frequency: 'daily', isActive: false },
    ]) await db.dbPut(db.STORES.HABITS, habits.normalizeHabit(row));
    return { firstId: first.id, taskCount: (await db.dbGetAll(db.STORES.TASKS)).length };
  });
  await page.reload();
  await page.locator('.today-habit-card').first().waitFor();
  assert.equal(await page.locator('.today-habit-card').count(), 2);
  assert.equal(await page.locator('#habit-summary').isVisible(), false);
  const first = `.today-habit-card[data-id="${seed.firstId}"] button`;
  const wallet = () => page.evaluate(async () => (await (await import('/src/rewardService.js')).getWallet()).stardust);
  const before = await wallet();
  // Same event loop double click exercises the action guard before persistence resolves.
  await page.locator(first).evaluate((button) => { button.focus(); button.click(); button.click(); });
  await page.waitForFunction((selector) => {
    const button = document.querySelector(selector);
    return button?.getAttribute('aria-pressed') === 'true' && !button.disabled;
  }, first);
  assert.equal(await wallet(), before + 5, 'one habit completion gives one reward');
  assert.equal(await page.locator(first).evaluate((button) => button === document.activeElement), true, 'keyboard focus follows the rerender');
  assert.equal(await page.locator('.today-habit-card').last().getAttribute('data-id'), seed.firstId);
  await page.reload();
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('aria-pressed') === 'true', first);
  await page.locator(first).click();
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('aria-pressed') === 'false' && !document.querySelector(selector).disabled, first);
  await page.locator(first).click();
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('aria-pressed') === 'true' && !document.querySelector(selector).disabled, first);
  assert.equal(await wallet(), before + 5, 'undo and redo cannot reclaim the daily reward');
  await page.locator('.today-habits [data-action="go-habits"]').click();
  const management = `#view-habits .habit-card[data-id="${seed.firstId}"]`;
  await page.locator(management + ' [data-action="habit-uncomplete"]').click();
  await page.waitForFunction((selector) => !!document.querySelector(selector + ' [data-action="habit-complete"]:not(:disabled)'), management);
  await page.evaluate(async () => (await import('/src/ui.js')).switchView('tasks'));
  assert.equal(await page.locator(first).getAttribute('aria-pressed'), 'false', 'both pages share the same log');
  await page.locator('[data-cat-filter="health"]').click();
  assert.equal(await page.locator('.today-habit-card').count(), 1);
  await page.locator('[data-task-view="all"]').click();
  assert.equal(await page.locator('.today-habits').count(), 0);
  await page.locator('[data-task-view="today"]').click();
  await page.locator('[data-cat-filter="all"]').click();
  let layouts = 0;
  for (const width of [320, 393, 768]) {
    await page.setViewportSize({ width, height: 852 });
    for (const theme of ['default', 'sweet', 'twilight']) {
      for (const fontSize of [16, 24, 32]) {
        await page.evaluate(({ theme, fontSize }) => {
          document.body.dataset.theme = theme;
          document.documentElement.style.fontSize = `${fontSize}px`;
        }, { theme, fontSize });
        const fits = await page.locator('.today-habits').evaluate((section) => {
          const bounds = section.getBoundingClientRect();
          return { width: section.clientWidth, scrollWidth: section.scrollWidth,
            buttons: [...section.querySelectorAll('button')].map((button) => {
              const rect = button.getBoundingClientRect();
              return { fit: rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1, height: rect.height, width: rect.width };
            }) };
        });
        assert.ok(fits.scrollWidth <= fits.width + 1, `${width}/${theme}/${fontSize}: section fits`);
        assert.ok(fits.buttons.every((button) => button.fit && button.height >= 44 && button.width >= 44));
        layouts++;
      }
    }
  }
  await page.evaluate(async () => (await import('/src/habitService.js')).updateHabit('daily-reading', { name: '閱讀十分鐘' }));
  await page.reload();
  await page.locator(first).click();
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('aria-pressed') === 'true' && !document.querySelector(selector).disabled, first);
  await page.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 10000 });
  await page.setViewportSize({ width: 393, height: 852 });
  for (const theme of ['default', 'sweet', 'twilight']) {
    await page.evaluate((theme) => {
      document.body.dataset.theme = theme;
      document.documentElement.style.fontSize = '16px';
      document.querySelector('.today-habits').scrollIntoView({ block: 'center' });
    }, theme);
    await page.screenshot({ path: `${output}/${theme}-393.png` });
  }
  const stored = await page.evaluate(async () => {
    const db = await import('/src/db.js');
    return { tasks: (await db.dbGetAll(db.STORES.TASKS)).length, errors: window.__questNoteOnboardingTest.errors };
  });
  assert.equal(stored.tasks, seed.taskCount, 'habit actions never create duplicate tasks');
  assert.deepEqual(stored.errors, []);
  await fs.writeFile(`${output}/browser.json`, JSON.stringify({ status: 'PASS', layouts,
    behavior: ['create from today', 'active daily only', 'double click', 'focus', 'reload persistence', 'undo/redo rewards', 'cross-page sync', 'category filtering', 'tab isolation', 'task storage unchanged'] }, null, 2));
  console.log(`PASS habit behavior and ${layouts} responsive layouts`);
  await context.close();
} finally { await browser.close(); }
