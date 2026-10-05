import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { prepareReleaseArtifact } from '../../scripts/releaseArtifact.mjs';
import { verifyReleaseArtifact } from '../../scripts/verify-release-artifact.mjs';

const report = import.meta.dirname;
const root = path.resolve(report, '../..');
const base = 'https://leotsouo.github.io/questnote-pwa/';
const outputRoot = 'C:/Users/User/.codex/visualizations/2026/10/05/01a10b1b-1567-75b3-b3cd-4f5cec637647/questnote-flow-release';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const save = async (name, value) => fs.writeFile(path.join(report, name), JSON.stringify(value, null, 2) + '\n');
const git = (args, options = {}) => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024, ...options });
const get = async (file, id = 'baseline') => {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(new URL(file + '?flow-release=' + id + '-' + Date.now(), base), { signal: AbortSignal.timeout(30000), cache: 'no-store' });
      assert(response.ok, `HTTP ${response.status}: ${file}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) { last = error; }
  }
  throw last;
};

const phase = process.argv[2];
if (phase === 'build') {
  const bytes = await get('release-artifact.json');
  const baseline = JSON.parse(bytes);
  assert.equal(baseline.profile.profile, 'production');
  assert.equal(baseline.profile.scopePath, '/questnote-pwa/');
  const catalogBytes = await get(baseline.profile.contentBundleUrl);
  assert.equal(hash(catalogBytes), baseline.profile.contentBundleSha256);
  const catalog = JSON.parse(catalogBytes);
  for (const [key, file] of [['petsData', 'pets'], ['poolsData', 'pools'], ['loreData', 'pets-lore'], ['seriesCatalog', 'pet-series']]) {
    assert.deepEqual(catalog[key], JSON.parse(await fs.readFile(path.join(root, 'data', file + '.json'))), `Preserve catalog ${file}`);
  }
  const mailbox = await get('data/global-mailbox.json');
  assert.equal(hash(mailbox), hash(await fs.readFile(path.join(root, 'data/global-mailbox.json'))), 'Preserve live mailbox bytes');
  await save('baseline.json', { at: new Date().toISOString(), artifactId: baseline.artifactId, sourceCommit: baseline.sourceCommit, manifestSha256: hash(bytes), catalogSha256: hash(catalogBytes), mailboxSha256: hash(mailbox), pagesCommit: git(['rev-parse', 'origin/gh-pages'], { encoding: 'utf8' }).trim() });
  const artifacts = {};
  for (const [profile, scopePath] of [['production', '/questnote-pwa/'], ['preview', '/questnote-pwa-preview/']]) {
    const result = await prepareReleaseArtifact({ projectRoot: root, outputRoot, profile, scopePath });
    artifacts[profile] = { artifactDir: result.artifactDir, artifactId: result.artifactId, manifestSha256: hash(await fs.readFile(result.manifestPath)), scopePath, fileCount: result.fileCount };
    await verifyReleaseArtifact({ ...artifacts[profile], profile });
  }
  const manifest = JSON.parse(await fs.readFile(path.join(artifacts.production.artifactDir, 'release-artifact.json')));
  assert.equal(manifest.profile.contentBundleSha256, baseline.profile.contentBundleSha256, 'Preserve content bundle');
  for (const [file, entry] of Object.entries(baseline.files)) {
    if (file.startsWith('data/') || file.startsWith('assets/')) {
      const expected = file === 'data/global-mailbox.json' ? hash(mailbox) : entry.sha256;
      assert.equal(manifest.files[file]?.sha256, expected, `Preserve ${file}`);
    }
  }
  await save('artifacts.json', artifacts);
  console.log(JSON.stringify(artifacts, null, 2));
} else if (phase === 'stage') {
  const pins = JSON.parse(await fs.readFile(path.join(report, 'artifacts.json'))).production;
  await verifyReleaseArtifact({ ...pins, profile: 'production' });
  const artifact = pins.artifactDir;
  const manifest = JSON.parse(await fs.readFile(path.join(artifact, 'release-artifact.json')));
  const baseline = JSON.parse(await fs.readFile(path.join(report, 'baseline.json')));
  const parent = git(['rev-parse', 'origin/gh-pages'], { encoding: 'utf8' }).trim();
  assert.equal(parent, baseline.pagesCommit, 'Deployment parent must remain unchanged');
  const index = path.join(root, '.dev-backups', 'flow-release-index-' + pins.artifactId);
  await fs.mkdir(path.dirname(index), { recursive: true });
  const env = { ...process.env, GIT_INDEX_FILE: index };
  git(['read-tree', '--empty'], { env });
  let count = 0;
  for (const file of [...Object.keys(manifest.files), 'release-artifact.json'].sort()) {
    const bytes = await fs.readFile(path.join(artifact, file));
    const expected = file === 'release-artifact.json' ? pins.manifestSha256 : manifest.files[file].sha256;
    assert.equal(hash(bytes), expected, file);
    const object = git(['hash-object', '-w', '--stdin'], { input: bytes, encoding: 'utf8' }).trim();
    assert.equal(hash(git(['cat-file', 'blob', object])), expected, `Git blob ${file}`);
    git(['update-index', '--add', '--cacheinfo', `100644,${object},${file}`], { env });
    count++;
  }
  const tree = git(['write-tree'], { env, encoding: 'utf8' }).trim();
  const commit = git(['commit-tree', tree, '-p', parent], { input: 'V3.8.1: publish verified product-flow safety artifact\n', encoding: 'utf8' }).trim();
  await save('prepared.json', { artifactId: pins.artifactId, commit, parent, tree, verifiedBlobs: count, at: new Date().toISOString() });
  console.log(`Prepared ${commit}; ${count} Git blobs verified; not pushed`);
} else if (phase === 'https') {
  const pins = JSON.parse(await fs.readFile(path.join(report, 'artifacts.json'))).production;
  const manifestBytes = await get('release-artifact.json', pins.artifactId);
  assert.equal(hash(manifestBytes), pins.manifestSha256, 'Live manifest');
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.artifactId, pins.artifactId);
  const files = Object.keys(manifest.files).filter((file) => file !== '.nojekyll');
  let next = 0;
  const checks = [];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < files.length) {
      const file = files[next++];
      const bytes = await get(file, pins.artifactId);
      assert.equal(hash(bytes), manifest.files[file].sha256, `HTTPS ${file}`);
      checks.push({ file, sha256: hash(bytes), bytes: bytes.length });
    }
  }));
  await save('https.json', { status: 'passed', at: new Date().toISOString(), url: base, artifactId: pins.artifactId, manifestSha256: pins.manifestSha256, verifiedFiles: checks.length + 1, checks: checks.sort((a, b) => a.file.localeCompare(b.file)) });
  console.log(`PASS ${checks.length + 1} HTTPS files match production artifact`);
} else throw new Error('Use build, stage, or https');
