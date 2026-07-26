/**
 * QuestNote Pet Series Builder — 作者本機專用
 *
 * 安全邊界：
 * - 只監聽 127.0.0.1:4174
 * - 只讀寫 content/pet-series/<seriesId>
 * - 發布僅透過 petSeriesPublishService 白名單
 * - 禁止路徑跳脫
 *
 * 啟動：node devtools/pet-series-builder/server.mjs
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROJECT_ROOT,
  listWorkspaces,
  loadWorkspace,
  loadOfficialData,
  createWorkspace,
  saveWorkspace,
  deleteWorkspacePet,
  saveWorkspaceImage,
  validateSeriesWorkspace,
  publishPetSeries,
  assertSafeSeriesId,
  resolveWorkspaceDir,
  getPublishAllowlist,
} from '../../scripts/petSeriesPublishService.mjs';
import {
  getNextPetId,
  PET_ID_TYPES,
  PET_RARITIES,
  PET_DIALOGUE_REQUIREMENTS,
  collectPoolTagsFromPools,
  countByRarity,
  buildPoolPreview,
} from '../../src/petDataSchema.js';
import { getEligiblePetsForPool } from '../../src/petPoolFilter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOST = '127.0.0.1';
const PORT = 4174;

function sendJson(res, status, body) {
  const data = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function sendText(res, status, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  res.end(text);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function readJsonBody(req) {
  const buf = await readBody(req);
  const raw = buf.toString('utf8');
  if (!raw.trim()) return null;
  return JSON.parse(raw);
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/meta') {
    const official = await loadOfficialData();
    const poolTags = [...collectPoolTagsFromPools(official.poolsData)];
    const pets = official.petsData.pets || [];
    return sendJson(res, 200, {
      host: HOST,
      port: PORT,
      rarities: PET_RARITIES,
      dialogueRequirements: PET_DIALOGUE_REQUIREMENTS,
      idTypes: PET_ID_TYPES,
      poolTags,
      seriesCatalog: official.seriesCatalog,
      nextIds: {
        N: getNextPetId(pets, PET_ID_TYPES.STANDARD, 'N'),
        R: getNextPetId(pets, PET_ID_TYPES.STANDARD, 'R'),
        SR: getNextPetId(pets, PET_ID_TYPES.STANDARD, 'SR'),
        SSR: getNextPetId(pets, PET_ID_TYPES.STANDARD, 'SSR'),
        UR: getNextPetId(pets, PET_ID_TYPES.STANDARD, 'UR'),
        SP: getNextPetId(pets, PET_ID_TYPES.SPECIAL_SP),
      },
      officialPetCount: pets.length,
      officialByRarity: countByRarity(pets),
      publishAllowlist: getPublishAllowlist(),
      note: '作者工具僅 localhost；發布權限來自本機專案檔案寫入權限',
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/workspaces') {
    const list = await listWorkspaces();
    return sendJson(res, 200, { workspaces: list });
  }

  if (req.method === 'GET' && url.pathname === '/api/official') {
    const official = await loadOfficialData();
    return sendJson(res, 200, {
      pets: official.petsData.pets,
      lore: official.loreData.lore,
      series: official.seriesCatalog.series,
      pools: official.poolsData.pools,
    });
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/workspace/')) {
    const seriesId = decodeURIComponent(url.pathname.slice('/api/workspace/'.length));
    const workspace = await loadWorkspace(seriesId);
    const official = await loadOfficialData();
    const combinedPets = [...(official.petsData.pets || []), ...(workspace.petsData.pets || [])];
    return sendJson(res, 200, {
      ...workspace,
      nextIds: {
        N: getNextPetId(combinedPets, PET_ID_TYPES.STANDARD, 'N'),
        R: getNextPetId(combinedPets, PET_ID_TYPES.STANDARD, 'R'),
        SR: getNextPetId(combinedPets, PET_ID_TYPES.STANDARD, 'SR'),
        SSR: getNextPetId(combinedPets, PET_ID_TYPES.STANDARD, 'SSR'),
        UR: getNextPetId(combinedPets, PET_ID_TYPES.STANDARD, 'UR'),
        SP: getNextPetId(combinedPets, PET_ID_TYPES.SPECIAL_SP),
      },
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/workspace/create') {
    const body = await readJsonBody(req);
    const created = await createWorkspace(body?.seriesMeta || body);
    return sendJson(res, 200, { ok: true, ...created });
  }

  if (req.method === 'POST' && url.pathname === '/api/workspace/save') {
    const body = await readJsonBody(req);
    const seriesId = assertSafeSeriesId(body?.seriesId);
    await saveWorkspace(seriesId, body);
    return sendJson(res, 200, { ok: true, seriesId });
  }

  if (req.method === 'POST' && url.pathname === '/api/workspace/delete-pet') {
    const body = await readJsonBody(req);
    const result = await deleteWorkspacePet(body.seriesId, body.petId);
    return sendJson(res, 200, result);
  }

  if (req.method === 'POST' && url.pathname === '/api/workspace/allocate-id') {
    const body = await readJsonBody(req);
    const seriesId = assertSafeSeriesId(body.seriesId);
    const workspace = await loadWorkspace(seriesId);
    const official = await loadOfficialData();
    const combined = [...(official.petsData.pets || []), ...(workspace.petsData.pets || [])];
    const idType = body.idType === PET_ID_TYPES.SPECIAL_SP
      ? PET_ID_TYPES.SPECIAL_SP
      : PET_ID_TYPES.STANDARD;
    const id = getNextPetId(combined, idType, body.rarity);
    return sendJson(res, 200, { ok: true, id, idType, rarity: body.rarity });
  }

  if (req.method === 'POST' && url.pathname === '/api/workspace/upload-image') {
    const seriesId = assertSafeSeriesId(url.searchParams.get('seriesId') || '');
    const petId = url.searchParams.get('petId');
    if (!petId || !/^[a-z0-9_]+$/i.test(petId)) {
      return sendJson(res, 400, { ok: false, error: '非法 petId' });
    }
    const buf = await readBody(req);
    const result = await saveWorkspaceImage(seriesId, petId, buf);
    return sendJson(res, 200, result);
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/workspace-image/')) {
    // /api/workspace-image/<seriesId>/<file>
    const parts = url.pathname.slice('/api/workspace-image/'.length).split('/');
    const seriesId = assertSafeSeriesId(decodeURIComponent(parts[0] || ''));
    const file = path.basename(decodeURIComponent(parts[1] || ''));
    const imgPath = path.join(resolveWorkspaceDir(seriesId), 'images', file);
    try {
      const buf = await fs.readFile(imgPath);
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
      res.end(buf);
    } catch {
      sendText(res, 404, 'Not found');
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/validate') {
    const body = await readJsonBody(req);
    // 若有未保存 payload，先寫入再驗證
    if (body?.saveBefore && body.seriesId) {
      await saveWorkspace(body.seriesId, body);
    }
    const result = await validateSeriesWorkspace(body.seriesId);
    return sendJson(res, result.ok ? 200 : 400, {
      ok: result.ok,
      errors: result.errors,
      warnings: result.warnings,
      poolPreview: result.poolPreview,
      stats: result.stats,
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/pool-preview') {
    const body = await readJsonBody(req);
    const official = await loadOfficialData();
    const workspacePets = body?.pets || [];
    const before = official.petsData.pets || [];
    const after = [...before, ...workspacePets];
    const preview = buildPoolPreview(official.poolsData, before, after, getEligiblePetsForPool);
    return sendJson(res, 200, { ok: true, preview, beforeCount: before.length, afterCount: after.length });
  }

  if (req.method === 'POST' && url.pathname === '/api/dry-run') {
    const body = await readJsonBody(req);
    if (body?.saveBefore && body.seriesId) {
      await saveWorkspace(body.seriesId, body);
    }
    const result = await publishPetSeries(body.seriesId, { dryRun: true, acknowledgeWarnings: true });
    return sendJson(res, result.ok ? 200 : 400, result);
  }

  if (req.method === 'POST' && url.pathname === '/api/publish') {
    const body = await readJsonBody(req);
    if (body?.saveBefore && body.seriesId) {
      await saveWorkspace(body.seriesId, body);
    }
    const result = await publishPetSeries(body.seriesId, {
      dryRun: false,
      confirmSeriesId: body.confirmSeriesId,
      acknowledgeWarnings: body.acknowledgeWarnings === true,
    });
    return sendJson(res, result.ok ? 200 : 400, result);
  }

  // App styles for preview iframe
  if (req.method === 'GET' && url.pathname === '/api/app-styles.css') {
    const css = await fs.readFile(path.join(PROJECT_ROOT, 'src', 'styles.css'));
    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(css);
    return;
  }

  return sendJson(res, 404, { ok: false, error: 'Not found' });
}

async function serveStatic(url, res) {
  let rel = url.pathname === '/' ? '/index.html' : url.pathname;
  // only allow files in this builder directory
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(__dirname, safe);
  if (!filePath.startsWith(__dirname)) {
    return sendText(res, 403, 'Forbidden');
  }
  try {
    const buf = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentTypeFor(filePath), 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(url, res);
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err?.message || String(err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log('QuestNote Pet Series Builder');
  console.log(`http://${HOST}:${PORT}`);
  console.log('Listening on 127.0.0.1 only. Workspace writes limited to content/pet-series.');
});
