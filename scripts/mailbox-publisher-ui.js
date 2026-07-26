/**
 * QuestNote Mailbox Publisher UI — 僅由本機 server 提供
 * 預覽使用 textContent，不對遠端／表單正文使用未處理 innerHTML
 */

const state = {
  document: { schemaVersion: 1, generatedAt: null, messages: [] },
  catalogs: { materials: [], items: [] },
  meta: null,
  selectedId: null,
  editMode: false,
};

const $ = (id) => document.getElementById(id);

function log(msg, cls = '') {
  const el = $('log');
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.prepend(line);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.errors?.join('; ') || `HTTP ${res.status}`);
    err.payload = data;
    throw err;
  }
  return data;
}

function nowLocalIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const oh = pad(Math.floor(Math.abs(offset) / 60));
  const om = pad(Math.abs(offset) % 60);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${oh}:${om}`;
}

function generateId() {
  const type = $('type').value || 'update';
  const d = new Date();
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 90) + 10);
  return `${ym}-${type}-${rand}`;
}

function createRewardRow(kind, selectedId = '', amount = 1) {
  const wrap = document.createElement('div');
  wrap.className = 'reward-row';
  const select = document.createElement('select');
  const list = kind === 'material' ? state.catalogs.materials : state.catalogs.items;
  for (const item of list) {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${item.name} (${item.id})`;
    if (item.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  }
  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.min = '0';
  amountInput.step = '1';
  amountInput.value = String(amount);
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = '移除';
  remove.addEventListener('click', () => wrap.remove());
  wrap.append(select, amountInput, remove);
  return wrap;
}

function collectMapFromRows(containerId) {
  const map = {};
  for (const row of $(containerId).querySelectorAll('.reward-row')) {
    const id = row.querySelector('select')?.value;
    const amt = Number(row.querySelector('input')?.value);
    if (!id) continue;
    if (!Number.isInteger(amt) || amt < 0) throw new Error(`${id} 數量必須為非負整數`);
    if (amt > 0) map[id] = amt;
  }
  return map;
}

function buildMessageFromForm() {
  const id = $('id').value.trim();
  const type = $('type').value;
  const actionView = $('actionView').value;
  const message = {
    id,
    type,
    title: $('title').value,
    body: $('body').value,
    publishedAt: $('publishedAt').value.trim() || nowLocalIso(),
    expiresAt: $('expiresAt').value.trim() || null,
    priority: $('priority').value,
    enabled: $('enabled').value === 'true',
    minAppVersion: $('minAppVersion').value.trim() || null,
    maxAppVersion: $('maxAppVersion').value.trim() || null,
    icon: $('icon').value.trim() || '📮',
    reward: null,
    action: null,
  };

  if (actionView) {
    message.action = {
      type: 'view',
      view: actionView,
      label: $('actionLabel').value.trim() || '前往查看',
    };
  }

  if (type === 'compensation') {
    message.reward = {
      stardust: Number($('stardust').value || 0),
      adventureEnergy: Number($('adventureEnergy').value || 0),
      materials: collectMapFromRows('material-rows'),
      items: collectMapFromRows('item-rows'),
    };
  }
  return message;
}

function fillFormFromMessage(msg) {
  state.selectedId = msg.id;
  state.editMode = true;
  $('type').value = msg.type;
  $('priority').value = msg.priority || 'normal';
  $('id').value = msg.id;
  $('title').value = msg.title || '';
  $('body').value = msg.body || '';
  $('icon').value = msg.icon || '📮';
  $('enabled').value = msg.enabled === false ? 'false' : 'true';
  $('publishedAt').value = msg.publishedAt || '';
  $('expiresAt').value = msg.expiresAt || '';
  $('minAppVersion').value = msg.minAppVersion || '';
  $('maxAppVersion').value = msg.maxAppVersion || '';
  $('actionView').value = msg.action?.view || '';
  $('actionLabel').value = msg.action?.label || '';
  toggleCompensationFields();
  $('material-rows').replaceChildren();
  $('item-rows').replaceChildren();
  if (msg.type === 'compensation' && msg.reward) {
    $('stardust').value = msg.reward.stardust ?? 0;
    $('adventureEnergy').value = msg.reward.adventureEnergy ?? 0;
    for (const [id, amt] of Object.entries(msg.reward.materials || {})) {
      $('material-rows').appendChild(createRewardRow('material', id, amt));
    }
    for (const [id, amt] of Object.entries(msg.reward.items || {})) {
      $('item-rows').appendChild(createRewardRow('item', id, amt));
    }
  }
}

function toggleCompensationFields() {
  $('compensation-fields').hidden = $('type').value !== 'compensation';
}

