/**
 * QuestNote Mailbox Publisher — 作者本機專用
 *
 * 安全邊界：
 * - 只監聽 127.0.0.1
 * - 只讀寫 data/global-mailbox.json
 * - 不接受／不儲存 GitHub Token
 * - Git 僅 stage 該 JSON，無 force push、無任意 shell
 *
 * 啟動：node scripts/mailbox-publisher-server.mjs
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import {
  validateMailboxDocument,
  MAILBOX_MESSAGE_TYPES,
  MAILBOX_PRIORITIES,
  MAILBOX_ACTION_VIEW_ALLOWLIST,
  MAILBOX_REWARD_LIMITS,
} from '../src/mailboxSchema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MAILBOX_REL = path.join('data', 'global-mailbox.json');
const MAILBOX_ABS = path.join(ROOT, MAILBOX_REL);
const MATERIALS_ABS = path.join(ROOT, 'data', 'materials.json');
const CRAFTABLES_ABS = path.join(ROOT, 'data', 'craftables.json');
const HOST = '127.0.0.1';
const PORT = 4173;

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
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return null;
  return JSON.parse(raw);
}

async function loadMailbox() {
  const text = await fs.readFile(MAILBOX_ABS, 'utf8');
  return JSON.parse(text);
}

async function loadCatalogs() {
  const [materialsRaw, craftablesRaw] = await Promise.all([
    fs.readFile(MATERIALS_ABS, 'utf8'),
    fs.readFile(CRAFTABLES_ABS, 'utf8'),
  ]);
  const materials = JSON.parse(materialsRaw);
  const craftables = JSON.parse(craftablesRaw);
  return {
    materials,
    craftables,
    materialIds: new Set(materials.map((m) => m.id)),
    itemIds: new Set(craftables.map((c) => c.id)),
  };
}

function formatMailboxJson(doc) {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

function runGit(args) {
  return new Promise((resolve) => {
    const child = spawn('git', args, {
      cwd: ROOT,
      windowsHide: true,
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      resolve({ ok: false, code: -1, stdout, stderr: err.message });
    });
    child.on('close', (code) => {
      resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

async function getGitStatus() {
  const [branch, remote, diff, status] = await Promise.all([
    runGit(['rev-parse', '--abbrev-ref', 'HEAD']),
    runGit(['remote', 'get-url', 'origin']),
    runGit(['diff', '--', MAILBOX_REL]),
    runGit(['status', '--short', '--', MAILBOX_REL]),
  ]);
  const inside = await runGit(['rev-parse', '--is-inside-work-tree']);
  return {
    insideRepo: inside.ok && inside.stdout.trim() === 'true',
    branch: branch.ok ? branch.stdout.trim() : null,
    remote: remote.ok ? remote.stdout.trim() : null,
    diff: diff.stdout || '',
    status: status.stdout || '',
    errors: [branch, remote, inside]
      .filter((r) => !r.ok)
      .map((r) => r.stderr || r.stdout)
      .filter(Boolean),
  };
}

async function handleApi(req, res, url) {
  const catalogs = await loadCatalogs();

  if (req.method === 'GET' && url.pathname === '/api/meta') {
    return sendJson(res, 200, {
      host: HOST,
      port: PORT,
      mailboxPath: MAILBOX_REL,
      types: MAILBOX_MESSAGE_TYPES,
      priorities: MAILBOX_PRIORITIES,
      actionViews: MAILBOX_ACTION_VIEW_ALLOWLIST,
      rewardLimits: MAILBOX_REWARD_LIMITS,
      note: '作者工具僅 localhost；發布權限來自本機 Git／Repository 寫入權限',
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/catalogs') {
    return sendJson(res, 200, {
      materials: catalogs.materials.map((m) => ({ id: m.id, name: m.name })),
      items: catalogs.craftables.map((c) => ({ id: c.id, name: c.name })),
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/mailbox') {
    const doc = await loadMailbox();
    return sendJson(res, 200, doc);
  }

  if (req.method === 'GET' && url.pathname === '/api/git-status') {
    const git = await getGitStatus();
    return sendJson(res, 200, git);
  }

  if (req.method === 'POST' && url.pathname === '/api/validate') {
    const body = await readBody(req);
    const result = validateMailboxDocument(body?.document ?? body, catalogs);
    return sendJson(res, result.ok ? 200 : 400, result);
  }

  if (req.method === 'POST' && url.pathname === '/api/write') {
    const body = await readBody(req);
    const document = body?.document;
    if (!document) return sendJson(res, 400, { ok: false, error: '缺少 document' });
    if (body?.confirm !== true) {
      return sendJson(res, 400, { ok: false, error: '請確認寫入（confirm: true）' });
    }

    const result = validateMailboxDocument(document, catalogs);
    if (!result.ok) return sendJson(res, 400, { ok: false, ...result });

    const next = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      messages: Array.isArray(document.messages) ? document.messages : [],
    };
    await fs.writeFile(MAILBOX_ABS, formatMailboxJson(next), 'utf8');
    return sendJson(res, 200, {
      ok: true,
      path: MAILBOX_REL,
      generatedAt: next.generatedAt,
      messageCount: next.messages.length,
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/git-publish') {
    const body = await readBody(req);
    if (body?.confirm !== true) {
      return sendJson(res, 400, { ok: false, error: '請確認發布（confirm: true）' });
    }
    if (body?.hasCompensation && body?.publishConfirmText !== 'PUBLISH') {
      return sendJson(res, 400, {
        ok: false,
        error: '補償發布需輸入 PUBLISH 確認',
      });
    }

    const git = await getGitStatus();
    if (!git.insideRepo) {
      return sendJson(res, 400, {
        ok: false,
        error: '目前不是 Git Repository，請手動 Commit／Push',
        git,
      });
    }

    // 只 stage 信箱 JSON
    const add = await runGit(['add', '--', MAILBOX_REL]);
    if (!add.ok) {
      return sendJson(res, 500, { ok: false, error: add.stderr || 'git add 失敗', step: 'add' });
    }

    const staged = await runGit(['diff', '--cached', '--name-only']);
    const stagedFiles = staged.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (stagedFiles.length === 0) {
      return sendJson(res, 400, { ok: false, error: '沒有可提交的 mailbox 變更', stagedFiles });
    }
    if (stagedFiles.some((f) => f.replace(/\\/g, '/') !== MAILBOX_REL.replace(/\\/g, '/'))) {
      await runGit(['reset', 'HEAD', '--', ...stagedFiles]);
      return sendJson(res, 500, {
        ok: false,
        error: '偵測到非 mailbox 檔案被 stage，已中止',
        stagedFiles,
      });
    }

    const ids = Array.isArray(body?.messageIds) ? body.messageIds.filter(Boolean) : [];
    const message = ids.length === 1
      ? `chore(mailbox): publish ${ids[0]}`
      : 'chore(mailbox): publish mailbox update';

    const commit = await runGit(['commit', '-m', message]);
    if (!commit.ok) {
      return sendJson(res, 500, {
        ok: false,
        error: commit.stderr || commit.stdout || 'git commit 失敗',
        step: 'commit',
      });
    }

    const push = await runGit(['push']);
    if (!push.ok) {
      return sendJson(res, 500, {
        ok: false,
        error: push.stderr || push.stdout || 'git push 失敗',
        step: 'push',
        commitKept: true,
        hint: '本機 Commit 已保留。請手動執行：git push',
      });
    }

    return sendJson(res, 200, {
      ok: true,
      message,
      stagedFiles,
      push: push.stdout || 'ok',
    });
  }

  return sendJson(res, 404, { ok: false, error: 'Not found' });
}

async function serveStatic(url, res) {
  let filePath;
  if (url.pathname === '/' || url.pathname === '/index.html') {
    filePath = path.join(__dirname, 'mailbox-publisher-ui.html');
  } else if (url.pathname === '/mailbox-publisher-ui.js') {
    filePath = path.join(__dirname, 'mailbox-publisher-ui.js');
  } else {
    return sendText(res, 404, 'Not found');
  }
  try {
    const buf = await fs.readFile(filePath);
    const type = filePath.endsWith('.js')
      ? 'text/javascript; charset=utf-8'
      : 'text/html; charset=utf-8';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
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
  console.log('QuestNote Mailbox Publisher');
  console.log(`http://${HOST}:${PORT}`);
  console.log(`Mailbox file: ${MAILBOX_REL}`);
  console.log('Listening on 127.0.0.1 only. No token storage. Git uses local credentials.');
});
