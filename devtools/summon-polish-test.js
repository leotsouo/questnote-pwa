/** Render-only companion to M4 contract tests. No static product imports before origin / DB guard. */
const frame = document.getElementById('preview');
const output = document.getElementById('results');
const controls = ['scene', 'theme', 'width', 'dust', 'single-active'];
const scenePool = { standard: 'standard', 'dream-locked': 'eternal_slumber_bloom',
  'dream-awakened': 'eternal_slumber_bloom', 'unthemed-unlock': 'fixture_beta',
  'synthetic-token': 'eternal_slumber_bloom' };
let ui;
let state;
let storage;
let preferences;
let contract;
let databaseName;
let results = [];
const doc = () => frame.contentDocument;
const win = () => frame.contentWindow;
const node = (id) => doc().getElementById(id);
const style = (element) => win().getComputedStyle(element);
const box = (element) => element.getBoundingClientRect();
const visible = (element) => !!element && !!element.getClientRects().length
  && style(element).display !== 'none' && style(element).visibility !== 'hidden';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (text) => { output.textContent += `${text}\n`; };
const futurePanel = 'rgb(16, 27, 48)';
const futureSurface = 'rgb(32, 52, 81)';
const futureStrongSurface = 'rgb(23, 41, 65)';

function leaveCapture(event) {
  if (event.key !== 'Escape' || !document.body.classList.contains('capture-mode')) return;
  document.body.classList.remove('capture-mode');
  event.preventDefault();
  event.stopImmediatePropagation();
  document.getElementById('capture').focus();
}

async function settle() {
  await new Promise((resolve) => win().requestAnimationFrame(() => win().requestAnimationFrame(resolve)));
  await pause(80);
}

async function guard() {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) throw new Error('Localhost only.');
  const response = await fetch('/__ui-polish_test_guard__', { cache: 'no-store' });
  if (!response.ok || (await response.json()).purpose !== 'questnote-ui-polish-synthetic-only') throw new Error('Dedicated safe server marker missing.');
  if (navigator.serviceWorker?.controller || (await navigator.serviceWorker?.getRegistrations())?.length) throw new Error('Use an origin without a service worker.');
}

function settings() {
  return { scene: document.getElementById('scene').value, theme: document.getElementById('theme').value,
    width: Number(document.getElementById('width').value), dust: Number(document.getElementById('dust').value),
    single: document.getElementById('single-active').checked };
}

function applyControls(value) {
  for (const key of ['scene', 'theme', 'width', 'dust']) document.getElementById(key).value = value[key];
  document.getElementById('single-active').checked = value.single;
}

