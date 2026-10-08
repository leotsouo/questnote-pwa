/** Native IndexedDB / real app on guarded synthetic origin; never touches player data. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const reports = path.resolve(root, process.env.QUESTNOTE_AWAKENING_REPORT_DIR || 'reports/awakening-implementation');
await fs.mkdir(reports, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const child = spawn(process.execPath, ['devtools/onboarding-browser-server.mjs', '0'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const base = await new Promise((resolve, reject) => { let output = ''; child.stdout.on('data', (b) => { output += b; const m = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (m) resolve(m[0]); }); child.once('error', reject); });
let browser; let context; let page;
const results = []; const errors = [];
const read = () => page.evaluate(() => window.awakeTest.petAwakeningService.getPetAwakening());
async function check(name, cb) { if (process.env.QUESTNOTE_AWAKENING_FOCUS === 'demon-final' && !/^(actual app starts|owned \+ Lv5|dark court final)/.test(name)) return; const result = { name, ok: false }; try { result.detail = await cb(); result.ok = true; } catch (error) { result.error = error.stack; await page.screenshot({ path: path.join(reports, 'failure.png'), fullPage: true }).catch(() => {}); } results.push(result); console.log(`${result.ok ? 'PASS' : 'FAIL'} ${name}${result.error ? '\n' + result.error : ''}`); assert.ok(result.ok, name); }
async function load(target = page) {
  await target.goto(`${base}/index.html`);
  await target.locator('#app-loader').waitFor({ state: 'hidden' });
  await target.waitForFunction(() => document.querySelector('#guide-tutorial-status')?.textContent);
  const skip = target.locator('.onboarding-dialog [data-onboarding-action="skip"]'); if (await skip.isVisible()) await skip.click();
  await target.waitForFunction(() => document.body.classList.contains('guided-learned') || document.querySelector('[data-guided-action="skip"]') || document.querySelector('.today-habit-card') || document.querySelector('.task-card'));
  if (await target.locator('[data-guided-action="skip"]').isVisible()) {
    await target.locator('[data-guided-action="skip"]').click();
    await target.locator('[data-guided-action="confirm-skip"]').click();
    await target.locator('.guided-coach').waitFor({ state: 'detached' });
  }
  await target.evaluate(async () => {
    if (!window.__questNoteOnboardingTest) throw Error('Synthetic database guard missing');
    const names = ['db', 'petAwakeningService', 'petAwakeningCore', 'petAwakeningCatalog', 'petAwakeningView', 'petAwakeningScene', 'collectionService', 'taskService', 'habitService', 'expeditionService', 'bondJourneyService', 'bondJourneyCore', 'backupService', 'achievementService', 'rewardService', 'ui', 'releaseCatalog'];
    window.awakeTest = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await import(`/src/${n}.js`)])));
    window.awakeTest.bundle = await window.awakeTest.releaseCatalog.loadCatalogBundle();
    window.awakeTest.areas = await window.awakeTest.expeditionService.loadExpeditionAreas();
  });
}
async function completeNewTask(content) {
  return page.evaluate(async (content) => { await new Promise((resolve) => setTimeout(resolve, 5)); const s = window.awakeTest; const t = await s.taskService.createTask({ content, priority: 'normal', planToday: true }); await s.taskService.toggleTaskComplete(t.id); return t.id; }, content);
}
async function dispatch(ids, areaId = 'cloudrest_trail') {
  return page.evaluate(async ({ ids, areaId }) => { const s = window.awakeTest; const e = await s.expeditionService.startExpedition(ids, areaId, s.areas, s.bundle.petsData.pets); await s.expeditionService.forceCompleteActiveExpedition(); return e.id; }, { ids, areaId });
}
async function claim(id) { return page.evaluate((id) => { const s = window.awakeTest; return s.expeditionService.claimExpeditionRewards(id, s.areas, s.bundle.petsData.pets); }, id); }
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
  context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  await context.route('**/*', (r) => new URL(r.request().url()).origin === base ? r.continue() : r.abort());
  page = await context.newPage(); page.setDefaultTimeout(20000); page.on('pageerror', (e) => errors.push(e.message));
  await check('actual app starts; all twenty awakening entries load without existing save changes', async () => {
    await load(); assert.equal((await read()).activePetId, null);
    assert.equal(await page.evaluate(async () => (await window.awakeTest.petAwakeningCatalog.loadAwakeningCatalog()).pets.filter(p=>!/^pet_(ur(28|29|30)|ssr(37|38|39|40))$/.test(p.petId)).length), 20);
    return { database: await page.evaluate(async () => (await window.awakeTest.db.openDB()).name), version: await page.evaluate(async () => (await import('/src/version.js')).APP_VERSION) };
  });
  await check('owned + Lv5 + claimed Lv5 gates and existing eligible progression', async () => {
    const gates = await page.evaluate(async () => {
      const s = window.awakeTest; const rejected = async () => { try { await s.petAwakeningService.startPetAwakening('pet_ur17'); return false; } catch { return true; } };
      const missing = await rejected(); await s.collectionService.addPetToCollection('pet_ur17'); const low = await rejected();
      for (const id of ['pet_ur17', 'pet_ur16', 'pet_ur18', 'pet_n36']) { await s.collectionService.addPetToCollection(id); const p = await s.collectionService.getPetCollection(id); await s.db.dbPut('collection', { ...p, bondLevel: 5, bondExp: 500 }); }
      const noStory = await rejected(); const j = s.bondJourneyCore.createBondJourney(); const at = new Date(Date.now() - 3600000).toISOString();
      for (const id of ['pet_ur17', 'pet_ur16', 'pet_ur18', 'pet_n36']) j.byPet[id] = { chapters: Object.fromEntries([2, 3, 4, 5].map((lv) => [lv, { choiceId: 'gentle', readAt: at, completedAt: at, claimedAt: at }])) };
      await s.db.dbPut('meta', j); await s.collectionService.setCompanion('pet_ur17');
      await s.db.dbPut('meta', s.rewardService.normalizeWallet({ stardust: 10000, adventureEnergy: 100 }));
      const old = await s.taskService.createTask({ content: '接下前已完成', priority: 'normal' }); await s.taskService.toggleTaskComplete(old.id);
      await s.petAwakeningService.startPetAwakening('pet_ur17'); return { missing, low, noStory, oldId: old.id };
    });
    assert.ok(gates.missing && gates.low && gates.noStory); assert.equal((await read()).byPet.pet_ur17.eventKeys.length, 0); return gates;
  });
  const first = await completeNewTask('覺醒同行任務');
  await check('real task undo/recomplete keeps one credit; simultaneous daily companion agreement proceeds', async () => {
    await page.evaluate(async (id) => { const s = window.awakeTest; await s.taskService.toggleTaskComplete(id); await s.taskService.toggleTaskComplete(id); }, first);
    assert.equal((await read()).byPet.pet_ur17.eventKeys.length, 1);
    await page.evaluate(async () => { const s = window.awakeTest; const t = await s.taskService.createTask({ content: '同行與覺醒並行', priority: 'normal' }); await s.bondJourneyService.startBondAgreement('pet_ur17', 0, 'task', t.id); await new Promise((resolve) => setTimeout(resolve, 5)); await s.taskService.toggleTaskComplete(t.id); });
    const bond = await page.evaluate(() => window.awakeTest.bondJourneyService.syncBondJourney()); assert.equal(bond.active.status, 'ready');
    assert.equal((await read()).byPet.pet_ur17.eventKeys.length, 2);
  });
  await check('pause/switch/resume retains progress and excludes paused or used completions', async () => {
    await page.evaluate(() => window.awakeTest.petAwakeningService.pausePetAwakening('pet_ur17'));
    const pausedTask = await completeNewTask('暫停期間完成');
    await page.evaluate(() => window.awakeTest.petAwakeningService.startPetAwakening('pet_ur16'));
    await completeNewTask('重岳雕獨立進度'); assert.equal((await read()).byPet.pet_ur16.eventKeys.length, 1);
    await page.evaluate(() => window.awakeTest.petAwakeningService.pausePetAwakening('pet_ur16'));
    await page.evaluate(() => window.awakeTest.petAwakeningService.startPetAwakening('pet_ur17'));
    await page.evaluate(async (id) => { const s = window.awakeTest; await s.taskService.toggleTaskComplete(id); await s.taskService.toggleTaskComplete(id); }, pausedTask);
    assert.equal((await read()).byPet.pet_ur17.eventKeys.length, 2);
    await page.evaluate(async () => { const s = window.awakeTest; const h = (await s.habitService.createHabit({ name: '每日讀書', frequency: 'daily' })).habit; await s.habitService.completeHabitToday(h.id); await s.habitService.uncompleteHabitToday(h.id); await s.habitService.completeHabitToday(h.id); });
    assert.equal((await read()).byPet.pet_ur17.eventKeys.length, 3); assert.equal((await read()).byPet.pet_ur16.eventKeys.length, 1);
  });
  await check('wrong region and absent participant do not count; actual team cloudrest claim yields exactly one token', async () => {
    await claim(await dispatch(['pet_ur17'], 'mist_forest')); assert.equal((await read()).byPet.pet_ur17.expeditionKey, null);
    await claim(await dispatch(['pet_ur16'])); assert.equal((await read()).byPet.pet_ur17.expeditionKey, null);
    const id = await dispatch(['pet_n36', 'pet_ur17']); await claim(id);
    const before = await read(); assert.equal(before.byPet.pet_ur17.status, 'ready'); assert.ok(before.byPet.pet_ur17.tokenGrantedAt); assert.equal(before.activePetId, null);
    await assert.rejects(() => claim(id)); assert.deepEqual(await read(), before);
  });
  await check('missing materials preserves trial; failed native transaction rolls back both ritual writes', async () => {
    const before = await read();
    const noFood = await page.evaluate(async () => { try { await window.awakeTest.petAwakeningService.awakenPet('pet_ur17'); return false; } catch { return true; } }); assert.ok(noFood); assert.deepEqual(await read(), before);
    const rolledBack = await page.evaluate(async () => {
      const s = window.awakeTest; await s.db.dbPut('meta', { key: 'inventory', items: { item_pine_trail_riceball: 2 }, itemUsageLogs: {} });
      const nativePut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (value, ...args) { if (this.name === 'meta' && value.key === 'inventory' && value.items.item_pine_trail_riceball === 1) throw Error('Synthetic interrupted ritual'); return nativePut.call(this, value, ...args); };
      try { await s.petAwakeningService.awakenPet('pet_ur17'); return false; } catch { return true; } finally { IDBObjectStore.prototype.put = nativePut; }
    }); assert.ok(rolledBack); assert.deepEqual(await read(), before);
    assert.equal(await page.evaluate(async () => (await window.awakeTest.db.dbGet('meta', 'inventory')).items.item_pine_trail_riceball), 2);
  });
  await check('two tabs race for ritual: one success, one food/token consumption, preserved wallet and no auto-title equip', async () => {
    const second = await context.newPage(); await load(second);
    const before = await page.evaluate(() => window.awakeTest.rewardService.getWallet());
    const results = await Promise.all([page, second].map((p) => p.evaluate(async () => { try { await window.awakeTest.petAwakeningService.awakenPet('pet_ur17'); return 'success'; } catch { return 'rejected'; } })));
    assert.deepEqual(results.sort(), ['rejected', 'success']); assert.equal((await read()).byPet.pet_ur17.status, 'awakened');
    assert.deepEqual(await page.evaluate(() => window.awakeTest.rewardService.getWallet()), before);
    const achievement = await page.evaluate(() => window.awakeTest.achievementService.getAchievementsState()); assert.ok(achievement.unlockedTitleIds.includes('title_awakening_pet_ur17')); assert.equal(achievement.equippedTitleId, null);
    assert.equal(await page.evaluate(async () => (await window.awakeTest.db.dbGet('meta', 'inventory')).items.item_pine_trail_riceball), 1); await second.close();
  });
  await check('actual mobile reader switches forms, replays/escapes animation, and remembers form after reload', async () => {
    await load(); await page.locator('.bottom-nav [data-view="collection"]').click();
    const selector = '[data-pet="pet_ur17"]';
    await page.locator(selector).click(); await page.locator('[data-identity-action="app-pet-detail"]').click(); await page.locator('[data-awake-open="pet_ur17"]').click();
    await page.locator('[data-awake-action="initial"]').click(); await page.waitForFunction(() => document.querySelector('.awakening-reader')?.textContent.includes('目前：初遇相'));
    assert.equal((await read()).byPet.pet_ur17.form, 'initial');
    await page.locator('[data-awake-action="replay"]').click(); await page.locator('.awakening-scene').waitFor(); await page.keyboard.press('Escape'); await page.locator('.awakening-scene').waitFor({ state: 'detached' });
    assert.equal((await read()).byPet.pet_ur17.form, 'initial');
    await page.screenshot({ path: path.join(reports, 'mobile-awakening-reader.png'), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await load(); await page.locator('.bottom-nav [data-view="collection"]').click(); await page.locator(selector).click(); await page.locator('[data-identity-action="app-pet-detail"]').click();
    await page.locator('[data-awake-open="pet_ur17"]').click(); await page.waitForFunction(() => document.querySelector('.awakening-reader')?.textContent.includes('目前：初遇相'));
    await page.locator('[data-awake-action="awakened"]').click(); await page.waitForFunction(() => document.querySelector('.awakening-reader')?.textContent.includes('目前：覺醒相'));
    assert.ok(await page.locator('.awakening-reader img').first().getAttribute('src').then((s) => s.includes('awakened-')));
    await page.locator('[data-awake-action="close"]').click();
  });
  await check('backup export/restore retains titles, progress and forms; malformed import does not overwrite', async () => {
    const out = await page.evaluate(async () => {
      const s = window.awakeTest; await s.achievementService.equipTitle('title_awakening_pet_ur17'); await s.petAwakeningService.setAwakeningForm('pet_ur17', 'initial');
      const backup = await s.backupService.exportBackup(); const current = await s.petAwakeningService.getPetAwakening();
      await s.petAwakeningService.setAwakeningForm('pet_ur17', 'awakened'); await s.backupService.importBackup(backup);
      const restored = await s.petAwakeningService.getPetAwakening(); const broken = structuredClone(backup); broken.data.petAwakening.schemaVersion = 99;
      let rejected = false; try { await s.backupService.importBackup(broken); } catch { rejected = true; }
      return { current, restored, rejected, after: await s.petAwakeningService.getPetAwakening(), equipped: (await s.achievementService.getAchievementsState()).equippedTitleId };
    }); assert.deepEqual(out.current, out.restored); assert.ok(out.rejected); assert.deepEqual(out.after, out.restored); assert.equal(out.equipped, 'title_awakening_pet_ur17');
  });
  await check('all twenty stage portraits load; reduced/normal scenes are replayable visual-only and canonical art unchanged', async () => {
    const before = await read();
    const out = await page.evaluate(async () => {
      const s = window.awakeTest; const c = await s.petAwakeningCatalog.loadAwakeningCatalog(); const bad = [];
      for (const e of c.pets) {
        const pet = s.bundle.petsData.pets.find((p) => p.id === e.petId);
        for (const src of [e.initialImage.original, e.initialImage.card, e.initialImage.stage, e.awakenedImage?.stage || pet.imageVariants.stage]) await new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(); i.onerror = () => { bad.push(src); resolve(); }; i.src = src; });
        await s.petAwakeningScene.playAwakeningScene(e, pet, { reducedMotion: true });
      }
      return { bad, canonicalToad: s.bundle.petsData.pets.find((p) => p.id === 'pet_ur17').image };
    }); assert.deepEqual(out.bad, []); assert.equal(out.canonicalToad, 'assets/pets/pet_ur17.png'); assert.deepEqual(await read(), before);
  });
  await check('latest Today habit UI advances the active trial once across undo and recomplete', async () => {
    const id = await page.evaluate(async () => {
      const s = window.awakeTest;
      await s.petAwakeningService.startPetAwakening('pet_ur16');
      await new Promise((resolve) => setTimeout(resolve, 5));
      return (await s.habitService.createHabit({ name: '今日清單覺醒整合', frequency: 'daily' })).habit.id;
    });
    await load();
    const card = page.locator(`.today-habit-card[data-id="${id}"]`);
    await card.locator('[data-action="habit-complete"]').click();
    await card.locator('[data-action="habit-uncomplete"]').waitFor();
    const completed = await read();
    assert.equal(completed.byPet.pet_ur16.eventKeys.length, 2);
    await card.locator('[data-action="habit-uncomplete"]').click();
    await card.locator('[data-action="habit-complete"]').waitFor();
    await card.locator('[data-action="habit-complete"]').click();
    await card.locator('[data-action="habit-uncomplete"]').waitFor();
    assert.deepEqual((await read()).byPet.pet_ur16.eventKeys, completed.byPet.pet_ur16.eventKeys);
    return { habitId: id, trialCredit: 1, preservedAfterUndo: true };
  });
  await check('dark court final question, locked Today task, backup and all seven atomic rituals', async () => {
    await page.evaluate(async () => {
      const s = window.awakeTest;
      const ids = (await import('/src/petAwakeningProfiles.js')).DARKCOURT_AWAKENING_IDS;
      const state = await s.petAwakeningService.getPetAwakening();
      if (state.activePetId) await s.petAwakeningService.pausePetAwakening(state.activePetId);
      const journey = await s.db.dbGet('meta', 'bondJourney');
      let raw = await s.petAwakeningService.getPetAwakening();
      const at = new Date(Date.now() - 60000).toISOString();
      const later = new Date(Date.now() - 30000).toISOString();
      for (const id of ids) {
        await s.collectionService.addPetToCollection(id);
        const p = await s.collectionService.getPetCollection(id);
        await s.db.dbPut('collection', { ...p, bondLevel: 5, bondExp: 500 });
        journey.byPet[id] = { chapters: Object.fromEntries([2, 3, 4, 5].map(lv => [lv, { choiceId: 'gentle', readAt: at, completedAt: at, claimedAt: at }])) };
        raw = s.petAwakeningCore.beginPetAwakening(raw, id, at);
        raw = s.petAwakeningCore.advancePetAwakening(raw, [
          ...[1,2,3].map(n => ({ key: 'task:final_fixture_' + id + '_' + n, at: later })),
          { key: 'expedition:final_fixture_' + id, at: later, startedAt: at, areaId: 'darkcrown_border', petIds: [id] },
        ]);
      }
      await s.db.dbPut('meta', journey); await s.db.dbPut('meta', raw);
      const inv = await s.db.dbGet('meta', 'inventory');
      inv.items.item_chaos_ember_tart = 7; await s.db.dbPut('meta', inv);
    });
    await load();
    await page.locator('.bottom-nav [data-view="collection"]').click();
    await page.locator('[data-pet="pet_ur28"]').click();
    await page.locator('[data-identity-action="app-pet-detail"]').click();
    await page.locator('[data-awake-open="pet_ur28"]').click();
    await page.locator('#demon-final-answer').waitFor();
    await page.locator('[data-awake-action="answer"]').click();
    await page.locator('[data-awake-error]').filter({ hasText: '請回答' }).waitFor();
    const question = await page.locator('.awakening-wizard__message').textContent();
    assert.ok(question.includes('你最近有哪件事'));
    await page.locator('#demon-final-answer').fill('完成一直拖延、對自己有幫助的整理 <script>');
    await page.locator('.awakening-reader').screenshot({ path: path.join(reports, 'demon-question-mobile.png') });
    await page.locator('[data-awake-action="answer"]').click();
    await page.locator('[data-awakening-step="demon-task"]').waitFor();
    await page.locator('[data-awake-action="daily"]').click();
    const card = page.locator('.task-card[data-id="demon_final_pet_ur28"]');
    await card.waitFor();
    await page.locator('#modal-overlay').waitFor({ state: 'hidden' });
    assert.equal(await card.locator('[data-action="delete"], [data-action="edit"], [data-action="unplan-today"]').count(), 0);
    assert.equal(await card.evaluate(el => getComputedStyle(el).borderLeftWidth), '5px');
    await card.screenshot({ path: path.join(reports, 'demon-task-mobile.png'), animations: 'disabled' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const native = await page.evaluate(async () => {
      const s = window.awakeTest; const ids = (await import('/src/petAwakeningProfiles.js')).DARKCOURT_AWAKENING_IDS;
      const reject = async fn => { try { await fn(); return false; } catch { return true; } };
      const out = [];
      for (const id of ids) {
        const taskId = 'demon_final_' + id;
        const before = await s.db.dbGet('meta', 'inventory');
        if (!await reject(() => s.petAwakeningService.awakenPet(id))) throw Error('bypassed missing final task');
        if (JSON.stringify(before) !== JSON.stringify(await s.db.dbGet('meta', 'inventory'))) throw Error('food deducted on blocked awakening');
        const answers = await Promise.all([
          s.petAwakeningService.acceptDemonFinalTask(id, '整理自己的生活'),
          s.petAwakeningService.acceptDemonFinalTask(id, '不應覆蓋前一個回答'),
        ]);
        if (answers[0].content !== answers[1].content) throw Error('duplicate submission changed answer');
        for (const fn of [() => s.taskService.deleteTask(taskId), () => s.taskService.removeFromTodayPlan(taskId),
          () => s.taskService.updateTask(taskId, { content: '換一件事' }), () => s.taskService.updateTask(taskId, { systemTask: null })]) {
          if (!await reject(fn)) throw Error('system lock bypass');
        }
        const backup = await s.backupService.exportBackup();
        await s.backupService.importBackup(backup);
        const restored = await s.taskService.getTaskById(taskId);
        if (restored.systemTask !== 'demon-final') throw Error('backup lost task lock');
        const sections = (await import('/src/taskFilterService.js')).getTodayViewSections([restored], '2027-01-01');
        if (sections.plannedIncomplete.length !== 1 || restored.dueDate !== null) throw Error('task lost Today persistence');
        await s.taskService.toggleTaskComplete(taskId);
        await s.taskService.toggleTaskComplete(taskId);
        if (!(await s.taskService.getTaskById(taskId)).completed) throw Error('undo allowed');
        const result = await Promise.allSettled([s.petAwakeningService.awakenPet(id), s.petAwakeningService.awakenPet(id)]);
        if (result.filter(r => r.status === 'fulfilled').length !== 1) throw Error('ritual not atomic');
        out.push({ id, taskId, backup: true, locked: true, awakened: true });
      }
      const final = await s.backupService.exportBackup(); await s.backupService.importBackup(final);
      if ((await s.db.dbGet('meta', 'inventory')).items.item_chaos_ember_tart !== 0) throw Error('wrong ritual food cost');
      return out;
    });
    assert.equal(native.length, 7);
    await load();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('.bottom-nav [data-view="collection"]').click();
    await page.locator('[data-pet="pet_ur28"]').click();
    await page.locator('[data-identity-action="app-pet-detail"]').click();
    await page.locator('[data-awake-open="pet_ur28"]').click();
    await page.locator('[data-awakening-step="done"]').waitFor();
    await page.locator('.awakening-reader').screenshot({ path: path.join(reports, 'demon-awakened-desktop.png') });
    return { native, mobileUI: true, desktopUI: true, requiredAnswer: true };
  });
  assert.deepEqual(errors, []); console.log(`Awakening acceptance: ${results.length} checks passed`);
} finally {
  await fs.writeFile(path.join(reports, 'browser-acceptance.json'), JSON.stringify({ testedAt: new Date().toISOString(), purpose: 'guarded synthetic-only awakening functional acceptance', results, pageErrors: errors }, null, 2) + '\n');
  await context?.close(); await browser?.close(); child.kill();
}
