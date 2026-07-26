/**
 * 寵物系列發布服務 — Builder 與 CLI 共用
 * 僅允許修改白名單檔案；支援 Dry Run、備份、原子寫入與回滾。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  validatePetPackage,
  validateSeriesCatalog,
  validatePetCatalog,
  validateLoreCatalog,
  validatePetAndLoreConsistency,
  buildPoolPreview,
  countByRarity,
  collectPoolTagsFromPools,
  isValidSeriesId,
  createIssue,
  emptyResult,
} from '../src/petDataSchema.js';
import { getEligiblePetsForPool, matchesPetPoolFilter } from '../src/petPoolFilter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, '..');

export const CONTENT_ROOT = path.join(PROJECT_ROOT, 'content', 'pet-series');
export const OFFICIAL_PETS_PATH = path.join(PROJECT_ROOT, 'data', 'pets.json');
export const OFFICIAL_LORE_PATH = path.join(PROJECT_ROOT, 'data', 'pets-lore.json');
export const OFFICIAL_SERIES_PATH = path.join(PROJECT_ROOT, 'data', 'pet-series.json');
export const OFFICIAL_POOLS_PATH = path.join(PROJECT_ROOT, 'data', 'pools.json');
export const ASSETS_PETS_DIR = path.join(PROJECT_ROOT, 'assets', 'pets');
export const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports');
export const BACKUPS_DIR = path.join(PROJECT_ROOT, '.dev-backups', 'pet-series');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export { getEligiblePetsForPool, matchesPetPoolFilter };

export function assertSafeSeriesId(seriesId) {
  if (!isValidSeriesId(seriesId)) {
    throw new Error(`非法 seriesId: ${seriesId}`);
  }
  if (seriesId === '_template' || seriesId.includes('..')) {
    throw new Error(`禁止使用的 seriesId: ${seriesId}`);
  }
  return seriesId;
}

/** 解析工作區路徑，禁止跳脫 content/pet-series */
export function resolveWorkspaceDir(seriesId) {
  const id = assertSafeSeriesId(seriesId);
  const resolved = path.resolve(CONTENT_ROOT, id);
  const rootResolved = path.resolve(CONTENT_ROOT);
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + path.sep)) {
    throw new Error('路徑跳脫被拒絕');
  }
  return resolved;
}

export function resolveWorkspaceImagePath(seriesId, fileName) {
  const base = resolveWorkspaceDir(seriesId);
  const safeName = path.basename(String(fileName || ''));
  if (!safeName || safeName !== fileName || safeName.includes('..') || path.isAbsolute(fileName)) {
    throw new Error('非法圖片檔名');
  }
  if (!/^[a-z0-9_]+\.png$/i.test(safeName)) {
    throw new Error('圖片檔名必須為 <petId>.png');
  }
  const resolved = path.resolve(base, 'images', safeName);
  const imagesRoot = path.resolve(base, 'images');
  if (!resolved.startsWith(imagesRoot + path.sep) && resolved !== imagesRoot) {
    throw new Error('圖片路徑跳脫被拒絕');
  }
  return resolved;
}

export async function readJson(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text);
}

export async function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const text = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(tmp, text, 'utf8');
  await fs.rename(tmp, filePath);
}

export async function loadOfficialData() {
  const [petsData, loreData, seriesCatalog, poolsData] = await Promise.all([
    readJson(OFFICIAL_PETS_PATH),
    readJson(OFFICIAL_LORE_PATH),
    readJson(OFFICIAL_SERIES_PATH),
    readJson(OFFICIAL_POOLS_PATH),
  ]);
  return { petsData, loreData, seriesCatalog, poolsData };
}

