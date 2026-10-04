/** Tests run only on the server-owned synthetic DB; never on the live profile. */
const frame = document.querySelector('#preview');
const output = document.querySelector('#results');
const results = [];
let marker;
let services;
const win = () => frame.contentWindow;
const doc = () => frame.contentDocument;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (value, message) => { if (!value) throw new Error(message); };
const state = () => services.db.dbGet('meta', 'guidedOnboarding');
async function until(predicate, label, timeout = 12000) {
  const start = performance.now();
  while (performance.now() - start < timeout) { if (await predicate()) return; await wait(40); }
  throw new Error(`Timed out: ${label}`);
}
async function guard() {
  assert(location.hostname === '127.0.0.1', 'Dedicated loopback origin required');
  marker = await (await fetch('/__onboarding_test_guard__')).json();
  assert(marker.purpose === 'questnote-onboarding-synthetic-only' && /^QuestNoteTest-Onboarding-[a-f0-9-]{36}$/.test(marker.databaseName), 'Synthetic DB guard required');
  assert((await indexedDB.databases()).every((db) => db.name === marker.databaseName), 'Unknown database; refusing to write');
}
async function load() {
  await guard();
  win().__questNoteOnboardingTest?.close();
  const loaded = new Promise((resolve) => { frame.onload = resolve; });
  frame.src = `/index.html?guidedQA=${Date.now()}`; await loaded;
  await until(() => {
    const loader = doc().querySelector('#app-loader');
    const hidden = !loader || !loader.getClientRects().length || win().getComputedStyle(loader).visibility === 'hidden' || win().getComputedStyle(loader).opacity === '0';
    return doc().querySelector('#task-view-content')?.children.length && hidden;
  }, 'app ready', 60000);
  assert(win().__questNoteOnboardingTest.databaseName === marker.databaseName, 'Wrong DB');
  services = Object.fromEntries(await Promise.all(['db', 'taskService', 'rewardService', 'guidedOnboardingService',
    'achievementService', 'backupService', 'preferencesService'].map(async (id) => [id, await win().eval(`import('/src/${id}.js')`)])));
  await wait(650);
}
async function fresh() {
  if (!services) await load();
  await services.db.clearAllData(); await load();
}
async function step(expected) { await until(async () => (await state()).step === expected, expected); await wait(700); }
async function click(selector, geometry = true) {
  const element = doc().querySelector(selector); assert(element, `Missing ${selector}`);
  assert(element.getClientRects().length && !element.disabled && !element.closest('[inert]'), `Blocked ${selector}`);
  if (element.closest('.guided-coach')) { element.scrollIntoView({ block: 'nearest' }); await wait(100); }
  if (geometry) {
    const r = element.getBoundingClientRect();
    assert(r.top >= 0 && r.bottom <= win().innerHeight + 1, `Control outside viewport: ${selector}`);
    const hit = doc().elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    assert(element.contains(hit), `Control covered by ${hit?.className}: ${selector}`);
  }
  element.click(); await wait(750);
}
const action = (name) => click(`[data-guided-action="${name}"]`);
const ack = () => action('acknowledge');
async function toEditor() {
  await ack(); await ack(); await ack();
  await step('OPEN_CREATE_QUEST'); await click('.twilight-add-task'); await step('CREATE_TUTORIAL_QUEST');
}
async function create() { await click('#task-form button[type="submit"]'); await step('RETURN_HOME'); }
async function complete() { await ack(); await step('COMPLETE_TUTORIAL_QUEST'); await click('.task-card [data-action="toggle"]'); await step('REWARD_REVEAL'); }
async function finish() { await ack(); await ack(); await action('finish-home'); }
function geometry() {
  const coach = doc().querySelector('.guided-coach')?.getBoundingClientRect();
  assert(doc().documentElement.scrollWidth <= win().innerWidth + 1, 'Horizontal overflow');
  if (coach) assert(coach.left >= 0 && coach.right <= win().innerWidth + 1 && coach.top >= 0 && coach.bottom <= win().innerHeight + 1, 'Coach outside viewport');
  return { width: win().innerWidth, height: win().innerHeight, coachHeight: coach?.height };
}
async function business() {
  const snapshot = await services.db.readAllStoresSnapshot();
  return JSON.stringify({ collection: snapshot.collection, meta: snapshot.meta.filter((m) => ['wallet', 'questProgress', 'taskStats', 'bondJourney', 'petAwakening'].includes(m.key)) });
}
async function check(name, callback) {
  const result = { name, ok: false };
  try { result.detail = await callback(); result.ok = true; } catch (error) { result.error = error.stack; }
  results.push(result); output.textContent = JSON.stringify({ status: 'running', results }, null, 2);
  assert(result.ok, `Failed ${name}`);
}
document.querySelector('#run').addEventListener('click', async () => {
  results.length = 0;
  try {
    await fresh();
    await check('fresh concurrent preparation and welcome survive reload without any tutorial task', async () => {
      await services.db.clearAllData();
      const initial = await Promise.all([services.guidedOnboardingService.prepareGuidedOnboarding(),
        services.guidedOnboardingService.prepareGuidedOnboarding()]);
      assert(initial.every((s) => s.status === 'active' && s.step === 'WELCOME'));
      await load();
      assert((await state()).step === 'WELCOME'); await load();
      assert((await state()).step === 'WELCOME'); assert(!(await services.db.dbGetAll('tasks')).length); return geometry();
    });
    await check('first meeting grants exactly one real companion; wrong navigation is gently blocked', async () => {
      await ack(); await step('MEET_COMPANION'); await load();
      const starters = await services.db.dbGetAll('collection');
      assert(starters.length === 1);
      assert(starters[0].encounterMigrationVersion === 1 && !Object.hasOwn(starters[0], 'stars') && !Object.hasOwn(starters[0], 'fragments'), 'Starter must use current encounter format');
      doc().querySelector('.bottom-nav [data-view="gacha"]').click();
      assert(doc().querySelector('#view-tasks.active')); assert((await state()).step === 'MEET_COMPANION');
      await until(() => doc().querySelector('.guided-feedback').textContent.includes('先完成'), 'gentle feedback'); return geometry();
    });
    await check('home and open-create checkpoints survive reload', async () => {
      await ack(); await step('HOME_INTRO'); await load(); assert((await state()).step === 'HOME_INTRO');
      await ack(); await step('OPEN_CREATE_QUEST'); await load(); return geometry();
    });
    await check('real editor is prefilled, without keyboard input or background task creation', async () => {
      await click('.twilight-add-task'); await step('CREATE_TUTORIAL_QUEST'); await load();
      assert(doc().querySelector('#task-content').value.startsWith('完成我的第一個 Quest'));
      assert(doc().querySelector('#task-plan-today').checked); assert(!(await services.db.dbGetAll('tasks')).length);
      return geometry();
    });
    await check('save failure aborts the native IDB transaction and leaves a retryable editor', async () => {
      const db = await services.db.openDB(); const native = db.transaction.bind(db);
      db.transaction = (...args) => {
        const tx = native(...args);
        if (args[1] === 'readwrite' && Array.from(typeof args[0] === 'string' ? [args[0]] : args[0]).includes('tasks')) {
          db.transaction = native; tx.abort();
        }
        return tx;
      };
      await click('#task-form button[type="submit"]');
      assert((await state()).step === 'CREATE_TUTORIAL_QUEST'); assert(!(await services.db.dbGetAll('tasks')).length);
      assert(doc().querySelector('#task-form')); return 'Native transaction aborted; no task/checkpoint committed.';
    });
    await check('double create uses one deterministic task and one atomic checkpoint', async () => {
      const draft = { isTutorial: true, tutorialRunId: 'first', tutorialMode: 'first', content: '完成我的第一個 Quest', planToday: true };
      await create();
      const tasks = await Promise.all([services.taskService.createTask(draft), services.taskService.createTask(draft)]);
      assert(tasks[0].id === tasks[1].id); assert((await services.db.dbGetAll('tasks')).length === 1);
      await load(); assert((await state()).step === 'RETURN_HOME'); return geometry();
    });
    await check('completion transaction failure pays nothing and remains retryable', async () => {
      await ack(); await load(); assert((await state()).step === 'COMPLETE_TUTORIAL_QUEST');
      const db = await services.db.openDB(); const native = db.transaction.bind(db);
      db.transaction = (...args) => {
        const tx = native(...args);
        if (args[1] === 'readwrite' && Array.from(args[0]).includes('collection')) { db.transaction = native; tx.abort(); }
        return tx;
      };
      await click('.task-card [data-action="toggle"]');
      assert((await state()).step === 'COMPLETE_TUTORIAL_QUEST');
      assert(!(await services.taskService.getTaskById((await state()).taskId)).completed);
      const wallet = await services.rewardService.getWallet();
      assert(wallet.stardust === 0 && wallet.adventureEnergy === 0);
      assert((await services.db.dbGetAll('collection'))[0].bondExp === 0);
      return 'Task, checkpoint, wallet and companion all rolled back in one native transaction.';
    });
    await check('completion and reward survive reload, with no double payment under concurrent retries', async () => {
      await click('.task-card [data-action="toggle"]'); await step('REWARD_REVEAL');
      const id = (await state()).taskId;
      await Promise.all([services.guidedOnboardingService.claimTutorialReward(id), services.guidedOnboardingService.claimTutorialReward(id)]);
      await load(); assert((await state()).step === 'REWARD_REVEAL');
      const wallet = await services.rewardService.getWallet(); const pets = await services.db.dbGetAll('collection');
      assert(wallet.stardust === 20 && wallet.adventureEnergy === 1 && pets[0].bondExp === 5);
      const context = await services.achievementService.buildAchievementContext([]);
      assert(context.completedTasksTotal === 0 && !context.hasPlannedTodayEver);
      const progress = await services.db.dbGet('meta', 'questProgress');
      assert(progress.daily.quests.daily_complete_tasks_3.current === 0);
      return { stardust: wallet.stardust, energy: wallet.adventureEnergy, bond: pets[0].bondExp, formalCompleted: context.completedTasksTotal };
    });
    await check('companion reaction and finish remain explicit, untimed checkpoints', async () => {
      await ack(); await load(); assert((await state()).step === 'COMPANION_REACTION');
      await ack(); await load(); assert((await state()).step === 'FINISH'); await action('finish-home');
      await load(); assert((await state()).status === 'completed' && (await state()).onboardingCompletedVersion === 1);
      assert(!doc().querySelector('.guided-coach')); return geometry();
    });
    await check('learning-transfer mechanism: a separate real quest can be created and completed without coach', async () => {
      await click('.twilight-add-task');
      const content = doc().querySelector('#task-content'); assert(content.value === ''); content.value = '自己的第二個任務';
      assert(doc().querySelector('#task-plan-today').checked, 'Today editor keeps the same default as the practice');
      // Real form submit; no tutorial payload or guided action.
      await click('#task-form button[type="submit"]', false);
      const task = (await services.taskService.getAllTasks()).find((t) => !t.isTutorial);
      assert(task); const button = doc().querySelector(`.task-card[data-id="${task.id}"] [data-action="toggle"]`);
      button.scrollIntoView({ block: 'center' }); await wait(150); button.click(); await wait(750);
      assert((await services.taskService.getTaskById(task.id)).completed);
      assert((await services.achievementService.buildAchievementContext([])).completedTasksTotal === 1);
      return 'Separate real task created and completed with no coach. Human transfer is still untested.';
    });
    await check('replay follows the same controls without changing wallet, bond or formal progress', async () => {
      const before = await business();
      await services.guidedOnboardingService.startGuidedReplay(); await load();
      await toEditor(); await create(); await complete(); await finish();
      assert(before === await business());
      assert(!(await services.taskService.getAllTasks()).some((t) => t.tutorialMode === 'replay'));
      const backup = await services.backupService.exportBackup(); assert(!backup.data.tasks.some((t) => t.tutorialMode === 'replay'));
      return 'No economy, companion, task-stat or challenge changes; rehearsal tasks excluded from export.';
    });
    await check('existing users with legacy flags bypass forced onboarding', async () => {
      for (const status of ['completed', 'dismissed', 'paused', 'active']) {
        await services.db.clearAllData(); await services.db.dbPut('meta', { key: 'onboardingV1', schemaVersion: 1, status, step: 'task' });
        await load(); assert((await state()).status === 'existing'); assert(!doc().querySelector('.guided-coach'));
      }
      return 'Completed, dismissed, paused and active legacy flags bypassed.';
    });
    await check('skip is confirmed; short press cancels; keyboard and assistive alternative remains available', async () => {
      await fresh(); await action('skip');
      const hold = doc().querySelector('.guided-hold');
      hold.dispatchEvent(new (win().PointerEvent)('pointerdown', { bubbles: true, pointerId: 1, button: 0 }));
      await wait(200); hold.dispatchEvent(new (win().PointerEvent)('pointerup', { bubbles: true, pointerId: 1 }));
      await wait(1600); assert((await state()).status === 'active');
      await action('cancel-skip'); await action('skip'); await action('confirm-skip');
      assert((await state()).status === 'skipped'); await load(); assert(!doc().querySelector('.guided-coach'));
      return 'Short hold did not skip; separate confirmation exited and persisted.';
    });
    await check('320px, all themes, large text and reduced motion retain actionable targets', async () => {
      await fresh(); frame.style.width = '320px';
      for (const theme of ['default', 'sweet', 'twilight']) {
        await services.db.dbPut('meta', { ...(await services.preferencesService.getUserPreferences()), theme, fontSize: 'extra-large', reduceMotion: true });
        await load(); geometry();
        await action('skip'); geometry(); await action('cancel-skip');
      }
      await toEditor(); geometry(); await create(); await complete(); geometry();
      return geometry();
    });
    await check('skip exits even if persistence fails, then retries the choice on the next launch', async () => {
      frame.style.width = '393px'; await fresh(); await action('skip');
      const db = await services.db.openDB(); const native = db.transaction.bind(db);
      db.transaction = (...args) => {
        const tx = native(...args);
        if (args[1] === 'readwrite') tx.abort();
        return tx;
      };
      await action('confirm-skip'); assert(!doc().querySelector('.guided-coach'));
      doc().dispatchEvent(new (win().Event)('visibilitychange')); await wait(1000);
      assert(!doc().querySelector('.guided-coach') && !doc().body.classList.contains('guided-active'));
      db.transaction = native;
      await load(); assert((await state()).status === 'skipped');
      return 'Session and foreground stayed unlocked under continuing write failure; pending skip persisted after reload.';
    });
    await check('200% text can finish the practice without a covered action', async () => {
      await fresh(); doc().documentElement.style.fontSize = '32px'; await wait(700); geometry();
      await toEditor(); geometry(); await create(); await complete(); await finish(); return geometry();
    });
    await check('rapid acknowledgement and stale-window requests cannot skip a screen', async () => {
      await fresh();
      const button = doc().querySelector('[data-guided-action="acknowledge"]');
      button.click(); button.click(); button.click();
      await step('MEET_COMPANION');
      const stale = { expectedStep: 'WELCOME', expectedRunId: 'first' };
      await Promise.all([services.guidedOnboardingService.advanceGuidedOnboarding('acknowledge', stale),
        services.guidedOnboardingService.advanceGuidedOnboarding('acknowledge', stale)]);
      await load(); assert((await state()).step === 'MEET_COMPANION');
      assert((await services.db.dbGetAll('collection')).length === 1);
      return 'Three clicks and two stale requests retained the meeting screen and one companion.';
    });
    await check('recovery moves an unfinished practice back to today after midnight', async () => {
      await fresh(); await toEditor(); await create();
      const task = await services.taskService.getTaskById((await state()).taskId);
      await services.db.dbPut('tasks', { ...task, plannedDate: '2000-01-01' });
      await load(); assert((await state()).step === 'RETURN_HOME');
      const today = await win().eval("import('/src/taskFilterService.js')");
      assert((await services.taskService.getTaskById(task.id)).plannedDate === today.getTodayDateString());
      assert(doc().querySelector(`.task-card[data-id="${task.id}"]`));
      return 'Same task identity remains visible on the current day.';
    });
    await check('replay replacement is atomic, concurrent-safe and removes only rehearsal history', async () => {
      await complete(); await finish();
      const firstId = (await state()).taskId;
      const own = await services.taskService.createTask({ content: '保留我的正式任務', planToday: true });
      await services.guidedOnboardingService.startGuidedReplay(); await load();
      await toEditor(); await create(); await complete(); await finish();
      const before = await business(); const guide = await state(); const tasks = await services.db.dbGetAll('tasks');
      const db = await services.db.openDB(); const native = db.transaction.bind(db);
      db.transaction = (...args) => {
        const tx = native(...args); if (args[1] === 'readwrite') { db.transaction = native; tx.abort(); } return tx;
      };
      let failed = false;
      try { await services.guidedOnboardingService.startGuidedReplay(); } catch { failed = true; }
      assert(failed); assert(JSON.stringify(await state()) === JSON.stringify(guide));
      assert(JSON.stringify(await services.db.dbGetAll('tasks')) === JSON.stringify(tasks));
      const runs = await Promise.all([services.guidedOnboardingService.startGuidedReplay(), services.guidedOnboardingService.startGuidedReplay()]);
      assert(runs[0].runId === runs[1].runId); assert(before === await business());
      const retained = await services.db.dbGetAll('tasks');
      assert(retained.length === 2 && retained.some((t) => t.id === own.id) && retained.some((t) => t.id === firstId));
      const foreign = { ...retained.find((t) => t.id === firstId), id: 'tutorial:foreign', tutorialRunId: 'foreign', rewardClaimed: false, completed: false };
      await services.db.dbPut('tasks', foreign);
      let rejected = false;
      try { await services.guidedOnboardingService.claimTutorialReward(foreign.id); } catch { rejected = true; }
      assert(rejected && before === await business());
      return 'Abort rolled back cleanup; two starts resumed one run; first receipt and formal task retained; foreign grant rejected.';
    });
    await check('optional education stays until acknowledged, survives navigation and links to rereadable help', async () => {
      await fresh(); await toEditor(); await create(); await complete(); await finish();
      assert(!doc().querySelector('.guided-feature-hint'), 'A completed learner must attempt the next own task without a task hint');
      await click('.bottom-nav [data-view="collection"]');
      assert(doc().querySelector('.guided-feature-hint h2').textContent.includes('已經相遇'));
      await wait(7000); assert(doc().querySelector('.guided-feature-hint'), 'No slow-reader timeout');
      await click('.bottom-nav [data-view="tasks"]'); await click('.bottom-nav [data-view="collection"]');
      assert(doc().querySelector('.guided-feature-hint'));
      await click('[data-guided-hint-help="collection"]', false);
      assert(doc().querySelector('#view-guide.active [data-education-feature="collection"]').open);
      assert(doc().activeElement.matches('[data-education-feature="collection"] summary'));
      await click('.bottom-nav [data-view="collection"]');
      await click('[data-guided-hint-dismiss="collection"]', false);
      assert((await state()).hintsAcknowledged.includes('collection')); assert(!doc().querySelector('.guided-feature-hint'));
      await load(); await click('.bottom-nav [data-view="collection"]'); assert(!doc().querySelector('.guided-feature-hint'));
      return 'Reminder remained after seven seconds and navigation; explicit dismissal persisted; help reopened the same explanation.';
    });
    await check('skip still offers an optional editor hint with no task created on the user behalf', async () => {
      await fresh(); await action('skip'); await action('confirm-skip');
      await click('.twilight-add-task');
      assert(doc().querySelector('#task-form .guided-feature-hint'));
      assert(doc().querySelector('#task-content').value === '');
      assert(!(await services.db.dbGetAll('tasks')).length);
      return 'A skipped learner sees a self-paced editor explanation and starts with an empty real form.';
    });
    assert(!win().__questNoteOnboardingTest.errors.length, win().__questNoteOnboardingTest.errors.join('\n'));
    output.textContent = JSON.stringify({ status: 'passed', database: marker.databaseName, results }, null, 2);
  } catch (error) { output.textContent = JSON.stringify({ status: 'failed', results, error: error.stack }, null, 2); }
});

