/**
 * Pet Series Builder 前端
 * 不寫入正式 data／assets；僅透過本機 API 操作工作區與發布服務。
 */

const DIALOGUE_SPEC = {
  normal: 5,
  urgent: 5,
  important: 5,
  praise: 5,
  idle: 3,
  bondUp: 2,
};

const state = {
  meta: null,
  seriesId: null,
  seriesMeta: null,
  pets: [],
  lore: [],
  prompts: {},
  selectedPetId: null,
  knownPoolTags: [],
  previewTheme: 'default',
  imageObjectUrl: null,
  lastValidation: null,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: options.body && !(options.body instanceof ArrayBuffer) && !(options.body instanceof Uint8Array)
      ? { 'Content-Type': 'application/json', ...(options.headers || {}) }
      : options.headers,
    ...options,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(data?.error || data?.errors?.[0]?.message || `HTTP ${res.status}`);
    err.data = data;
    throw err;
  }
  return data;
}

function emptyLore(id) {
  return {
    id,
    title: '',
    personality: ['', '', ''],
    element: '',
    lore: '',
    dialogues: {
      normal: Array(5).fill(''),
      urgent: Array(5).fill(''),
      important: Array(5).fill(''),
      praise: Array(5).fill(''),
      idle: Array(3).fill(''),
      bondUp: Array(2).fill(''),
      summon: '',
    },
    bondUnlocks: { 2: '', 3: '', 4: '', 5: '' },
  };
}

function emptyPet(seriesId) {
  return {
    id: '',
    name: '',
    rarity: 'N',
    image: '',
    description: '',
    poolTags: ['standard'],
    seriesId,
    speciesType: '',
    element: '',
    visualTheme: '',
    _idType: 'standard',
  };
}

function getSelectedPet() {
  return state.pets.find((p) => p.id === state.selectedPetId) || null;
}

function getSelectedLore() {
  const pet = getSelectedPet();
  if (!pet) return null;
  let lore = state.lore.find((l) => l.id === pet.id);
  if (!lore) {
    lore = emptyLore(pet.id);
    state.lore.push(lore);
  }
  return lore;
}

function ensureDialogueFields() {
  const root = $('#dialogue-fields');
  root.innerHTML = '';
  for (const [key, count] of Object.entries(DIALOGUE_SPEC)) {
    const group = document.createElement('div');
    group.className = 'dialogue-group';
    group.dataset.key = key;
    group.innerHTML = `<h4>${key}（標準 ${count}）</h4>`;
    const list = document.createElement('div');
    list.className = 'dialogue-list';
    group.appendChild(list);
    const actions = document.createElement('div');
    actions.className = 'inline-row';
    actions.innerHTML = `
      <button type="button" class="btn btn--sm" data-add-line="${key}">新增一行</button>
      <button type="button" class="btn btn--sm" data-trim-line="${key}">移除末行</button>
    `;
    group.appendChild(actions);
    root.appendChild(group);
  }
  root.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add-line]');
    const trim = e.target.closest('[data-trim-line]');
    const lore = getSelectedLore();
    if (!lore) return;
    if (add) {
      const key = add.dataset.addLine;
      lore.dialogues[key] = [...(lore.dialogues[key] || []), ''];
      renderDialogueInputs();
      updateDialogueStatus();
    }
    if (trim) {
      const key = trim.dataset.trimLine;
      const arr = [...(lore.dialogues[key] || [])];
      if (arr.length > 1) {
        arr.pop();
        lore.dialogues[key] = arr;
        renderDialogueInputs();
        updateDialogueStatus();
      }
    }
  });
}

function renderDialogueInputs() {
  const lore = getSelectedLore();
  if (!lore) return;
  for (const [key, minCount] of Object.entries(DIALOGUE_SPEC)) {
    const group = $(`.dialogue-group[data-key="${key}"] .dialogue-list`);
    if (!group) continue;
    let lines = Array.isArray(lore.dialogues[key]) ? [...lore.dialogues[key]] : [];
    while (lines.length < minCount) lines.push('');
    lore.dialogues[key] = lines;
    group.innerHTML = lines.map((line, i) => `
      <div class="row">
        <input data-dialogue="${key}" data-index="${i}" value="${escapeAttr(line)}" />
      </div>
    `).join('');
  }
}

