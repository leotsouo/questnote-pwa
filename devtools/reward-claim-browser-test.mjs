// Loopback only, disposable browser storage, synthetic rewards, no external requests.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.argv[2];
assert.equal(new URL(origin).hostname, '127.0.0.1');
const output = 'reports/reward-claim';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const mail = (id, reward, extra = {}) => ({ id, type: 'compensation', title: `測試贈禮 ${id}`, body: '隔離領獎測試。',
    publishedAt: '2020-01-01T00:00:00Z', enabled: true, priority: 'normal', reward, ...extra });
  await context.route('**/data/global-mailbox.json*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({
    schemaVersion: 1, generatedAt: new Date().toISOString(), messages: [mail('test-a', { stardust: 11 }),
      mail('test-b', { stardust: 13, materials: { forest_leaf: 2 } }),
      mail('test-expired', { stardust: 999 }, { expiresAt: '2020-01-02T00:00:00Z' }),
      mail('test-future-version', { stardust: 999 }, { minAppVersion: '99.0.0' }),
      mail('test-invalid', { stardust: -1 })],
  }) }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/index.html`);
  await page.locator('[data-onboarding-action="skip"]').click();
  await page.waitForFunction(() => document.querySelector('#home-hub [data-hub="quest"]'));
  await page.evaluate(async () => {
    const { dbPut, STORES } = await import('/src/db.js');
    const { createDefaultQuestProgress } = await import('/src/questService.js');
    const { createDefaultExplorationProgress } = await import('/src/explorationService.js');
    const qp = createDefaultQuestProgress();
    for (const scope of ['daily', 'weekly']) {
      for (const quest of Object.values(qp[scope].quests).slice(0, scope === 'daily' ? 2 : 1)) {
        quest.current = quest.target;
        quest.completed = true;
      }
    }
    await dbPut(STORES.META, qp);
    const ep = createDefaultExplorationProgress();
    ep.areas.mist_forest.progress = 25;
    ep.areas.polar_shore.progress = 10;
    await dbPut(STORES.META, ep);
    const pets = (await (await fetch('/data/pets.json')).json()).pets.slice(0, 10);
    const { addPetToCollection } = await import('/src/collectionService.js');
    for (const pet of pets) await addPetToCollection(pet.id);
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelector('[data-claim-all="quests"]'));

  const show = async (kind) => {
    if (kind === 'mailbox') {
      await page.evaluate(async () => { await (await import('/src/ui.js')).openGlobalMailbox(); });
    } else {
      await page.evaluate(async (kind) => { const ui = await import('/src/ui.js');
        ui.closeGlobalMailbox(); ui.switchView(({ blessing: 'tasks', quests: 'tasks', exploration: 'expedition' })[kind] || kind);
      }, kind);
      if (['blessing', 'quests'].includes(kind)) {
        const hub = page.locator(`#home-hub [data-hub="${kind === 'quests' ? 'quest' : 'blessing'}"]`);
        if (await hub.getAttribute('aria-expanded') !== 'true') await hub.click();
      }
    }
    await page.locator(`[data-claim-all="${kind}"]`).waitFor({ state: 'visible' });
  };
  const kinds = ['blessing', 'quests', 'collection', 'exploration', 'achievements', 'mailbox'];
  for (const width of [320, 393, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['default', 'sweet', 'twilight']) {
      for (const font of ['standard', 'extra-large']) {
        await page.evaluate(async ({ theme, font }) => { const prefs = await import('/src/preferencesService.js');
          await prefs.setTheme(theme); await prefs.setFontSize(font);
          prefs.applyThemeToDocument(theme); prefs.applyFontSizeToDocument(font);
        }, { theme, font });
        for (const kind of kinds) {
          await show(kind);
          const button = page.locator(`[data-claim-all="${kind}"]`);
          try { await button.scrollIntoViewIfNeeded(); } catch (error) {
            if (!error.message.includes('not attached')) throw error;
            await button.scrollIntoViewIfNeeded();
          }
          const layout = await button.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right, width: r.width, height: r.height, viewport: innerWidth,
              scroll: document.documentElement.scrollWidth };
          });
          assert.ok(layout.left >= 0 && layout.right <= width + 1 && layout.height >= 39,
            `${width} ${theme} ${font} ${kind}: ${JSON.stringify(layout)}`);
          assert.ok(layout.scroll <= width + 1, `Page overflow: ${width} ${theme} ${font} ${kind}`);
          if (width === 393 && font === 'standard') await page.screenshot({ path: `${output}/${theme}-${kind}.png` });
        }
      }
    }
  }
  console.log('PASS 108 layout cases: six sections, three widths, three themes, two font sizes');

  await page.evaluate(async () => { const prefs = await import('/src/preferencesService.js');
    await prefs.setFontSize('standard'); prefs.applyFontSizeToDocument('standard'); });
  await show('collection');
  await page.locator('[data-collection-milestone-action="toggle"]').click();
  const galleryCount = await page.locator('#identity-collection-results [data-pet]').count();
  await page.locator('[data-collection-milestone-action="filter"][data-filter="in_progress"]').click();
  assert.equal(await page.locator('#identity-collection-results [data-pet]').count(), galleryCount,
    'Milestone filters must not change the card gallery filter');
  await page.locator('[data-collection-milestone-action="filter"][data-filter="claimable"]').click();
  await page.locator('[data-collection-milestone-action="claim"]').first().click();
  await page.waitForFunction(() => document.querySelector('[data-claim-all="collection"] .reward-claim-all__count')?.textContent === '1');
  console.log('PASS individual collection milestone claim and independent gallery filters');
  for (const kind of kinds) {
    await show(kind);
    if (kind === 'quests') await page.locator('[data-action="quest-tab"][data-scope="weekly"]').click();
    if (kind === 'mailbox') await page.locator('[data-action="mailbox-filter"][data-filter="unread"]').click();
    const count = Number(await page.locator(`[data-claim-all="${kind}"] .reward-claim-all__count`).textContent());
    if (kind === 'mailbox') assert.equal(count, 2, 'Expired, invalid and incompatible rewards are excluded');
    await page.locator(`[data-claim-all="${kind}"]`).click();
    await page.waitForFunction((kind) => !document.querySelector(`[data-claim-all="${kind}"]`), kind);
    const repeat = await page.evaluate(async (kind) => (await import('/src/rewardClaimService.js')).claimAllAvailableRewards(kind), kind);
    assert.ok(!repeat.count, `Repeated ${kind} must grant nothing`);
    console.log(`PASS ${kind}: claimed ${count}, repeat grants nothing`);
  }
  const mailbox = await page.evaluate(async () => (await import('/src/mailboxService.js')).getGlobalMailboxState());
  assert.deepEqual([...mailbox.claimedIds].sort(), ['test-a', 'test-b']);
  assert.deepEqual(mailbox.readIds, [], 'Bulk attachments must not mark unread announcements as read');

  const atomic = await page.evaluate(async () => {
    const { dbPut, dbGet, STORES } = await import('/src/db.js');
    const reward = await import('/src/rewardService.js');
    const quest = await import('/src/questService.js');
    const daily = await import('/src/dailyCheckInService.js');
    const qp = quest.createDefaultQuestProgress();
    const item = Object.values(qp.daily.quests)[0]; item.current = item.target; item.completed = true;
    await dbPut(STORES.META, qp);
    const before = await reward.getWallet();
    const claims = await Promise.all([quest.claimQuestReward(item.id, 'daily'), quest.claimQuestReward(item.id, 'daily')]);
    const after = await reward.getWallet();
    const expected = claims.find((result) => result.success).reward.stardust || 0;
    await dbPut(STORES.META, daily.normalizeDailyCheckIn(null));
    const checks = await Promise.all([daily.performDailyCheckIn(), daily.performDailyCheckIn()]);
    const spins = await Promise.all([daily.finalizeDailyWheelSpin({ type: 'stardust', amount: 7 }),
      daily.finalizeDailyWheelSpin({ type: 'stardust', amount: 7 })]);
    const bulk = await import('/src/rewardClaimService.js');
    const locked = await Promise.all([bulk.claimAllAvailableRewards('blessing'), bulk.claimAllAvailableRewards('blessing')]);
    const snapshot = await reward.getWallet();
    let aborted = false;
    try { await reward.applyRewardBundleAndUpdateMeta('synthetic-abort', () => ({ state: { key: 'synthetic-abort', claimed: true },
      reward: { stardust: 5, items: { bad: Number.MAX_SAFE_INTEGER + 1 } }, result: true })); } catch { aborted = true; }
    return { claimed: claims.filter((r) => r.success).length, delta: after.stardust - before.stardust, expected,
      checked: checks.filter((r) => r.success).length, spun: spins.filter((r) => r.success).length,
      locked: locked.some((r) => r.error?.includes('正在領取')), aborted, marker: await dbGet(STORES.META, 'synthetic-abort'),
      walletUnchanged: JSON.stringify(snapshot) === JSON.stringify(await reward.getWallet()) };
  });
  assert.equal(atomic.claimed, 1); assert.equal(atomic.delta, atomic.expected);
  assert.equal(atomic.checked, 1); assert.equal(atomic.spun, 1); assert.equal(atomic.locked, true);
  assert.equal(atomic.aborted, true); assert.equal(atomic.marker, null); assert.equal(atomic.walletUnchanged, true);
  assert.deepEqual(errors, []);
  console.log('PASS duplicate prevention, batch lock, atomic abort, unread preservation; no browser errors');
  await fs.writeFile(`${output}/results.json`, JSON.stringify({ layoutCases: 108, kinds, atomic, errors }, null, 2));
  await context.close();
} finally { await browser.close(); }