function renderMessageList() {
  const list = $('message-list');
  list.replaceChildren();
  for (const msg of state.document.messages || []) {
    const el = document.createElement('div');
    el.className = 'msg';
    const title = document.createElement('div');
    title.textContent = `${msg.enabled === false ? '[停用] ' : ''}${msg.title || '(無標題)'}`;
    const meta = document.createElement('small');
    meta.textContent = `${msg.id} · ${msg.type}${msg.type === 'compensation' ? ' · 補償' : ''}`;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = '編輯';
    edit.addEventListener('click', () => fillFormFromMessage(msg));
    const disable = document.createElement('button');
    disable.type = 'button';
    disable.textContent = msg.enabled === false ? '啟用' : '停用';
    disable.addEventListener('click', () => {
      msg.enabled = msg.enabled === false;
      renderMessageList();
      log(`已切換 ${msg.id} enabled=${msg.enabled}`);
    });
    actions.append(edit, disable);
    el.append(title, meta, actions);
    list.appendChild(el);
  }
}

function renderPreview(message) {
  const box = $('preview');
  box.replaceChildren();
  if (!message) {
    box.textContent = '尚無預覽';
    return;
  }
  const title = document.createElement('h3');
  title.textContent = message.title || '';
  const meta = document.createElement('div');
  meta.textContent = `${message.type} · ${message.publishedAt || ''}`;
  const body = document.createElement('p');
  body.className = 'preview-body';
  body.textContent = message.body || '';
  box.append(title, meta, body);
  if (message.type === 'compensation' && message.reward) {
    const rewardTitle = document.createElement('strong');
    rewardTitle.textContent = '獎勵預覽';
    const ul = document.createElement('ul');
    if (message.reward.stardust) {
      const li = document.createElement('li');
      li.textContent = `星塵 ×${message.reward.stardust}`;
      ul.appendChild(li);
    }
    if (message.reward.adventureEnergy) {
      const li = document.createElement('li');
      li.textContent = `冒險能量 ×${message.reward.adventureEnergy}`;
      ul.appendChild(li);
    }
    for (const [id, amt] of Object.entries(message.reward.materials || {})) {
      const mat = state.catalogs.materials.find((m) => m.id === id);
      const li = document.createElement('li');
      li.textContent = `${mat?.name || id} ×${amt}`;
      ul.appendChild(li);
    }
    for (const [id, amt] of Object.entries(message.reward.items || {})) {
      const item = state.catalogs.items.find((m) => m.id === id);
      const li = document.createElement('li');
      li.textContent = `${item?.name || id} ×${amt}`;
      ul.appendChild(li);
    }
    box.append(rewardTitle, ul);
  }
}

async function reloadMailbox() {
  state.document = await api('/api/mailbox');
  state.editMode = false;
  state.selectedId = null;
  renderMessageList();
  log(`已載入 ${state.document.messages?.length || 0} 封信件`);
}

async function refreshGit() {
  const git = await api('/api/git-status');
  const info = $('git-info');
  info.textContent = git.insideRepo
    ? `branch: ${git.branch || '?'} · remote: ${git.remote || '（無）'}`
    : '目前不是 Git Repository，仍可驗證／寫入／下載 JSON';
  $('git-diff').textContent = git.diff || git.status || '（無 diff）';
  return git;
}

function upsertMessage(message) {
  const exists = (state.document.messages || []).some((m) => m.id === message.id);
  if (exists && !state.editMode) {
    throw new Error(`ID 已存在：${message.id}。若要修改請先按「編輯」進入編輯模式。`);
  }
  if (!exists && state.editMode) {
    // 編輯時改了 ID：當作新增，並移除舊 selected
    state.document.messages = (state.document.messages || []).filter((m) => m.id !== state.selectedId);
  }
  if (exists && state.editMode) {
    state.document.messages = state.document.messages.map((m) => (m.id === message.id ? message : m));
  } else {
    state.document.messages = [...(state.document.messages || []), message];
  }
  state.editMode = true;
  state.selectedId = message.id;
  renderMessageList();
}