function updateDialogueStatus() {
  const lore = getSelectedLore();
  const el = $('#dialogue-status');
  if (!lore) { el.innerHTML = ''; return; }
  const rows = [];
  for (const [key, need] of Object.entries(DIALOGUE_SPEC)) {
    const filled = (lore.dialogues[key] || []).filter((s) => String(s || '').trim()).length;
    const cls = filled >= need ? 'ok' : 'bad';
    const label = ({
      normal: '一般對話',
      urgent: '緊急對話',
      important: '重要對話',
      praise: '稱讚對話',
      idle: '待機對話',
      bondUp: '羈絆提升',
    })[key] || key;
    rows.push(`<div class="${cls}">${label} ${filled} / ${need}</div>`);
  }
  const bonds = [2, 3, 4, 5].filter((lv) => String(lore.bondUnlocks?.[lv] || '').trim()).length;
  rows.push(`<div class="${bonds >= 4 ? 'ok' : 'bad'}">羈絆內容 ${bonds} / 4</div>`);
  const summonOk = String(lore.dialogues?.summon || '').trim() ? 'ok' : 'bad';
  rows.push(`<div class="${summonOk}">召喚台詞 ${summonOk === 'ok' ? 1 : 0} / 1</div>`);
  el.innerHTML = rows.join('');
}

function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderRarityPlan() {
  const root = $('#rarity-plan');
  root.innerHTML = ['N', 'R', 'SR', 'SSR', 'UR'].map((r) => `
    <label>${r}
      <input type="number" min="0" data-plan="${r}" value="${state.seriesMeta?.rarityPlan?.[r] ?? 0}" />
    </label>
  `).join('');
}

function renderPetList() {
  const list = $('#pet-list');
  list.innerHTML = state.pets.map((p) => `
    <li data-id="${escapeAttr(p.id)}" class="${p.id === state.selectedPetId ? 'is-active' : ''}">
      <span>${escapeHtml(p.name || '（未命名）')}</span>
      <span class="rarity">${escapeHtml(p.rarity)} · ${escapeHtml(p.id || '—')}</span>
    </li>
  `).join('') || '<li class="muted">尚無寵物</li>';
}

function renderPoolTags() {
  const pet = getSelectedPet();
  const root = $('#pool-tags');
  const selected = new Set(pet?.poolTags || []);
  const tags = [...new Set([...state.knownPoolTags, ...selected])];
  root.innerHTML = tags.map((tag) => `
    <button type="button" class="chip ${selected.has(tag) ? 'is-on' : ''}" data-tag="${escapeAttr(tag)}">${escapeHtml(tag)}</button>
  `).join('');
}

function syncFormFromPet() {
  const pet = getSelectedPet();
  const lore = getSelectedLore();
  if (!pet || !lore) return;

  $('#pet-id-type').value = pet._idType || (String(pet.id).startsWith('pet_sp') ? 'special_sp' : 'standard');
  $('#pet-rarity').value = pet.rarity || 'N';
  $('#pet-id').value = pet.id || '';
  $('#pet-name').value = pet.name || '';
  $('#pet-desc').value = pet.description || '';
  $('#pet-element').value = pet.element || '';
  $('#pet-species').value = pet.speciesType || '';
  $('#pet-visual').value = pet.visualTheme || '';
  $('#pet-series-id').value = state.seriesId || '';

  $('#lore-title').value = lore.title || '';
  $('#lore-personality').value = (lore.personality || []).join('、');
  $('#lore-element').value = lore.element || '';
  $('#lore-text').value = lore.lore || '';
  $('#lore-summon').value = lore.dialogues?.summon || '';
  $('#bond-2').value = lore.bondUnlocks?.['2'] || lore.bondUnlocks?.[2] || '';
  $('#bond-3').value = lore.bondUnlocks?.['3'] || lore.bondUnlocks?.[3] || '';
  $('#bond-4').value = lore.bondUnlocks?.['4'] || lore.bondUnlocks?.[4] || '';
  $('#bond-5').value = lore.bondUnlocks?.['5'] || lore.bondUnlocks?.[5] || '';

  const prompt = state.prompts[pet.id] || {};
  $('#prompt-text').value = prompt.prompt || '';
  $('#prompt-neg').value = prompt.negativePrompt || '';
  $('#prompt-notes').value = prompt.notes || '';

  renderDialogueInputs();
  updateDialogueStatus();
  renderPoolTags();
  updateImagePreview();
  updateCardPreview();
}