async function initialize() {
  await guard();
  if (ui) { await render(); return; }
  output.textContent = '';
  const [html, catalog, pets, fixtureModule] = await Promise.all([
    fetch('/index.html', { cache: 'no-store' }).then((response) => response.text()),
    fetch('/data/pools.json', { cache: 'no-store' }).then((response) => response.json()),
    fetch('/data/pets.json', { cache: 'no-store' }).then((response) => response.json()),
    import('./fixtures/pool-content-fixtures.mjs'),
  ]);
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.querySelectorAll('script, #app-loader').forEach((element) => element.remove());
  const base = parsed.createElement('base');
  base.href = `${location.origin}/`;
  parsed.head.prepend(base);
  const probeStyle = parsed.createElement('style');
  probeStyle.dataset.syntheticOnly = 'future-pool-token-contract';
  probeStyle.textContent = `body[data-theme] #view-gacha #gacha-panel[data-pool-theme="synthetic_future_theme"] {
    --pool-text-primary: #f3f7ff;
    --pool-text-secondary: #c5d7ef;
    --pool-text-muted: #a8bddb;
    --pool-surface: ${futureSurface};
    --pool-surface-strong: ${futureStrongSurface};
    --pool-border: #607c9f;
    --pool-accent: #9bd8ff;
    background: ${futurePanel};
  }`;
  parsed.head.append(probeStyle);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Iframe load timed out.')), 15000);
    frame.onload = () => { clearTimeout(timer); resolve(); };
    frame.srcdoc = `<!doctype html>${parsed.documentElement.outerHTML}`;
  });
  if (win().navigator.serviceWorker?.controller) throw new Error('Unexpected iframe service worker.');
  doc().addEventListener('keydown', leaveCapture, true);
  databaseName = `QuestNoteTest-Summon-${crypto.randomUUID()}`;
  const nativeOpen = win().indexedDB.open.bind(win().indexedDB);
  win().indexedDB.open = (name, version) => {
    if (!['QuestNoteDB', 'QuestNotePreviewDB'].includes(name)) throw new Error(`Unexpected product DB: ${name}`);
    return nativeOpen(databaseName, version);
  };
  storage = await win().eval('import("/src/db.js")');
  const db = await storage.openDB();
  if (db.name !== databaseName) throw new Error('Synthetic DB isolation failed.');
  const fixture = fixtureModule.createPoolContentFixtures();
  state = {
    allPets: [...pets.pets, ...fixture.pets], poolsData: { schemaVersion: 1, pools: [...catalog.pools, fixture.beta] },
    tasks: [], habits: [], categories: [], enrichedCollection: [], todayCompleted: 0,
    achievementSummary: {}, habitSummary: {}, questSummary: null, dailyCheckIn: null, inventory: null, companion: null,
    wallet: { key: 'wallet', stardust: 2000, adventureEnergy: 0 },
    gachaStats: { key: 'gachaStats', selectedPoolId: 'standard' },
    poolUnlockState: { key: 'poolUnlockState', byPool: {} },
    userPreferences: { reduceMotion: true, theme: 'default' },
  };
  await storage.dbPut(storage.STORES.META, state.wallet);
  ui = await win().eval('import("/src/ui.js")');
  preferences = await win().eval('import("/src/preferencesService.js")');
  contract = await win().eval('import("/src/poolContentContract.js")');
  // Preserve enabled / disabled styling while forbidding draw submission in this visual harness.
  doc().addEventListener('click', (event) => {
    if (event.target.closest('#btn-pull, #btn-pull-ten')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      log('PREVIEW · 抽卡提交已攔截；本工具只驗證展示。');
    }
  }, true);
  // Manual pool choice uses the same renderer without invoking debut / resume workflows.
  doc().addEventListener('change', (event) => {
    if (event.target.id !== 'gacha-pool-select') return;
    event.stopImmediatePropagation();
    const selected = event.target.value;
    const scene = Object.keys(scenePool).find((key) => scenePool[key] === selected);
    if (scene) { document.getElementById('scene').value = scene; void render(); }
  }, true);
  ui.initUI(state, async () => { ui.renderView('gacha'); }, async () => {});
  ui.applyReduceMotionClass(true);
  doc().querySelectorAll('.view').forEach((element) => element.classList.toggle('active', element.id === 'view-gacha'));
  doc().querySelectorAll('.nav-item').forEach((element) => element.classList.toggle('active', element.dataset.view === 'gacha'));
  await render();
  log(`READY · ${databaseName}\n初始畫面保留，尚未自動執行測試。使用上方場景控制；既有卡池 selector 的展示切換也略過登場動畫。`);
}

async function render(value = settings()) {
  if (!Number.isFinite(value.dust) || value.dust < 0) throw new Error('Stardust must be a nonnegative number.');
  frame.style.width = `${value.width}px`;
  document.body.style.setProperty('--preview-width', `${value.width}px`);
  const poolId = scenePool[value.scene];
  state.poolsData.pools.forEach((pool) => { pool.active = !value.single || pool.id === poolId; });
  state.gachaStats.selectedPoolId = poolId;
  state.wallet.stardust = value.dust;
  state.poolUnlockState.byPool = value.scene === 'dream-awakened'
    ? { eternal_slumber_bloom: { lifetimeDraws: 20, unlocked: true, rewardClaimed: true, animationSeen: true } } : {};
  state.userPreferences.theme = value.theme;
  preferences.applyThemeToDocument(value.theme);
  ui.renderView('gacha');
  // Forward CSS probe, not a valid new pool: unknown themeKey values are correctly
  // rejected by the domain registry. Render a valid model before changing only its
  // DOM token. The harness stylesheet supplies the future theme's tokens and solid
  // panel surface. This is not production glacier content or behavior.
  if (value.scene === 'synthetic-token') {
    node('gacha-panel').dataset.poolTheme = 'synthetic_future_theme';
  }
  await settle();
  win().scrollTo(0, 0);
  node('view-gacha').scrollTop = 0;
  await settle();
}

function record(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail });
  log(`${pass ? 'PASS' : 'FAIL'} · ${name}${detail ? ` · ${detail}` : ''}`);
  window.summonPolishResults = results;
}

function inViewport(id, limit) {
  const element = node(id);
  return visible(element) && box(element).top >= -1 && box(element).bottom <= limit;
}

