/** Shared helpers for preview:deploy and release:production. Nothing here force-pushes or rewrites history. */
import fs from 'node:fs/promises';
import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prepareReleaseArtifact } from '../releaseArtifact.mjs';
import { verifyReleaseArtifact } from '../verify-release-artifact.mjs';

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const MANIFEST = 'release-artifact.json';
export const TARGETS = {
  preview: {
    profile: 'preview', scopePath: '/questnote-pwa-preview/', dbName: 'QuestNotePreviewDB',
    remote: 'https://github.com/leotsouo/questnote-pwa-preview.git', branch: 'main',
    publicUrl: 'https://leotsouo.github.io/questnote-pwa-preview/', cloneName: 'preview-repo',
  },
  production: {
    profile: 'production', scopePath: '/questnote-pwa/', dbName: 'QuestNoteDB',
    remote: 'https://github.com/leotsouo/questnote-pwa.git', branch: 'gh-pages',
    publicUrl: 'https://leotsouo.github.io/questnote-pwa/', cloneName: 'pages-repo',
  },
};
/** Review pages live here on the preview site; the service worker never intercepts `reports/`. */
export const REVIEW_PATH = 'reports/review';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const gitBlobSha1 = (bytes) => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');

export function git(cwd, args, options = {}) {
  return execFileSync('git', ['-C', cwd, '-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false', ...args],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024, ...options }).trim();
}

export function log(message) { console.log(`[deploy] ${message}`); }

/** The artifact records HEAD as its source, so HEAD must describe exactly what is assembled. */
export function assertCleanCheckout(expectedBranch) {
  const branch = git(PROJECT_ROOT, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== expectedBranch) throw new Error(`Run this from the ${expectedBranch} branch (currently ${branch}).`);
  // Judge local changes with the checkout's own line-ending settings; CRLF-only differences are not changes.
  const status = execFileSync('git', ['-C', PROJECT_ROOT, 'status', '--porcelain'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  if (status) throw new Error(`Working tree is not clean; commit first.\n${status}`);
  normalizeCheckoutLineEndings();
  return git(PROJECT_ROOT, ['rev-parse', 'HEAD']);
}

/**
 * Artifacts are read from the working tree. With core.autocrlf=true a Windows checkout can hold CRLF
 * copies of LF blobs that `status` still reports as clean, so the artifact would not match HEAD byte
 * for byte. On a clean tree, rewrite those files from the index (content is unchanged).
 */
function normalizeCheckoutLineEndings() {
  const drifted = git(PROJECT_ROOT, ['ls-files', '--eol']).split('\n')
    .map((line) => line.split('\t'))
    .filter(([info, file]) => file && /^i\/lf\s+w\/crlf\b/.test(info))
    .map(([, file]) => file);
  if (!drifted.length) return;
  for (const file of drifted) rmSync(path.join(PROJECT_ROOT, file));
  git(PROJECT_ROOT, ['checkout-index', '-f', '-u', '--stdin'],
    { input: `${drifted.join('\n')}\n`, stdio: ['pipe', 'pipe', 'pipe'] });
  const status = git(PROJECT_ROOT, ['status', '--porcelain']);
  if (status) throw new Error(`Line-ending normalization left changes; inspect before retrying.\n${status}`);
  log(`Rewrote ${drifted.length} CRLF working copies of LF files from the index.`);
}

export async function assembleAndVerify(target) {
  const outputRoot = path.join(os.tmpdir(), 'questnote-releases');
  const prepared = await prepareReleaseArtifact({ projectRoot: PROJECT_ROOT, outputRoot,
    profile: target.profile, scopePath: target.scopePath });
  const manifestBytes = await fs.readFile(prepared.manifestPath);
  const manifestSha256 = sha256(manifestBytes);
  await verifyReleaseArtifact({ artifactDir: prepared.artifactDir, artifactId: prepared.artifactId, manifestSha256,
    profile: target.profile, scopePath: target.scopePath });
  const manifest = JSON.parse(manifestBytes);
  if (manifest.profile.dbName !== target.dbName) throw new Error(`Unexpected database for ${target.profile}: ${manifest.profile.dbName}`);
  const version = /export const APP_VERSION = '([^']+)'/.exec(
    await fs.readFile(path.join(prepared.artifactDir, 'src/version.js'), 'utf8'))?.[1];
  return { artifactDir: prepared.artifactDir, artifactId: prepared.artifactId, manifestSha256, manifest, version };
}

/** A reusable single-branch clone under the ignored .dev-backups/, fast-forwarded to the remote branch. */
export async function syncDeployClone(target) {
  const clone = path.join(PROJECT_ROOT, '.dev-backups', target.cloneName);
  let exists = true;
  try { await fs.access(path.join(clone, '.git')); } catch { exists = false; }
  if (!exists) {
    await fs.mkdir(path.dirname(clone), { recursive: true });
    log(`Cloning ${target.remote} (${target.branch}) …`);
    execFileSync('git', ['-c', 'core.autocrlf=false', 'clone', '--single-branch', '--branch', target.branch, target.remote, clone],
      { stdio: 'inherit' });
  } else {
    if (git(clone, ['status', '--porcelain'])) throw new Error(`Deploy clone has local changes; inspect ${clone} before retrying.`);
    git(clone, ['fetch', 'origin', target.branch]);
    git(clone, ['merge', '--ff-only', `origin/${target.branch}`]);
  }
  git(clone, ['config', 'core.autocrlf', 'false']);
  return clone;
}