export async function loadWorkspace(seriesId) {
  const dir = resolveWorkspaceDir(seriesId);
  const seriesPath = path.join(dir, 'series.json');
  const petsPath = path.join(dir, 'pets.json');
  const lorePath = path.join(dir, 'pets-lore.json');
  const promptsPath = path.join(dir, 'prompts.json');
  const imagesDir = path.join(dir, 'images');

  const [seriesMeta, petsData, loreData, promptsData] = await Promise.all([
    readJson(seriesPath),
    readJson(petsPath),
    readJson(lorePath),
    readJson(promptsPath).catch(() => ({ schemaVersion: 1, prompts: {} })),
  ]);

  let imageFiles = [];
  try {
    imageFiles = (await fs.readdir(imagesDir)).filter((f) => f.toLowerCase().endsWith('.png'));
  } catch {
    imageFiles = [];
  }

  return {
    seriesId,
    dir,
    seriesMeta,
    petsData,
    loreData,
    promptsData,
    imageFiles,
    paths: { seriesPath, petsPath, lorePath, promptsPath, imagesDir },
  };
}

export async function listWorkspaces() {
  await fs.mkdir(CONTENT_ROOT, { recursive: true });
  const entries = await fs.readdir(CONTENT_ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && e.name !== '_template' && isValidSeriesId(e.name))
    .map((e) => e.name)
    .sort();
}

/**
 * 驗證工作區 PNG（簽名、大小；尺寸由呼叫端可選補充）
 */
export async function validateWorkspaceImages(workspace, options = {}) {
  const result = emptyResult();
  const pets = workspace.petsData?.pets || [];
  const imagesDir = workspace.paths.imagesDir;
  const existingOfficial = new Set();

  for (const pet of pets) {
    const expectedName = `${pet.id}.png`;
    const imgPath = path.join(imagesDir, expectedName);
    let stat;
    try {
      stat = await fs.stat(imgPath);
    } catch {
      result.errors.push(createIssue('error', 'IMAGE_MISSING', `圖片不存在: images/${expectedName}`));
      continue;
    }
    if (stat.size === 0) {
      result.errors.push(createIssue('error', 'IMAGE_EMPTY', `${expectedName} 為 0 byte`));
      continue;
    }
    if (stat.size > 5 * 1024 * 1024) {
      result.errors.push(createIssue('error', 'IMAGE_TOO_LARGE', `${expectedName} 超過 5 MB`));
    } else if (stat.size > 2 * 1024 * 1024) {
      result.warnings.push(createIssue('warning', 'IMAGE_LARGE', `${expectedName} 容量偏大（2～5 MB）`));
    }

    const fd = await fs.open(imgPath, 'r');
    try {
      const buf = Buffer.alloc(8);
      await fd.read(buf, 0, 8, 0);
      if (!buf.equals(PNG_SIGNATURE)) {
        result.errors.push(createIssue('error', 'IMAGE_NOT_PNG', `${expectedName} 不是有效 PNG（簽名不符）`));
      }
    } finally {
      await fd.close();
    }

    const officialTarget = path.join(ASSETS_PETS_DIR, expectedName);
    try {
      await fs.access(officialTarget);
      result.errors.push(createIssue('error', 'IMAGE_OFFICIAL_EXISTS', `正式圖片已存在，禁止覆蓋: assets/pets/${expectedName}`));
      existingOfficial.add(expectedName);
    } catch {
      // ok — does not exist
    }
  }

  // orphan images in workspace
  for (const file of workspace.imageFiles || []) {
    const id = file.replace(/\.png$/i, '');
    if (!pets.some((p) => p.id === id)) {
      result.warnings.push(createIssue('warning', 'IMAGE_ORPHAN', `工作區圖片無對應寵物: ${file}`));
    }
  }

  if (options.dimensionChecks) {
    // dimensionChecks provided by caller (browser); server keeps signature/size only
  }

  result.ok = result.errors.length === 0;
  result.existingOfficial = [...existingOfficial];
  return result;
}