function collectFormIntoState() {
  if (!state.seriesMeta) return;
  state.seriesMeta.seriesName = $('#series-name').value.trim();
  state.seriesMeta.description = $('#series-desc').value.trim();
  state.seriesMeta.themeKeywords = $('#series-keywords').value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  state.seriesMeta.releaseVersion = $('#series-release').value.trim();
  state.seriesMeta.rarityPlan = {};
  $$('#rarity-plan [data-plan]').forEach((input) => {
    state.seriesMeta.rarityPlan[input.dataset.plan] = Number(input.value) || 0;
  });

  const pet = getSelectedPet();
  const lore = getSelectedLore();
  if (!pet || !lore) return;

  pet._idType = $('#pet-id-type').value;
  pet.rarity = $('#pet-rarity').value;
  pet.id = $('#pet-id').value.trim();
  pet.name = $('#pet-name').value.trim();
  pet.description = $('#pet-desc').value.trim();
  pet.element = $('#pet-element').value.trim();
  pet.speciesType = $('#pet-species').value.trim();
  pet.visualTheme = $('#pet-visual').value.trim();
  pet.seriesId = state.seriesId;
  pet.image = pet.id ? `assets/pets/${pet.id}.png` : '';

  lore.id = pet.id;
  lore.title = $('#lore-title').value.trim();
  lore.personality = $('#lore-personality').value.split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
  lore.element = $('#lore-element').value.trim();
  lore.lore = $('#lore-text').value.trim();
  lore.dialogues.summon = $('#lore-summon').value.trim();
  lore.bondUnlocks = {
    2: $('#bond-2').value.trim(),
    3: $('#bond-3').value.trim(),
    4: $('#bond-4').value.trim(),
    5: $('#bond-5').value.trim(),
  };

  $$('[data-dialogue]').forEach((input) => {
    const key = input.dataset.dialogue;
    const idx = Number(input.dataset.index);
    if (!Array.isArray(lore.dialogues[key])) lore.dialogues[key] = [];
    lore.dialogues[key][idx] = input.value;
  });

  state.prompts[pet.id] = {
    prompt: $('#prompt-text').value.trim(),
    negativePrompt: $('#prompt-neg').value.trim(),
    notes: $('#prompt-notes').value.trim(),
  };
}

function buildPayload() {
  collectFormIntoState();
  const pets = state.pets.map(({ _idType, ...rest }) => ({
    ...rest,
    image: `assets/pets/${rest.id}.png`,
    seriesId: state.seriesId,
  }));
  const lore = state.lore.map((entry) => ({
    ...entry,
    bondUnlocks: {
      2: entry.bondUnlocks?.['2'] ?? entry.bondUnlocks?.[2] ?? '',
      3: entry.bondUnlocks?.['3'] ?? entry.bondUnlocks?.[3] ?? '',
      4: entry.bondUnlocks?.['4'] ?? entry.bondUnlocks?.[4] ?? '',
      5: entry.bondUnlocks?.['5'] ?? entry.bondUnlocks?.[5] ?? '',
    },
  }));
  return {
    seriesId: state.seriesId,
    seriesMeta: state.seriesMeta,
    petsData: { pets },
    loreData: {
      version: 1,
      description: `${state.seriesMeta.seriesName} 寵物個性化內容`,
      lore,
    },
    promptsData: { schemaVersion: 1, prompts: state.prompts },
  };
}