async function listFiles(root, relative = '') {
  const result = [];
  for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await listFiles(root, name));
    else result.push(name);
  }
  return result;
}

/**
 * Make the clone's tree equal to the artifact. `keep` lists path prefixes that are
 * not part of the artifact and must survive (the fixed review pages on the preview site).
 */
export async function replaceTree(clone, artifactDir, { keep = [] } = {}) {
  const kept = (name) => keep.some((prefix) => name === prefix || name.startsWith(`${prefix}/`));
  const wanted = new Set(await listFiles(artifactDir));
  for (const name of await listFiles(clone)) {
    if (name.startsWith('.git/') || kept(name) || wanted.has(name)) continue;
    await fs.rm(path.join(clone, name));
  }
  for (const name of wanted) {
    const destination = path.join(clone, name);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(artifactDir, name), destination);
  }
}

export async function replaceDirectory(clone, relative, sourceDir) {
  const destination = path.join(clone, relative);
  await fs.rm(destination, { recursive: true, force: true });
  await fs.cp(sourceDir, destination, { recursive: true });
}

/** Commit, prove the committed blobs are the artifact bytes (no EOL rewriting), then push without force. */
export async function commitAndPush(clone, target, artifact, message) {
  git(clone, ['add', '--all']);
  if (!git(clone, ['status', '--porcelain'])) { log('Deploy tree already matches; nothing to commit.'); }
  else git(clone, ['commit', '-m', message]);
  const tree = new Map(git(clone, ['ls-tree', '-r', 'HEAD']).split('\n').filter(Boolean).map((line) => {
    const [meta, name] = line.split('\t');
    return [name.replace(/^"|"$/g, ''), meta.split(' ')[2]];
  }));
  const names = [...Object.keys(artifact.manifest.files), MANIFEST];
  for (const name of names) {
    const bytes = await fs.readFile(path.join(artifact.artifactDir, name));
    if (tree.get(name) !== gitBlobSha1(bytes)) throw new Error(`Committed blob differs from artifact bytes: ${name}`);
  }
  log(`Verified ${names.length} committed blobs against the artifact.`);
  git(clone, ['push', 'origin', `HEAD:${target.branch}`]);
  return git(clone, ['rev-parse', 'HEAD']);
}

async function fetchBytes(url) {
  const response = await fetch(url, { cache: 'no-store', redirect: 'error' });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Wait for Pages to serve this artifact's manifest, then compare every file's bytes.
 * The mailbox is published separately after a release, so a newer mailbox is reported, not failed.
 */
export async function verifyHttps(target, artifact, { timeoutMs = 20 * 60 * 1000, concurrency = 8 } = {}) {
  const bust = `?verify=${artifact.artifactId.slice(0, 12)}`;
  const started = Date.now();
  for (;;) {
    try {
      if (sha256(await fetchBytes(`${target.publicUrl}${MANIFEST}${bust}-${Date.now()}`)) === artifact.manifestSha256) break;
    } catch { /* Pages may briefly return errors while deploying. */ }
    if (Date.now() - started > timeoutMs) throw new Error(`Timed out waiting for ${target.publicUrl} to serve artifact ${artifact.artifactId}`);
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
  log(`Live manifest matches after ${Math.round((Date.now() - started) / 1000)}s; comparing every file …`);
  const entries = Object.entries(artifact.manifest.files);
  const mismatches = [];
  const notes = [];
  let index = 0;
  async function worker() {
    while (index < entries.length) {
      const [name, entry] = entries[index++];
      let actual;
      for (let attempt = 0; attempt < 4 && actual !== entry.sha256; attempt += 1) {
        try { actual = sha256(await fetchBytes(`${target.publicUrl}${name}${bust}`)); }
        catch (error) { actual = `error: ${error.message}`; }
        if (actual !== entry.sha256) await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      if (actual === entry.sha256) continue;
      if (name === 'data/global-mailbox.json') notes.push('Live mailbox differs from the artifact (published separately by the mailbox flow).');
      else mismatches.push({ name, expected: entry.sha256, actual });
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  if (mismatches.length) throw new Error(`Live HTTPS bytes differ for ${mismatches.length} files: ${JSON.stringify(mismatches.slice(0, 5))}`);
  return { verifiedFiles: entries.length + 1 - notes.length, notes };
}

export async function writeEvidence(name, value) {
  const directory = path.join(PROJECT_ROOT, '.dev-backups', 'evidence');
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, name);
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
  return file;
}