export function mergeSeriesCatalog(officialCatalog, seriesMeta) {
  const next = {
    schemaVersion: 1,
    series: [...(officialCatalog.series || [])],
  };
  const idx = next.series.findIndex((s) => s.id === seriesMeta.seriesId);
  const entry = {
    id: seriesMeta.seriesId,
    name: seriesMeta.seriesName,
    description: seriesMeta.description || '',
    enabled: true,
    order: typeof seriesMeta.order === 'number' ? seriesMeta.order : 100,
  };
  if (idx >= 0) {
    next.series[idx] = { ...next.series[idx], ...entry };
  } else {
    next.series.push(entry);
  }
  return next;
}

export function mergePets(officialPetsData, workspacePetsData) {
  return {
    pets: [...(officialPetsData.pets || []), ...(workspacePetsData.pets || [])],
  };
}

export function mergeLore(officialLoreData, workspaceLoreData) {
  return {
    version: officialLoreData.version ?? 1,
    description: officialLoreData.description || workspaceLoreData.description || '',
    lore: [...(officialLoreData.lore || []), ...(workspaceLoreData.lore || [])],
  };
}

/**
 * 完整驗證（不含寫入）
 */
export async function validateSeriesWorkspace(seriesId) {
  const workspace = await loadWorkspace(seriesId);
  const official = await loadOfficialData();
  const knownPoolTags = collectPoolTagsFromPools(official.poolsData);

  const packageResult = validatePetPackage({
    seriesMeta: workspace.seriesMeta,
    petsData: workspace.petsData,
    loreData: workspace.loreData,
    promptsData: workspace.promptsData,
    officialPets: official.petsData.pets || [],
    officialLore: official.loreData.lore || [],
    seriesCatalog: official.seriesCatalog,
    poolsData: official.poolsData,
    getEligiblePetsForPool,
    knownPoolTags,
  });

  if (workspace.seriesMeta.seriesId !== seriesId) {
    packageResult.errors.push(createIssue(
      'error',
      'SERIES_ID_FOLDER_MISMATCH',
      `資料夾 ${seriesId} 與 series.json seriesId ${workspace.seriesMeta.seriesId} 不一致`,
    ));
    packageResult.ok = false;
  }

  const imageResult = await validateWorkspaceImages(workspace);
  packageResult.errors.push(...imageResult.errors);
  packageResult.warnings.push(...imageResult.warnings);
  packageResult.ok = packageResult.errors.length === 0;

  const beforePets = official.petsData.pets || [];
  const afterPets = [...beforePets, ...(workspace.petsData.pets || [])];
  const poolPreview = buildPoolPreview(
    official.poolsData,
    beforePets,
    afterPets,
    getEligiblePetsForPool,
  );

  const mergedPets = mergePets(official.petsData, workspace.petsData);
  const mergedLore = mergeLore(official.loreData, workspace.loreData);
  const mergedSeries = mergeSeriesCatalog(official.seriesCatalog, workspace.seriesMeta);

  const mergedPetCheck = validatePetCatalog(mergedPets, {
    mode: 'existing',
    seriesIds: new Set(mergedSeries.series.map((s) => s.id)),
    knownPoolTags,
  });
  const mergedLoreCheck = validateLoreCatalog(mergedLore, { mode: 'existing' });
  const mergedConsistency = validatePetAndLoreConsistency(mergedPets, mergedLore);
  const seriesCheck = validateSeriesCatalog(mergedSeries);

  for (const r of [mergedPetCheck, mergedLoreCheck, mergedConsistency, seriesCheck]) {
    // 合併後只擋 error；既有寵物缺 seriesId 等 legacy warning 不灌進發布確認清單
    packageResult.errors.push(...r.errors);
  }
  packageResult.ok = packageResult.errors.length === 0;

  return {
    ok: packageResult.ok,
    errors: packageResult.errors,
    warnings: packageResult.warnings,
    workspace,
    official,
    poolPreview,
    merged: {
      petsData: mergedPets,
      loreData: mergedLore,
      seriesCatalog: mergedSeries,
    },
    stats: {
      beforePetCount: beforePets.length,
      afterPetCount: afterPets.length,
      beforeByRarity: countByRarity(beforePets),
      afterByRarity: countByRarity(afterPets),
      addedPets: (workspace.petsData.pets || []).map((p) => ({ id: p.id, name: p.name, rarity: p.rarity })),
      addedLoreCount: (workspace.loreData.lore || []).length,
      addedImageCount: (workspace.petsData.pets || []).length,
    },
  };
}

