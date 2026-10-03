/** Human learning-transfer observation. No remote telemetry or quest-text export. */
const frame = document.querySelector('#preview');
const status = document.querySelector('#status');
const milestones = document.querySelector('#milestones');
const controls = Object.fromEntries(['start', 'transfer', 'assisted', 'end', 'export'].map((id) => [id, document.getElementById(id)]));
let services;
let observation;
let timer;
let reading = false;
let started;
let ownTaskIds;
let baselineIds;
let sequence = 0;
const win = () => frame.contentWindow;
const doc = () => frame.contentDocument;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const elapsed = () => Math.round((performance.now() - started) / 100) / 10;

async function load() {
  if (location.hostname !== '127.0.0.1') throw new Error('請使用專用 loopback 測試伺服器。');
  const marker = await (await fetch('/__onboarding_test_guard__')).json();
  if (marker.purpose !== 'questnote-onboarding-synthetic-only'
    || !/^QuestNoteTest-Onboarding-[a-f0-9-]{36}$/.test(marker.databaseName)
    || !(await indexedDB.databases()).every((db) => db.name === marker.databaseName)) throw new Error('未通過資料隔離檢查；不會寫入。');
  win().__questNoteOnboardingTest?.close();
  await new Promise((resolve) => { frame.onload = resolve; frame.src = `/index.html?usability=${Date.now()}`; });
  for (let count = 0; count < 600; count++) {
    if (doc().querySelector('#task-view-content')?.children.length && doc().querySelector('.guided-coach, .twilight-add-task')) break;
    await wait(100);
    if (count === 599) throw new Error('App 尚未載入，請先確認伺服器。');
  }
  if (win().__questNoteOnboardingTest.databaseName !== marker.databaseName) throw new Error('資料庫不符合測試隔離。');
  services = Object.fromEntries(await Promise.all(['db', 'guidedOnboardingService'].map(async (id) =>
    [id, await win().eval(`import('/src/${id}.js')`)])));
}

function record(name) {
  if (observation.milestones[name] === undefined) observation.milestones[name] = elapsed();
  milestones.textContent = JSON.stringify({ phase: observation.phase, assistanceCount: observation.assistanceCount,
    seconds: observation.milestones }, null, 2);
}

async function observe() {
  if (reading || !services || !observation || observation.phase === 'ended') return;
  reading = true;
  try {
    const guide = await services.db.dbGet('meta', 'guidedOnboarding');
    if (observation.phase === 'guided') {
      controls.transfer.disabled = guide?.status !== 'completed';
      if (guide?.status === 'completed') status.textContent = '首輪練習已完成。主持人可以開始獨立操作。';
      return;
    }
    // Only IDs and flags are used transiently; neither IDs nor quest content are exported.
    const tasks = (await services.db.dbGetAll('tasks')).filter((task) => !task.isTutorial && !baselineIds.has(task.id));
    if (tasks.length) { record('createdOwnQuest'); ownTaskIds = new Set(tasks.map((task) => task.id)); }
    if (doc().querySelector('#view-tasks.active') && tasks.some((task) =>
      doc().querySelector(`.task-card[data-id="${win().CSS.escape(task.id)}"]`))) record('returnedToToday');
    if (tasks.some((task) => task.completed && task.rewardClaimed)) {
      record('completedOwnQuest'); status.textContent = '已觀察到自己的任務完成。請主持人確認是否曾提供協助，再結束本次觀察。';
    }
  } catch (error) { status.textContent = `觀察暫停：${error.message}`; }
  finally { reading = false; }
}

controls.start.addEventListener('click', async () => {
  controls.start.disabled = true; clearInterval(timer);
  try {
    if (!services) await load();
    await services.db.clearAllData(); await load();
    observation = { participant: `P${String(++sequence).padStart(2, '0')}`,
      sampleKind: document.querySelector('#sample-kind').value,
      familiarity: document.querySelector('#familiarity').value, phase: 'guided', assistanceCount: 0, milestones: {} };
    milestones.textContent = '首輪練習中；尚未進行獨立操作。';
    document.querySelector('#prompt').textContent = '請照 App 畫面上的引導試一次。';
    status.textContent = '觀察已開始。請讓受測者自己操作，不提供指路提示。';
    controls.transfer.disabled = true; controls.assisted.disabled = true; controls.end.disabled = true; controls.export.disabled = true;
    document.querySelector('#report').hidden = true;
    timer = setInterval(() => void observe(), 500);
  } catch (error) { status.textContent = error.message; }
  finally { controls.start.disabled = false; }
});

controls.transfer.addEventListener('click', async () => {
  const guide = await services.db.dbGet('meta', 'guidedOnboarding');
  if (guide?.status !== 'completed') return;
  // Establish the same starting point, using existing product controls.
  doc().querySelector('#task-form #form-cancel')?.click();
  doc().querySelector('.bottom-nav [data-view="tasks"]')?.click();
  baselineIds = new Set((await services.db.dbGetAll('tasks')).map((task) => task.id));
  ownTaskIds = new Set(); started = performance.now(); observation.phase = 'independent';
  observation.milestones = {}; controls.transfer.disabled = true; controls.assisted.disabled = false; controls.end.disabled = false;
  document.querySelector('#prompt').textContent = '現在請新增一個你自己的任務。做完後，也請把它標記完成。';
  status.textContent = '獨立操作開始。請勿指路；沒有時間限制。';
  doc().addEventListener('click', (event) => {
    if (observation.phase !== 'independent') return;
    if (event.target.closest('.twilight-add-task, #btn-add-task')) record('foundAddQuest');
    if (event.target.closest('.task-card [data-action="toggle"]')) {
      const id = event.target.closest('.task-card')?.dataset.id;
      if (ownTaskIds.has(id)) record('pressedComplete');
    }
  });
  record('started');
});

controls.assisted.addEventListener('click', () => { observation.assistanceCount++; record('firstAssistance'); });
controls.end.addEventListener('click', async () => {
  await observe(); observation.phase = 'ended'; clearInterval(timer);
  observation.durationSeconds = elapsed();
  observation.unaidedTransfer = observation.assistanceCount === 0
    && ['foundAddQuest', 'createdOwnQuest', 'returnedToToday', 'completedOwnQuest'].every((key) => observation.milestones[key] !== undefined);
  status.textContent = observation.unaidedTransfer ? '已記錄無協助完成。理解程度仍需主持人訪談確認。' : '這次未達成無協助完成；請保留卡住處與協助情況。';
  controls.assisted.disabled = true; controls.end.disabled = true; controls.export.disabled = false;
  milestones.textContent = JSON.stringify(observation, null, 2);
});
controls.export.addEventListener('click', () => {
  const report = document.querySelector('#report');
  report.value = JSON.stringify({ protocolVersion: 1, humanEvidence: observation.sampleKind === 'human', observation }, null, 2);
  report.hidden = false; report.focus(); report.select();
});
