/** Real app / native IDB / native SW on a dedicated random, synthetic-only origin. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import os from 'node:os';
import { prepareReleaseArtifact } from '../scripts/releaseArtifact.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const reportDir = path.join(root, 'reports', 'bond-v351');
await fs.mkdir(reportDir, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const results = [];
const errors = [];
let browser;
let server;
let context;
let page;
let base;
let fixtures;
let artifactMode = false;
let artifactConfiguration;
const action = (value) => page.locator(`#modal-body [data-bond-action="${value}"]`);

async function startServer(offline = false) {
  const child = spawn(process.execPath, ['devtools/onboarding-browser-server.mjs', '0', ...(offline ? ['--workshop-offline'] : [])],
    { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const url = await new Promise((resolve, reject) => {
    let text = '';
    const timer = setTimeout(() => reject(new Error('Synthetic server failed to start')), 15000);
    child.stdout.on('data', (bytes) => {
      text += bytes;
      const match = text.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
    child.once('error', reject);
    child.once('exit', (code) => { clearTimeout(timer); if (code) reject(new Error(`Server exited ${code}`)); });
  });
  return { child, url };
}

async function startArtifactServer() {
  const artifacts = {};
  for (const profile of ['production', 'preview']) {
    artifacts[profile] = await prepareReleaseArtifact({ projectRoot: root,
      outputRoot: path.join(os.tmpdir(), 'questnote-bond-v351'), profile,
      scopePath: `/questnote-pwa${profile === 'preview' ? '-preview' : ''}/` });
    const result = artifacts[profile];
    await fs.writeFile(path.join(reportDir, `artifact-${profile}.log`), JSON.stringify({ artifactId: result.artifactId, artifactDir: result.artifactDir,
      manifestPath: result.manifestPath, fileCount: result.fileCount, releaseReady: false }, null, 2) + '\n');
  }
  const child = spawn(process.execPath, ['devtools/release-artifact-browser-server.mjs', '--production', artifacts.production.artifactDir,
    '--preview', artifacts.preview.artifactDir], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const url = await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (bytes) => { output += bytes; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) resolve(match[0]); });
    child.once('error', reject);
    child.stderr.on('data', (bytes) => process.stderr.write(bytes));
    child.once('exit', (code) => { if (code) reject(new Error('Artifact server failed')); });
  });
  return { child, url };
}

async function check(name, callback) {
  const result = { name, ok: false };
  const started = performance.now();
  try { result.detail = await callback(); result.ok = true; }
  catch (error) { result.error = error.stack; await page?.screenshot({ path: path.join(reportDir, 'failure.png'), fullPage: true }).catch(() => {}); }
  result.durationMs = Math.round(performance.now() - started);
  results.push(result);
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${name}${result.error ? '\n' + result.error : ''}`);
  assert.ok(result.ok, name);
}

async function load() {
  await page.goto(`${base}/index.html?bond-acceptance=${Date.now()}`);
  await page.locator('#app-loader').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.querySelector('#task-view-content')?.children.length
    && document.querySelector('#guide-tutorial-status')?.textContent);
  const skip = page.locator('.onboarding-dialog [data-onboarding-action="skip"]');
  if (await skip.isVisible()) await skip.click();
  await page.evaluate(async (scope) => {
    const names = ['db', 'bondJourneyService', 'collectionService', 'taskService', 'habitService', 'backupService', 'rewardService', 'preferencesService', 'ui'];
    window.bondTest = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await import(`${scope}/src/${name}.js`)])));
  }, new URL(base).pathname.replace(/\/$/, ''));
  const name = await page.evaluate(async () => (await window.bondTest.db.openDB()).name);
  if (artifactMode) assert.equal(name, 'QuestNotePreviewDB');
  else assert.match(name, /^QuestNoteTest-Onboarding-/);
}

const journey = () => page.evaluate(() => window.bondTest.bondJourneyService.getBondJourney());
const wallet = () => page.evaluate(() => window.bondTest.rewardService.getWallet());
async function openHome() {
  await page.locator('#modal-overlay').evaluate((el) => { if (el.classList.contains('open')) window.bondTest.ui.closeModal(); });
  await page.locator('.bottom-nav [data-view="tasks"]').click();
  await page.locator('#bond-journey-home [data-bond-open]').click();
  await page.locator('[data-bond-screen="overview"]').waitFor();
}
async function readChapter(level) {
  await page.locator(`#modal-body [data-bond-action="chapter"][data-level="${level}"]`).click();
  await page.locator('[data-bond-screen="chapter"]').waitFor();
  await page.locator('[data-bond-action="choice"][data-choice="gentle"]').click();
  await page.locator('.bond-reply').waitFor();
}
async function selectTask(level, id) {
  await page.locator(`[data-bond-action="select"][data-level="${level}"]`).click();
  await page.locator('#bond-source-type').selectOption('task');
  await page.locator('#bond-source-id').selectOption(id);
  await action('start').click();
  await page.waitForFunction(() => document.querySelector('[data-bond-screen="overview"]') && !document.querySelector('#bond-start'));
}
async function completeTaskUi(id) {
  await action('go-source').click();
  await page.locator(`#task-view-content .task-card[data-id="${id}"] [data-action="toggle"]`).click();
  await page.waitForFunction(() => document.querySelector('#bond-home-progress')?.textContent.includes('可領取'));
}

try {
  browser = await chromium.launch({ channel: process.env.QUESTNOTE_BROWSER_CHANNEL || 'chrome', headless: true,
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
  if (!process.argv.includes('--offline-only')) {
    ({ child: server, url: base } = await startServer());
    context = await browser.newContext({ viewport: { width: 393, height: 852 } });
    await context.route('**/*', (route) => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    await context.tracing.start({ screenshots: true, snapshots: true });
    page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.setDefaultTimeout(20000);

    await check('guarded source baseline and actual app startup', async () => {
      const guard = await (await context.request.get(`${base}/__onboarding_test_guard__`)).json();
      assert.equal(guard.purpose, 'questnote-onboarding-synthetic-only');
      await load();
      fixtures = await page.evaluate(async () => {
        const s = window.bondTest;
        assertSafe();
        function assertSafe() { if (!window.__questNoteOnboardingTest) throw Error('No database guard'); }
        for (const id of ['pet_n01', 'pet_ur10']) {
          await s.collectionService.addPetToCollection(id);
          const pet = await s.collectionService.getPetCollection(id);
          await s.db.dbPut('collection', { ...pet, bondLevel: 5, bondExp: 500 });
        }
        await s.collectionService.setCompanion('pet_n01');
        const tasks = [];
        for (let i = 1; i <= 7; i += 1) tasks.push(await s.taskService.createTask({ content: `同行測試任務 ${i}`, priority: 'normal', planToday: true }));
        const habit = (await s.habitService.createHabit({ name: '同行閱讀習慣', frequency: 'daily' })).habit;
        await s.db.dbPut('meta', s.rewardService.normalizeWallet({ stardust: 1000, adventureEnergy: 20 }));
        return { tasks, habit };
      });
      await load();
      assert.equal(await page.locator('#bond-journey-home [data-bond-open]').count(), 1);
      return { version: await page.evaluate(async () => (await import('/src/version.js')).APP_VERSION), database: guard.databaseName };
    });

    await check('chapter gates, two replies and first-choice persistence', async () => {
      await openHome();
      assert.ok(await page.locator('[data-bond-action="chapter"][data-level="3"]').isDisabled());
      await readChapter(2);
      const gentle = await page.locator('.bond-reply').innerText();
      await page.locator('[data-bond-action="choice"][data-choice="steady"]').click();
      await page.waitForFunction(() => document.querySelector('[data-choice="steady"]')?.getAttribute('aria-pressed') === 'true');
      assert.notEqual(await page.locator('.bond-reply').innerText(), gentle);
      assert.equal((await journey()).byPet.pet_n01.chapters[2].choiceId, 'gentle');
      await selectTask(2, fixtures.tasks[0].id);
      assert.equal((await journey()).active.progress, 0);
    });

    await check('real task completion, chapter ending, atomic duplicate-claim prevention and focus return', async () => {
      await completeTaskUi(fixtures.tasks[0].id);
      await openHome();
      const before = (await wallet()).stardust;
      await action('claim').click();
      await page.locator('.bond-ending').waitFor();
      assert.equal((await wallet()).stardust - before, 30);
      assert.equal((await journey()).active, null);
      const duplicate = await page.evaluate(async () => {
        try { await window.bondTest.bondJourneyService.claimBondAgreement(); return false; } catch { return true; }
      });
      assert.ok(duplicate);
      assert.equal((await wallet()).stardust - before, 30);
      await action('overview').click();
      assert.ok(await page.locator('[data-bond-action="chapter"][data-level="3"]').isEnabled());
      await page.screenshot({ path: path.join(reportDir, 'chapter-unlock-393.png'), fullPage: true });
      await action('close').click();
      await page.waitForFunction(() => document.activeElement?.dataset.bondOpen === 'pet_n01');
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.bondOpen), 'pet_n01');
    });

    await check('habit UI progress, pause/reload/resume, replacement notice and nonconsecutive completion', async () => {
      await openHome(); await readChapter(3);
      await page.locator('[data-bond-action="select"][data-level="3"]').click();
      await page.locator('#bond-source-type').selectOption('habit');
      await page.locator('#bond-source-id').selectOption(fixtures.habit.id);
      await action('start').click();
      await page.locator('[data-bond-screen="overview"]').waitFor();
      await action('go-source').click();
      await page.locator(`[data-id="${fixtures.habit.id}"] [data-action="habit-complete"]`).click();
      await page.waitForFunction(async () => (await window.bondTest.bondJourneyService.getBondJourney()).active.progress === 1);
      await openHome(); await action('pause').click();
      await page.waitForFunction(async () => (await window.bondTest.bondJourneyService.getBondJourney()).active.status === 'paused');
      await load(); assert.equal((await journey()).active.progress, 1);
      await openHome(); await action('resume').click();
      await page.waitForFunction(async () => (await window.bondTest.bondJourneyService.getBondJourney()).active.status === 'active');
      await action('replace').click();
      await page.locator('[data-bond-screen="selector"]').waitFor();
      assert.match(await page.locator('.bond-reader').innerText(), /進度從 0 開始/);
      await action('overview').click();
      assert.equal((await journey()).active.progress, 1);
      assert.equal((await journey()).active.status, 'paused');
      await action('resume').click();
      await page.waitForFunction(async () => {
        const active = (await window.bondTest.bondJourneyService.getBondJourney()).active;
        return active.status === 'active' && Date.now() > Date.parse(active.observingSince);
      });
      await page.evaluate(async (id) => {
        const habit = await window.bondTest.habitService.getHabitById(id);
        const date = new Date(); date.setDate(date.getDate() + 2);
        const key = (await import('/src/taskFilterService.js')).getTodayDateString(date);
        habit.logs[key] = { completed: true, completedAt: new Date().toISOString(), rewardClaimed: false, stardustGiven: 0, bondGiven: 0 };
        await window.bondTest.db.dbPut('habits', habit);
        await window.bondTest.bondJourneyService.syncBondJourney();
      }, fixtures.habit.id);
      await load(); await openHome();
      const before = (await wallet()).stardust;
      await action('claim').click(); await page.locator('.bond-ending').waitFor();
      assert.equal((await wallet()).stardust - before, 50);
      return 'Second nonconsecutive date is synthetic; first completion used the actual habit UI';
    });

    await check('remaining stories, concurrent claims, keepsake display and repeatable Lv.5 daily use', async () => {
      for (const [level, task] of [[4, fixtures.tasks[1]], [5, fixtures.tasks[2]]]) {
        if (await action('overview').isVisible()) await action('overview').click();
        await readChapter(level); await selectTask(level, task.id); await completeTaskUi(task.id);
        await openHome();
        if (level === 4) {
          const before = (await wallet()).stardust;
          const result = await page.evaluate(async () => {
            const claims = await Promise.allSettled([window.bondTest.bondJourneyService.claimBondAgreement(), window.bondTest.bondJourneyService.claimBondAgreement()]);
            return claims.map((item) => item.status);
          });
          assert.equal(result.filter((status) => status === 'fulfilled').length, 1);
          assert.equal((await wallet()).stardust - before, 70);
          await load(); await openHome();
        } else { await action('claim').click(); await page.locator('.bond-ending').waitFor(); }
      }
      await action('overview').click();
      assert.equal((await journey()).displayPetId, 'pet_n01');
      assert.match(await page.locator('.bond-keepsake').innerText(), /並肩霧石/);
      await page.screenshot({ path: path.join(reportDir, 'keepsake-393.png'), fullPage: true });
      await action('select').click();
      await page.locator('#bond-source-type').selectOption('task');
      await page.locator('#bond-source-id').selectOption(fixtures.tasks[3].id);
      await action('start').click(); await page.locator('[data-bond-screen="overview"]').waitFor();
      await completeTaskUi(fixtures.tasks[3].id); await openHome();
      const before = (await wallet()).stardust;
      await action('claim').click(); await page.locator('[data-bond-screen="overview"]').waitFor();
      await page.locator('.bond-reader').filter({ hasText: '今天已領取' }).waitFor();
      assert.equal((await wallet()).stardust - before, 20);
      assert.match(await page.locator('.bond-reader').innerText(), /今天已領取/);
      await action('display').click();
      await page.waitForFunction(async () => (await window.bondTest.bondJourneyService.getBondJourney()).displayPetId === null);
      await action('display').filter({ hasText: '展示在陪伴頁與營地' }).waitFor();
      await action('display').click();
      await page.waitForFunction(async () => (await window.bondTest.bondJourneyService.getBondJourney()).displayPetId === 'pet_n01');
      await page.waitForFunction(() => document.querySelector('#bond-journey-home .bond-keepsake-display')?.textContent.includes('並肩霧石'));
      await action('close').click();
      assert.match(await page.locator('#bond-journey-home .bond-keepsake-display').innerText(), /並肩霧石/);
      await page.evaluate(() => window.bondTest.ui.openTeachingTarget({ view: 'expedition' }));
      await page.locator('#expedition-camp summary').click();
      await page.waitForFunction(() => document.querySelector('#expedition-camp .bond-keepsake-display')?.textContent.includes('並肩霧石'));
      assert.match(await page.locator('#expedition-camp .bond-keepsake-display').innerText(), /並肩霧石/);
    });

    await check('failed wallet writes roll back receipts, and two tabs claim only once', async () => {
      await page.evaluate(async (id) => {
        const s = window.bondTest;
        await s.bondJourneyService.chooseBondResponse('pet_ur10', 2, 'steady');
        await s.bondJourneyService.startBondAgreement('pet_ur10', 2, 'task', id);
      }, fixtures.tasks[4].id);
      await page.waitForFunction(async () => Date.now() > Date.parse((await window.bondTest.bondJourneyService.getBondJourney()).active.observingSince));
      await page.evaluate(async (id) => {
        const s = window.bondTest;
        const task = await s.db.dbGet('tasks', id);
        await s.db.dbPut('tasks', { ...task, completed: true, completedAt: new Date().toISOString() });
        await s.bondJourneyService.syncBondJourney();
      }, fixtures.tasks[4].id);
      const before = await wallet();
      const receipt = await journey();
      const rejected = await page.evaluate(async () => {
        const original = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (value, ...rest) {
          if (this.name === 'meta' && value?.key === 'wallet') throw new DOMException('Synthetic wallet failure', 'QuotaExceededError');
          return original.call(this, value, ...rest);
        };
        try { await window.bondTest.bondJourneyService.claimBondAgreement(); return false; }
        catch { return true; }
        finally { IDBObjectStore.prototype.put = original; }
      });
      assert.equal(rejected, true);
      assert.deepEqual(await wallet(), before);
      assert.deepEqual(await journey(), receipt);
      const second = await context.newPage();
      try {
        await second.goto(`${base}/index.html`);
        await second.locator('#app-loader').waitFor({ state: 'hidden' });
        const claims = await Promise.allSettled([
          page.evaluate(() => window.bondTest.bondJourneyService.claimBondAgreement()),
          second.evaluate(async () => (await import('/src/bondJourneyService.js')).claimBondAgreement()),
        ]);
        assert.equal(claims.filter((item) => item.status === 'fulfilled').length, 1);
        assert.equal((await wallet()).stardust - before.stardust, 30);
      } finally { await second.close(); }
      await load();
    });

    await check('goal replacement resets progress but retains used events; deleted goals and ready receipts are protected', async () => {
      await page.evaluate(async ({ habitId }) => {
        const s = window.bondTest;
        await s.bondJourneyService.chooseBondResponse('pet_ur10', 3, 'gentle');
        await s.bondJourneyService.startBondAgreement('pet_ur10', 3, 'habit', habitId);
      }, { habitId: fixtures.habit.id });
      await page.waitForFunction(async () => Date.now() > Date.parse((await window.bondTest.bondJourneyService.getBondJourney()).active.observingSince));
      const replacement = await page.evaluate(async ({ habitId, taskId }) => {
        const s = window.bondTest;
        const habit = await s.db.dbGet('habits', habitId);
        habit.logs['2026-10-10'] = { completed: true, completedAt: new Date().toISOString(), rewardClaimed: false, stardustGiven: 0, bondGiven: 0 };
        await s.db.dbPut('habits', habit);
        const partial = await s.bondJourneyService.syncBondJourney();
        await s.bondJourneyService.controlBondAgreement('pause');
        const changed = await s.bondJourneyService.startBondAgreement('pet_ur10', 3, 'task', taskId, { replace: true });
        await s.db.dbDelete('tasks', taskId);
        return { partial: partial.active.progress, progress: changed.active.progress, used: changed.usedEventKeys.includes(`habit:${habitId}:2026-10-10`) };
      }, { habitId: fixtures.habit.id, taskId: fixtures.tasks[5].id });
      assert.deepEqual(replacement, { partial: 1, progress: 0, used: true });
      await load(); await openHome();
      assert.match(await page.locator('.bond-reader').innerText(), /原目標已刪除或封存/);
      await page.evaluate(async (id) => {
        const s = window.bondTest;
        await s.bondJourneyService.controlBondAgreement('pause');
        await s.bondJourneyService.startBondAgreement('pet_ur10', 3, 'task', id, { replace: true });
      }, fixtures.tasks[6].id);
      await page.waitForFunction(async () => Date.now() > Date.parse((await window.bondTest.bondJourneyService.getBondJourney()).active.observingSince));
      const blocked = await page.evaluate(async (id) => {
        const s = window.bondTest;
        const task = await s.db.dbGet('tasks', id);
        await s.db.dbPut('tasks', { ...task, completed: true, completedAt: new Date().toISOString() });
        await s.bondJourneyService.syncBondJourney();
        const attempts = await Promise.allSettled([s.bondJourneyService.controlBondAgreement('end'),
          s.bondJourneyService.startBondAgreement('pet_ur10', 3, 'habit', 'invalid', { replace: true })]);
        await s.bondJourneyService.claimBondAgreement();
        return attempts.every((item) => item.status === 'rejected');
      }, fixtures.tasks[6].id);
      assert.equal(blocked, true);
      await load();
    });

    await check('native full backup round trip and corrupted reward record refusal', async () => {
      const result = await page.evaluate(async () => {
        const backup = await window.bondTest.backupService.exportBackup();
        const expected = JSON.stringify(backup.data.bondJourney);
        const prepared = window.bondTest.backupService.normalizeBackupPayload(backup);
        await window.bondTest.backupService.restoreBackup(prepared);
        const actual = JSON.stringify(await window.bondTest.bondJourneyService.getBondJourney());
        const broken = structuredClone(backup);
        broken.data.bondJourney.byPet.pet_n01.chapters[5].claimedAt = 'not-a-time';
        broken.bondJourney = structuredClone(broken.data.bondJourney);
        return { exact: expected === actual, invalidAccepted: window.bondTest.backupService.validateBackup(broken).valid };
      });
      assert.equal(result.exact, true); assert.equal(result.invalidAccepted, false);
      await load();
    });

    await check('story load failures can retry, and closing a slow retry prevents the reader reopening', async () => {
      let requests = 0;
      let releaseStory;
      let storyRequested;
      const release = new Promise((resolve) => { releaseStory = resolve; });
      const requested = new Promise((resolve) => { storyRequested = resolve; });
      const routeStory = async (route) => {
        requests += 1;
        if (requests <= 2) { await route.fulfill({ status: 503, body: 'Synthetic story failure' }); return; }
        if (requests === 3) { storyRequested(); await release; }
        await route.continue();
      };
      await page.route('**/data/bond-stories.json', routeStory);
      try {
        await load();
        await page.locator('#bond-journey-home [data-bond-open]').click();
        await action('retry').waitFor();
        await action('retry').click();
        await requested;
        await page.locator('.bond-reader[aria-busy="true"] [data-bond-action="close"]').click();
        assert.equal(await page.locator('#modal-overlay').evaluate((element) => element.classList.contains('open')), false);
        releaseStory();
        await page.waitForFunction(() => document.querySelector('#bond-home-progress')?.textContent.includes('已解鎖日常同行'));
        assert.equal(await page.locator('#modal-overlay').evaluate((element) => element.classList.contains('open')), false);
        await openHome();
        assert.match(await page.locator('.bond-reader').innerText(), /專屬紀念物/);
      } finally { releaseStory(); await page.unroute('**/data/bond-stories.json', routeStory); }
      await action('close').click();
    });

    await check('three themes × three viewports × two font sizes, keyboard focus and action sizes', async () => {
      const matrix = [];
      for (const theme of ['default', 'sweet', 'twilight']) for (const width of [320, 393, 1280]) for (const fontSize of ['standard', 'extra-large']) {
        await page.setViewportSize({ width, height: width === 1280 ? 900 : 852 });
        await page.evaluate(async ({ theme, fontSize }) => {
          await window.bondTest.preferencesService.setTheme(theme);
          await window.bondTest.preferencesService.setFontSize(fontSize);
        }, { theme, fontSize });
        await load(); await openHome();
        const measurements = await page.evaluate(() => {
          const modal = document.querySelector('#modal-body');
          const small = [...modal.querySelectorAll('[data-bond-action]')].filter((el) => !el.disabled && el.getBoundingClientRect().height < 43);
          return { pageOverflow: document.documentElement.scrollWidth - innerWidth, modalOverflow: modal.scrollWidth - modal.clientWidth, smallActions: small.map((el) => el.textContent) };
        });
        assert.ok(measurements.pageOverflow <= 1, `${theme}/${width}/${fontSize}: page overflow`);
        assert.ok(measurements.modalOverflow <= 1, `${theme}/${width}/${fontSize}: modal overflow`);
        assert.deepEqual(measurements.smallActions, []);
        await page.keyboard.press('Tab');
        assert.ok(await page.evaluate(() => document.querySelector('#modal-overlay').contains(document.activeElement)));
        await page.keyboard.press('Shift+Tab');
        assert.ok(await page.evaluate(() => document.querySelector('#modal-overlay').contains(document.activeElement)));
        if (width === 320 && fontSize === 'extra-large') {
          await page.locator('#modal-body').evaluate((element) => { element.querySelector('h2')?.focus({ preventScroll: true }); element.scrollTop = 0; });
          await page.screenshot({ path: path.join(reportDir, `320-${theme}-large.png`) });
        }
        matrix.push({ theme, width, fontSize, ...measurements });
      }
      return matrix;
    });

    const traceDir = path.join(root, '.dev-backups', 'bond-v351');
    await fs.mkdir(traceDir, { recursive: true });
    await context.tracing.stop({ path: path.join(traceDir, 'browser-trace.zip') });
    await context.close(); server.kill();
  }
  const artifactServer = await startArtifactServer();
  server = artifactServer.child;
  context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  artifactConfiguration = await (await context.request.get(`${artifactServer.url}/test/config`)).json();
  artifactMode = true;
  base = artifactServer.url + artifactConfiguration.profiles.preview.profile.scopePath.replace(/\/$/, '');
  // Native worker fetches must remain unintercepted. External host names are
  // blocked at Chromium's resolver instead of DevTools network interception.
  page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.text().includes('SW') || message.text().includes('Required asset')) console.log(message.text()); });
  await check('native SW cached reload, offline story choices, agreement progress and reward writes', async () => {
    await load();
    await page.evaluate(async () => {
      const s = window.bondTest;
      await s.collectionService.addPetToCollection('pet_n01');
      const pet = await s.collectionService.getPetCollection('pet_n01');
      await s.db.dbPut('collection', { ...pet, bondLevel: 2, bondExp: 50 });
      await s.collectionService.setCompanion('pet_n01');
      window.offlineTaskId = (await s.taskService.createTask({ content: '離線同行任務', priority: 'normal', planToday: true })).id;
    });
    await load();
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    const offlineTaskId = await page.evaluate(async () => (await window.bondTest.taskService.getAllTasks()).find((task) => task.title === '離線同行任務').id);
    await page.evaluate(async (token) => {
      const response = await fetch('/test/control', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Harness-Token': token },
        body: JSON.stringify({ profile: 'preview', fault: 'all503' }) });
      if (!response.ok) throw new Error('Offline rehearsal control rejected');
    }, artifactConfiguration.token);
    await load(); await openHome(); await readChapter(2); await selectTask(2, offlineTaskId); await completeTaskUi(offlineTaskId); await openHome();
    const before = (await wallet()).stardust;
    await action('claim').click(); await page.locator('.bond-ending').waitFor();
    assert.equal((await wallet()).stardust - before, 30);
    await page.screenshot({ path: path.join(reportDir, 'offline-complete-393.png'), fullPage: true });
    return { workerControlled: await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), chapterClaimed: Boolean((await journey()).byPet.pet_n01.chapters[2].claimedAt),
      artifactId: artifactConfiguration.profiles.preview.profile.artifactId };
  });
  assert.deepEqual(errors, []);
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  const output = { status: process.exitCode ? 'failed' : 'passed', results, runtimeErrors: errors,
    browser: browser ? await browser.version() : null, deviceValidation: 'Desktop Chromium, not an iPhone device test',
    isolation: 'Random synthetic source database and fresh assembled-preview loopback origin; external hosts blocked at the Chromium resolver' };
  await fs.writeFile(path.join(reportDir, process.argv.includes('--offline-only') ? 'offline-results.json' : 'browser-results.json'), JSON.stringify(output, null, 2) + '\n');
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  server?.kill();
}