async function saveWorkspace() {
  if (!state.seriesId) throw new Error('尚未載入工作區');
  const payload = buildPayload();
  await api('/api/workspace/save', { method: 'POST', body: JSON.stringify(payload) });
  return payload;
}

function showSeriesUI(show) {
  $('#series-editor').hidden = !show;
  $('#pet-list-block').hidden = !show;
  $('#editor-panel').hidden = !show;
}

async function refreshWorkspaceList() {
  const data = await api('/api/workspaces');
  const sel = $('#workspace-select');
  const current = state.seriesId || '';
  sel.innerHTML = '<option value="">— 選擇 —</option>'
    + data.workspaces.map((id) => `<option value="${escapeAttr(id)}">${escapeHtml(id)}</option>`).join('');
  sel.value = current;
}

async function loadWorkspace(seriesId) {
  const data = await api(`/api/workspace/${encodeURIComponent(seriesId)}`);
  state.seriesId = seriesId;
  state.seriesMeta = data.seriesMeta;
  state.pets = (data.petsData.pets || []).map((p) => ({
    ...p,
    _idType: String(p.id).startsWith('pet_sp') ? 'special_sp' : 'standard',
  }));
  state.lore = data.loreData.lore || [];
  state.prompts = data.promptsData?.prompts || {};
  state.selectedPetId = state.pets[0]?.id || null;

  $('#series-id').value = state.seriesMeta.seriesId;
  $('#series-name').value = state.seriesMeta.seriesName || '';
  $('#series-desc').value = state.seriesMeta.description || '';
  $('#series-keywords').value = (state.seriesMeta.themeKeywords || []).join('、');
  $('#series-release').value = state.seriesMeta.releaseVersion || '';
  renderRarityPlan();
  renderPetList();
  showSeriesUI(true);
  if (state.selectedPetId) syncFormFromPet();
  await refreshPoolPreview();
  await refreshWorkspaceList();
}

async function allocateId() {
  collectFormIntoState();
  const pet = getSelectedPet();
  if (!pet) return;
  const data = await api('/api/workspace/allocate-id', {
    method: 'POST',
    body: JSON.stringify({
      seriesId: state.seriesId,
      idType: $('#pet-id-type').value,
      rarity: $('#pet-rarity').value,
    }),
  });
  // 若舊 id 存在於 lore/prompts，遷移
  const oldId = pet.id;
  pet.id = data.id;
  pet.image = `assets/pets/${data.id}.png`;
  pet._idType = $('#pet-id-type').value;
  const lore = state.lore.find((l) => l.id === oldId) || getSelectedLore();
  lore.id = data.id;
  if (oldId && state.prompts[oldId] && oldId !== data.id) {
    state.prompts[data.id] = state.prompts[oldId];
    delete state.prompts[oldId];
  }
  state.selectedPetId = data.id;
  $('#pet-id').value = data.id;
  renderPetList();
  updateCardPreview();
}

async function refreshPoolPreview() {
  const payload = state.seriesId ? buildPayload() : { petsData: { pets: [] } };
  const data = await api('/api/pool-preview', {
    method: 'POST',
    body: JSON.stringify({ pets: payload.petsData.pets }),
  });
  const lines = data.preview.map((pool) => {
    const br = pool.before.byRarity;
    const ar = pool.after.byRarity;
    return [
      `${pool.name} (${pool.id})${pool.active ? ' [active]' : ''}`,
      `  新增前：N ${br.N} R ${br.R} SR ${br.SR} SSR ${br.SSR} UR ${br.UR} 總計 ${pool.before.total}`,
      `  新增後：N ${ar.N} R ${ar.R} SR ${ar.SR} SSR ${ar.SSR} UR ${ar.UR} 總計 ${pool.after.total}`,
      pool.addedIds?.length ? `  新進：${pool.addedIds.join(', ')}` : '  新進：（無）',
    ].join('\n');
  });
  $('#pool-preview').textContent = `正式寵物 ${data.beforeCount} → 合併後 ${data.afterCount}\n\n${lines.join('\n\n')}`;
}

