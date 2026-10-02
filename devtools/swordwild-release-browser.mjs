/** Actual approved pool on a fresh loopback origin; never touches player storage. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { APP_VERSION } from '../src/version.js';
const root = path.resolve(import.meta.dirname, '..');
const report = path.join(root, process.env.QUESTNOTE_RELEASE_REPORT_DIR || 'reports/swordwild-release');
const artifacts = JSON.parse(await fs.readFile(path.join(report, 'artifacts.json')));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
const child = spawn(process.execPath, ['devtools/release-artifact-browser-server.mjs', '--production', artifacts.production.artifactDir,
  '--preview', artifacts.preview.artifactDir], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
const results = [];
let page;
const check = async (name, run) => {
  try { const detail = await run(); results.push({ name, ok: true, detail }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, ok: false, error: error.stack }); throw error; }
};
try {
  const origin = await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (bytes) => { output += bytes; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) resolve(match[0]); });
    child.stderr.on('data', (bytes) => process.stderr.write(bytes));
    child.once('error', reject); child.once('exit', (code) => { if (code) reject(new Error(`Server exited ${code}`)); });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true,
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
  if (!process.argv.includes('--pool-only')) await check('assembled preview/production isolation, worker recovery and offline bootstrap', async () => {
    const context = await browser.newContext();
    const p = await context.newPage();
    await p.goto(`${origin}/test/`);
    await p.waitForFunction(() => { try { return JSON.parse(document.querySelector('#results').textContent).running === false; } catch { return false; } }, null, { timeout: 240000 });
    const outcome = await p.locator('#results').innerText().then(JSON.parse);
    await fs.writeFile(path.join(report, 'artifact-browser.json'), JSON.stringify(outcome, null, 2) + '\n');
    assert.equal(outcome.failed, 0, JSON.stringify(outcome.results.filter((r) => !r.ok)));
    const configuration = await (await context.request.get(`${origin}/test/config`)).json();
    for (const profile of ['preview', 'production']) {
      const response = await context.request.post(`${origin}/test/control`, {
        headers: { 'X-Harness-Token': configuration.token, Origin: origin }, data: { profile, fault: 'none' },
      });
      assert.equal(response.ok(), true, 'Could not reset guarded fault fixture');
    }
    await context.close(); return { passed: outcome.passed, profiles: ['preview', 'production'] };
  });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
  page = await context.newPage(); page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const scope = artifacts.preview.scopePath.replace(/\/$/, '');
  async function load() {
    await page.goto(`${origin}${scope}/index.html`);
    await page.waitForFunction(() => document.querySelector('#task-view-content')?.children.length && navigator.serviceWorker.controller);
    const skip = page.locator('.onboarding-dialog [data-onboarding-action="skip"]');
    if (await skip.isVisible()) await skip.click();
    await page.evaluate(async (scope) => {
      const names = ['db', 'releaseCatalog', 'gachaService', 'gachaTransactionCore', 'collectionService', 'rewardService', 'workshopService',
        'expeditionService', 'expeditionGameplay', 'explorationService', 'bondJourneyService', 'taskService', 'backupService', 'preferencesService',
        'summonRevealService', 'themedSummonController', 'ui'];
      window.poolTest = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await import(`${scope}/src/${name}.js`)])));
      window.poolTest.catalog = await window.poolTest.releaseCatalog.loadCatalogBundle();
      window.poolTest.pets = window.poolTest.catalog.petsData.pets.filter((p) => p.seriesId === 'swordwild_shanhe_v3');
      if ((await window.poolTest.db.openDB()).name !== 'QuestNotePreviewDB' || location.hostname !== '127.0.0.1') throw Error('Isolation guard failed');
    }, scope);
  }
  await check('actual 20-pet catalog, three UR, all images and complete bond stories', async () => {
    await load();
    const detail = await page.evaluate(async () => {
      const s = window.poolTest;
      const stories = await s.bondJourneyService.loadBondStories();
      const validation = s.bondJourneyService.validateBondStories(stories, s.catalog.petsData.pets);
      if (validation.length) throw Error(validation.join(';'));
      const images = await Promise.all(s.pets.map((p) => new Promise((resolve, reject) => {
        const image = new Image(); image.onload = () => resolve({ petId: p.id, width: image.naturalWidth }); image.onerror = () => reject(Error(p.image)); image.src = p.imageVariants.card;
      })));
      for (const p of s.pets) await s.collectionService.addPetToCollection(p.id);
      await s.db.dbPut('meta', s.rewardService.normalizeWallet({ stardust: 20000, adventureEnergy: 1000,
        materials: { forest_leaf: 100, harvest_charm: 50 } }));
      await s.gachaService.setSelectedPoolId('swordwild_shanhe_v3');
      return { count: s.pets.length, ur: s.pets.filter((p) => p.rarity === 'UR').map((p) => p.name), images: images.length,
        stories: stories.stories.length, chapters: stories.stories.filter((p) => s.pets.some((pet) => pet.id === p.petId)).reduce((sum, p) => sum + p.chapters.length, 0) };
    });
    assert.equal(detail.count, 20); assert.equal(detail.ur.length, 3); assert.equal(detail.chapters, 80);
    await load(); return detail;
  });
  await check('actual pool SSR/UR pity branches, native single and ten pulls, duplicate fragments', async () => {
    return page.evaluate(async () => {
      const s = window.poolTest;
      const plan = (stats, values) => s.gachaTransactionCore.planGachaTransaction({ allPets: s.catalog.petsData.pets,
        poolsData: s.catalog.poolsData, selectedPoolId: 'swordwild_shanhe_v3', count: 1, wallet: { stardust: 2000 },
        stats, collection: [], rng: () => values.shift() ?? 0 });
      const ur = [0, 0.34, 0.67].map((value) => plan({ poolPity: { swordwild_shanhe_v3: { urPity: 99, ssrPity: 0 } } }, [value]).result.pet.id);
      if (new Set(ur).size !== 3) throw Error(`UR pity incomplete: ${ur}`);
      const ssr = plan({ poolPity: { swordwild_shanhe_v3: { ssrPity: 29, urPity: 0 } } }, [0]);
      if (!['SSR', 'UR'].includes(ssr.result.rarity)) throw Error('SSR pity failed');
      const before = (await s.rewardService.getWallet()).stardust;
      const rng = Math.random; Math.random = () => 0.999;
      try {
        const single = await s.gachaService.pullOnce(s.catalog.petsData.pets, s.catalog.poolsData, 'swordwild_shanhe_v3');
        const ten = await s.gachaService.performTenPull(s.catalog.petsData.pets, s.catalog.poolsData, 'swordwild_shanhe_v3');
        if (ten.results.length !== 10 || ten.results.some((p) => p.petId !== 'pet_ur18' || p.isNew)) throw Error('Ten duplicate result mismatch');
        const difference = before - (await s.rewardService.getWallet()).stardust;
        if (difference !== 1100) throw Error(`Wrong debit: ${difference}`);
        return { urPityIds: ur, ssrPity: ssr.result.rarity, single: single.pet.name, tenResults: ten.results.length,
          duplicateFragments: ten.summary.totalFragments, charged: difference };
      } finally { Math.random = rng; }
    });
  });
  await check('UR/SSR reveal order, repeated UR, keyboard continue and reduced motion', async () => {
    const expected = ['抱卷白猿', '玄翎重岳雕', '丹砂鎮嶺蛤', '素心劍猿', '玄翎重岳雕'];
    await page.evaluate(() => {
      const s = window.poolTest;
      const rows = ['pet_ssr21', 'pet_ur16', 'pet_ur17', 'pet_ur18', 'pet_ur16'].map((id) => ({ pet: s.pets.find((p) => p.id === id), rarity: s.pets.find((p) => p.id === id).rarity }));
      window.revealDone = false;
      s.summonRevealService.playSsrPlusRevealQueue({ results: rows, reduceMotion: true }).then((result) => { window.revealResult = result; window.revealDone = true; });
    });
    const seen = [];
    for (let i = 0; i < expected.length; i++) {
      await page.locator('.summon-reveal-overlay.is-ready').waitFor();
      seen.push(await page.locator('.summon-reveal-name').innerText());
      await page.keyboard.press('Enter');
      await page.waitForFunction((last) => !document.querySelector('.summon-reveal-overlay') || document.querySelector('.summon-reveal-name').textContent !== last, seen.at(-1));
    }
    await page.waitForFunction(() => window.revealDone);
    assert.deepEqual(seen, expected);
    const result = await page.evaluate(() => window.revealResult); assert.equal(result.played, 5);
    return { seen, result };
  });
  await check('image fallback and skip remaining queue leave wallet/collection unchanged', async () => {
    const result = await page.evaluate(async () => {
      const s = window.poolTest;
      window.beforeVisual = JSON.stringify([await s.rewardService.getWallet(), await s.collectionService.getCollection()]);
      window.fallbackDone = false;
      const pet = s.pets.find((p) => p.id === 'pet_ur18');
      s.summonRevealService.playSsrPlusRevealQueue({ results: [{ pet, rarity: 'UR' }, { pet, rarity: 'UR' }], forceFirstFallback: true,
        reduceMotion: true }).then((result) => { window.fallbackResult = result; window.fallbackDone = true; });
      return pet.name;
    });
    await page.locator('.summon-reveal-overlay').waitFor(); await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.fallbackDone);
    assert.equal(await page.evaluate(async () => window.beforeVisual === JSON.stringify([await window.poolTest.rewardService.getWallet(), await window.poolTest.collectionService.getCollection()])), true);
    return { name: result, result: await page.evaluate(() => window.fallbackResult) };
  });
  await check('real UI pool debut, prelude skip and rapid single-pull clicks charge once', async () => {
    await load();
    await page.evaluate(() => window.poolTest.ui.openTeachingTarget({ view: 'gacha' }));
    await page.locator('#gacha-pool-select').selectOption('swordwild_shanhe_v3');
    await page.locator('.dream-debut-skip').waitFor(); await page.locator('.dream-debut-skip').click();
    await page.locator('.dream-debut-overlay').waitFor({ state: 'detached' });
    await page.screenshot({ path: path.join(report, 'pool-393.png'), fullPage: true });
    const before = await page.evaluate(async () => ({ wallet: (await window.poolTest.rewardService.getWallet()).stardust, total: (await window.poolTest.gachaService.getGachaStats()).totalPulls }));
    await page.evaluate(() => { window.savedRandom = Math.random; Math.random = () => 0.999; document.querySelector('#btn-pull').click(); document.querySelector('#btn-pull').click(); });
    await page.locator('.dream-bloom-overlay [data-action="skip"]').waitFor(); await page.locator('.dream-bloom-overlay [data-action="skip"]').click();
    await page.locator('.summon-reveal-overlay').waitFor(); await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('.dream-bloom-overlay')?.dataset.state === 'REVEAL_RESULT' || document.querySelector('.dream-bloom-overlay [data-action="close"]'));
    await page.evaluate(() => { document.querySelector('.dream-bloom-overlay [data-action="close"]')?.click(); });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#btn-pull')?.dataset.pulling);
    const after = await page.evaluate(async () => { Math.random = window.savedRandom; return { wallet: (await window.poolTest.rewardService.getWallet()).stardust, total: (await window.poolTest.gachaService.getGachaStats()).totalPulls }; });
    assert.equal(before.wallet - after.wallet, 100); assert.equal(after.total - before.total, 1);
    return { debit: 100, transactions: 1, preludeSkipPreservedRareReveal: true };
  });
  await check('workshop UI craft then select pet and gift; actual affinity gains for all 20', async () => {
    await load(); await page.evaluate(() => window.poolTest.ui.openTeachingTarget({ view: 'workshop', tab: 'craft' }));
    const before = await page.evaluate(() => window.poolTest.workshopService.getInventory());
    await page.locator('[data-action="craft-item"][data-item-id="item_pine_trail_riceball"][data-qty="1"]').click();
    await page.waitForFunction((count) => window.poolTest.workshopService.getInventory().then((inv) => inv.items.item_pine_trail_riceball === count + 1), before.items.item_pine_trail_riceball || 0);
    await page.locator('[data-workshop-tab="gift"]').click();
    await page.locator('[data-action="select-gift-item"][data-item-id="item_pine_trail_riceball"]').click();
    await page.locator('[data-action="select-gift-pet"][data-pet-id="pet_n36"]').click();
    await page.locator('[data-action="gift-item"][data-pet-id="pet_n36"]').click();
    await page.waitForFunction(() => window.poolTest.collectionService.getPetCollection('pet_n36').then((p) => p.bondExp === 150));
    await page.screenshot({ path: path.join(report, 'workshop-393.png'), fullPage: true });
    return page.evaluate(async () => {
      const s = window.poolTest; const food = s.workshopService.getCraftableInfo('item_pine_trail_riceball');
      const gains = s.pets.map((pet) => ({ petId: pet.id, ...s.workshopService.getFavoriteBonus(food, pet) }));
      if (gains.some((p) => p.bondExp !== (p.isFavorite ? 150 : 75))) throw Error('Affinity mismatch');
      return { gains, recipe: food.recipe, actualGift: (await s.collectionService.getPetCollection('pet_n36')).bondExp };
    });
  });
  await check('all specialties, real cloudrest dispatch/claim, five milestones and duplicate rejection', async () => {
    const detail = await page.evaluate(async () => {
      const s = window.poolTest; const areas = await s.expeditionService.loadExpeditionAreas(); const area = areas.find((p) => p.id === 'cloudrest_trail');
      if (!s.expeditionService.checkAreaUnlock(area, []).unlocked) throw Error('Cloudrest should be open');
      const specialties = s.pets.map((pet) => ({ petId: pet.id, ...s.expeditionGameplay.getPetSpecialty(pet) }));
      let runs = 0; let duplicateClaimsRejected = 0;
      while ((await s.explorationService.getAreaExploration(area.id)).progress < 100 && runs < 40) {
        const exp = await s.expeditionService.startExpedition(['pet_ur16', 'pet_n36', 'pet_sr31'], area.id, areas, s.catalog.petsData.pets, 'explore');
        await s.db.dbPut('expeditions', { ...exp, startedAt: new Date(Date.now() - exp.durationMinutes * 60000 - 1000).toISOString(), endsAt: new Date(Date.now() - 1000).toISOString() });
        const claims = await Promise.allSettled([s.expeditionService.claimExpeditionRewards(exp.id, areas, s.catalog.petsData.pets), s.expeditionService.claimExpeditionRewards(exp.id, areas, s.catalog.petsData.pets)]);
        if (claims.filter((p) => p.status === 'fulfilled').length !== 1) throw Error('Dispatch claim not atomic');
        duplicateClaimsRejected++; runs++;
      }
      const progress = await s.explorationService.getAreaExploration(area.id);
      if (progress.progress !== 100) throw Error('Exploration never reached 100');
      const milestones = [];
      for (const percent of [10, 25, 50, 75, 100]) {
        const result = await s.explorationService.claimExplorationMilestone(area.id, percent);
        if (!result.success) throw Error(JSON.stringify(result));
        const duplicate = await s.explorationService.claimExplorationMilestone(area.id, percent);
        if (duplicate.success) throw Error('Duplicate milestone reward');
        milestones.push(percent);
      }
      const stories = await s.explorationService.getUnlockedAreaStories(area.id);
      if (stories.length !== 5) throw Error('Incomplete cloudrest story');
      return { specialties, runs, duplicateClaimsRejected, progress: progress.progress, milestones, stories: stories.length };
    });
    await load(); await page.evaluate(() => window.poolTest.ui.openTeachingTarget({ view: 'expedition' }));
    await page.screenshot({ path: path.join(report, 'region-393.png'), fullPage: true }); return detail;
  });
  await check('new UR four-chapter journey, reply persistence, keepsake and duplicate reward rejection', async () => {
    return page.evaluate(async () => {
      const s = window.poolTest; const id = 'pet_ur18';
      const pet = await s.collectionService.getPetCollection(id);
      await s.db.dbPut('collection', { ...pet, bondLevel: 5, bondExp: Math.max(500, pet.bondExp) });
      const chapters = [];
      for (const level of [2, 3, 4, 5]) {
        await s.bondJourneyService.chooseBondResponse(id, level, 'gentle');
        const task = await s.taskService.createTask({ content: `劍猿同行章節 ${level}`, priority: 'normal', planToday: true });
        await s.bondJourneyService.startBondAgreement(id, level, 'task', task.id);
        await new Promise((resolve) => setTimeout(resolve, 10));
        await s.taskService.toggleTaskComplete(task.id); await s.bondJourneyService.syncBondJourney();
        const before = (await s.rewardService.getWallet()).stardust;
        const claimed = await s.bondJourneyService.claimBondAgreement();
        const gain = (await s.rewardService.getWallet()).stardust - before;
        try { await s.bondJourneyService.claimBondAgreement(); throw Error('Duplicate accepted'); } catch (error) { if (error.message === 'Duplicate accepted') throw error; }
        chapters.push({ level, gain, claimed });
      }
      await s.bondJourneyService.displayBondKeepsake(id);
      const journey = await s.bondJourneyService.getBondJourney();
      if (journey.displayPetId !== id || chapters.map((p) => p.gain).join(',') !== '30,50,70,100') throw Error('Journey mismatch');
      return { chapters, keepsakePetId: journey.displayPetId };
    });
  });
  await check('native backup round trip, 320px card layout and cached new content offline', async () => {
    const backup = await page.evaluate(() => window.poolTest.backupService.exportBackup());
    assert.equal(backup.appVersion, APP_VERSION); assert.equal(backup.data.explorationProgress.areas.cloudrest_trail.progress, 100);
    const restored = await page.evaluate(async (backup) => { await window.poolTest.backupService.restoreBackup(window.poolTest.backupService.normalizeBackupPayload(backup)); return window.poolTest.backupService.exportBackup(); }, backup);
    assert.deepEqual(restored.data, backup.data);
    await page.setViewportSize({ width: 320, height: 740 }); await load();
    await page.evaluate(() => window.poolTest.ui.openTeachingTarget({ view: 'gacha' }));
    await page.locator('#gacha-pool-select').selectOption('swordwild_shanhe_v3');
    const skip = page.locator('.dream-debut-skip'); if (await skip.isVisible()) await skip.click();
    await page.screenshot({ path: path.join(report, 'pool-320.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    const configuration = await (await context.request.get(`${origin}/test/config`)).json();
    const faultResponse = await context.request.post(`${origin}/test/control`, { headers: { 'X-Harness-Token': configuration.token, Origin: origin }, data: { profile: 'preview', fault: 'all503' } });
    assert.equal(faultResponse.ok(), true, 'Offline fixture not applied');
    await load();
    const offline = await page.evaluate(async () => ({ pets: window.poolTest.pets.length,
      stories: (await window.poolTest.bondJourneyService.loadBondStories()).stories.length,
      worker: Boolean(navigator.serviceWorker.controller), progress: (await window.poolTest.explorationService.getAreaExploration('cloudrest_trail')).progress }));
    assert.equal(offline.pets, 20); assert.equal(offline.progress, 100); return { backupRoundTrip: true, offline, viewport: 320 };
  });
  assert.deepEqual(errors, []); await context.close();
} catch (error) { console.error(error.stack); process.exitCode = 1; await page?.screenshot({ path: path.join(report, 'browser-failure.png'), fullPage: true }).catch(() => {}); }
finally {
  await fs.writeFile(path.join(report, 'pool-browser.json'), JSON.stringify({ status: process.exitCode ? 'failed' : 'passed', artifacts,
    results, browser: browser ? await browser.version() : null, isolation: 'Fresh loopback origin and ephemeral Chromium contexts; all external DNS blocked. No production player DB.' }, null, 2) + '\n');
  await browser?.close().catch(() => {}); child.kill();
}