document.querySelector('#offline').addEventListener('click', async () => {
  results.length = 0;
  try {
    await fresh();
    output.textContent = `Registering native worker (secure context: ${win().isSecureContext}).`;
    const registration = await Promise.race([win().navigator.serviceWorker.register('/service-worker.js?v=360'),
      wait(30000).then(() => { throw new Error('Browser did not resolve native Service Worker registration.'); })]);
    output.textContent = `Installing native worker: ${registration.installing?.state || registration.waiting?.state || registration.active?.state}`;
    registration.installing?.addEventListener('statechange', () => {
      output.textContent = `Native worker: ${registration.installing?.state || registration.waiting?.state || registration.active?.state || 'installation rejected'}`;
    });
    await Promise.race([win().navigator.serviceWorker.ready,
      wait(30000).then(() => { throw new Error('Worker installation did not become ready; check artifact profile and precache.'); })]);
    await load();
    assert(win().navigator.serviceWorker.controller, 'Worker must control the cached app');
    // Warm the current companion artwork via the actual worker before the outage.
    const images = [...doc().images].map((img) => img.src).filter(Boolean);
    await Promise.all(images.map((url) => win().fetch(url)));
    const response = await fetch('/__workshop_offline_control__', { method: 'POST' });
    assert(response.ok, 'Start onboarding-browser-server.mjs 0 --workshop-offline');
    await check('native Service Worker offline practice, with reload at every core checkpoint', async () => {
      await load(); await ack(); await load(); assert((await state()).step === 'MEET_COMPANION');
      await ack(); await load(); await ack(); await load(); await click('.twilight-add-task'); await load();
      await create(); await load(); await ack(); await load(); await click('.task-card [data-action="toggle"]'); await load();
      assert((await state()).step === 'REWARD_REVEAL'); await finish(); await load();
      assert((await state()).status === 'completed');
      const wallet = await services.rewardService.getWallet(); assert(wallet.stardust === 20 && wallet.adventureEnergy === 1);
      return { stardust: wallet.stardust, energy: wallet.adventureEnergy, workerControlled: true, originOffline: true };
    });
    output.textContent = JSON.stringify({ status: 'passed', results }, null, 2);
  } catch (error) { output.textContent = JSON.stringify({ status: 'failed', results, error: error.stack }, null, 2); }
});

