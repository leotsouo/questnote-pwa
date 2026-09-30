const worlds = [...document.querySelectorAll('.world')];
const status = document.getElementById('status');
const seed = document.getElementById('seed');
let ready = false;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate) { for (let n = 0; n < 180; n += 1) { if (predicate()) return; await wait(100); } throw new Error('初始化未完成，請查看手機驗證工具的錯誤。'); }
async function load(world) {
  const frame = world.querySelector('iframe');
  frame.src = '/index.html?theme-comparison=' + world.dataset.theme + '&t=' + Date.now();
  await new Promise((resolve, reject) => { frame.onload = resolve; frame.onerror = reject; });
  await until(() => frame.contentDocument.querySelector('.task-card') && (!frame.contentDocument.querySelector('#app-loader') || frame.contentWindow.getComputedStyle(frame.contentDocument.querySelector('#app-loader')).display === 'none'));
  // This dev-only page shares a guarded fixture; each document's theme is UI-only.
  world.ui = await frame.contentWindow.eval('import("/src/ui.js")');
  await world.ui.applyTheme(world.dataset.theme, { silent: true, skipSave: true });
  const skip = frame.contentDocument.querySelector('[data-onboarding-action="skip"]');
  if (skip) skip.click();
}
async function run(work) {
  document.querySelectorAll('button,select').forEach((element) => { element.disabled = true; });
  try { await work(); } catch (error) { status.textContent = error.message; }
  finally {
    document.querySelectorAll('button,select').forEach((element) => { element.disabled = false; });
    document.getElementById('before').disabled = !['tasks', 'collection', 'gacha', 'expedition'].includes(document.getElementById('screen').value);
  }
}
async function navigate() {
  const view = document.getElementById('screen').value;
  const suffix = view === 'tasks' ? 'home' : view;
  const supported = ['home', 'collection', 'gacha', 'expedition'].includes(suffix);
  document.getElementById('before').disabled = !supported;
  if (!supported && document.getElementById('before').getAttribute('aria-pressed') === 'true') {
    document.getElementById('before').setAttribute('aria-pressed', 'false');
    document.getElementById('after').setAttribute('aria-pressed', 'true');
    worlds.forEach((world) => {
      world.querySelector('.before').classList.add('hidden');
      world.querySelector('iframe').classList.remove('hidden');
    });
  }
  for (const world of worlds) {
    if (ready) { world.ui.switchView(view); world.querySelector('iframe').contentWindow.scrollTo(0, 0); }
    if (supported) world.querySelector('.before').src = '../../reports/theme-round-two/before-' + world.dataset.theme + '-' + suffix + '.jpg';
  }
}
document.getElementById('prepare').onclick = () => run(async () => {
  seed.src = '/devtools/ui-polish-test.html';
  await new Promise((resolve) => { seed.onload = resolve; });
  seed.contentDocument.querySelector('#initialize').click();
  await until(() => /READY|ERROR/.test(seed.contentDocument.querySelector('#results').textContent));
  if (seed.contentDocument.querySelector('#results').textContent.includes('ERROR')) throw new Error(seed.contentDocument.querySelector('#results').textContent);
  seed.contentDocument.querySelector('#gray-companion').click();
  await until(() => !seed.contentDocument.querySelector('#theme').disabled);
  for (const world of worlds) await load(world);
  ready = true; await navigate();
  status.textContent = '已就緒 · 三套共用同一組驗證存檔，世界預覽不儲存風格偏好。可完成任務、撫摸與查看角色，互動後按同步更新其他兩套。';
});
document.getElementById('sync').onclick = () => run(async () => { if (!ready) return; for (const world of worlds) await load(world); await navigate(); });
document.getElementById('screen').onchange = () => run(navigate);
for (const mode of ['before','after']) document.getElementById(mode).onclick = () => {
  document.getElementById('before').setAttribute('aria-pressed', mode === 'before');
  document.getElementById('after').setAttribute('aria-pressed', mode === 'after');
  worlds.forEach((world) => { world.querySelector('.before').classList.toggle('hidden', mode !== 'before'); world.querySelector('iframe').classList.toggle('hidden', mode !== 'after'); });
  navigate();
};
await navigate();