function renderValidation(result) {
  state.lastValidation = result;
  const lines = [];
  if (result.stats) {
    lines.push(`寵物 ${result.stats.beforePetCount} → ${result.stats.afterPetCount}`);
  }
  lines.push(`Errors: ${result.errors?.length || 0}`);
  for (const e of result.errors || []) lines.push(`  ✗ [${e.code}] ${e.message}`);
  lines.push(`Warnings: ${result.warnings?.length || 0}`);
  for (const w of result.warnings || []) lines.push(`  ! [${w.code}] ${w.message}`);
  lines.push(result.ok ? 'Result: PASS' : 'Result: FAIL');
  $('#validation-out').innerHTML = lines.map((line) => {
    if (line.startsWith('  ✗')) return `<div class="err">${escapeHtml(line)}</div>`;
    if (line.startsWith('  !')) return `<div class="warn">${escapeHtml(line)}</div>`;
    if (line.includes('PASS')) return `<div class="ok">${escapeHtml(line)}</div>`;
    return `<div>${escapeHtml(line)}</div>`;
  }).join('');
  if (result.poolPreview) {
    // sync from server validation too
  }
}

async function updateImagePreview() {
  const pet = getSelectedPet();
  const img = $('#preview-image');
  const empty = $('#preview-image-empty');
  if (state.imageObjectUrl) {
    img.src = state.imageObjectUrl;
    img.hidden = false;
    empty.hidden = true;
    return;
  }
  if (pet?.id) {
    img.src = `/api/workspace-image/${encodeURIComponent(state.seriesId)}/${encodeURIComponent(pet.id)}.png?t=${Date.now()}`;
    img.onload = () => { img.hidden = false; empty.hidden = true; };
    img.onerror = () => { img.hidden = true; empty.hidden = false; };
    return;
  }
  img.hidden = true;
  empty.hidden = false;
}

function updateCardPreview() {
  const pet = getSelectedPet();
  const lore = getSelectedLore();
  const frame = $('#preview-frame');
  if (!pet) {
    frame.srcdoc = '';
    return;
  }
  const imgSrc = state.imageObjectUrl
    || (pet.id ? `/api/workspace-image/${encodeURIComponent(state.seriesId)}/${encodeURIComponent(pet.id)}.png` : '');
  const title = lore?.title || '';
  const tags = (lore?.personality || []).filter(Boolean).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const html = `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="UTF-8" />
<link rel="stylesheet" href="/api/app-styles.css" />
<style>
  body { margin: 0; padding: 12px; background: var(--bg, #0f121a); }
  .preview-stack { display: grid; gap: 12px; }
  .collection-card { max-width: 180px; }
  .collection-card__image img { width: 100%; display: block; }
  .pet-detail { max-width: 320px; }
  .pet-detail__hero img { width: 120px; height: 120px; object-fit: contain; }
</style>
</head>
<body data-theme="${escapeAttr(state.previewTheme)}">
  <div class="preview-stack">
    <article class="collection-card rarity-${escapeAttr(pet.rarity || 'N')}">
      <div class="collection-card__image">${imgSrc ? `<img src="${escapeAttr(imgSrc)}" alt="" />` : ''}</div>
      <div class="collection-card__info">
        <h3 class="collection-card__name">${escapeHtml(pet.name || '未命名')}</h3>
        ${title ? `<p class="collection-card__title">${escapeHtml(title)}</p>` : ''}
      </div>
    </article>
    <section class="pet-detail rarity-${escapeAttr(pet.rarity || 'N')}">
      <div class="pet-detail__hero">${imgSrc ? `<img src="${escapeAttr(imgSrc)}" alt="" />` : ''}</div>
      <h2 class="pet-detail__name">${escapeHtml(pet.name || '未命名')}</h2>
      ${title ? `<p class="pet-detail__title">${escapeHtml(title)}</p>` : ''}
      <div class="pet-detail__badges"><span class="rarity-${escapeAttr(pet.rarity || 'N')}">${escapeHtml(pet.rarity || '')}</span></div>
      <div class="pet-detail__tags">${tags}</div>
      <p class="pet-detail__desc">${escapeHtml(pet.description || '')}</p>
      <p class="pet-detail__lore">${escapeHtml(lore?.lore || '')}</p>
    </section>
  </div>
</body></html>`;
  frame.srcdoc = html;
}

