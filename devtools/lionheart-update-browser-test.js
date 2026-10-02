// Real release generations, a new loopback port, synthetic saves only.
const results = [];
const output = document.getElementById('results');
const frames = document.getElementById('clients');
const assert = (condition, message) => { if (!condition) throw Error(message); };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const publish = () => { output.textContent = JSON.stringify({ results }, null, 2); };
async function until(condition, label) {
  for (let n = 0; n < 300; n++) { if (await condition()) return; await sleep(100); }
  throw Error('Timeout: ' + label);
}
let config;
let frame;
const doc = () => frame.contentDocument;
const win = () => frame.contentWindow;
const marker = () => doc()?.querySelector('meta[name="questnote-artifact"]')?.content;
const read = async () => {
  const db = await win().eval('import("/questnote-pwa/src/db.js")');
  const data = await db.readAllStoresSnapshot();
  const mailbox = data.meta.find((entry) => entry.key === 'globalMailboxState');
  if (mailbox) {
    delete mailbox.lastFetchedAt;
    assert(config.mailboxGeneratedAts.includes(mailbox.lastSeenGeneratedAt), 'Unexpected mailbox generation');
    // The independently published mailbox may advance; keep claimed/read IDs in the comparison.
    delete mailbox.lastSeenGeneratedAt;
  }
  const exploration=data.meta.find(row=>row.key==='explorationProgress');
  if(exploration?.areas?.lionheart_city){
    const area=exploration.areas.lionheart_city;
    assert(area.progress===0 && area.completedRuns===0 && area.claimedMilestones.length===0 && area.unlockedStories.length===0,'Upgrade invented new city progress/rewards');
    delete exploration.areas.lionheart_city;
  }
  const inventory=data.meta.find(row=>row.key==='inventory');
  if(inventory?.items && Object.hasOwn(inventory.items,'item_lionheart_gear_crisp')){
    assert(inventory.items.item_lionheart_gear_crisp===0,'Upgrade invented free food');
    delete inventory.items.item_lionheart_gear_crisp;
  }
  const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
  return JSON.stringify(stable(data));
};
const register = () => win().navigator.serviceWorker.getRegistration('/questnote-pwa/');
const ready = () => !!doc()?.querySelector('#view-more [data-app-update="apply"]')
  && !doc()?.querySelector('#app-loader') && !doc().querySelector('#view-more [data-app-update="apply"]').disabled;
async function open() {
  const child = document.createElement('iframe');
  child.style.cssText = 'width:393px;height:852px;border:1px solid #888';
  child.src = '/questnote-pwa/index.html'; frames.appendChild(child);
  return child;
}
const apply = () => doc().querySelector('#view-more [data-app-update="apply"]').click();
const note = (name) => { results.push({ name, ok: true }); publish(); };

