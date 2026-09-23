import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prepareReleaseArtifact } from '../scripts/releaseArtifact.mjs';
import { verifyReleaseArtifact } from '../scripts/verify-release-artifact.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => JSON.stringify(value, null, 2) + '\n';

test('strict verifier accepts assembler output and rejects unsafe or inconsistent deployment bytes', async (t) => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'questnote-verify-artifact-'));
  try {
    const source = path.join(temporary, 'source');
    await fs.mkdir(source);
    for (const directory of ['src', 'data', 'content/release-compatibility']) {
      await fs.cp(path.join(repository, directory), path.join(source, directory), { recursive: true });
    }
    for (const name of ['index.html', 'manifest.webmanifest', 'service-worker.js', '.nojekyll']) {
      await fs.copyFile(path.join(repository, name), path.join(source, name));
    }
    const pets = JSON.parse(await fs.readFile(path.join(source, 'data/pets.json'))).pets;
    const images = new Set(pets.flatMap((pet) => [pet.image, ...Object.values(pet.imageVariants || {})]));
    images.add('assets/icons/icon-192.png'); images.add('assets/icons/icon-512.png');
    for (const name of images) {
      await fs.mkdir(path.dirname(path.join(source, name)), { recursive: true });
      await fs.writeFile(path.join(source, name), `synthetic-image:${name}`);
    }
    execFileSync('git', ['init', '--quiet', source]);
    execFileSync('git', ['-C', source, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
      'commit', '--quiet', '--allow-empty', '-m', 'Synthetic verifier source']);
    const buildOptions = { projectRoot: source, outputRoot: path.join(temporary, 'artifacts'), profile: 'production', scopePath: '/questnote-pwa/' };
    const built = await prepareReleaseArtifact(buildOptions);
    const pins = { artifactDir: built.artifactDir, artifactId: built.artifactId,
      manifestSha256: hash(await fs.readFile(built.manifestPath)), profile: 'production', scopePath: '/questnote-pwa/' };
    let caseNumber = 0;
    async function copy() {
      const artifactDir = path.join(temporary, `case-${++caseNumber}`);
      await fs.cp(built.artifactDir, artifactDir, { recursive: true });
      return { ...pins, artifactDir };
    }
    async function repin(options, change) {
      const manifestFile = path.join(options.artifactDir, 'release-artifact.json');
      const manifest = JSON.parse(await fs.readFile(manifestFile));
      await change(manifest);
      const bytes = json(manifest);
      await fs.writeFile(manifestFile, bytes);
      options.manifestSha256 = hash(bytes);
    }
    async function rewrite(options, name, transform) {
      const file = path.join(options.artifactDir, name);
      const bytes = Buffer.from(transform(await fs.readFile(file, 'utf8')));
      await fs.writeFile(file, bytes);
      await repin(options, (manifest) => { manifest.files[name] = { sha256: hash(bytes), bytes: bytes.length }; });
    }

    await t.test('genuine production and preview assembler output and CLI pass', async () => {
      assert.equal((await verifyReleaseArtifact(pins)).ok, true);
      const preview = await prepareReleaseArtifact({ ...buildOptions, profile: 'preview', scopePath: '/questnote-pwa-preview/' });
      assert.equal((await verifyReleaseArtifact({ artifactDir: preview.artifactDir, artifactId: preview.artifactId,
        manifestSha256: hash(await fs.readFile(preview.manifestPath)), profile: 'preview', scopePath: '/questnote-pwa-preview/' })).ok, true);
      const stdout = execFileSync(process.execPath, [path.join(repository, 'scripts/verify-release-artifact.mjs'),
        '--artifact-dir', pins.artifactDir, '--artifact-id', pins.artifactId, '--manifest-sha256', pins.manifestSha256,
        '--profile', pins.profile, '--scope', pins.scopePath], { encoding: 'utf8' });
      assert.equal(JSON.parse(stdout).artifactId, built.artifactId);
    });
    await t.test('all caller pins are mandatory and binding', async () => {
      for (const key of Object.keys(pins)) await assert.rejects(verifyReleaseArtifact({ ...pins, [key]: undefined }), /pins are required/);
      await assert.rejects(verifyReleaseArtifact({ ...pins, manifestSha256: '0'.repeat(64) }), /Pinned manifest/);
      await assert.rejects(verifyReleaseArtifact({ ...pins, artifactId: '0'.repeat(64) }), /artifact ID mismatch/);
      await assert.rejects(verifyReleaseArtifact({ ...pins, profile: 'preview' }), /Pinned profile/);
      await assert.rejects(verifyReleaseArtifact({ ...pins, scopePath: '/other/' }), /Pinned profile/);
      await assert.rejects(verifyReleaseArtifact({ ...pins, scopePath: '/' }), /pins are required/);
    });
    await t.test('extra, missing and untracked empty directories fail', async () => {
      const extra = await copy(); await fs.writeFile(path.join(extra.artifactDir, '.secret'), 'not published');
      await assert.rejects(verifyReleaseArtifact(extra), /inventory mismatch/);
      const missing = await copy(); await fs.unlink(path.join(missing.artifactDir, 'src/app.js'));
      await assert.rejects(verifyReleaseArtifact(missing), /inventory mismatch/);
      const empty = await copy(); await fs.mkdir(path.join(empty.artifactDir, 'unexpected'));
      await assert.rejects(verifyReleaseArtifact(empty), /Unexpected empty/);
    });
    await t.test('nojekyll must be in both actual and pinned inventory', async () => {
      const options = await copy();
      await fs.unlink(path.join(options.artifactDir, '.nojekyll'));
      await repin(options, (manifest) => { delete manifest.files['.nojekyll']; });
      await assert.rejects(verifyReleaseArtifact(options), /include .nojekyll/);
    });
    await t.test('tampered bytes and forged byte counts fail', async () => {
      const options = await copy(); await fs.appendFile(path.join(options.artifactDir, 'src/app.js'), '\n// changed');
      await assert.rejects(verifyReleaseArtifact(options), /hash\/bytes mismatch/);
      const badCount = await copy(); await repin(badCount, (manifest) => { manifest.files['src/app.js'].bytes += 1; });
      await assert.rejects(verifyReleaseArtifact(badCount), /hash\/bytes mismatch/);
    });
    await t.test('manifest traversal, Windows path aliases and self-inventory fail before use', async () => {
      for (const name of ['../escape', '/absolute', 'src\\app.js', 'src/app.js:stream', 'src/%2e%2e/escape', 'src/app.js.', 'src/NUL']) {
        const options = await copy();
        await repin(options, (manifest) => { manifest.files[name] = { sha256: hash('x'), bytes: 1 }; });
        await assert.rejects(verifyReleaseArtifact(options), /Unsafe artifact path/);
      }
      const self = await copy();
      await repin(self, (manifest) => { manifest.files['release-artifact.json'] = { sha256: hash('x'), bytes: 1 }; });
      await assert.rejects(verifyReleaseArtifact(self), /exclude the manifest/);
    });
    await t.test('directory symlinks/junctions and linked ancestor roots fail', async () => {
      const options = await copy();
      const linked = path.join(options.artifactDir, 'linked');
      await fs.symlink(source, linked, process.platform === 'win32' ? 'junction' : 'dir');
      await assert.rejects(verifyReleaseArtifact(options), /Symlink\/junction/);
      const alias = path.join(temporary, 'artifact-alias');
      await fs.symlink(built.artifactDir, alias, process.platform === 'win32' ? 'junction' : 'dir');
      await assert.rejects(verifyReleaseArtifact({ ...pins, artifactDir: alias }), /Symlink\/junction/);
    });
    await t.test('rehashed inconsistent runtime descriptor is rejected without executing it', async () => {
      const options = await copy();
      await rewrite(options, 'src/releaseProfile.js', (value) => value.replace('QuestNoteDB', 'QuestNotePreviewDB'));
      await assert.rejects(verifyReleaseArtifact(options), /Runtime descriptor identity/);
    });
    await t.test('rehashed index and webmanifest deployment changes fail', async () => {
      const index = await copy();
      await rewrite(index, 'index.html', (value) => value.replace(`content="${built.artifactId}"`, `content="${'0'.repeat(64)}"`));
      await assert.rejects(verifyReleaseArtifact(index), /Index artifact marker/);
      const webmanifest = await copy();
      await rewrite(webmanifest, 'manifest.webmanifest', (value) => json({ ...JSON.parse(value), scope: '/wrong/' }));
      await assert.rejects(verifyReleaseArtifact(webmanifest), /Webmanifest deployment identity/);
      const diagnostics = await copy();
      await rewrite(diagnostics, 'manifest.webmanifest', (value) => {
        const manifest = JSON.parse(value);
        return json({ ...manifest, start_url: manifest.start_url + '?perf=1' });
      });
      await assert.rejects(verifyReleaseArtifact(diagnostics), /Webmanifest deployment identity/);
    });
    await t.test('rehashed SW descriptor, cache identity and registration changes fail', async () => {
      const worker = await copy();
      await rewrite(worker, 'service-worker.js', (value) => value.replace('"dbName": "QuestNoteDB"', '"dbName": "QuestNotePreviewDB"'));
      await assert.rejects(verifyReleaseArtifact(worker), /Worker descriptor identity/);
      const cache = await copy();
      await rewrite(cache, 'src/version.js', (value) => value.replace(`questnote-production-app-${built.artifactId}`, 'questnote-production-app-wrong'));
      await assert.rejects(verifyReleaseArtifact(cache), /cache identity mismatch/);
      const url = await copy();
      await rewrite(url, 'src/version.js', (value) => value.replace(`./service-worker.js?artifact=${built.artifactId}`, './service-worker.js'));
      await assert.rejects(verifyReleaseArtifact(url), /registration identity/);
    });
    await t.test('rehashed precache digest or catalog edits cannot pass', async () => {
      const worker = await copy();
      const report = JSON.parse(await fs.readFile(built.manifestPath));
      await rewrite(worker, 'service-worker.js', (value) => value.replace(report.files['src/app.js'].sha256, '0'.repeat(64)));
      await assert.rejects(verifyReleaseArtifact(worker), /precache hash mismatch/);
      const catalog = await copy();
      await rewrite(catalog, report.profile.contentBundleUrl, (value) => value + ' ');
      await assert.rejects(verifyReleaseArtifact(catalog), /precache hash mismatch|Catalog generation hash mismatch/);
    });
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