function formatReportMarkdown(report) {
  const lines = [];
  lines.push(`# 寵物系列發布報告：${report.seriesName} (${report.seriesId})`);
  lines.push('');
  lines.push(`- 發布時間：${report.publishedAt}`);
  lines.push(`- releaseVersion：${report.releaseVersion || '（未填）'}`);
  lines.push(`- Dry Run：${report.dryRun ? '是' : '否'}`);
  lines.push('');
  lines.push('## 數量');
  lines.push(`- 新增寵物數：${report.addedPetCount}`);
  lines.push(`- 新增 Lore 數：${report.addedLoreCount}`);
  lines.push(`- 新增圖片數：${report.addedImageCount}`);
  lines.push(`- 發布前總寵物數：${report.beforePetCount}`);
  lines.push(`- 發布後總寵物數：${report.afterPetCount}`);
  lines.push('');
  lines.push('## 各 rarity 新增數');
  for (const r of ['N', 'R', 'SR', 'SSR', 'UR']) {
    const before = report.beforeByRarity[r] || 0;
    const after = report.afterByRarity[r] || 0;
    lines.push(`- ${r}：${before} → ${after}（+${after - before}）`);
  }
  lines.push('');
  lines.push('## 新增寵物');
  for (const p of report.addedPets) {
    lines.push(`- ${p.id}｜${p.rarity}｜${p.name}`);
  }
  lines.push('');
  lines.push('## Pool Preview');
  for (const pool of report.poolPreview) {
    lines.push(`### ${pool.name} (${pool.id})${pool.active ? ' [active]' : ''}`);
    lines.push(`- 總計：${pool.before.total} → ${pool.after.total}`);
    for (const r of ['N', 'R', 'SR', 'SSR', 'UR']) {
      lines.push(`  - ${r}：${pool.before.byRarity[r]} → ${pool.after.byRarity[r]}`);
    }
    if (pool.addedIds?.length) {
      lines.push(`- 新進候選：${pool.addedIds.join(', ')}`);
    }
    lines.push('');
  }
  lines.push('## Warnings');
  if (!report.warnings?.length) {
    lines.push('- （無）');
  } else {
    for (const w of report.warnings) {
      lines.push(`- [${w.code}] ${w.message}`);
    }
  }
  lines.push('');
  lines.push('## 修改檔案');
  for (const f of report.modifiedFiles) {
    lines.push(`- ${f}`);
  }
  lines.push('');
  lines.push('## 驗證結果');
  lines.push(`- Errors：${report.errors?.length || 0}`);
  lines.push(`- Warnings：${report.warnings?.length || 0}`);
  lines.push(`- 結果：${report.ok ? 'PASS' : 'FAIL'}`);
  lines.push('');
  return lines.join('\n');
}

export function buildPublishReport(validation, { dryRun, publishedAt, backupDir }) {
  const ws = validation.workspace;
  const stats = validation.stats;
  const seriesId = ws.seriesMeta.seriesId;
  const reportName = `pet-series-${seriesId.replace(/_/g, '-')}.md`;
  return {
    seriesId,
    seriesName: ws.seriesMeta.seriesName,
    releaseVersion: ws.seriesMeta.releaseVersion || null,
    publishedAt,
    dryRun: !!dryRun,
    ok: validation.ok,
    errors: validation.errors,
    warnings: validation.warnings,
    addedPetCount: stats.addedPets.length,
    addedLoreCount: stats.addedLoreCount,
    addedImageCount: stats.addedImageCount,
    beforePetCount: stats.beforePetCount,
    afterPetCount: stats.afterPetCount,
    beforeByRarity: stats.beforeByRarity,
    afterByRarity: stats.afterByRarity,
    addedPets: stats.addedPets,
    poolPreview: validation.poolPreview,
    modifiedFiles: [
      'data/pets.json',
      'data/pets-lore.json',
      'data/pet-series.json',
      ...stats.addedPets.map((p) => `assets/pets/${p.id}.png`),
      `reports/${reportName}`,
    ],
    backupDir: backupDir || null,
    reportRelPath: path.join('reports', reportName).replace(/\\/g, '/'),
  };
}