function contrast(foreground, background) {
  const luminance = (color) => {
    const channels = (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map((value) => value / 255)
      .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}

async function checkCurrent() {
  const selected = settings();
  await render(selected);
  log(`\n[${selected.scene} / ${selected.theme} / ${selected.width}×844 / dust ${selected.dust}]`);
  const pool = state.poolsData.pools.find((entry) => entry.id === scenePool[selected.scene]);
  const singleCost = contract.resolveDrawCost(pool, 1);
  const tenCost = contract.resolveDrawCost(pool, 10);
  const nav = doc().querySelector('.bottom-nav');
  const limit = Math.min(844, visible(nav) ? box(nav).top : 844);
  for (const [id, label] of [['gacha-pool-name', '卡池名称'], ['gacha-stardust', '目前星塵'],
    ['gacha-cost', '單抽成本'], ['gacha-ten-cost', '十連成本'], ['btn-pull', '單抽操作'], ['btn-pull-ten', '十連操作']]) {
    const element = node(id);
    record(`${label}在首屏 nav 上方`, inViewport(id, limit), element
      ? `visible=${visible(element)} top=${box(element).top.toFixed(1)} bottom=${box(element).bottom.toFixed(1)} limit=${limit.toFixed(1)}` : 'missing');
  }
  record('顯示目前卡池、成本與資源', node('gacha-pool-name').textContent === pool.name
    && Number(node('gacha-cost').textContent) === singleCost && Number(node('gacha-ten-cost').textContent) === tenCost
    && Number(node('gacha-stardust').textContent) === selected.dust);
  record('沒有橫向溢出', doc().documentElement.scrollWidth <= selected.width,
    `scrollWidth=${doc().documentElement.scrollWidth}`);
  record('只有召喚 view active', doc().querySelectorAll('.view.active').length === 1 && node('view-gacha').classList.contains('active'));
  record('成本決定 disabled 語意', node('btn-pull').disabled === (selected.dust < singleCost)
    && node('btn-pull-ten').disabled === (selected.dust < tenCost));
  const content = node('gacha-pool-content');
  const follows = (a, b) => !!(a.compareDocumentPosition(b) & win().Node.DOCUMENT_POSITION_FOLLOWING);
  record('DOM 中成本與抽卡操作早於內容展示', follows(node('gacha-cost'), node('btn-pull'))
    && follows(node('gacha-ten-cost'), node('btn-pull-ten'))
    && follows(node('btn-pull'), content) && follows(node('btn-pull-ten'), content));
  const focusable = [...node('gacha-panel').querySelectorAll('button, select, summary, a[href], [tabindex]')]
    .filter((element) => visible(element) && !element.disabled && element.tabIndex >= 0);
  const primaryFocusable = [node('gacha-pool-select'), node('btn-pull'), node('btn-pull-ten')]
    .filter((element) => visible(element) && !element.disabled);
  const contentFocusable = focusable.filter((element) => content.contains(element));
  record('可用主要操作依 DOM tab 順序早於詳情、解鎖', primaryFocusable.every((element, index) =>
    focusable.indexOf(element) >= 0 && (index === 0 || focusable.indexOf(primaryFocusable[index - 1]) < focusable.indexOf(element)))
    && contentFocusable.every((element) => primaryFocusable.every((primary) => focusable.indexOf(primary) < focusable.indexOf(element)))
    && focusable.every((element) => element.tabIndex === 0));
  const detailsButton = node('gacha-theme-details-btn');
  if (visible(detailsButton)) {
    detailsButton.click();
    await settle();
    record('詳情可展開且 aria-expanded 正確', !node('gacha-theme-details').hidden && detailsButton.getAttribute('aria-expanded') === 'true');
    detailsButton.click();
    await settle();
    record('詳情可收合且 aria-expanded 正確', node('gacha-theme-details').hidden && detailsButton.getAttribute('aria-expanded') === 'false');
  } else record('無主題卡池沒有多餘主題詳情入口', selected.scene === 'standard' || selected.scene === 'unthemed-unlock');
  if (selected.scene !== 'standard') {
    const unlock = node('gacha-awakening-panel');
    record('解鎖資訊可見且不依附隱藏 theme stage', visible(unlock) && !unlock.closest('#gacha-theme-stage'));
    unlock.querySelector('summary').click();
    await settle();
    record('解鎖 details 可展開', unlock.open);
    unlock.querySelector('summary').click();
    record('解鎖 details 可收合', !unlock.open);
  }
  if (selected.scene === 'dream-awakened') record('晨醒 phase 保留', node('gacha-panel').dataset.poolPhase === 'awakened');
  if (selected.scene === 'unthemed-unlock') record('Synthetic 無主題仍有 75 / 750 成本與解鎖',
    node('gacha-theme-stage').hidden && singleCost === 75 && tenCost === 750 && visible(node('gacha-awakening-panel')));
  if (selected.scene === 'synthetic-token') {
    log('PROBE · 合法dream model + synthetic DOM token／theme供應tokens與solid panel；不是有效新pool或真glacier，不驗證舊stage的任意無token配色。');
    record('未知 CSS token不隱藏召喚操作或stage', node('gacha-panel').dataset.poolTheme === 'synthetic_future_theme'
      && visible(node('gacha-theme-stage')) && visible(node('btn-pull')));
    const contrastTargets = [
      ['#gacha-pool-name', futurePanel], ['#gacha-stardust', futurePanel],
      ['.gacha-stardust__label', futurePanel], ['#gacha-cost', futurePanel], ['#gacha-ten-cost', futurePanel],
      ['.gacha-info p', futurePanel], ['.pity-label', futurePanel], ['#gacha-ssr-pity', futurePanel],
      ['#gacha-ur-pity', futurePanel], ['#gacha-pool-select', futureStrongSurface], ['#btn-pull-ten', futureSurface],
    ];
    for (const [selector, expectedBackground] of contrastTargets) {
      const element = node('gacha-panel').querySelector(selector);
      const ratio = contrast(style(element).color, expectedBackground);
      record(`Synthetic token ${selector} 對比 >= 4.5`, ratio >= 4.5,
        `${ratio.toFixed(2)}:1; color=${style(element).color}; bg=${expectedBackground}`);
    }
    record('Synthetic panel、select與十連採用theme surface', style(node('gacha-panel')).backgroundColor === futurePanel
      && style(node('gacha-pool-select')).backgroundColor === futureStrongSurface
      && style(node('btn-pull-ten')).backgroundColor === futureSurface);
  }

  try {
    state.wallet.stardust = Math.max(0, singleCost - 1);
    ui.updateGachaAffordability();
    await settle();
    record('不足單抽成本：disabled + 可讀提示', node('btn-pull').disabled && node('btn-pull-ten').disabled
      && visible(node('gacha-hint-single')) && visible(node('gacha-hint-ten')));
    record('不足單抽狀態停用按鈕仍保留文字可讀性', style(node('btn-pull')).opacity === '1'
      && style(node('btn-pull-ten')).opacity === '1');
    if (selected.scene === 'synthetic-token') for (const id of ['btn-pull', 'btn-pull-ten']) {
      const ratio = contrast(style(node(id)).color, futureSurface);
      record(`Synthetic disabled ${id} token 對比 >= 4.5`, ratio >= 4.5 && style(node(id)).backgroundColor === futureSurface, `${ratio.toFixed(2)}:1`);
    }
    state.wallet.stardust = tenCost - 1;
    ui.updateGachaAffordability();
    await settle();
    record('不足十連成本：保留單抽與當前池提示', !node('btn-pull').disabled && node('btn-pull-ten').disabled
      && !visible(node('gacha-hint-single')) && visible(node('gacha-hint-ten'))
      && node('gacha-hint-ten').textContent.includes(String(tenCost)));
    await render({ ...selected, single: true });
    record('單一 active pool 隱藏 switcher且保留選池名稱', !visible(node('gacha-pool-switcher'))
      && node('gacha-pool-name').textContent === pool.name && state.poolsData.pools.filter((entry) => entry.active).length === 1);
  } finally { await render(selected); }
}

async function run(matrix = false) {
  await guard();
  results = [];
  output.textContent = `Render-only checks · ${new Date().toISOString()}\n`;
  const original = settings();
  try {
    if (matrix) {
      for (const scene of Object.keys(scenePool)) for (const theme of ['default', 'sweet']) for (const width of [320, 390, 430]) {
        applyControls({ ...original, scene, theme, width });
        await checkCurrent();
      }
    } else await checkCurrent();
  } finally {
    applyControls(original);
    await render(original);
  }
  log(`\n${results.filter((result) => result.pass).length} PASS / ${results.filter((result) => !result.pass).length} FAIL。已還原原始預覽；未抽卡、未扣款、未改收藏。`);
}

async function action(work) {
  document.querySelectorAll('button, input, select').forEach((element) => { element.disabled = true; });
  try { await work(); } catch (error) { log(`ERROR · ${error.stack || error.message}`); }
  finally {
    document.getElementById('initialize').disabled = false;
    if (ui) document.querySelectorAll('button, input, select').forEach((element) => { element.disabled = false; });
  }
}
document.getElementById('initialize').onclick = () => action(initialize);
document.getElementById('render').onclick = () => action(() => render());
document.getElementById('test').onclick = () => action(() => run());
document.getElementById('matrix').onclick = () => action(() => run(true));
document.getElementById('poor-preview').onclick = () => action(async () => {
  const pool = state.poolsData.pools.find((entry) => entry.id === scenePool[settings().scene]);
  document.getElementById('dust').value = Math.max(0, contract.resolveDrawCost(pool, 1) - 1);
  await render();
  log('PREVIEW · 固定星塵不足單抽的真實disabled狀態；沒有直接改disabled屬性或提交抽卡。');
});
document.getElementById('capture').onclick = () => {
  document.body.classList.add('capture-mode');
  window.scrollTo(0, 0);
  frame.focus();
};
document.addEventListener('keydown', leaveCapture, true);
controls.forEach((id) => { document.getElementById(id).onchange = () => action(() => render()); });
