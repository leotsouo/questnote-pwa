import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { hash, encode, mergeMailboxes, inspectRelease, pendingReleases, makeDecision, publishDecision, validateDocument } from './questnote-watch-core.mjs';
import { commitMailbox } from './questnote-watch-git.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = 'leotsouo/questnote-pwa';
const baseUrl = 'https://leotsouo.github.io/questnote-pwa/';
const mailboxPath = 'data/global-mailbox.json';
const run = (program, args, options = {}) => execFileSync(program, args, { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024, ...options });
const git = (...args) => run('git', args).trim();
const show = (ref, name) => run('git', ['show', `${ref}:${name}`]);
const api = (endpoint) => JSON.parse(run('gh', ['api', endpoint]));
const stateDir = path.join(path.dirname(git('rev-parse', '--path-format=absolute', '--git-common-dir')), '.dev-backups', 'questnote-watch');
const stateFile = path.join(stateDir, 'state.json');
const scanFile = path.join(stateDir, 'scan.json');
const atomic = async (name, value) => {
  await fs.writeFile(name + '.tmp', encode(value), 'utf8');
  await fs.rename(name + '.tmp', name);
};
const read = async (name, fallback) => {
  try { return JSON.parse(await fs.readFile(name, 'utf8')); } catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; }
};
const catalogs = (ref) => {
  const materials = JSON.parse(show(ref, 'data/materials.json'));
  const items = JSON.parse(show(ref, 'data/craftables.json'));
  return { materials: Array.isArray(materials) ? materials : materials.materials, items: Array.isArray(items) ? items : items.items };
};
const refresh = () => git('fetch', 'origin', '+refs/heads/main:refs/remotes/origin/main', '+refs/heads/gh-pages:refs/remotes/origin/gh-pages');
async function live(name) {
  const response = await fetch(baseUrl + name + `?watch=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTPS ${response.status}: ${name}`);
  return Buffer.from(await response.arrayBuffer());
}
function successfulDeployments() {
  const entries = api(`repos/${repo}/deployments?environment=github-pages&per_page=20`);
  return entries.map((entry) => {
    const status = api(`repos/${repo}/deployments/${entry.id}/statuses?per_page=1`)[0];
    return { deployedCommit: entry.sha, createdAt: entry.created_at, success: status?.state === 'success' };
  }).filter((entry) => entry.success);
}
async function verifyLive() {
  refresh();
  const pagesCommit = git('rev-parse', 'origin/gh-pages');
  const deployments = successfulDeployments();
  if (!deployments.length) throw new Error('No successful Pages deployment evidence');
  const manifestBytes = await live('release-artifact.json');
  if (hash(manifestBytes) !== hash(show('origin/gh-pages', 'release-artifact.json'))) throw new Error('Live manifest mismatch');
  const manifest = JSON.parse(manifestBytes);
  const names = ['index.html', 'src/releaseProfile.js', 'src/version.js', 'service-worker.js'];
  const liveFiles = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await live(name)])));
  const remoteFiles = Object.fromEntries(names.map((name) => [name, Buffer.from(show('origin/gh-pages', name))]));
  const release = inspectRelease({ deployedCommit: deployments[0].deployedCommit, pagesCommit, manifest, liveFiles, remoteFiles });
  const source = JSON.parse(show('origin/main', mailboxPath));
  const production = JSON.parse(show('origin/gh-pages', mailboxPath));
  if (hash(await live(mailboxPath)) !== hash(show('origin/gh-pages', mailboxPath))) throw new Error('Live mailbox mismatch');
  const merged = mergeMailboxes(source, production, catalogs('origin/main'));
  return { checkedAt: new Date().toISOString(), release, pagesCommit, mainCommit: git('rev-parse', 'origin/main'), deployments, source, production, merged };
}
async function feedback() {
  const config = JSON.parse(await fs.readFile(path.join(root, 'backend/feedback/deployment.json'), 'utf8'));
  const reports = [];
  let cursor = 0;
  // Use the maintained main checkout's already-installed Wrangler; no install or public query endpoint.
  const wrangler = path.join(path.dirname(stateDir), '..', '.worktrees/main-integration/node_modules/wrangler/bin/wrangler.js');
  for (;;) {
    const sql = `SELECT rowid AS cursor, id, submitted_at, type, title, description, steps, expected, diagnostics_json, status, resolution_note FROM feedback WHERE status = 'new' AND rowid > ${cursor} ORDER BY rowid LIMIT 100`;
    let rows;
    if (process.env.CLOUDFLARE_API_TOKEN) {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ sql, params: [] }), signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Private D1 HTTP ${response.status}`);
      const result = await response.json();
      if (!result.success || !result.result?.[0]?.success) throw new Error('D1 query failed');
      rows = result.result[0].results;
    } else {
      const result = JSON.parse(run(process.execPath, ['--use-system-ca', wrangler, 'd1', 'execute', config.databaseName, '--remote', '--config', path.join(root, 'backend/feedback/wrangler.jsonc'), '--command', sql, '--json']));
      if (!result[0]?.success) throw new Error('Wrangler D1 query failed');
      rows = result[0].results;
    }
    if (!Array.isArray(rows)) throw new Error('Invalid D1 result');
    reports.push(...rows);
    if (rows.length < 100) break;
    cursor = rows.at(-1).cursor;
    if (!Number.isSafeInteger(cursor) || cursor < 1) throw new Error('Invalid feedback cursor');
  }
  return reports;
}
const decisionFile = (id) => {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Invalid eventId');
  return path.join(stateDir, `decision-${id}.json`);
};
async function scan(state) {
  const evidence = await verifyLive();
  const reports = await feedback();
  const releases = [];
  for (const deployment of evidence.deployments.toReversed()) {
    const manifest = JSON.parse(show(deployment.deployedCommit, 'release-artifact.json'));
    releases.push({ ...deployment, artifactId: manifest.artifactId, sourceCommit: manifest.sourceCommit });
  }
  if (!state.baseline) {
    state.baseline = evidence.release;
    state.observed = releases.map((release) => release.deployedCommit);
    state.initialMailbox = evidence.production;
    await atomic(stateFile, state);
  } else if (!releases.some((release) => (state.observed || []).includes(release.deployedCommit))) {
    throw new Error('Deployment history exceeds the 20-entry window; reconcile history before proceeding');
  }
  // A publication made by this tool is already covered and must not trigger a new announcement.
  const decisions = await loadDecisions();
  const observed = new Set([...(state.observed || []), ...decisions.filter((decision) => decision.status === 'published').map((decision) => decision.pagesCommit)]);
  const pending = pendingReleases({ observed: [...observed] }, releases);
  const covered = new Set(decisions.flatMap((decision) => decision.deployments));
  const changes = pending.filter((release) => !covered.has(release.deployedCommit));
  const newReports = reports.filter((report) => !state.reviewedFeedback?.includes(report.id));
  const result = { ...evidence, pending: changes, reports, newReports, incompleteDecisions: decisions.filter((decision) => !['published', 'skipped'].includes(decision.status)) };
  if (changes.length) result.sourceDiff = run('git', ['log', '--oneline', `${state.lastSource || state.baseline.sourceCommit}..${evidence.release.sourceCommit}`]);
  await atomic(scanFile, result);
  console.log(encode({ scanFile, newReports: newReports.length, pendingDeployments: changes.length, incompleteDecisions: result.incompleteDecisions.map((decision) => decision.eventId), release: evidence.release }));
}
async function loadDecisions() {
  const names = (await fs.readdir(stateDir)).filter((name) => /^decision-[A-Za-z0-9_-]+\.json$/.test(name));
  return Promise.all(names.map((name) => read(path.join(stateDir, name))));
}
async function main() {
  await fs.mkdir(stateDir, { recursive: true });
  const lock = await fs.open(path.join(stateDir, 'run.lock'), 'wx').catch(() => { throw new Error('Another run or interrupted lock exists; inspect run.lock before recovery'); });
  await lock.writeFile(encode({ pid: process.pid, startedAt: new Date().toISOString() }));
  try {
    const state = await read(stateFile, { schemaVersion: 1, reviewedFeedback: [], observed: [] });
    const [command = 'scan', argument] = process.argv.slice(2);
    if (command === 'scan') return await scan(state);
    if (command === 'review') {
      const input = await read(path.resolve(argument));
      const snapshot = await read(scanFile);
      if (!input.reviews?.length || input.reviews.some((review) => !snapshot.reports.some((report) => report.id === review.id) || !review.category || !review.severity || !review.summary || !review.recommendation)) throw new Error('Review requires known IDs, category, severity, summary and recommendation');
      await atomic(path.join(stateDir, `reviews-${Date.now()}.json`), input);
      state.reviewedFeedback = [...new Set([...state.reviewedFeedback, ...input.reviews.map((review) => review.id)])];
      return await atomic(stateFile, state);
    }
    if (command === 'decide') {
      const input = await read(path.resolve(argument));
      const name = decisionFile(input.eventId);
      const existing = await read(name, null);
      if (existing) throw new Error('Immutable event already recorded; use publish to resume');
      const priorDecisions = await loadDecisions();
      const snapshot = await read(scanFile);
      const fresh = await verifyLive();
      if (fresh.mainCommit !== snapshot.mainCommit || fresh.pagesCommit !== snapshot.pagesCommit) throw new Error('Stale scan; scan again');
      const decision = makeDecision({ input, scan: snapshot, merged: fresh.merged, catalogs: catalogs('origin/main'), priorDecisions });
      await atomic(name, decision);
      if (decision.status === 'skipped') {
        state.observed = [...new Set([...state.observed, ...decision.deployments])];
        state.lastSource = decision.release.sourceCommit;
        await atomic(stateFile, state);
      }
      console.log(name);
      return;
    }
    if (command === 'publish') {
      const name = decisionFile(argument);
      const decision = await read(name);
      validateDocument(decision.document, catalogs('origin/main'));
      const transport = {
        head: async (branch) => { refresh(); return git('rev-parse', `origin/${branch}`); },
        commit: async (branch, base, bytes, eventId) => commitMailbox({ root, stateDir, branch, base, bytes, eventId }),
        push: async (branch, commit) => git('push', 'origin', `${commit}:refs/heads/${branch}`),
        verify: async (commit, bytes) => {
          for (let attempt = 0; attempt < 4; attempt += 1) {
            try {
              const current = await verifyLive();
              if (current.pagesCommit !== commit || hash(await live(mailboxPath)) !== hash(bytes)) throw new Error('Pages pending/failed or deployed mailbox mismatch');
              return;
            } catch (error) {
              if (attempt === 3 || !/pending|mismatch|No successful/.test(error.message)) throw error;
              await new Promise((resolve) => setTimeout(resolve, 15000));
            }
          }
        },
      };
      await publishDecision(decision, transport, (value) => atomic(name, value));
      if (decision.status === 'published') {
        state.observed = [...new Set([...state.observed, ...decision.deployments, decision.pagesCommit])];
        state.lastSource = decision.release.sourceCommit;
        await atomic(stateFile, state);
      }
      console.log(encode({ eventId: decision.eventId, status: decision.status, mainCommit: decision.mainCommit, pagesCommit: decision.pagesCommit }));
      return;
    }
    throw new Error('Usage: questnote-watch.mjs scan | review <private.json> | decide <private.json> | publish <eventId>');
  } finally { await lock.close(); await fs.unlink(path.join(stateDir, 'run.lock')); }
}
main().catch(async (error) => {
  console.error(error.message);
  await fs.appendFile(path.join(stateDir, 'failures.log'), `${new Date().toISOString()} ${error.message}\n`).catch(() => {});
  process.exitCode = 1;
});