async function init() {
  state.meta = await api('/api/meta');
  state.catalogs = await api('/api/catalogs');

  const actionSelect = $('actionView');
  for (const view of state.meta.actionViews || []) {
    const opt = document.createElement('option');
    opt.value = view;
    opt.textContent = view;
    actionSelect.appendChild(opt);
  }

  $('publishedAt').value = nowLocalIso();
  $('type').addEventListener('change', toggleCompensationFields);
  $('btn-gen-id').addEventListener('click', () => { $('id').value = generateId(); });
  $('btn-add-material').addEventListener('click', () => {
    $('material-rows').appendChild(createRewardRow('material'));
  });
  $('btn-add-item').addEventListener('click', () => {
    $('item-rows').appendChild(createRewardRow('item'));
  });

  $('btn-preview').addEventListener('click', () => {
    try {
      const msg = buildMessageFromForm();
      renderPreview(msg);
      log('已更新預覽（未寫入）');
    } catch (err) {
      log(err.message, 'err');
    }
  });

  $('btn-validate-msg').addEventListener('click', async () => {
    try {
      const msg = buildMessageFromForm();
      const doc = {
        schemaVersion: 1,
        generatedAt: nowLocalIso(),
        messages: [msg],
      };
      const result = await api('/api/validate', { method: 'POST', body: JSON.stringify({ document: doc }) });
      log(result.ok ? '此信驗證通過' : '驗證失敗', result.ok ? 'ok' : 'err');
      if (result.warnings?.length) log(`警告：${result.warnings.join('; ')}`);
    } catch (err) {
      log(err.message, 'err');
      if (err.payload?.errors) log(err.payload.errors.join('\n'), 'err');
    }
  });

  $('btn-add-msg').addEventListener('click', () => {
    try {
      const msg = buildMessageFromForm();
      upsertMessage(msg);
      renderPreview(msg);
      log(`已加入／更新文件中的 ${msg.id}`);
    } catch (err) {
      log(err.message, 'err');
    }
  });

  $('btn-disable-selected').addEventListener('click', () => {
    if (!state.selectedId) {
      log('尚未選取信件', 'err');
      return;
    }
    const msg = state.document.messages.find((m) => m.id === state.selectedId);
    if (!msg) return;
    msg.enabled = false;
    renderMessageList();
    log(`已將 ${msg.id} 設為 enabled=false。停用後新裝置不會再顯示／領取；已領獎勵無法撤回。`);
  });

  $('btn-reload').addEventListener('click', () => reloadMailbox().catch((e) => log(e.message, 'err')));
  $('btn-validate-doc').addEventListener('click', async () => {
    try {
      const result = await api('/api/validate', {
        method: 'POST',
        body: JSON.stringify({ document: state.document }),
      });
      log(`整份文件驗證通過（${state.document.messages.length} 封）`, 'ok');
      if (result.warnings?.length) log(`警告：${result.warnings.join('; ')}`);
    } catch (err) {
      log(err.message, 'err');
      if (err.payload?.errors) log(err.payload.errors.join('\n'), 'err');
    }
  });

  $('btn-write').addEventListener('click', async () => {
    try {
      const ids = (state.document.messages || []).map((m) => m.id).join(', ');
      if (!confirm(`即將寫入本機 ${state.meta.mailboxPath}\n信件：${ids || '(無)'}\n確定？`)) return;
      const result = await api('/api/write', {
        method: 'POST',
        body: JSON.stringify({ document: state.document, confirm: true }),
      });
      log(`已寫入 ${result.path}（generatedAt=${result.generatedAt}）`, 'ok');
      await reloadMailbox();
      await refreshGit();
    } catch (err) {
      log(err.message, 'err');
      if (err.payload?.errors) log(err.payload.errors.join('\n'), 'err');
    }
  });

  $('btn-download').addEventListener('click', () => {
    const blob = new Blob([`${JSON.stringify(state.document, null, 2)}\n`], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'global-mailbox.json';
    a.click();
    URL.revokeObjectURL(a.href);
    log('已下載 JSON');
  });

  $('btn-git-refresh').addEventListener('click', () => refreshGit().catch((e) => log(e.message, 'err')));
  $('btn-git-publish').addEventListener('click', async () => {
    try {
      const comps = (state.document.messages || []).filter((m) => m.type === 'compensation' && m.enabled !== false);
      const hasCompensation = comps.length > 0;
      const summary = comps.map((m) => {
        const r = m.reward || {};
        return `${m.id}: 星塵 ${r.stardust || 0} / 能量 ${r.adventureEnergy || 0}`;
      }).join('\n');

      if (hasCompensation) {
        const ok = confirm(
          `這封補償將發送給所有符合條件的 QuestNote 裝置。\n目前架構為每份本機資料可領取一次。\n\n${summary || '(見文件)'}\n\n確定後仍需輸入 PUBLISH。`,
        );
        if (!ok) return;
        if ($('publish-confirm').value.trim() !== 'PUBLISH') {
          log('補償發布需在確認欄輸入 PUBLISH', 'err');
          return;
        }
      } else if (!confirm('即將只 Commit／Push data/global-mailbox.json，確定？')) {
        return;
      }

      const result = await api('/api/git-publish', {
        method: 'POST',
        body: JSON.stringify({
          confirm: true,
          hasCompensation,
          publishConfirmText: $('publish-confirm').value.trim(),
          messageIds: (state.document.messages || []).map((m) => m.id),
        }),
      });
      log(`已發布：${result.message}`, 'ok');
      $('publish-confirm').value = '';
      await refreshGit();
    } catch (err) {
      log(err.message, 'err');
      if (err.payload?.hint) log(err.payload.hint, 'err');
      if (err.payload?.commitKept) log('本機 Commit 已保留，請手動 git push', 'err');
    }
  });

  toggleCompensationFields();
  await reloadMailbox();
  await refreshGit();
  log('Mailbox Publisher 就緒');
}

init().catch((err) => log(err.message || String(err), 'err'));