async function validateImageFile(file) {
  const out = $('#image-checks');
  const notes = [];
  if (!file) { out.innerHTML = ''; return false; }
  if (file.type && file.type !== 'image/png') {
    notes.push('<div class="err">MIME type 不是 image/png</div>');
  }
  if (!/\.png$/i.test(file.name)) {
    notes.push('<div class="err">副檔名必須為 .png</div>');
  }
  if (file.size > 5 * 1024 * 1024) {
    notes.push('<div class="err">超過 5 MB</div>');
  } else if (file.size > 2 * 1024 * 1024) {
    notes.push('<div class="warn">容量 2～5 MB（warning）</div>');
  } else {
    notes.push('<div class="ok">容量通過</div>');
  }

  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const isPng = sig.every((b, i) => bytes[i] === b);
  if (!isPng) notes.push('<div class="err">PNG 簽名不符（可能是 JPG 改名）</div>');
  else notes.push('<div class="ok">PNG 簽名通過</div>');

  const bitmapUrl = URL.createObjectURL(file);
  const dims = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = bitmapUrl;
  });
  URL.revokeObjectURL(bitmapUrl);

  let ok = isPng && file.size <= 5 * 1024 * 1024;
  if (!dims) {
    notes.push('<div class="err">無法讀取圖片尺寸</div>');
    ok = false;
  } else {
    if (dims.w !== dims.h) {
      notes.push(`<div class="err">非 1:1（${dims.w}×${dims.h}）</div>`);
      ok = false;
    } else if (dims.w < 512) {
      notes.push(`<div class="err">尺寸低於 512（${dims.w}×${dims.h}）</div>`);
      ok = false;
    } else if (dims.w === 1024) {
      notes.push('<div class="ok">尺寸 1024×1024（最佳）</div>');
    } else if (dims.w > 2048) {
      notes.push(`<div class="warn">尺寸高於建議（${dims.w}×${dims.h}）</div>`);
    } else {
      notes.push(`<div class="ok">尺寸可接受（${dims.w}×${dims.h}）</div>`);
    }

    // alpha probe
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(dims.w, 64);
      canvas.height = Math.min(dims.h, 64);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const img = await createImageBitmap(file);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let hasAlpha = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 250) { hasAlpha = true; break; }
      }
      notes.push(hasAlpha
        ? '<div class="ok">偵測到透明度</div>'
        : '<div class="warn">未偵測到明顯透明像素（若為實底可忽略）</div>');
    } catch {
      notes.push('<div class="warn">無法判斷透明度</div>');
    }
  }

  out.innerHTML = notes.join('');
  return ok;
}