async function copyFileSafe(src, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

/**
 * Dry Run 或正式發布
 * @param {string} seriesId
 * @param {{ dryRun?: boolean, confirmSeriesId?: string, acknowledgeWarnings?: boolean }} options
 */
export async function publishPetSeries(seriesId, options = {}) {
  const dryRun = options.dryRun === true;
  const id = assertSafeSeriesId(seriesId);

  if (!dryRun) {
    if (options.confirmSeriesId !== id) {
      throw new Error(`最終確認失敗：請輸入系列 ID「${id}」`);
    }
    if (options.acknowledgeWarnings !== true && options.forceWarnings !== true) {
      // Caller should pass acknowledgeWarnings after showing warnings
    }
  }

  const validation = await validateSeriesWorkspace(id);
  if (!validation.ok) {
    return {
      ok: false,
      dryRun,
      stage: 'validate',
      errors: validation.errors,
      warnings: validation.warnings,
      poolPreview: validation.poolPreview,
      stats: validation.stats,
    };
  }

  if (!dryRun && validation.warnings.length > 0 && options.acknowledgeWarnings !== true) {
    return {
      ok: false,
      dryRun: false,
      stage: 'warnings',
      errors: [createIssue('error', 'WARNINGS_UNACKED', '存在 Warnings，請確認後再發布')],
      warnings: validation.warnings,
      poolPreview: validation.poolPreview,
      stats: validation.stats,
      requireWarningAck: true,
    };
  }

  const publishedAt = new Date().toISOString();
  const report = buildPublishReport(validation, { dryRun, publishedAt, backupDir: null });

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      report,
      reportMarkdown: formatReportMarkdown(report),
      errors: validation.errors,
      warnings: validation.warnings,
      poolPreview: validation.poolPreview,
      stats: validation.stats,
      filesWouldChange: report.modifiedFiles,
    };
  }

  // —— 正式發布 ——
  const backupStamp = `${publishedAt.replace(/[:.]/g, '-')}-${id}`;
  const backupDir = path.join(BACKUPS_DIR, backupStamp);
  await fs.mkdir(backupDir, { recursive: true });

  const copiedImages = [];
  const tmpImages = [];

  try {
    // 1. 備份
    await copyFileSafe(OFFICIAL_PETS_PATH, path.join(backupDir, 'pets.json'));
    await copyFileSafe(OFFICIAL_LORE_PATH, path.join(backupDir, 'pets-lore.json'));
    await copyFileSafe(OFFICIAL_SERIES_PATH, path.join(backupDir, 'pet-series.json'));

    const { merged, workspace } = validation;

    // 2. 記憶體資料已在 validation.merged；再驗一次 JSON roundtrip
    JSON.parse(JSON.stringify(merged.petsData));
    JSON.parse(JSON.stringify(merged.loreData));
    JSON.parse(JSON.stringify(merged.seriesCatalog));

    // 3. 寫入 .tmp JSON
    const petsTmp = `${OFFICIAL_PETS_PATH}.publish.tmp`;
    const loreTmp = `${OFFICIAL_LORE_PATH}.publish.tmp`;
    const seriesTmp = `${OFFICIAL_SERIES_PATH}.publish.tmp`;
    await fs.writeFile(petsTmp, `${JSON.stringify(merged.petsData, null, 2)}\n`, 'utf8');
    await fs.writeFile(loreTmp, `${JSON.stringify(merged.loreData, null, 2)}\n`, 'utf8');
    await fs.writeFile(seriesTmp, `${JSON.stringify(merged.seriesCatalog, null, 2)}\n`, 'utf8');

    // 4. 複製圖片到暫存位置
    await fs.mkdir(ASSETS_PETS_DIR, { recursive: true });
    for (const pet of workspace.petsData.pets || []) {
      const src = path.join(workspace.paths.imagesDir, `${pet.id}.png`);
      const dest = path.join(ASSETS_PETS_DIR, `${pet.id}.png`);
      const destTmp = `${dest}.publish.tmp`;
      try {
        await fs.access(dest);
        throw new Error(`正式圖片已存在，禁止覆蓋: ${pet.id}.png`);
      } catch (err) {
        if (err && err.message && err.message.includes('禁止覆蓋')) throw err;
        // not exists — ok
      }
      await copyFileSafe(src, destTmp);
      tmpImages.push({ destTmp, dest, id: pet.id });
    }

    // 5. 原子 rename JSON
    await fs.rename(petsTmp, OFFICIAL_PETS_PATH);
    await fs.rename(loreTmp, OFFICIAL_LORE_PATH);
    await fs.rename(seriesTmp, OFFICIAL_SERIES_PATH);

    // 6. 移動圖片至正式位置
    for (const item of tmpImages) {
      await fs.rename(item.destTmp, item.dest);
      copiedImages.push(item.dest);
    }

    // 7. 報告
    report.backupDir = path.relative(PROJECT_ROOT, backupDir).replace(/\\/g, '/');
    report.dryRun = false;
    const reportMd = formatReportMarkdown(report);
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    const reportAbs = path.join(PROJECT_ROOT, report.reportRelPath);
    await fs.writeFile(reportAbs, reportMd, 'utf8');

    return {
      ok: true,
      dryRun: false,
      report,
      reportMarkdown: reportMd,
      backupDir: report.backupDir,
      errors: [],
      warnings: validation.warnings,
      poolPreview: validation.poolPreview,
      stats: validation.stats,
    };
  } catch (err) {
    // 回滾 JSON
    try {
      await copyFileSafe(path.join(backupDir, 'pets.json'), OFFICIAL_PETS_PATH);
      await copyFileSafe(path.join(backupDir, 'pets-lore.json'), OFFICIAL_LORE_PATH);
      await copyFileSafe(path.join(backupDir, 'pet-series.json'), OFFICIAL_SERIES_PATH);
    } catch {
      // keep going
    }
    // 移除本次新圖片與暫存
    for (const item of tmpImages) {
      await fs.rm(item.destTmp, { force: true }).catch(() => {});
    }
    for (const img of copiedImages) {
      await fs.rm(img, { force: true }).catch(() => {});
    }
    await fs.rm(`${OFFICIAL_PETS_PATH}.publish.tmp`, { force: true }).catch(() => {});
    await fs.rm(`${OFFICIAL_LORE_PATH}.publish.tmp`, { force: true }).catch(() => {});
    await fs.rm(`${OFFICIAL_SERIES_PATH}.publish.tmp`, { force: true }).catch(() => {});

    return {
      ok: false,
      dryRun: false,
      stage: 'publish',
      error: err?.message || String(err),
      errors: [createIssue('error', 'PUBLISH_FAILED', err?.message || String(err))],
      warnings: validation.warnings,
      backupDir: path.relative(PROJECT_ROOT, backupDir).replace(/\\/g, '/'),
      rolledBack: true,
    };
  }
}

