/** Local immutable artifact assembly. This module never deploys or changes source files. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateContentBundle, validateReleaseProfile } from '../src/releaseCatalog.js';
import { POOL_CONTENT_SCHEMA_VERSION, validatePoolContent } from '../src/poolContentContract.js';

const CATALOG_FILES = { petsData: 'data/pets.json', poolsData: 'data/pools.json',
  loreData: 'data/pets-lore.json', seriesCatalog: 'data/pet-series.json' };
const HASH = /^[a-f0-9]{64}$/;
const PROFILES = { production: { dbName: 'QuestNoteDB', cacheNamespace: 'questnote-production-' },
  preview: { dbName: 'QuestNotePreviewDB', cacheNamespace: 'questnote-preview-' } };
const MANIFEST_FILE = 'release-artifact.json';
const LEGACY_DIRECTORY = 'content/release-compatibility/v3.4.4';
const CANDIDATE_METADATA = new Set(['validation.json', 'approvals.json']);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sorted = (entries) => Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b, 'en')));
const jsonBytes = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

function relativeFile(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || /[%?#\u0000-\u001f:]/.test(value)
    || path.posix.isAbsolute(value) || value.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe relative artifact path: ${String(value)}`);
  }
  return value;
}

/** Reject symlinks/junctions at every existing component, including ancestor roots. */
async function noLinks(target, { allowMissing = false } = {}) {
  const absolute = path.resolve(target);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try { stat = await fs.lstat(current); }
    catch (error) { if (allowMissing && error.code === 'ENOENT') continue; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`Symlink/junction is not allowed: ${current}`);
  }
  return absolute;
}

async function readFile(root, relative) {
  const target = path.join(root, relativeFile(relative));
  await noLinks(target);
  if (!(await fs.stat(target)).isFile()) throw new Error(`Not a regular file: ${target}`);
  return fs.readFile(target);
}

async function listFiles(root, relative = '') {
  const directory = path.join(root, relative);
  await noLinks(directory);
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    relativeFile(child);
    if (entry.isSymbolicLink()) throw new Error(`Symlink/junction is not allowed: ${child}`);
    if (entry.isDirectory()) result.push(...await listFiles(root, child));
    else if (entry.isFile()) result.push(child);
    else throw new Error(`Unsupported filesystem entry: ${child}`);
  }
  return result.sort();
}

function replaceOne(source, expression, replacement, label) {
  const matches = [...source.matchAll(new RegExp(expression.source, 'g'))];
  if (matches.length !== 1) throw new Error(`Expected one ${label} template marker`);
  return source.replace(expression, replacement);
}