function bindEvents() {
  $('#btn-create').addEventListener('click', async () => {
    const seriesId = $('#new-series-id').value.trim();
    const seriesName = $('#new-series-name').value.trim();
    try {
      await api('/api/workspace/create', {
        method: 'POST',
        body: JSON.stringify({ seriesMeta: { seriesId, seriesName } }),
      });
      await loadWorkspace(seriesId);
    } catch (err) {
      alert(err.message);
    }
  });

  $('#btn-load').addEventListener('click', async () => {
    const id = $('#workspace-select').value;
    if (!id) return;
    try { await loadWorkspace(id); } catch (err) { alert(err.message); }
  });

  $('#btn-save').addEventListener('click', async () => {
    try {
      await saveWorkspace();
      alert('已保存工作區');
      await refreshPoolPreview();
    } catch (err) { alert(err.message); }
  });

  $('#btn-add-pet').addEventListener('click', async () => {
    collectFormIntoState();
    const pet = emptyPet(state.seriesId);
    state.pets.push(pet);
    const lore = emptyLore('');
    state.lore.push(lore);
    state.selectedPetId = '';
    // temporary select last
    const idx = state.pets.length - 1;
    renderPetList();
    // allocate id immediately
    state.selectedPetId = state.pets[idx].id;
    // hack: select by index via temporary id
    state.pets[idx].id = `__new_${idx}`;
    state.selectedPetId = state.pets[idx].id;
    lore.id = state.pets[idx].id;
    renderPetList();
    syncFormFromPet();
    try {
      await allocateId();
      await saveWorkspace();
    } catch (err) {
      alert(err.message);
    }
  });

  $('#pet-list').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    collectFormIntoState();
    state.selectedPetId = li.dataset.id;
    state.imageObjectUrl = null;
    renderPetList();
    syncFormFromPet();
  });

  $('#btn-alloc-id').addEventListener('click', () => allocateId().catch((e) => alert(e.message)));

  $('#btn-del-pet').addEventListener('click', async () => {
    const pet = getSelectedPet();
    if (!pet?.id) return;
    if (!confirm(`刪除工作區寵物 ${pet.id}？（不會影響正式資料）`)) return;
    try {
      await saveWorkspace();
      await api('/api/workspace/delete-pet', {
        method: 'POST',
        body: JSON.stringify({ seriesId: state.seriesId, petId: pet.id }),
      });
      await loadWorkspace(state.seriesId);
    } catch (err) { alert(err.message); }
  });

  $('#btn-dup-pet').addEventListener('click', async () => {
    collectFormIntoState();
    const pet = getSelectedPet();
    const lore = getSelectedLore();
    if (!pet) return;
    const clone = {
      ...structuredClone(pet),
      id: '',
      name: `${pet.name || '未命名'}（副本）`,
      _idType: pet._idType || 'standard',
    };
    const loreClone = structuredClone(lore);
    loreClone.id = '';
    state.pets.push(clone);
    state.lore.push(loreClone);
    state.selectedPetId = '';
    // use temp then allocate
    clone.id = `__dup_${Date.now()}`;
    loreClone.id = clone.id;
    state.selectedPetId = clone.id;
    renderPetList();
    syncFormFromPet();
    try {
      await allocateId();
      await saveWorkspace();
    } catch (err) { alert(err.message); }
  });

  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((t) => t.classList.remove('is-active'));
      $$('.tab-panel').forEach((p) => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      $(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.add('is-active');
    });
  });

  $('#pool-tags').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-tag]');
    const pet = getSelectedPet();
    if (!chip || !pet) return;
    const tag = chip.dataset.tag;
    const set = new Set(pet.poolTags || []);
    if (set.has(tag)) set.delete(tag);
    else set.add(tag);
    pet.poolTags = [...set];
    renderPoolTags();
  });

  $('#btn-add-tag').addEventListener('click', () => {
    const pet = getSelectedPet();
    const tag = $('#pool-tag-custom').value.trim();
    if (!pet || !tag) return;
    if (!confirm(`「${tag}」可能沒有任何 Pool 使用。確定加入？`)) return;
    pet.poolTags = [...new Set([...(pet.poolTags || []), tag])];
    $('#pool-tag-custom').value = '';
    renderPoolTags();
  });

  ['#pet-name', '#pet-desc', '#lore-title', '#lore-text', '#lore-personality', '#lore-element', '#lore-summon']
    .forEach((sel) => {
      $(sel).addEventListener('input', () => {
        collectFormIntoState();
        updateDialogueStatus();
        updateCardPreview();
        renderPetList();
      });
    });

  $('#dialogue-fields').addEventListener('input', () => {
    collectFormIntoState();
    updateDialogueStatus();
  });

  $$('.preview-theme .btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.preview-theme .btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.previewTheme = btn.dataset.theme;
      updateCardPreview();
    });
  });

  $('#image-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    const pet = getSelectedPet();
    if (!file || !pet?.id) return;
    const ok = await validateImageFile(file);
    if (!ok) {
      alert('圖片驗證未通過，請修正後再上傳');
      return;
    }
    if (file.name.toLowerCase() !== `${pet.id}.png`.toLowerCase()) {
      if (!confirm(`檔名為 ${file.name}，將以 ${pet.id}.png 儲存。繼續？`)) return;
    }
    if (state.imageObjectUrl) URL.revokeObjectURL(state.imageObjectUrl);
    state.imageObjectUrl = URL.createObjectURL(file);
    updateImagePreview();
    updateCardPreview();
    try {
      const buf = await file.arrayBuffer();
      await api(`/api/workspace/upload-image?seriesId=${encodeURIComponent(state.seriesId)}&petId=${encodeURIComponent(pet.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buf,
      });
    } catch (err) {
      alert(err.message);
    }
  });

  $('#btn-validate').addEventListener('click', async () => {
    try {
      const payload = await saveWorkspace();
      const result = await api('/api/validate', {
        method: 'POST',
        body: JSON.stringify({ ...payload, saveBefore: false }),
      }).catch(async (err) => err.data || Promise.reject(err));
      renderValidation(result);
      if (result.poolPreview) {
        // reuse formatter
        await refreshPoolPreview();
      }
    } catch (err) {
      if (err.data) renderValidation(err.data);
      else alert(err.message);
    }
  });

  $('#btn-dry-run').addEventListener('click', async () => {
    try {
      const payload = await saveWorkspace();
      const result = await api('/api/dry-run', {
        method: 'POST',
        body: JSON.stringify({ ...payload, saveBefore: false }),
      });
      renderValidation({
        ok: result.ok,
        errors: result.errors || [],
        warnings: result.warnings || [],
        stats: result.stats,
      });
      const extra = [
        '— Dry Run —',
        ...(result.filesWouldChange || []).map((f) => `將修改: ${f}`),
        result.reportMarkdown ? '報告已產生於回應（未寫入磁碟）' : '',
      ].filter(Boolean);
      $('#validation-out').innerHTML += extra.map((l) => `<div>${escapeHtml(l)}</div>`).join('');
      await refreshPoolPreview();
    } catch (err) {
      if (err.data) renderValidation(err.data);
      else alert(err.message);
    }
  });

  $('#btn-publish').addEventListener('click', async () => {
    if (!state.seriesId) return;
    $('#confirm-series-id').value = '';
    $('#ack-warnings').checked = false;
    $('#publish-dialog').showModal();
  });

  $('#publish-dialog').addEventListener('close', async () => {
    if ($('#publish-dialog').returnValue !== 'ok') return;
    try {
      const payload = await saveWorkspace();
      const result = await api('/api/publish', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          saveBefore: false,
          confirmSeriesId: $('#confirm-series-id').value.trim(),
          acknowledgeWarnings: $('#ack-warnings').checked,
        }),
      });
      renderValidation({
        ok: result.ok,
        errors: result.errors || [],
        warnings: result.warnings || [],
        stats: result.stats,
      });
      alert(result.ok
        ? `發布成功\n報告：${result.report?.reportRelPath}\n備份：${result.backupDir}`
        : `發布失敗：${result.error || result.errors?.[0]?.message || ''}`);
    } catch (err) {
      if (err.data) {
        renderValidation(err.data);
        alert(err.data.error || err.data.errors?.[0]?.message || err.message);
      } else alert(err.message);
    }
  });
}

async function boot() {
  ensureDialogueFields();
  bindEvents();
  state.meta = await api('/api/meta');
  state.knownPoolTags = state.meta.poolTags || [];
  await refreshWorkspaceList();
  $('#validation-out').textContent = `正式寵物 ${state.meta.officialPetCount} 隻\n下一個 ID：N ${state.meta.nextIds.N} / R ${state.meta.nextIds.R} / SR ${state.meta.nextIds.SR} / SSR ${state.meta.nextIds.SSR} / UR ${state.meta.nextIds.UR} / SP ${state.meta.nextIds.SP}`;
  await refreshPoolPreview();
}

boot().catch((err) => {
  console.error(err);
  alert(`啟動失敗：${err.message}`);
});
