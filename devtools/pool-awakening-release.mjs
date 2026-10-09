/** Immutable release checks. Explicit modes; this tool never pushes or deploys. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { prepareReleaseArtifact } from '../scripts/releaseArtifact.mjs';
import { verifyReleaseArtifact } from '../scripts/verify-release-artifact.mjs';
import { APP_VERSION } from '../src/version.js';
const root = path.resolve(import.meta.dirname, '..');
const [mode, reportArg, outputArg] = process.argv.slice(2);
assert.ok(['assemble', 'browser', 'tree', 'live'].includes(mode));
assert.ok(reportArg, 'Dedicated report directory required');
const report = path.resolve(reportArg);
await fs.mkdir(report, { recursive: true });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const save = (name, value) => fs.writeFile(path.join(report, name), JSON.stringify(value, null, 2) + '\n');
const git = (args, options = {}) => execFileSync('git', ['-c', 'core.longpaths=true', ...args], { cwd: root, maxBuffer: 512 * 1024 * 1024, ...options });
if (mode === 'assemble') {
  assert.ok(outputArg, 'Outside-project artifact output required');
  assert.equal(git(['status', '--porcelain']).toString().trim(), '', 'Commit source before assembly');
  const pins = {};
  for (const profile of ['preview', 'production']) {
    const scopePath = profile === 'production' ? '/questnote-pwa/' : '/questnote-pwa-preview/';
    const result = await prepareReleaseArtifact({ projectRoot: root, outputRoot: path.resolve(outputArg), profile, scopePath });
    const bytes = await fs.readFile(result.manifestPath);
    pins[profile] = { artifactDir: result.artifactDir, artifactId: result.artifactId, manifestSha256: hash(bytes), scopePath };
    await verifyReleaseArtifact({ ...pins[profile], profile });
    console.log('PASS assembled and verified ' + profile + ' ' + result.artifactId);
  }
  await save('artifacts.json', pins);
  await save('baseline.json', { originPages: git(['rev-parse', 'origin/gh-pages']).toString().trim(), source: git(['rev-parse', 'HEAD']).toString().trim() });
} else {
  const pins = JSON.parse(await fs.readFile(path.join(report, 'artifacts.json')));
  for (const profile of ['preview', 'production']) await verifyReleaseArtifact({ ...pins[profile], profile });
  if (mode === 'browser') {
    const child = spawn(process.execPath, ['devtools/release-artifact-browser-server.mjs', '--production', pins.production.artifactDir, '--preview', pins.preview.artifactDir], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let browser;
    try {
      const origin = await new Promise((resolve, reject) => {
        let output = '';
        child.stdout.on('data', (bytes) => { output += bytes; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) resolve(match[0]); });
        child.stderr.on('data', (bytes) => process.stderr.write(bytes));
        child.once('error', reject); child.once('exit', (code) => reject(Error('Artifact server exited ' + code)));
      });
      const { chromium } = createRequire(import.meta.url)(process.env.QUESTNOTE_PLAYWRIGHT_PACKAGE || 'playwright');
      browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
      const context = await browser.newContext();
      await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      const page = await context.newPage();
      await page.goto(origin + '/test/');
      await page.waitForFunction(() => { try { return JSON.parse(document.querySelector('#results').textContent).running === false; } catch { return false; } }, null, { timeout: 240000 });
      const result = JSON.parse(await page.locator('#results').innerText());
      await save('artifact-browser.json', result);
      assert.equal(result.failed, 0, JSON.stringify(result.results.filter((row) => !row.ok)));
      console.log('PASS native artifact tests: ' + result.passed);
      await context.close();
    } finally { await browser?.close(); child.kill(); }
  } else if (mode === 'tree') {
    const acceptance = JSON.parse(await fs.readFile(path.join(report, 'artifact-browser.json')));
    assert.equal(acceptance.failed, 0, 'Artifact acceptance must pass');
    const baseline = JSON.parse(await fs.readFile(path.join(report, 'baseline.json')));
    const parent = git(['rev-parse', 'origin/gh-pages']).toString().trim();
    assert.equal(parent, baseline.originPages, 'Formal baseline moved; rebuild from latest source/mailbox');
    const manifestBytes = await fs.readFile(path.join(pins.production.artifactDir, 'release-artifact.json'));
    const manifest = JSON.parse(manifestBytes);
    const names = [...Object.keys(manifest.files), 'release-artifact.json'].sort();
    const entries = [];
    for (const name of names) {
      const bytes = await fs.readFile(path.join(pins.production.artifactDir, name));
      const oid = git(['hash-object', '-w', '--stdin'], { input: bytes }).toString().trim();
      entries.push('100644 ' + oid + '\t' + name);
    }
    const env = { ...process.env, GIT_INDEX_FILE: path.join(report, 'deployment.index') };
    git(['read-tree', '--empty'], { env });
    git(['update-index', '--index-info'], { env, input: entries.join('\n') + '\n' });
    const tree = git(['write-tree'], { env }).toString().trim();
    const commit = git(['commit-tree', tree, '-p', parent], { input: `V${APP_VERSION}: publish verified artifact ${pins.production.artifactId}\n` }).toString().trim();
    assert.deepEqual(git(['ls-tree', '-r', '--name-only', '-z', commit]).toString().split('\0').filter(Boolean).sort(), names);
    for (let offset = 0; offset < names.length; offset += 32) {
      const group = names.slice(offset, offset + 32);
      const batch = git(['cat-file', '--batch'], { input: group.map((name) => commit + ':' + name + '\n').join('') });
      let cursor = 0;
      for (const name of group) {
        const newline = batch.indexOf(10, cursor);
        const [, type, length] = batch.subarray(cursor, newline).toString().split(' ');
        assert.equal(type, 'blob'); cursor = newline + 1;
        assert.equal(hash(batch.subarray(cursor, cursor + Number(length))), name === 'release-artifact.json' ? pins.production.manifestSha256 : manifest.files[name].sha256);
        cursor += Number(length) + 1;
      }
      assert.equal(cursor, batch.length);
    }
    await save('deployment-tree.json', { ok: true, parent, tree, deploymentCommit: commit, sourceCommit: manifest.sourceCommit, artifactId: manifest.artifactId, verifiedFiles: names.length });
    console.log('PASS byte-exact deployment tree ' + commit);
  } else {
    const base = 'https://leotsouo.github.io/questnote-pwa/';
    const get = async (name) => {
      const response = await fetch(base + name + '?release-check=' + pins.production.artifactId);
      assert.equal(response.status, 200, name);
      return Buffer.from(await response.arrayBuffer());
    };
    const manifestBytes = await get('release-artifact.json');
    assert.equal(hash(manifestBytes), pins.production.manifestSha256);
    const manifest = JSON.parse(manifestBytes);
    const entries = Object.entries(manifest.files).filter(([name]) => name !== '.nojekyll');
    let index = 0;
    await Promise.all(Array.from({ length: 8 }, async () => {
      while (index < entries.length) {
        const [name, entry] = entries[index++];
        const bytes = await get(name);
        assert.equal(bytes.length, entry.bytes, name); assert.equal(hash(bytes), entry.sha256, name);
      }
    }));
    await save('live-verification.json', { ok: true, checkedAt: new Date().toISOString(), url: base, artifactId: manifest.artifactId, sourceCommit: manifest.sourceCommit, manifestSha256: pins.production.manifestSha256, checkedHttpsFiles: entries.length + 1 });
    console.log('PASS exact HTTPS release: ' + (entries.length + 1) + ' files');
  }
}