/** 建立工作區（從模板） */
export async function createWorkspace(seriesMeta) {
  const seriesId = assertSafeSeriesId(seriesMeta.seriesId);
  const dir = resolveWorkspaceDir(seriesId);
  try {
    await fs.access(dir);
    throw new Error(`工作區已存在: ${seriesId}`);
  } catch (err) {
    if (err && err.message && err.message.includes('工作區已存在')) throw err;
  }

  await fs.mkdir(path.join(dir, 'images'), { recursive: true });

  const series = {
    schemaVersion: 1,
    seriesId,
    seriesName: seriesMeta.seriesName || seriesId,
    description: seriesMeta.description || '',
    themeKeywords: seriesMeta.themeKeywords || [],
    visualRules: seriesMeta.visualRules || {
      preferred: ['圓潤比例', '明確剪影', '角色差異'],
      avoid: ['過度寫實', '恐怖外觀', '寵物外型過度相似'],
    },
    rarityPlan: seriesMeta.rarityPlan || { N: 2, R: 2, SR: 2, SSR: 1, UR: 1 },
    releaseVersion: seriesMeta.releaseVersion || '3.2.0',
    order: seriesMeta.order ?? 100,
  };

  await writeJsonAtomic(path.join(dir, 'series.json'), series);
  await writeJsonAtomic(path.join(dir, 'pets.json'), { pets: [] });
  await writeJsonAtomic(path.join(dir, 'pets-lore.json'), {
    version: 1,
    description: `${series.seriesName} 寵物個性化內容`,
    lore: [],
  });
  await writeJsonAtomic(path.join(dir, 'prompts.json'), { schemaVersion: 1, prompts: {} });

  // touch gitkeep in images
  await fs.writeFile(path.join(dir, 'images', '.gitkeep'), '', 'utf8');

  return { seriesId, dir, series };
}