function moduleImports(source) {
  // Repository modules use static imports/re-exports and literal dynamic imports.
  // Remove comments before inspecting statements; imported strings are never run.
  const uncommented = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const imports = [];
  for (const match of uncommented.matchAll(/\b(?:import|export)\s+(?:[^;'"`]*?\sfrom\s*)?['"]([^'"\r\n]+)['"]/g)) imports.push(match[1]);
  for (const match of uncommented.matchAll(/\bimport\s*\(\s*(['"])([^'"\r\n]+)\1\s*\)/g)) imports.push(match[2]);
  const dynamic = uncommented.replace(/\bimport\s*\(\s*(['"])([^'"\r\n]+)\1\s*\)/g, '');
  if (/\bimport\s*\(/.test(dynamic)) throw new Error('Nonliteral dynamic import cannot be assembled safely');
  return [...new Set(imports)];
}

function localReference(value, from = '') {
  if (value.startsWith('#') || value.startsWith('data:')) return null;
  if (/^(?:[a-z]+:|\/\/|\/)/i.test(value)) throw new Error(`External or absolute runtime resource: ${value}`);
  const clean = value.split(/[?#]/)[0];
  return relativeFile(path.posix.normalize(path.posix.join(from, clean)));
}

async function collectSource(projectRoot) {
  const files = new Map();
  const queue = [];
  async function add(relative) {
    relativeFile(relative);
    if (files.has(relative)) return;
    files.set(relative, await readFile(projectRoot, relative));
    if (/\.(?:js|css)$/.test(relative)) queue.push(relative);
  }
  await add('index.html');
  await add('manifest.webmanifest');
  await add('service-worker.js');
  const html = files.get('index.html').toString('utf8');
  for (const match of html.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)\s*=\s*['"]([^'"]+)['"][^>]*>/gi)) {
    const reference = localReference(match[1]);
    if (reference) await add(reference);
  }
  const manifest = JSON.parse(files.get('manifest.webmanifest'));
  for (const icon of manifest.icons || []) await add(localReference(icon.src));
  // Root data files include runtime fetch catalogs and mailbox public content.
  // Authoring workspaces and previously generated releases are deliberately excluded.
  for (const name of await fs.readdir(path.join(projectRoot, 'data'))) {
    if (name.endsWith('.json')) await add(`data/${name}`);
  }
  for (const relative of await listFiles(projectRoot, 'assets')) await add(relative);
  while (queue.length) {
    const relative = queue.shift();
    const source = files.get(relative).toString('utf8');
    if (relative.endsWith('.js') && relative !== 'service-worker.js') {
      for (const specifier of moduleImports(source)) {
        if (!specifier.startsWith('.')) throw new Error(`Unsupported module dependency ${specifier} in ${relative}`);
        await add(localReference(specifier, path.posix.dirname(relative)));
      }
      // Runtime fetch paths are relative to the page, not the module file.
      // Health-check fetches intentionally inspect authoring/archived source code.
      if (relative !== 'src/healthCheckService.js') {
        for (const match of source.matchAll(/\bfetch\s*\(\s*['"]([^'"]+)['"]/g)) {
          const reference = localReference(match[1]);
          if (reference) await add(reference);
        }
      }
    } else if (relative.endsWith('.css')) {
      for (const match of source.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) {
        const reference = localReference(match[1], path.posix.dirname(relative));
        if (reference) await add(reference);
      }
    }
  }
  for (const required of ['src/app.js', 'src/releaseCatalog.js', 'src/releaseProfile.js', 'src/version.js', ...Object.values(CATALOG_FILES)]) {
    if (!files.has(required)) throw new Error(`Required runtime source missing from closure: ${required}`);
  }
  try { await add('.nojekyll'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return files;
}

async function assertValidatorProvenance(source) {
  // Validation runs in this assembler's checkout. Refuse a different runtime's
  // validator bytes instead of claiming that its content contract was checked.
  const localRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const queue = ['src/releaseCatalog.js'];
  const seen = new Set();
  while (queue.length) {
    const relative = queue.shift();
    if (seen.has(relative) || relative === 'src/releaseProfile.js') continue;
    seen.add(relative);
    const bytes = await readFile(localRoot, relative);
    if (!source.has(relative) || sha256(bytes) !== sha256(source.get(relative))) {
      throw new Error(`Runtime validator differs from this assembler's contract: ${relative}`);
    }
    for (const specifier of moduleImports(bytes.toString('utf8'))) {
      if (!specifier.startsWith('.')) throw new Error(`Unsupported validator dependency: ${specifier}`);
      queue.push(localReference(specifier, path.posix.dirname(relative)));
    }
  }
}

function bundleFrom(files) {
  return { schemaVersion: 1, ...Object.fromEntries(Object.entries(CATALOG_FILES)
    .map(([key, relative]) => [key, JSON.parse(files.get(relative))])) };
}

async function legacyCatalogs(projectRoot) {
  const manifestBytes = await readFile(projectRoot, `${LEGACY_DIRECTORY}/baseline.json`);
  const manifest = JSON.parse(manifestBytes);
  if (manifest.schemaVersion !== 1 || !/^[a-f0-9]{40}$/.test(manifest.sourceCommit || '')
    || JSON.stringify(Object.keys(manifest.catalogs || {}).sort()) !== JSON.stringify(Object.values(CATALOG_FILES).sort())) {
    throw new Error('Invalid frozen legacy catalog manifest');
  }
  const files = new Map();
  for (const relative of Object.values(CATALOG_FILES)) {
    const bytes = await readFile(projectRoot, `${LEGACY_DIRECTORY}/${path.posix.basename(relative)}`);
    if (sha256(bytes) !== manifest.catalogs[relative]) throw new Error(`Frozen legacy catalog hash mismatch: ${relative}`);
    files.set(relative, bytes);
  }
  const validation = validateContentBundle(bundleFrom(files));
  if (!validation.ok) throw new Error('Invalid frozen legacy catalogs: ' + validation.errors.join('; '));
  return { files, manifest, manifestSha256: sha256(manifestBytes) };
}

async function candidateInputs({ candidateDir, bundlePath, assetRoot }) {
  if (candidateDir && (bundlePath || assetRoot)) throw new Error('candidateDir cannot be combined with bundlePath/assetRoot');
  if (assetRoot && !bundlePath) throw new Error('assetRoot requires bundlePath');
  if (!candidateDir && !bundlePath) return null;
  if (candidateDir) {
    const root = await noLinks(candidateDir);
    const manifestBytes = await readFile(root, 'candidate.json');
    const manifest = JSON.parse(manifestBytes);
    if (manifest.schemaVersion !== 1 || !manifest.files || Array.isArray(manifest.files)
      || typeof manifest.files !== 'object' || !HASH.test(manifest.files['catalog.json'])) {
      throw new Error('Invalid candidate manifest: schemaVersion 1 and a files SHA-256 map are required');
    }
    const actualFiles = (await listFiles(root)).filter((name) => name !== 'candidate.json');
    const declared = Object.keys(manifest.files).sort();
    if (JSON.stringify(actualFiles) !== JSON.stringify(declared)) throw new Error('Candidate contains missing or unlisted files');
    const files = new Map();
    for (const relative of declared) {
      relativeFile(relative);
      if (relative !== 'catalog.json' && !CANDIDATE_METADATA.has(relative)
        && !relative.startsWith('assets/pets/')) throw new Error(`Candidate file is outside allowed content: ${relative}`);
      const bytes = await readFile(root, relative);
      if (!HASH.test(manifest.files[relative]) || sha256(bytes) !== manifest.files[relative]) throw new Error(`Candidate hash mismatch: ${relative}`);
      if (CANDIDATE_METADATA.has(relative)) JSON.parse(bytes);
      files.set(relative, bytes);
    }
    const metadata = new Map([['candidate.json', manifestBytes], ...[...files].filter(([name]) => CANDIDATE_METADATA.has(name))]);
    return { bundle: JSON.parse(files.get('catalog.json')), assets: new Map([...files].filter(([name]) => name.startsWith('assets/pets/'))), metadata,
      verification: 'candidate-file-hashes', candidateManifestSha256: sha256(manifestBytes) };
  }
  const file = await noLinks(bundlePath);
  const assets = new Map();
  if (assetRoot) {
    const root = await noLinks(assetRoot);
    for (const relative of await listFiles(root)) {
      if (!relative.startsWith('assets/pets/')) throw new Error(`assetRoot contains non-pet content: ${relative}`);
      assets.set(relative, await readFile(root, relative));
    }
  }
  return { bundle: JSON.parse(await fs.readFile(file)), assets, verification: 'explicit-local-input', candidateManifestSha256: null };
}

function assertCatalogAssets(bundle, files) {
  const walk = (value) => {
    if (typeof value === 'string' && value.startsWith('assets/')) {
      relativeFile(value);
      if (!files.has(value)) throw new Error(`Missing referenced content asset: ${value}`);
    } else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(bundle);
  for (const pet of bundle.petsData.pets) {
    for (const reference of [pet.image, ...Object.values(pet.imageVariants || {})]) {
      if (typeof reference !== 'string' || !reference.startsWith('assets/pets/')) throw new Error(`Nonlocal pet image: ${pet.id}`);
      relativeFile(reference);
      if (!files.has(reference)) throw new Error(`Missing referenced pet image: ${reference}`);
    }
  }
}

async function verifyExisting(directory, expected) {
  await noLinks(directory);
  const names = await listFiles(directory);
  if (JSON.stringify(names) !== JSON.stringify([...expected.keys()].sort())) throw new Error('Existing artifact file list differs; refusing overwrite');
  for (const [relative, bytes] of expected) {
    if (sha256(await readFile(directory, relative)) !== sha256(bytes)) throw new Error(`Existing artifact is corrupt or different: ${relative}`);
  }
}

/**
 * Prepare a deterministic, inspectable artifact; never publish or modify source.
 * outputRoot must be outside projectRoot. dryRun performs all local checks but
 * creates neither outputRoot nor staging files. Returned buffers are not exposed.
 */
export async function prepareReleaseArtifact({ projectRoot, outputRoot, profile, scopePath,
  candidateDir, bundlePath, assetRoot, dryRun = false } = {}) {
  if (!projectRoot || !outputRoot || !Object.hasOwn(PROFILES, profile)
    || typeof scopePath !== 'string' || !/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(scopePath)) {
    throw new Error('projectRoot, outputRoot, production|preview profile and an absolute slash-terminated scopePath are required');
  }
  const sourceRoot = await noLinks(projectRoot);
  const output = await noLinks(outputRoot, { allowMissing: true });
  if (inside(sourceRoot, output)) throw new Error('outputRoot must be outside the source repository');
  const sourceCommit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error('Source repository has no verifiable commit');
  const source = await collectSource(sourceRoot);
  await assertValidatorProvenance(source);
  const legacy = await legacyCatalogs(sourceRoot);
  const baseline = bundleFrom(source);
  const candidate = await candidateInputs({ candidateDir, bundlePath, assetRoot });
  const bundle = candidate?.bundle || baseline;
  for (const [label, value] of [['baseline', baseline], ['candidate', bundle]]) {
    const result = validateContentBundle(value);
    if (!result.ok) throw new Error(`Invalid ${label} content bundle: ${result.errors.slice(0, 5).join('; ')}`);
  }
  for (const [catalog, rowsKey] of [['petsData', 'pets'], ['loreData', 'lore'], ['poolsData', 'pools'], ['seriesCatalog', 'series']]) {
    const retained = new Set(bundle[catalog][rowsKey].map((row) => row.id));
    for (const row of [...baseline[catalog][rowsKey], ...bundleFrom(legacy.files)[catalog][rowsKey]]) {
      if (!retained.has(row.id)) throw new Error(`Candidate removes persistent content identity: ${catalog}.${row.id}`);
    }
  }
  const compatibility = validatePoolContent(bundle.poolsData, { pets: bundle.petsData.pets, previousPoolsData: baseline.poolsData });
  if (!compatibility.ok) throw new Error('Published pool contract changed: ' + compatibility.errors.map((entry) => entry.message).join('; '));
  const files = new Map(source);
  // Authoring catalogs may advance after an approved release. Old clients must
  // continue to receive their frozen contract at the original unversioned URLs.
  for (const [relative, bytes] of legacy.files) files.set(relative, bytes);
  for (const [relative, bytes] of candidate?.assets || []) {
    if (files.has(relative) && sha256(files.get(relative)) !== sha256(bytes)) throw new Error(`Candidate would overwrite an existing image: ${relative}`);
    files.set(relative, bytes);
  }
  for (const [relative, bytes] of candidate?.metadata || []) files.set(`release-input/${relative}`, bytes);
  assertCatalogAssets(baseline, files);
  assertCatalogAssets(bundleFrom(legacy.files), files);
  assertCatalogAssets(bundle, files);
  const bundleBytes = jsonBytes(bundle);
  const contentBundleSha256 = sha256(bundleBytes);
  const sourceFiles = sorted([...source].map(([name, bytes]) => [name, sha256(bytes)]));
  const input = { schemaVersion: 1, sourceCommit, profile, scopePath, contentBundleSha256, sourceFiles,
    legacyCompatibility: { sourceCommit: legacy.manifest.sourceCommit, manifestSha256: legacy.manifestSha256, catalogs: legacy.manifest.catalogs },
    assemblerSha256: sha256(await fs.readFile(fileURLToPath(import.meta.url))),
    candidateAssets: sorted([...(candidate?.assets || [])].map(([name, bytes]) => [name, sha256(bytes)])),
    candidateManifestSha256: candidate?.candidateManifestSha256 || null };
  const artifactId = sha256(jsonBytes(input));
  const descriptor = validateReleaseProfile({ schemaVersion: 1, profile, artifactId, sourceCommit, scopePath,
    runtimeContentSchema: POOL_CONTENT_SCHEMA_VERSION, ...PROFILES[profile], contentBundleSha256,
    contentBundleUrl: `data/releases/${contentBundleSha256}/catalog.json` });
  const caches = { CACHE_NAME: `${descriptor.cacheNamespace}app-${artifactId}`,
    PET_IMAGE_CACHE: `${descriptor.cacheNamespace}pet-images-v1`,
    MAILBOX_RUNTIME_CACHE: `${descriptor.cacheNamespace}mailbox-runtime-v1` };
  files.set(descriptor.contentBundleUrl, bundleBytes);
  files.set('src/releaseProfile.js', Buffer.from('/** Generated immutable release descriptor. */\nexport const RELEASE_PROFILE = '
    + JSON.stringify(descriptor, null, 2) + ';\n'));
  const sourceHtml = source.get('index.html').toString('utf8');
  if (/\bname\s*=\s*['"]questnote-artifact['"]/i.test(sourceHtml)) throw new Error('Source index already has an artifact marker');
  files.set('index.html', Buffer.from(replaceOne(sourceHtml, /<\/head>/,
    `  <meta name="questnote-artifact" content="${artifactId}">\n</head>`, 'HTML closing head')));
  const manifest = JSON.parse(source.get('manifest.webmanifest'));
  Object.assign(manifest, { name: profile === 'production' ? 'QuestNote' : 'QuestNote 預覽',
    short_name: profile === 'production' ? 'QN' : 'QN 預覽', id: scopePath, scope: scopePath,
    start_url: `${scopePath}index.html` });
  files.set('manifest.webmanifest', jsonBytes(manifest));
  let version = source.get('src/version.js').toString('utf8');
  let worker = source.get('service-worker.js').toString('utf8');
  for (const [key, value] of Object.entries(caches)) {
    version = replaceOne(version, new RegExp(`export const ${key} = ['"][^'"]+['"];`), `export const ${key} = '${value}';`, key);
    worker = replaceOne(worker, new RegExp(`const ${key} = ['"][^'"]+['"];`), `const ${key} = '${value}';`, key);
  }
  version = replaceOne(version, /export function getServiceWorkerRegisterUrl\(\) \{[\s\S]*?\n\}/,
    `export function getServiceWorkerRegisterUrl() {\n  return './service-worker.js?artifact=${artifactId}';\n}`, 'SW registration URL');
  files.set('src/version.js', Buffer.from(version));
  const precache = [...files.keys()].filter((name) => name !== 'service-worker.js' && name !== '.nojekyll'
    && name !== 'data/global-mailbox.json' && !name.startsWith('assets/pets/') && !name.startsWith('release-input/')).sort();
  const precacheHashes = sorted(precache.map((name) => [name, sha256(files.get(name))]));
  worker = replaceOne(worker, /const BUILD_PROFILE = null;/, `const BUILD_PROFILE = ${JSON.stringify(descriptor, null, 2)};`, 'BUILD_PROFILE');
  worker = replaceOne(worker, /const PRECACHE_HASHES = null;/, `const PRECACHE_HASHES = ${JSON.stringify(precacheHashes, null, 2)};`, 'PRECACHE_HASHES');
  worker = replaceOne(worker, /const PRECACHE_URLS = \[[\s\S]*?\];/, `const PRECACHE_URLS = ${JSON.stringify(precache, null, 2)};`, 'PRECACHE_URLS');
  files.set('service-worker.js', Buffer.from(worker));
  const report = { schemaVersion: 1, artifactId, sourceCommit, profile: descriptor,
    legacyCompatibility: input.legacyCompatibility,
    sourceFiles, assemblerSha256: input.assemblerSha256, candidateManifestSha256: input.candidateManifestSha256,
    inputVerification: candidate?.verification || 'source-catalogs',
    files: sorted([...files].map(([name, bytes]) => [name, { sha256: sha256(bytes), bytes: bytes.length }])),
    localValidations: { catalogContract: 'PASS', imageReferences: 'PASS', importClosure: 'PASS',
      profileAndCacheConfiguration: 'PASS', immutablePrecacheHashes: 'PASS' },
    releaseReady: false, liveBaseline: 'UNKNOWN', nativePwaValidation: 'NOT_RUN', deploymentApproval: 'NOT_GRANTED',
    compatibility: 'Unversioned catalogs use the frozen legacy snapshot; generated runtime reads only the versioned content bundle.',
    withdrawal: 'Deactivate the pool while retaining pet, lore, image and identity records. Never roll user data back.',
    limitations: ['Image dimensions and artistic review belong to the content pipeline.',
      'Candidate approval/validation metadata is archived, not interpreted as deployment approval.',
      'Health-check probes of archived/authoring source are excluded from deployment.',
      'Live runtime/SW baseline and browser upgrade/rollback validation remain release gates.'] };
  files.set(MANIFEST_FILE, jsonBytes(report));
  const artifactDir = path.join(output, artifactId);
  if (inside(sourceRoot, artifactDir) || inside(artifactDir, sourceRoot)) throw new Error('Artifact destination overlaps source');
  let reused = false;
  let exists = false;
  try { await fs.lstat(artifactDir); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (exists) { await verifyExisting(artifactDir, files); reused = true; }
  if (!dryRun && !reused) {
    await fs.mkdir(output, { recursive: true });
    await noLinks(output);
    const staging = path.join(output, `.staging-${artifactId}-${randomUUID()}`);
    await fs.mkdir(staging);
    try {
      for (const [relative, bytes] of files) {
        const target = path.join(staging, relative);
        if (!inside(staging, target)) throw new Error('Staging path escaped');
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, bytes, { flag: 'wx' });
      }
      await verifyExisting(staging, files);
      try { await fs.rename(staging, artifactDir); }
      catch (error) {
        if (!['EEXIST', 'ENOTEMPTY', 'EPERM'].includes(error.code)) throw error;
        await verifyExisting(artifactDir, files);
        reused = true;
      }
    } finally {
      // Only the exact, generated staging child can be removed; never source/output.
      if (!inside(output, staging) || path.dirname(staging) !== output || !path.basename(staging).startsWith('.staging-')) throw new Error('Unsafe staging cleanup');
      await fs.rm(staging, { recursive: true, force: true });
    }
  }
  return { artifactId, artifactDir, manifestPath: path.join(artifactDir, MANIFEST_FILE),
    dryRun, reused, fileCount: files.size, releaseReady: false, descriptor, manifest: report };
}