// High-fidelity review snapshots seeded only in the guarded synthetic profile.
for (const value of ['COLLECTION_HINT', 'EDUCATION_HELP', 'SKIPPED_EDITOR', 'GROWTH_INVITATION_READY']) {
  const option = document.createElement('option'); option.value = value; option.textContent = value;
  document.querySelector('#scene').append(option);
}
document.querySelector('#show').addEventListener('click', async () => {
  try {
    await fresh(); frame.style.width = `${document.querySelector('#review-width').value}px`; frame.style.height = '852px';
    const scene = document.querySelector('#scene').value;
    let checkpoint = ['SKIP', 'LARGE_TEXT', 'REDUCE_MOTION', 'NARROW'].includes(scene) ? 'WELCOME' : scene;
    if (['COLLECTION_HINT', 'EDUCATION_HELP', 'GROWTH_INVITATION_READY'].includes(scene)) checkpoint = 'FINISH';
    if (scene === 'SKIPPED_EDITOR') checkpoint = 'WELCOME';
    if (scene === 'NARROW') { frame.style.width = '320px'; checkpoint = 'CREATE_TUTORIAL_QUEST'; }
    if (scene === 'LARGE_TEXT' || scene === 'REDUCE_MOTION') {
      await services.db.dbPut('meta', { ...(await services.preferencesService.getUserPreferences()),
        fontSize: scene === 'LARGE_TEXT' ? 'extra-large' : 'standard', reduceMotion: scene === 'REDUCE_MOTION' });
    }
    const guide = await state();
    if (checkpoint !== 'WELCOME') await services.guidedOnboardingService.advanceGuidedOnboarding('acknowledge');
    await services.db.dbPut('meta', { ...guide, step: checkpoint });
    if (['RETURN_HOME', 'COMPLETE_TUTORIAL_QUEST', 'REWARD_REVEAL', 'COMPANION_REACTION', 'FINISH'].includes(checkpoint)) {
      await services.db.dbPut('meta', { ...guide, step: 'CREATE_TUTORIAL_QUEST' });
      const task = await services.taskService.createTask({ isTutorial: true, tutorialRunId: 'first', tutorialMode: 'first', content: '完成我的第一個 Quest\n我已練習新增任務，現在試著把它完成。', planToday: true });
      if (['REWARD_REVEAL', 'COMPANION_REACTION', 'FINISH'].includes(checkpoint)) await services.guidedOnboardingService.claimTutorialReward(task.id);
      await services.db.dbPut('meta', { ...(await state()), step: checkpoint });
    }
    await load(); if (scene === 'SKIP') await action('skip');
    if (scene === 'GROWTH_INVITATION_READY') {
      await action('finish-home');
            await services.db.dbPut('meta', { key: 'onboardingV1', status: 'dismissed', activeLesson: 'invitation',
        lessons: { invitation: { status: 'active', step: 'invite', practiced: [] } } });
      await load();
      await until(() => doc().querySelector('.growth-coach[data-step="invite"]'), 'growth invitation');
      doc().querySelector('.dream-debut-skip')?.click();
      await until(() => !doc().querySelector('.dream-debut-overlay') && !doc().querySelector('#onboarding-root')?.hidden && doc().querySelector('.growth-coach')?.getClientRects().length, 'coach restored after entry');
      await click('[data-identity-action="invitation"]', false);
      await until(() => doc().querySelector('#specified-invitation-dialog[open] .growth-coach'), 'coach in invitation gallery');
      await click('[data-invitation-filter="SSR"]', false);
      await until(() => doc().querySelector('#specified-invitation-dialog[open] .growth-coach'), 'coach restored after gallery redraw');
      await click('[data-onboarding-action="lesson-pause"]', false);
      await until(() => doc().querySelector('#view-guide.active') && !doc().querySelector('#specified-invitation-dialog[open]'), 'paused and dialog closed');
      await click('[data-onboarding-action="lesson:invitation"]', false);
      await until(() => doc().querySelector('.growth-coach[data-step="invite"]')?.getClientRects().length, 'invitation resumed');
      assert(!doc().querySelector('.pet-detail__growth'), 'No obsolete star operation');
    }
    if (['COLLECTION_HINT', 'EDUCATION_HELP'].includes(scene)) {
      await action('finish-home'); await click('.bottom-nav [data-view="collection"]');
      if (scene === 'EDUCATION_HELP') await click('[data-guided-hint-help="collection"]', false);
    }
    if (scene === 'SKIPPED_EDITOR') { await action('skip'); await action('confirm-skip'); await click('.twilight-add-task'); }
    output.textContent = JSON.stringify({ status: 'review', scene, checkpoint, geometry: geometry() }, null, 2);
  } catch (error) { output.textContent = error.stack; }
});