export async function saveWorkspace(seriesId, payload) {
  const dir = resolveWorkspaceDir(seriesId);
  if (payload.seriesMeta) {
    if (payload.seriesMeta.seriesId !== seriesId) {
      throw new Error('不可在保存時更改 seriesId（請建立新工作區）');
    }
    await writeJsonAtomic(path.join(dir, 'series.json'), payload.seriesMeta);
  }
  if (payload.petsData) {
    await writeJsonAtomic(path.join(dir, 'pets.json'), payload.petsData);
  }
  if (payload.loreData) {
    await writeJsonAtomic(path.join(dir, 'pets-lore.json'), payload.loreData);
  }
  if (payload.promptsData) {
    await writeJsonAtomic(path.join(dir, 'prompts.json'), payload.promptsData);
  }
  return { ok: true, seriesId };
}

export async function deleteWorkspacePet(seriesId, petId) {
  const workspace = await loadWorkspace(seriesId);
  const pets = (workspace.petsData.pets || []).filter((p) => p.id !== petId);
  const lore = (workspace.loreData.lore || []).filter((l) => l.id !== petId);
  const prompts = { ...(workspace.promptsData.prompts || {}) };
  delete prompts[petId];

  await saveWorkspace(seriesId, {
    seriesMeta: workspace.seriesMeta,
    petsData: { pets },
    loreData: { ...workspace.loreData, lore },
    promptsData: { schemaVersion: 1, prompts },
  });

  const img = path.join(workspace.paths.imagesDir, `${petId}.png`);
  await fs.rm(img, { force: true }).catch(() => {});

  return { ok: true, petId };
}

/**
 * 儲存上傳圖片（僅工作區）
 * @param {string} seriesId
 * @param {string} petId
 * @param {Buffer} buffer
 */
export async function saveWorkspaceImage(seriesId, petId, buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('圖片內容為空');
  }
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('圖片超過 5 MB');
  }
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('不是有效 PNG');
  }
  const dest = resolveWorkspaceImagePath(seriesId, `${petId}.png`);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buffer);
  return { ok: true, path: path.relative(PROJECT_ROOT, dest).replace(/\\/g, '/') };
}

export function getPublishAllowlist() {
  return [
    'data/pets.json',
    'data/pets-lore.json',
    'data/pet-series.json',
    'assets/pets/<new>.png',
    'reports/pet-series-<seriesId>.md',
  ];
}