try {
  assert(['localhost', '127.0.0.1'].includes(location.hostname), 'Loopback only');
  assert((await indexedDB.databases()).length === 0 && (await navigator.serviceWorker.getRegistrations()).length === 0
    && (await caches.keys()).length === 0, 'Unknown storage: refusing fixture writes');
  config = await (await fetch('./config')).json(); assert(config.origin === location.origin, 'Wrong test origin');
  frame = await open(); await until(ready, 'initial app');
  assert(marker() === config.profiles.old.artifactId, 'Old artifact missing');
  doc().querySelector('[data-onboarding-action="skip"]')?.click();
  await until(() => !doc().querySelector('#onboarding-welcome-title'), 'dismiss teaching');
  const tasks = await win().eval('import("/questnote-pwa/src/taskService.js")');
  const collection = await win().eval('import("/questnote-pwa/src/collectionService.js")');
  const prefs = await win().eval('import("/questnote-pwa/src/preferencesService.js")');
  const task = await tasks.createTask({ content: '更新測試：保留完成任務與獎勵' });
  await tasks.toggleTaskComplete(task.id);
  await collection.addPetToCollection('pet_n01'); await collection.setCompanion('pet_n01');
  await prefs.setTheme('twilight');
  await new Promise((resolve) => { frame.onload = resolve; frame.src = '/questnote-pwa/index.html?fixture=ready'; });
  await until(ready, 'seeded baseline');
  const ui = await win().eval('import("/questnote-pwa/src/ui.js")');
  await ui.applyTheme('twilight', { silent: true });
  ui.switchView('more');
  const baseline = await read();
  // Same iframe remains open from this point; no close/reopen or storage reset.
  await fetch('./switch', { method: 'POST', headers: { 'X-Test-Token': config.token }, body: 'new' });
  await (await register()).update();
  await until(async () => !!(await register()).waiting, 'verified waiting worker');
  assert(marker() === config.profiles.old.artifactId, 'Update activated automatically');
  assert(doc().getElementById('update-banner'), 'Update prompt missing');
  note('Downloaded generation waits; no forced refresh during use');

  const activity = await win().eval('import("/questnote-pwa/src/updateActivity.js")');
  let finish;
  const pending = activity.trackUpdateActivity(async () => { await new Promise((resolve) => { finish = resolve; }); })();
  apply(); await until(() => doc().querySelector('[data-app-update-status]').textContent.includes('請先完成'), 'busy action veto');
  assert(marker() === config.profiles.old.artifactId, 'Busy action was interrupted');
  finish(); await pending;
  note('An incomplete asynchronous UI operation vetoes activation');

  ui.switchView('tasks'); doc().getElementById('btn-add-task').click();
  doc().getElementById('task-content').value = '這段文字尚未存檔';
  apply(); await until(() => doc().querySelector('[data-app-update-status]').textContent.includes('請先完成'), 'edit veto');
  assert(doc().getElementById('task-content').value === '這段文字尚未存檔', 'Draft was lost');
  assert(marker() === config.profiles.old.artifactId, 'Editing app was reloaded');
  doc().getElementById('form-cancel').click(); ui.switchView('more');
  await until(() => win().getComputedStyle(doc().getElementById('modal-overlay')).visibility === 'hidden'
    && !activity.hasUpdateActivity(), 'editor close transition');
  note('Unsaved task text and the open editor survive a blocked update');

  const second = await open();
  await until(() => second.contentDocument?.querySelector('#view-more [data-app-update="apply"]') && !second.contentDocument.querySelector('#app-loader'), 'second app');
  apply(); await until(() => doc().querySelector('[data-app-update-status]').textContent.includes('另一個 QuestNote'), 'other-window veto');
  assert(marker() === config.profiles.old.artifactId, 'Other client did not veto');
  assert(second.contentDocument.querySelector('meta[name="questnote-artifact"]').content === config.profiles.old.artifactId, 'Other client was upgraded mid-use');
  assert(!doc().getElementById('app').inert, 'UI stayed locked after veto');
  second.remove(); note('A second app window vetoes activation and the first window unlocks');

  await fetch('./offline', { method: 'POST', headers: { 'X-Test-Token': config.token }, body: 'on' });
  // This is the user's button. No external skipWaiting/claim/reload calls.
  apply(); await until(() => marker() === config.profiles.new.artifactId && ready(), 'one-tap new generation');
  assert(frame.isConnected, 'App window was closed');
  const updatedSnapshot = await read();
  if (updatedSnapshot !== baseline) results.push({ name: 'save difference diagnostic', ok: false,
    before: JSON.parse(baseline), after: JSON.parse(updatedSnapshot) });
  assert(updatedSnapshot === baseline, 'Update changed stored rows');
  assert(doc().body.dataset.theme === 'twilight', 'Theme preference lost');
  assert(win().navigator.serviceWorker.controller, 'New app is uncontrolled');
  note(`One click upgrades actual formal artifact ${config.profiles.old.artifactId} to ${config.profiles.new.artifactId} while network is 503; original five stores/theme retained, only empty Lionheart progress and zero-count food inventory added`);

  const offlineUi = await win().eval('import("/questnote-pwa/src/ui.js")');
  offlineUi.switchView('expedition');
  doc().querySelector('[data-area-id="lionheart_city"] button').click();
  const offlineCityImage = doc().querySelector('.expedition-dispatch-area__image');
  await offlineCityImage.decode();
  assert(offlineCityImage.src.endsWith('/assets/expeditions/lionheart_city.webp')
    && offlineCityImage.naturalWidth >= 960 && offlineCityImage.naturalHeight >= 540,
  'New Lionheart illustration was not available from verified offline cache');
  doc().querySelector('.expedition-dispatch-modal__close').click();
  note('New Lionheart city map and dispatch use the decoded raster while every artifact network request returns 503');
  await fetch('./offline', { method: 'POST', headers: { 'X-Test-Token': config.token }, body: 'off' });
  const newUi = await win().eval('import("/questnote-pwa/src/ui.js")');
  newUi.switchView('more');
  doc().querySelector('#view-more [data-app-update="apply"]').click();
  await until(() => doc().querySelector('[data-app-update-status]').textContent.includes('已是最新'), 'latest version state');
  note('Checking the latest generation reports success without a reload loop');
  doc().querySelector('#view-more [data-app-update="icon"]').click();
  await until(() => doc().querySelector('.app-icon-guide'), 'icon guide');
  const image = doc().querySelector('.app-icon-guide img'); await image.decode();
  assert(image.naturalWidth === 180, 'New icon did not render');
  assert(doc().querySelector('.app-icon-guide').textContent.includes('先匯入剛才的 JSON 備份'), 'Separated iOS installation data guidance missing');
  doc().querySelector('[data-app-update="backup"]').click();
  assert(doc().getElementById('view-settings').classList.contains('active'), 'Backup navigation failed');
  assert(await read() === baseline, 'Icon guide altered the save');
  note('Real icon decodes; backup settings opens without reset, reinstall or changing app identity');
} catch (error) { results.push({ name: 'acceptance', ok: false, error: error.stack || error.message }); }
publish();
document.title = results.every((result) => result.ok) ? 'PASS — One-tap update' : 'FAIL — One-tap update';
