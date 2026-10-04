/** Native browser/IndexedDB acceptance on a fresh synthetic-only loopback origin. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const reportDir = path.resolve(root, process.env.QUESTNOTE_SENIOR_REPORT_DIR || 'reports/senior-mode');
await fs.mkdir(reportDir, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const results = [];
const errors = [];
let browser;
let page;
let normalHomeOrder;
const server = spawn(process.execPath, ['devtools/onboarding-browser-server.mjs', '0'], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
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
async function check(name, callback) {
  const result = { name, ok: false };
  try { result.detail = await callback(); result.ok = true; }
  catch (error) {
    result.error = error.stack;
    await page?.screenshot({ path: path.join(reportDir, 'failure.png'), fullPage: true }).catch(() => {});
  }
  results.push(result);
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${name}${result.error ? '\n' + result.error : ''}`);
  assert.ok(result.ok, name);
}
const shot = async (name) => {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: path.join(reportDir, `${name}.png`), fullPage: true });
  await page.screenshot({ path: path.join(reportDir, `${name}-viewport.png`) });
};
async function load() {
  await page.goto(`${base}/index.html`);
  await page.locator('#app-loader').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.querySelector('#task-view-content')?.children.length
    && document.querySelector('#guide-tutorial-status')?.textContent);
  await page.waitForTimeout(400);
  const skip = page.locator('[data-guided-action="skip"]');
  if (await skip.isVisible()) {
    await skip.click();
    await page.locator('[data-guided-action="confirm-skip"]').click();
    await page.locator('.guided-coach').waitFor({ state: 'hidden' });
  }
  await page.evaluate(async () => {
    const names = ['db', 'preferencesService', 'taskService', 'rewardService', 'collectionService', 'gachaService', 'ui'];
    window.seniorTest = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await import(`/src/${name}.js`)])));
    if (!(await window.seniorTest.db.openDB()).name.startsWith('QuestNoteTest-Onboarding-')) throw new Error('Unsafe test database');
  });
}
async function nav(view) {
  if (view === 'settings') {
    await page.locator('.bottom-nav [data-view="more"]').click();
    await page.locator('[data-goto="settings"]').click();
  } else await page.locator(`.bottom-nav [data-view="${view}"]`).click();
  await page.locator(`#view-${view}.active`).waitFor();
  if (view === 'gacha') {
    await page.waitForTimeout(300);
    const skip = page.locator('.dream-debut-skip');
    if (await skip.isVisible()) {
      await skip.click();
      await page.locator('.dream-debut-overlay').waitFor({ state: 'hidden' });
    }
  }
}
const snapshot = () => page.evaluate(async () => {
  const s = await window.seniorTest.db.readAllStoresSnapshot();
  return { ...s, meta: s.meta.filter((row) => row.key !== 'userPreferences').map((row) => {
    // Reload refreshes the mailbox fetch timestamp; claims/read state still compare exactly.
    if (row.key !== 'globalMailboxState') return row;
    const { lastFetchedAt, ...state } = row;
    return state;
  }) };
});
const wallet = () => page.evaluate(() => window.seniorTest.rewardService.getWallet());
const taskRows = () => page.evaluate(() => window.seniorTest.taskService.getAllTasks());
async function mode(senior) {
  await nav('settings');
  await page.locator('label[for="reading-mode-toggle"]').click();
  await page.waitForFunction((value) => document.body.dataset.readingMode === value && !document.getElementById('reading-mode-toggle').disabled, senior ? 'senior' : 'normal');
}
async function closeModal() {
  await page.locator('#modal-close').click();
  await page.locator('#modal-overlay.open').waitFor({ state: 'hidden' });
}

try {
  const guard = await (await fetch(`${base}/__onboarding_test_guard__`)).json();
  assert.equal(guard.purpose, 'questnote-onboarding-synthetic-only');
  assert.match(guard.databaseName, /^QuestNoteTest-Onboarding-/);
  browser = await chromium.launch({ channel: process.env.QUESTNOTE_BROWSER_CHANNEL || 'chrome', headless: true,
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => errors.push(error.message));
  await load();
  await check('normal baseline and isolated seed', async () => {
    assert.equal(await page.locator('body').getAttribute('data-reading-mode'), 'normal');
    normalHomeOrder = await page.locator('#view-tasks').evaluate((home) => [...home.children].map((node) => node.id || node.className));
    await shot('normal-home');
    await page.getByRole('button', { name: '新增任務', exact: true }).filter({ visible: true }).first().click();
    await shot('normal-add');
    await closeModal();
    await page.evaluate(async () => {
      await window.seniorTest.rewardService.addStardust(1000);
      await window.seniorTest.collectionService.addPetToCollection('pet_n01');
      await window.seniorTest.collectionService.setCompanion('pet_n01');
    });
    await load();
    return { database: guard.databaseName, note: 'Native IDB only; no production calls allowed' };
  });
  await check('settings switch persists and preserves every shared store', async () => {
    const before = await snapshot();
    await nav('settings'); await shot('normal-settings');
    await mode(true);
    assert.deepEqual(await snapshot(), before);
    await shot('senior-settings');
    await load();
    assert.equal(await page.locator('body').getAttribute('data-reading-mode'), 'senior');
    assert.deepEqual(await snapshot(), before);
    await shot('senior-empty');
    await shot('senior-home');
  });
  let taskId;
  await check('guided practice uses real task creation/completion and can be dismissed persistently', async () => {
    await page.locator('[data-senior-action="practice"]').click();
    assert.equal(await page.locator('#task-content').inputValue(), '喝一杯水');
    await page.locator('#task-form button[type="submit"]').click();
    await page.locator('#modal-overlay.open').waitFor({ state: 'hidden' });
    await page.waitForFunction(async () => (await window.seniorTest.taskService.getAllTasks()).some((row) => row.title === '喝一杯水'));
    const practice = (await taskRows()).find((row) => row.title === '喝一杯水');
    await page.locator(`.task-card[data-id="${practice.id}"] [data-action="toggle"]`).click();
    await page.locator('[data-senior-action="guide-summon"]').waitFor({ state: 'visible' });
    await shot('senior-practice-completed');
    await page.locator('[data-senior-action="guide-finish"]').click();
    await page.locator('#senior-practice').waitFor({ state: 'hidden' });
    await load();
    assert.equal(await page.locator('#senior-practice').isVisible(), false);
    assert.equal(await page.evaluate(async () => (await window.seniorTest.preferencesService.getUserPreferences()).seniorOnboardingCompleted), true);
  });
  await check('create timed task through the shared form; useful labels and advanced disclosure', async () => {
    await page.getByRole('button', { name: '新增任務', exact: true }).filter({ visible: true }).first().click();
    await page.locator('#task-content').waitFor();
    assert.equal(await page.locator('#task-form .senior-schedule-shortcuts').evaluate((row) => getComputedStyle(row).display), 'grid',
      'Senior date shortcuts must override legacy modal flex layout');
    await shot('senior-add-top');
    await page.locator('#task-content').fill('晚上吃藥');
    await page.locator('#task-planned-time').fill('20:00');
    assert.equal(await page.locator('.senior-form-options').getAttribute('open'), null);
    await shot('senior-add');
    await page.locator('#task-form button[type="submit"]').click();
    await page.locator('#modal-overlay.open').waitFor({ state: 'hidden' });
    await page.waitForFunction(async () => (await window.seniorTest.taskService.getAllTasks()).some((task) => task.title === '晚上吃藥'));
    const task = (await taskRows()).find((row) => row.title === '晚上吃藥');
    taskId = task.id;
    assert.equal(task.plannedTime, '20:00');
    await page.locator(`.task-card[data-id="${taskId}"]`).waitFor();
    await shot('senior-home-with-task');
    await page.locator('.senior-completion-receipt [data-senior-action="dismiss-feedback"]').click();
    await shot('senior-home-settled');
    return { plannedTime: task.plannedTime, taskId };
  });
  await check('complete task grants actual shared rewards and leaves persistent readable receipt', async () => {
    const before = await wallet();
    await page.locator(`.task-card[data-id="${taskId}"] [data-action="toggle"]`).click();
    await page.waitForFunction(async (id) => (await window.seniorTest.taskService.getAllTasks()).find((row) => row.id === id)?.completed, taskId);
    await page.waitForFunction(() => document.querySelector('.senior-completion-receipt')?.textContent.includes('已完成「晚上吃藥」'));
    const after = await wallet();
    assert.ok(after.stardust > before.stardust);
    const receipt = await page.locator('.senior-completion-receipt').innerText();
    assert.ok(receipt.includes(`${after.stardust - before.stardust} 星塵`));
    await shot('senior-completion');
    await shot('senior-reward');
    await page.waitForTimeout(3000);
    assert.equal(await page.locator('.senior-completion-receipt').isVisible(), true);
    return { stardustDelta: after.stardust - before.stardust, energyDelta: after.adventureEnergy - before.adventureEnergy, receipt };
  });
  await check('edit/delete are explicit; confirmation names the task; cancellation is safe', async () => {
    const card = page.locator(`.task-card[data-id="${taskId}"]`);
    await card.locator('.senior-task-actions [data-action="edit"]').click();
    await page.locator('#task-content').fill('晚上吃藥（飯後）');
    await page.locator('#task-form button[type="submit"]').click();
    await page.locator('#modal-overlay.open').waitFor({ state: 'hidden' });
    await page.waitForFunction(async (id) => (await window.seniorTest.taskService.getAllTasks()).find((row) => row.id === id)?.title === '晚上吃藥（飯後）', taskId);
    await card.locator('.twilight-task-menu summary').click();
    await card.locator('[data-action="delete"]').click();
    assert.match(await page.locator('#modal-body').innerText(), /晚上吃藥（飯後）/);
    await shot('senior-delete-confirmation');
    await shot('senior-modal');
    await page.locator('#confirm-cancel').click();
    assert.ok((await taskRows()).some((row) => row.id === taskId));
    await card.locator('[data-action="delete"]').click();
    await page.locator('#confirm-ok').click();
    await page.waitForFunction(async (id) => !(await window.seniorTest.taskService.getAllTasks()).some((row) => row.id === id), taskId);
    return { deleted: true };
  });
  await check('error feedback remains readable and dirty forms prevent accidental dismissal', async () => {
    await page.getByRole('button', { name: '新增任務', exact: true }).filter({ visible: true }).first().click();
    await page.locator('#task-content').fill('未儲存的任務');
    await page.locator('.senior-form-options summary').click();
    await page.locator('#task-start-date').fill('2026-10-05');
    await page.locator('#task-due-date').fill('2026-10-04');
    await page.locator('#task-form button[type="submit"]').click();
    await page.locator('#task-date-error').waitFor({ state: 'visible' });
    await shot('senior-error');
    await page.locator('#modal-close').click();
    await page.locator('.senior-discard').waitFor();
    assert.equal(await page.locator('#task-form').isVisible(), true);
    await shot('senior-unsaved-confirmation');
    // The visible discard action is the UI operation under test.
    await page.getByRole('button', { name: '放棄修改', exact: true }).click();
    await page.locator('#modal-overlay.open').waitFor({ state: 'hidden' });
  });
  await check('single summon confirms cost, charges once and preserves a readable result', async () => {
    await nav('gacha');
    // Current production presentation delegates to encounterActions; legacy controls are hidden.
    await page.locator('#view-gacha [data-identity-action="summon"]').waitFor();
    await shot('senior-gacha');
    const before = await wallet();
    const statsBefore = await page.evaluate(() => window.seniorTest.gachaService.getGachaStats());
    await page.locator('#view-gacha [data-identity-action="summon"]').click();
    await page.locator('#confirm-ok').waitFor();
    await shot('senior-summon-confirmation');
    assert.deepEqual(await wallet(), before, 'confirmation must precede spending');
    await page.locator('#confirm-cancel').click();
    assert.deepEqual(await wallet(), before, 'canceling a summon never spends currency');
    await page.locator('#view-gacha [data-identity-action="summon"]').click();
    await page.locator('#confirm-ok').click();
    await page.waitForFunction(async (count) => (await window.seniorTest.gachaService.getGachaStats()).totalPulls === count + 1, statsBefore.totalPulls, { timeout: 30000 });
    await page.waitForTimeout(2500);
    await shot('senior-summon-result');
    const after = await wallet();
    assert.ok(before.stardust > after.stardust);
    // The original summon layer has a persistent result and a visible close control.
    await page.locator('[data-identity-action="skip-reveal"]').click();
    return { cost: before.stardust - after.stardust, pulls: 1 };
  });
  await check('collection and pet details remain reachable, with explicit home navigation', async () => {
    await nav('collection');
    await shot('senior-collection');
    await page.locator('#view-collection .collection-card [data-pet="pet_n01"]').click();
    await page.locator('#identity-dialog-content').waitFor();
    await shot('senior-pet');
    await page.locator('[data-identity-action="close-dialog"]').first().click();
    await page.locator('#senior-location [data-senior-action="home"]').click();
    await page.locator('#view-tasks.active').waitFor();
  });
  await check('primary touch targets, modal keyboard semantics and system reduced motion', async () => {
    const controls = await page.locator('.twilight-add-task, .bottom-nav button').evaluateAll((items) => items.map((el) => ({
      name: el.getAttribute('aria-label') || el.textContent.trim(), width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height,
    })));
    assert.ok(controls.every((control) => control.width >= 44 && control.height >= 44), JSON.stringify(controls));
    await page.getByRole('button', { name: '新增任務', exact: true }).filter({ visible: true }).first().click();
    const semantics = await page.locator('#modal-overlay').evaluate((overlay) => ({
      role: overlay.getAttribute('role'), modal: overlay.getAttribute('aria-modal'),
      name: overlay.getAttribute('aria-label') || document.getElementById(overlay.getAttribute('aria-labelledby'))?.textContent,
    }));
    assert.equal(semantics.role, 'dialog');
    assert.equal(semantics.modal, 'true');
    assert.match(semantics.name, /新增任務/);
    const submit = page.locator('#task-form button[type="submit"]');
    await submit.focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('#modal-overlay')), true);
    await page.keyboard.press('Escape');
    await page.locator('#modal-overlay.open').waitFor({ state: 'hidden' });
    const running = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running')
      .map((animation) => ({ name: animation.animationName, target: animation.effect?.target?.className })));
    assert.deepEqual(running, []);
    return { controls, semantics, runningAnimations: running.length };
  });
  await check('all visible actionable controls have touch targets across main views', async () => {
    const measurements = [];
    for (const view of ['tasks', 'settings', 'gacha', 'collection', 'expedition', 'more']) {
      await nav(view);
      measurements.push(...await page.locator('.view.active').evaluate((root, view) => [...root.querySelectorAll('button, select, summary, input, textarea, a[href]')]
        .filter((el) => el.getClientRects().length && !el.disabled && getComputedStyle(el).visibility !== 'hidden')
        .map((el) => {
          const target = el.matches('input[type="checkbox"], input[type="radio"]') ? el.closest('label') || el : el;
          const box = target.getBoundingClientRect();
          return { view, id: el.id, tag: el.tagName, name: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 55), width: box.width, height: box.height };
        }), view));
    }
    await nav('tasks');
    await page.getByRole('button', { name: '新增任務', exact: true }).filter({ visible: true }).first().click();
    measurements.push(...await page.locator('#modal-overlay').evaluate((root) => [...root.querySelectorAll('button, select, summary, input, textarea')]
      .filter((el) => el.getClientRects().length && !el.disabled && getComputedStyle(el).visibility !== 'hidden')
      .map((el) => {
        const target = el.matches('input[type="checkbox"], input[type="radio"]') ? el.closest('label') || el : el;
        const box = target.getBoundingClientRect();
        return { view: 'task-modal', id: el.id, tag: el.tagName, name: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 55), width: box.width, height: box.height };
      })));
    await closeModal();
    await fs.writeFile(path.join(reportDir, 'touch-targets.json'), JSON.stringify({ measurements, failures: measurements.filter((row) => row.width < 43.9 || row.height < 43.9) }, null, 2));
    assert.deepEqual(measurements.filter((row) => row.width < 43.9 || row.height < 43.9), [], 'See touch-targets.json');
    return { count: measurements.length, minimumWidth: Math.min(...measurements.map((row) => row.width)), minimumHeight: Math.min(...measurements.map((row) => row.height)) };
  });
  await check('lazy mailbox/image overlays isolate background and recover focus without stale inert', async () => {
    await nav('tasks');
    await page.locator('[data-senior-action="mailbox"]').click();
    await page.locator('#global-mailbox-modal.open').waitFor();
    await page.waitForFunction(() => document.getElementById('app').inert);
    await page.evaluate(async () => (await import('/src/seniorModeController.js')).seniorFeedback('測試錯誤：請再試一次。', 'error'));
    assert.equal(await page.locator('#global-mailbox-modal .senior-completion-receipt').isVisible(), true);
    await shot('senior-mailbox-error');
    await page.locator('#global-mailbox-modal [data-senior-action="dismiss-feedback"]').click();
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('#global-mailbox-modal')), true);
    await page.locator('#global-mailbox-modal button[data-action="mailbox-close"]').click();
    await page.waitForFunction(() => !document.getElementById('app').inert);
    await page.evaluate(() => window.seniorTest.ui.openPetImageViewer('pet_n01'));
    await page.locator('#pet-image-viewer.is-open').waitFor();
    await page.waitForFunction(() => document.getElementById('app').inert);
    await shot('senior-pet-image');
    await page.locator('#pet-image-viewer button[data-viewer-close]').click();
    await page.waitForFunction(() => !document.getElementById('app').inert);
  });
  await check('reflow across widths/themes/larger text and reduced motion', async () => {
    const measurements = [];
    const failures = [];
    for (const theme of ['default', 'sweet', 'twilight']) {
      await page.evaluate(async (value) => {
        await window.seniorTest.preferencesService.setTheme(value);
        await window.seniorTest.preferencesService.setFontSize('extra-large');
      }, theme);
      await load();
      for (const width of [320, 393, 430, 852]) {
        await page.setViewportSize({ width, height: width === 852 ? 393 : 852 });
        for (const view of ['tasks', 'settings', 'gacha', 'collection']) {
          await nav(view);
          const size = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth,
            reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
            overflow: [...document.querySelectorAll('body *')].filter((el) => {
              const box = el.getBoundingClientRect(); return box.width && box.right > innerWidth + 0.5;
            }).slice(0, 12).map((el) => ({ element: `${el.tagName}#${el.id}.${el.className}`, right: el.getBoundingClientRect().right, width: el.getBoundingClientRect().width })) }));
          measurements.push({ theme, width, view, ...size });
          if (size.scroll > width + 1) failures.push(measurements.at(-1));
          assert.equal(size.reducedMotion, true);
        }
        await nav('tasks');
        await shot(`senior-${theme}-large-${width}`);
        await page.getByRole('button', { name: '新增任務', exact: true }).filter({ visible: true }).first().click();
        const formSize = await page.locator('#task-form').evaluate((form) => ({
          viewport: innerWidth, scroll: document.documentElement.scrollWidth,
          width: form.getBoundingClientRect().width, scrollWidth: form.scrollWidth,
          controls: [...form.querySelectorAll('input, textarea, button')].filter((el) => el.getClientRects().length)
            .map((el) => ({ id: el.id, type: el.type, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
        }));
        measurements.push({ theme, width, view: 'task-form', ...formSize });
        if (formSize.scroll > width + 1 || formSize.scrollWidth > formSize.width + 2) failures.push(measurements.at(-1));
        if (width === 320) await shot(`senior-${theme}-large-form-${width}`);
        await closeModal();
      }
    }
    await fs.writeFile(path.join(reportDir, 'reflow-measurements.json'), JSON.stringify({ measurements, failures }, null, 2));
    assert.deepEqual(failures, [], 'Reflow failures are recorded in reflow-measurements.json');
    return measurements;
  });
  await check('200 percent text and WCAG text spacing at 320 pixels reflow', async () => {
    await page.setViewportSize({ width: 320, height: 852 });
    await page.addStyleTag({ content: 'html { font-size: 32px !important; } body[data-reading-mode="senior"] :is(p, label, button, input, select, textarea, summary, h1, h2, h3, span) { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } body[data-reading-mode="senior"] p { margin-bottom: 2em !important; }' });
    const measurements = [];
    for (const view of ['tasks', 'settings', 'gacha', 'collection']) {
      await nav(view);
      measurements.push({ view, ...await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth })) });
      await shot(`senior-200percent-spacing-${view}`);
    }
    await nav('tasks');
    await page.getByRole('button', { name: '新增任務', exact: true }).filter({ visible: true }).first().click();
    measurements.push({ view: 'form', ...await page.locator('#task-form').evaluate((form) => ({ width: form.getBoundingClientRect().width, scrollWidth: form.scrollWidth })) });
    await shot('senior-200percent-spacing-form');
    await closeModal();
    await fs.writeFile(path.join(reportDir, '200percent-spacing.json'), JSON.stringify(measurements, null, 2));
    assert.ok(measurements.every((row) => row.scrollWidth <= row.width + 2), JSON.stringify(measurements));
    await load();
    return measurements;
  });
  await check('switching back restores normal presentation with identical gameplay', async () => {
    await page.setViewportSize({ width: 393, height: 852 });
    const before = await snapshot();
    await mode(false);
    assert.deepEqual(await snapshot(), before);
    await nav('tasks');
    assert.equal(await page.locator('#senior-home-intro').isVisible(), false);
    assert.equal(await page.locator('.senior-completion-receipt').count(), 0);
    assert.deepEqual(await page.locator('#view-tasks').evaluate((home) => [...home.children].map((node) => node.id || node.className)), normalHomeOrder);
    await shot('normal-restored');
    await load();
    assert.equal(await page.locator('body').getAttribute('data-reading-mode'), 'normal');
    assert.deepEqual(await snapshot(), before);
    assert.deepEqual(errors, []);
  });
  await check('normal mode task create/edit/complete/delete still uses the same working services', async () => {
    await page.getByRole('button', { name: '新增任務', exact: true }).filter({ visible: true }).first().click();
    await page.locator('#task-content').fill('一般模式回歸任務');
    if (!(await page.locator('#task-plan-today').isChecked())) await page.locator('label[for="task-plan-today"]').click();
    await page.locator('#task-form button[type="submit"]').click();
    await page.locator('#modal-overlay.open').waitFor({ state: 'hidden' });
    await page.waitForFunction(async () => (await window.seniorTest.taskService.getAllTasks()).some((row) => row.title === '一般模式回歸任務'));
    const task = (await taskRows()).find((row) => row.title === '一般模式回歸任務');
    const card = page.locator(`.task-card[data-id="${task.id}"]`);
    await card.locator('.twilight-task-menu summary').click();
    await card.locator('.task-card__actions [data-action="edit"]').click();
    await page.locator('#task-content').fill('一般模式已修改');
    await page.locator('#task-form button[type="submit"]').click();
    await page.locator('#modal-overlay.open').waitFor({ state: 'hidden' });
    await card.locator('[data-action="toggle"]').click();
    await page.waitForFunction(async (id) => (await window.seniorTest.taskService.getTaskById(id)).completed, task.id);
    await card.locator('.twilight-task-menu summary').click();
    await card.locator('[data-action="delete"]').click();
    await page.locator('#confirm-ok').click();
    await page.waitForFunction(async (id) => !(await window.seniorTest.taskService.getTaskById(id)), task.id);
    assert.equal(await page.locator('.senior-completion-receipt').count(), 0);
  });
  await check('synthetic Chinese IME Enter and long text use the shared form in both modes', async () => {
    const longTitle = '明天下午記得帶媽媽去醫院拿慢性病處方箋然後順便去超市買晚餐需要的東西';
    const notes = '帶健保卡、處方箋，先確認醫院時間。\n買青菜、豆腐，回家後記得整理。';
    for (const senior of [true, false]) {
      await mode(senior);
      await nav('tasks');
      await page.getByRole('button', { name: '新增任務', exact: true }).filter({ visible: true }).first().click();
      await page.locator('#task-content').fill(`${longTitle}\n${notes}`);
      await page.locator('#task-form .task-editor-options summary').click();
      const input = page.locator('#subtask-new-input');
      await input.fill('注音選字中');
      for (const data of [{ isComposing: true, keyCode: 13 }, { isComposing: false, keyCode: 229 }]) {
        const untouched = await input.evaluate((node, options) => {
          node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
          const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...options });
          node.dispatchEvent(event);
          node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: node.value }));
          return { prevented: event.defaultPrevented, value: node.value };
        }, data);
        assert.deepEqual(untouched, { prevented: false, value: '注音選字中' });
        assert.equal(await page.locator('#subtask-form-list .subtask-form-item').count(), 0);
        assert.equal((await taskRows()).some((task) => task.title === longTitle), false, 'IME candidate confirmation must not create a task');
      }
      await input.fill('帶健保卡');
      await input.press('Enter');
      assert.equal(await page.locator('#subtask-form-list .subtask-form-item').count(), 1, 'ordinary Enter still adds exactly one subtask');
      assert.equal(await input.inputValue(), '');
      assert.equal((await taskRows()).some((task) => task.title === longTitle), false, 'subtask input must not submit the parent task');
      await page.locator('#task-form button[type="submit"]').click();
      await page.locator('#modal-overlay.open').waitFor({ state: 'hidden' });
      await page.waitForFunction(async (title) => (await window.seniorTest.taskService.getAllTasks()).some((task) => task.title === title), longTitle);
      const task = (await taskRows()).find((task) => task.title === longTitle);
      assert.equal(task.content, `${longTitle}\n${notes}`);
      assert.equal(task.subtasks[0].text, '帶健保卡');
      // Normal mode deliberately leaves a new task unplanned unless requested.
      await page.locator('button[data-task-view="all"]').click();
      const card = page.locator(`.task-card[data-id="${task.id}"]`);
      await card.locator('.task-card__description summary').click();
      assert.ok((await card.innerText()).includes(notes.split('\n')[0]));
      await shot(`${senior ? 'senior' : 'normal'}-long-chinese-task`);
      await card.locator('.twilight-task-menu summary').click();
      await card.locator('[data-action="delete"]').click();
      await page.locator('#confirm-ok').click();
      await page.waitForFunction(async (id) => !(await window.seniorTest.taskService.getTaskById(id)), task.id);
    }
    return { evidence: 'Synthetic DOM keyboard/composition events; not an iPhone keyboard or dictation test' };
  });
  assert.deepEqual(errors, []);
  await fs.unlink(path.join(reportDir, 'failure.png')).catch((error) => { if (error.code !== 'ENOENT') throw error; });
} finally {
  await fs.writeFile(path.join(reportDir, 'browser-results.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results, errors,
    limits: ['Chromium emulation, not physical iPhone', 'VoiceOver speech and native Dynamic Type need device verification', 'Personas are expert walkthroughs, not recruited participant results'] }, null, 2));
  await browser?.close();
  server.kill();
}


