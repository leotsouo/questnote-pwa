import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prepareReleaseArtifact } from '../scripts/releaseArtifact.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const stringify = (value) => JSON.stringify(value, null, 2) + '\n';
async function exists(file) { try { await fs.stat(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
async function tree(root, relative = '') {
  const entries = [];
  for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) entries.push(...await tree(root, name));
    else entries.push([name, hash(await fs.readFile(path.join(root, name)))]);
  }
  return entries.sort(([a], [b]) => a.localeCompare(b));
}
function extractConstant(source, name) {
  const start = source.indexOf(`const ${name} = `);
  assert.notEqual(start, -1);
  const body = source.slice(start + `const ${name} = `.length);
  return JSON.parse(body.slice(0, body.indexOf(';')));
}

test('release artifact preparation is immutable, isolated and content complete', async (t) => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'questnote-release-test-'));
  const projectRoot = path.join(temporary, 'source');
  const outputRoot = path.join(temporary, 'artifacts');
  try {
    await fs.mkdir(projectRoot);
    for (const directory of ['src', 'data']) await fs.cp(path.join(repository, directory), path.join(projectRoot, directory), { recursive: true });
    await fs.cp(path.join(repository, 'content/release-compatibility'), path.join(projectRoot, 'content/release-compatibility'), { recursive: true });
    for (const name of ['index.html', 'manifest.webmanifest', 'service-worker.js']) await fs.copyFile(path.join(repository, name), path.join(projectRoot, name));
    const pets = JSON.parse(await fs.readFile(path.join(projectRoot, 'data/pets.json'))).pets;
    const images = [...new Set(pets.flatMap((pet) => [pet.image, ...Object.values(pet.imageVariants || {})]))];
    images.push('assets/icons/icon-192.png', 'assets/icons/icon-512.png');
    // Tiny stand-ins exercise file closure/hash checks; these tests do not claim
    // image dimension or artistic validation (the production image tools own it).
    for (const name of images) {
      await fs.mkdir(path.dirname(path.join(projectRoot, name)), { recursive: true });
      await fs.writeFile(path.join(projectRoot, name), `synthetic-image:${name}`);
    }
    execFileSync('git', ['init', '--quiet', projectRoot]);
    execFileSync('git', ['-C', projectRoot, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
      'commit', '--quiet', '--allow-empty', '-m', 'Synthetic artifact source']);
    const sourceBefore = await tree(projectRoot);
    const options = { projectRoot, outputRoot, profile: 'production', scopePath: '/questnote/' };
    let production;

    await t.test('dry-run validates without creating output or modifying source', async () => {
      const result = await prepareReleaseArtifact({ ...options, dryRun: true });
      assert.equal(result.dryRun, true);
      assert.equal(await exists(outputRoot), false);
      assert.deepEqual(await tree(projectRoot), sourceBefore);
    });
    await t.test('production config, final-byte precache hashes and baseline files agree', async () => {
      production = await prepareReleaseArtifact(options);
      assert.equal(production.releaseReady, false);
      const html = await fs.readFile(path.join(production.artifactDir, 'index.html'), 'utf8');
      assert.ok(html.includes(`<meta name="questnote-artifact" content="${production.artifactId}">`));
      const manifest = JSON.parse(await fs.readFile(path.join(production.artifactDir, 'manifest.webmanifest')));
      assert.equal(manifest.name, 'QuestNote'); assert.equal(manifest.short_name, 'QN');
      assert.equal(manifest.id, '/questnote/'); assert.equal(manifest.scope, '/questnote/');
      assert.equal(manifest.start_url, '/questnote/index.html');
      const worker = await fs.readFile(path.join(production.artifactDir, 'service-worker.js'), 'utf8');
      const version = await fs.readFile(path.join(production.artifactDir, 'src/version.js'), 'utf8');
      assert.ok(version.includes(production.artifactId));
      const hashes = extractConstant(worker, 'PRECACHE_HASHES');
      const urls = extractConstant(worker, 'PRECACHE_URLS');
      assert.ok(urls.includes('src/backupSchema.js'));
      assert.ok(urls.includes('src/poolContentContract.js'));
      assert.ok(urls.includes(production.descriptor.contentBundleUrl));
      assert.equal(urls.some((name) => name.startsWith('assets/pets/')), false);
      assert.equal(urls.includes('service-worker.js'), false);
      assert.equal(urls.includes('data/global-mailbox.json'), false);
      for (const name of urls) assert.equal(hash(await fs.readFile(path.join(production.artifactDir, name))), hashes[name], name);
      assert.deepEqual(extractConstant(worker, 'BUILD_PROFILE'), production.descriptor);
      for (const name of ['pets', 'pools', 'pets-lore', 'pet-series']) {
        assert.deepEqual(await fs.readFile(path.join(projectRoot, `content/release-compatibility/v3.4.4/${name}.json`)), await fs.readFile(path.join(production.artifactDir, `data/${name}.json`)));
      }
      const report = JSON.parse(await fs.readFile(production.manifestPath));
      assert.equal(report.liveBaseline, 'UNKNOWN'); assert.equal(report.nativePwaValidation, 'NOT_RUN');
      assert.equal(report.files['release-artifact.json'], undefined, 'manifest hash must not be self-referential');
      for (const [name, value] of Object.entries(report.files)) assert.equal(hash(await fs.readFile(path.join(production.artifactDir, name))), value.sha256);
    });
    await t.test('identical inputs reuse identical artifact and preview is isolated', async () => {
      const again = await prepareReleaseArtifact(options);
      assert.equal(again.artifactId, production.artifactId); assert.equal(again.reused, true);
      const preview = await prepareReleaseArtifact({ ...options, profile: 'preview', scopePath: '/review/' });
      assert.notEqual(preview.artifactId, production.artifactId);
      assert.equal(preview.descriptor.dbName, 'QuestNotePreviewDB');
      assert.equal(preview.descriptor.cacheNamespace, 'questnote-preview-');
      const manifest = JSON.parse(await fs.readFile(path.join(preview.artifactDir, 'manifest.webmanifest')));
      assert.equal(manifest.short_name, 'QN 預覽'); assert.equal(manifest.scope, '/review/');
      assert.equal(manifest.start_url, '/review/index.html?perf=1');
    });
    await t.test('recursive literal imports are discovered and missing imports fail before writes', async () => {
      const entry = path.join(projectRoot, 'src/app.js'); const original = await fs.readFile(entry);
      await fs.writeFile(path.join(projectRoot, 'src/new-dependency.js'), 'export const fixture = true;\n');
      await fs.appendFile(entry, "\nimport './new-dependency.js';\n");
      const result = await prepareReleaseArtifact({ ...options, dryRun: true });
      assert.ok(result.manifest.files['src/new-dependency.js']);
      assert.notEqual(result.artifactId, production.artifactId, 'Uncommitted source bytes identify a different artifact');
      await fs.unlink(path.join(projectRoot, 'src/new-dependency.js'));
      await assert.rejects(() => prepareReleaseArtifact({ ...options, dryRun: true }), /ENOENT/);
      await fs.writeFile(entry, original);
    });
    await t.test('another runtime validator cannot be certified using this checkout contract', async () => {
      const target = path.join(projectRoot, 'src/petPoolFilter.js'); const original = await fs.readFile(target);
      await fs.appendFile(target, '\n// Different source contract.\n');
      await assert.rejects(() => prepareReleaseArtifact({ ...options, dryRun: true }), /Runtime validator differs/);
      await fs.writeFile(target, original);
    });
    await t.test('later authoring promotion never changes the legacy URLs served to old clients', async () => {
      const target = path.join(projectRoot, 'data/pools.json'); const original = await fs.readFile(target);
      const next = JSON.parse(original);
      next.pools.push({ ...structuredClone(next.pools[0]), id: 'promoted_pool', name: 'Previously approved pool' });
      await fs.writeFile(target, stringify(next));
      const result = await prepareReleaseArtifact(options);
      const legacy = JSON.parse(await fs.readFile(path.join(result.artifactDir, 'data/pools.json')));
      const current = JSON.parse(await fs.readFile(path.join(result.artifactDir, result.descriptor.contentBundleUrl)));
      assert.equal(legacy.pools.some((pool) => pool.id === 'promoted_pool'), false);
      assert.equal(current.poolsData.pools.some((pool) => pool.id === 'promoted_pool'), true);
      assert.equal(result.manifest.legacyCompatibility.sourceCommit, 'aada9a73e6cf0381fc03359dafd78b70b274cce2');
      await fs.writeFile(target, original);
      const frozen = path.join(projectRoot, 'content/release-compatibility/v3.4.4/pools.json'); const frozenBytes = await fs.readFile(frozen);
      await fs.appendFile(frozen, ' ');
      await assert.rejects(() => prepareReleaseArtifact({ ...options, dryRun: true }), /Frozen legacy catalog hash mismatch/);
      await fs.writeFile(frozen, frozenBytes);
    });
    await t.test('bootstrap entrypoint and its dynamic app import are included in precache', async () => {
      const target = path.join(projectRoot, 'index.html'); const original = await fs.readFile(target);
      const bootstrap = path.join(projectRoot, 'src/artifact-bootstrap-fixture.js');
      const html = original.toString('utf8').replace(/src\/(?:app|bootstrap)\.js/g, 'src/artifact-bootstrap-fixture.js');
      assert.notEqual(html, original.toString('utf8'));
      await fs.writeFile(target, html); await fs.writeFile(bootstrap, "await import('./app.js');\n");
      const result = await prepareReleaseArtifact({ ...options, dryRun: true });
      assert.ok(result.manifest.files['src/artifact-bootstrap-fixture.js']);
      assert.ok(result.manifest.files['src/app.js']);
      await fs.writeFile(target, original); await fs.unlink(bootstrap);
    });
    await t.test('missing image references and unsafe output roots are rejected', async () => {
      const file = path.join(projectRoot, images[0]); const original = await fs.readFile(file);
      await fs.unlink(file);
      await assert.rejects(() => prepareReleaseArtifact({ ...options, dryRun: true }), /Missing referenced/);
      await fs.writeFile(file, original);
      await assert.rejects(() => prepareReleaseArtifact({ ...options, outputRoot: path.join(projectRoot, 'data') }), /outside the source/);
      await assert.rejects(() => prepareReleaseArtifact({ ...options, scopePath: '/../escape/' }), /scopePath/);
    });
    await t.test('candidate hashes, additive identities and unchanged legacy catalogs are enforced', async () => {
      const candidateDir = path.join(temporary, 'candidate'); await fs.mkdir(candidateDir);
      const bundle = JSON.parse(await fs.readFile(path.join(production.artifactDir, production.descriptor.contentBundleUrl)));
      bundle.poolsData.pools.push({ ...structuredClone(bundle.poolsData.pools[0]), id: 'synthetic_pool', name: 'Synthetic pool' });
      const catalog = path.join(candidateDir, 'catalog.json');
      const candidateManifest = path.join(candidateDir, 'candidate.json');
      const metadata = { 'validation.json': stringify({ ok: true }), 'approvals.json': stringify({ approved: true }) };
      const imageName = 'assets/pets/pet_n9999.png';
      await fs.mkdir(path.dirname(path.join(candidateDir, imageName)), { recursive: true });
      await fs.writeFile(path.join(candidateDir, imageName), 'synthetic-new-image');
      const newPet = { ...structuredClone(bundle.petsData.pets[0]), id: 'pet_n9999', name: 'Synthetic artifact pet', image: imageName };
      delete newPet.imageVariants;
      bundle.petsData.pets.push(newPet);
      bundle.loreData.lore.push({ ...structuredClone(bundle.loreData.lore[0]), id: newPet.id });
      async function writeCandidate() {
        const bytes = stringify(bundle); await fs.writeFile(catalog, bytes);
        for (const [name, value] of Object.entries(metadata)) await fs.writeFile(path.join(candidateDir, name), value);
        await fs.writeFile(candidateManifest, stringify({ schemaVersion: 1, releaseReady: false,
          files: { 'catalog.json': hash(bytes), [imageName]: hash('synthetic-new-image'),
            ...Object.fromEntries(Object.entries(metadata).map(([name, value]) => [name, hash(value)])) } }));
      }
      await writeCandidate();
      const candidate = await prepareReleaseArtifact({ ...options, candidateDir });
      assert.notEqual(candidate.artifactId, production.artifactId);
      assert.equal(candidate.manifest.inputVerification, 'candidate-file-hashes');
      assert.equal(await fs.readFile(path.join(candidate.artifactDir, imageName), 'utf8'), 'synthetic-new-image');
      for (const [name, value] of Object.entries(metadata)) assert.equal(await fs.readFile(path.join(candidate.artifactDir, 'release-input', name), 'utf8'), value);
      assert.equal(extractConstant(await fs.readFile(path.join(candidate.artifactDir, 'service-worker.js'), 'utf8'), 'PRECACHE_URLS')
        .some((name) => name.startsWith('release-input/')), false);
      assert.deepEqual(await fs.readFile(path.join(candidate.artifactDir, 'data/pools.json')), await fs.readFile(path.join(projectRoot, 'data/pools.json')));
      const publishedExpansion = bundle.poolsData.pools.find((pool) => pool.unlockExpansion).unlockExpansion;
      const previousKey = publishedExpansion.key;
      publishedExpansion.key = 'changed_published_identity';
      await writeCandidate();
      await assert.rejects(() => prepareReleaseArtifact({ ...options, candidateDir, dryRun: true }), /Published pool contract changed/);
      publishedExpansion.key = previousKey;
      await writeCandidate();
      await fs.appendFile(catalog, ' ');
      await assert.rejects(() => prepareReleaseArtifact({ ...options, candidateDir, dryRun: true }), /hash mismatch/);
      await writeCandidate(); await fs.writeFile(path.join(candidateDir, 'unlisted.txt'), 'unlisted');
      await assert.rejects(() => prepareReleaseArtifact({ ...options, candidateDir, dryRun: true }), /unlisted/);
      await fs.unlink(path.join(candidateDir, 'unlisted.txt'));
      const collision = images[0];
      await fs.writeFile(path.join(candidateDir, collision), 'changed-existing-image');
      const collisionManifest = JSON.parse(await fs.readFile(candidateManifest));
      collisionManifest.files[collision] = hash('changed-existing-image');
      await fs.writeFile(candidateManifest, stringify(collisionManifest));
      await assert.rejects(() => prepareReleaseArtifact({ ...options, candidateDir, dryRun: true }), /overwrite an existing image/);
      await fs.unlink(path.join(candidateDir, collision)); await writeCandidate();
      bundle.petsData.pets = bundle.petsData.pets.filter((pet) => pet.id !== 'pet_n01');
      bundle.loreData.lore = bundle.loreData.lore.filter((lore) => lore.id !== 'pet_n01');
      await writeCandidate();
      await assert.rejects(() => prepareReleaseArtifact({ ...options, candidateDir, dryRun: true }), /removes persistent content identity/);
    });
    await t.test('existing artifact corruption and missing files are never overwritten', async () => {
      const target = path.join(production.artifactDir, 'index.html'); const original = await fs.readFile(target);
      await fs.writeFile(target, 'corrupt');
      await assert.rejects(() => prepareReleaseArtifact(options), /corrupt or different/);
      assert.equal(await fs.readFile(target, 'utf8'), 'corrupt');
      await fs.unlink(target);
      await assert.rejects(() => prepareReleaseArtifact({ ...options, dryRun: true }), /file list differs/);
      await fs.writeFile(target, original);
    });
    await t.test('junction/symlink inputs and output roots are refused', async () => {
      const target = path.join(temporary, 'linked-content'); await fs.mkdir(target);
      const junction = path.join(projectRoot, 'assets', 'junction');
      await fs.symlink(target, junction, process.platform === 'win32' ? 'junction' : 'dir');
      await assert.rejects(() => prepareReleaseArtifact({ ...options, dryRun: true }), /Symlink\/junction/);
      await fs.unlink(junction);
      const linkedOutput = path.join(temporary, 'linked-output');
      await fs.symlink(outputRoot, linkedOutput, process.platform === 'win32' ? 'junction' : 'dir');
      await assert.rejects(() => prepareReleaseArtifact({ ...options, outputRoot: linkedOutput, dryRun: true }), /Symlink\/junction/);
      await fs.unlink(linkedOutput);
    });
    assert.deepEqual(await tree(projectRoot), sourceBefore, 'Assembler must leave source bytes unchanged');
    assert.equal((await fs.readdir(outputRoot)).some((name) => name.startsWith('.staging-')), false);
  } finally {
    const safe = path.resolve(temporary);
    assert.equal(path.dirname(safe), path.resolve(os.tmpdir()));
    assert.ok(path.basename(safe).startsWith('questnote-release-test-'));
    await fs.rm(safe, { recursive: true, force: true });
  }
});
