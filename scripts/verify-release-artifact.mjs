#!/usr/bin/env node
/** Verify reviewed bytes locally. This tool never rebuilds, imports artifact code or deploys. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { validateReleaseProfile } from '../src/releaseCatalog.js';

const MANIFEST = 'release-artifact.json';
const HASH = /^[a-f0-9]{64}$/;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function requireValue(condition, message) { if (!condition) throw new Error(message); }
function object(value) { return value && typeof value === 'object' && !Array.isArray(value); }

function safeRelative(name) {
  requireValue(typeof name === 'string' && name.length > 0 && !/[\\%?#:\u0000-\u001f]/.test(name)
    && !path.posix.isAbsolute(name) && name.split('/').every((part) => part && part !== '.' && part !== '..'
      && !/[. ]$/.test(part) && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)),
  `Unsafe artifact path: ${String(name)}`);
  return name;
}

async function noLinks(target) {
  const absolute = path.resolve(target);
  let current = path.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    requireValue(!(await fs.lstat(current)).isSymbolicLink(), `Symlink/junction is not allowed: ${current}`);
  }
  return absolute;
}

async function inventory(root, relative = '') {
  const result = [];
  for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = safeRelative(relative ? `${relative}/${entry.name}` : entry.name);
    const stat = await fs.lstat(path.join(root, name));
    requireValue(!stat.isSymbolicLink(), `Symlink/junction is not allowed: ${name}`);
    if (stat.isDirectory()) {
      const children = await inventory(root, name);
      requireValue(children.length > 0, `Unexpected empty artifact directory: ${name}`);
      result.push(...children);
    } else {
      requireValue(stat.isFile(), `Not a regular artifact file: ${name}`);
      result.push(name);
    }
  }
  return result.sort();
}

function constant(source, name, json = true) {
  const matches = [...source.matchAll(new RegExp(`^(?:export )?const ${name} = ([\\s\\S]*?);\\r?$`, 'gm'))];
  requireValue(matches.length === 1, `Expected one generated ${name} constant`);
  if (json) return JSON.parse(matches[0][1]);
  const quoted = /^'([^'\\]*)'$/.exec(matches[0][1]);
  requireValue(quoted, `Invalid generated ${name} string`);
  return quoted[1];
}

export async function verifyReleaseArtifact({ artifactDir, artifactId, manifestSha256, profile, scopePath } = {}) {
  requireValue(typeof artifactDir === 'string' && HASH.test(artifactId || '') && HASH.test(manifestSha256 || '')
    && ['production', 'preview'].includes(profile) && typeof scopePath === 'string'
    && /^\/(?:[a-zA-Z0-9_-]+\/)+$/.test(scopePath), 'Artifact directory, artifact ID, manifest SHA-256, profile and non-root scope pins are required');
  const root = await noLinks(artifactDir);
  requireValue((await fs.stat(root)).isDirectory(), 'Artifact root must be a directory');
  await noLinks(path.join(root, MANIFEST));
  requireValue((await fs.lstat(path.join(root, MANIFEST))).isFile(), 'Artifact manifest must be a regular file');
  const manifestBytes = await fs.readFile(path.join(root, MANIFEST));
  requireValue(hash(manifestBytes) === manifestSha256, 'Pinned manifest SHA-256 mismatch');
  const manifest = JSON.parse(manifestBytes);
  requireValue(manifest.schemaVersion === 1 && manifest.artifactId === artifactId && object(manifest.files), 'Invalid artifact manifest or artifact ID mismatch');
  const descriptor = validateReleaseProfile(manifest.profile);
  requireValue(descriptor.artifactId === artifactId && descriptor.profile === profile
    && descriptor.scopePath === scopePath && descriptor.sourceCommit === manifest.sourceCommit, 'Pinned profile, scope or source identity mismatch');
  requireValue(!Object.hasOwn(manifest.files, MANIFEST) && Object.hasOwn(manifest.files, '.nojekyll'), 'Inventory must include .nojekyll and exclude the manifest itself');
  const expected = Object.keys(manifest.files).map(safeRelative).concat(MANIFEST).sort();
  requireValue(new Set(expected.map((name) => name.toLowerCase())).size === expected.length, 'Case-colliding artifact paths');
  const actual = await inventory(root);
  requireValue(isDeepStrictEqual(actual, expected), 'Artifact inventory mismatch: extra or missing files');
  const files = new Map();
  for (const [name, entry] of Object.entries(manifest.files)) {
    requireValue(object(entry) && HASH.test(entry.sha256 || '') && Number.isSafeInteger(entry.bytes) && entry.bytes >= 0, `Invalid file entry: ${name}`);
    await noLinks(path.join(root, name));
    const bytes = await fs.readFile(path.join(root, name));
    requireValue(bytes.length === entry.bytes && hash(bytes) === entry.sha256, `Artifact hash/bytes mismatch: ${name}`);
    files.set(name, bytes);
  }
  const text = (name) => {
    requireValue(files.has(name), `Missing required artifact file: ${name}`);
    return files.get(name).toString('utf8');
  };
  requireValue(isDeepStrictEqual(constant(text('src/releaseProfile.js'), 'RELEASE_PROFILE'), descriptor), 'Runtime descriptor identity mismatch');
  const index = text('index.html');
  const markers = [...index.matchAll(/<meta\b[^>]*\bname=["']questnote-artifact["'][^>]*>/gi)];
  requireValue(markers.length === 1 && markers[0][0].includes(`content="${artifactId}"`), 'Index artifact marker mismatch');
  requireValue(/<script\b[^>]*\bsrc=["']src\/bootstrap\.js["'][^>]*>/.test(index), 'Artifact bootstrap entry missing');
  const webmanifest = JSON.parse(text('manifest.webmanifest'));
  requireValue(webmanifest.id === scopePath && webmanifest.scope === scopePath
    && webmanifest.start_url === `${scopePath}index.html${profile === 'preview' ? '?perf=1' : ''}`
    && webmanifest.name === (profile === 'production' ? 'QuestNote' : 'QuestNote 預覽')
    && webmanifest.short_name === (profile === 'production' ? 'QN' : 'QN 預覽'), 'Webmanifest deployment identity mismatch');
  const worker = text('service-worker.js');
  const version = text('src/version.js');
  requireValue(isDeepStrictEqual(constant(worker, 'BUILD_PROFILE'), descriptor), 'Worker descriptor identity mismatch');
  const caches = { CACHE_NAME: `${descriptor.cacheNamespace}app-${artifactId}`,
    PET_IMAGE_CACHE: `${descriptor.cacheNamespace}pet-images-v1`, MAILBOX_RUNTIME_CACHE: `${descriptor.cacheNamespace}mailbox-runtime-v1` };
  for (const [name, value] of Object.entries(caches)) {
    requireValue(constant(worker, name, false) === value && constant(version, name, false) === value, `Worker/version cache identity mismatch: ${name}`);
  }
  const registrations = [...version.matchAll(/export function getServiceWorkerRegisterUrl\(\) \{\s*return '([^']+)';\s*\}/g)];
  requireValue(registrations.length === 1 && registrations[0][1] === `./service-worker.js?artifact=${artifactId}`, 'Worker registration identity mismatch');
  const urls = constant(worker, 'PRECACHE_URLS');
  const hashes = constant(worker, 'PRECACHE_HASHES');
  const precache = Object.keys(manifest.files).filter((name) => name !== 'service-worker.js' && name !== '.nojekyll'
    && name !== 'data/global-mailbox.json' && !name.startsWith('assets/pets/') && !name.startsWith('release-input/')).sort();
  requireValue(Array.isArray(urls) && isDeepStrictEqual(urls, precache) && object(hashes)
    && isDeepStrictEqual(Object.keys(hashes).sort(), precache), 'Worker precache inventory mismatch');
  for (const name of precache) requireValue(hashes[name] === manifest.files[name].sha256, `Worker precache hash mismatch: ${name}`);
  requireValue(files.has(descriptor.contentBundleUrl) && hash(files.get(descriptor.contentBundleUrl)) === descriptor.contentBundleSha256, 'Catalog generation hash mismatch');
  return { ok: true, artifactDir: root, artifactId, manifestSha256, profile, scopePath, fileCount: actual.length };
}

const usage = 'node scripts/verify-release-artifact.mjs --artifact-dir <dir> --artifact-id <sha256> --manifest-sha256 <sha256> --profile production|preview --scope /path/';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--help') console.log(usage);
    else {
      const keys = { '--artifact-dir': 'artifactDir', '--artifact-id': 'artifactId', '--manifest-sha256': 'manifestSha256', '--profile': 'profile', '--scope': 'scopePath' };
      const options = {};
      for (let index = 0; index < args.length; index += 2) {
        requireValue(Object.hasOwn(keys, args[index]) && args[index + 1] && !args[index + 1].startsWith('--')
          && !Object.hasOwn(options, keys[args[index]]), usage);
        options[keys[args[index]]] = args[index + 1];
      }
      console.log(JSON.stringify(await verifyReleaseArtifact(options), null, 2));
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
