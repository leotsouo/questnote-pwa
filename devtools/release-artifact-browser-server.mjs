/** Run against immutable assembled artifacts on a fresh, ephemeral loopback origin. */
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index += 2) {
  if (!['--production', '--preview'].includes(args[index]) || !args[index + 1] || options[args[index]]) {
    throw new Error('Usage: node devtools/release-artifact-browser-server.mjs --production <artifact-dir> --preview <artifact-dir>');
  }
  options[args[index]] = args[index + 1];
}
if (!options['--production'] || !options['--preview']) throw new Error('Both assembled artifact directories are required');

const runId = randomUUID();
const token = randomUUID();
const legacyCommit = 'aada9a73e6cf0381fc03359dafd78b70b274cce2';
const legacyCacheNames = ['shell', 'images', 'mailbox'].map((kind) => `questnote-production-legacy-${kind}-${runId}`);
let legacyWorker = execFileSync('git', ['show', `${legacyCommit}:service-worker.js`], {
  cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8',
});
for (const [index, name] of ['CACHE_NAME', 'PET_IMAGE_CACHE', 'MAILBOX_RUNTIME_CACHE'].entries()) {
  legacyWorker = legacyWorker.replace(new RegExp(`const ${name} = '[^']+';`), `const ${name} = '${legacyCacheNames[index]}';`);
}
legacyWorker = legacyWorker.replace(/const PRECACHE_URLS = \[[\s\S]*?\];/, "const PRECACHE_URLS = ['index.html'];");
const legacyIndex = '<!doctype html><title>Isolated legacy controller fixture</title><p>Legacy SW baseline fixture</p><script>window.legacyHarness=true;</script>';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
const readInside = async (root, relative) => {
  if (!relative || relative.includes('\\') || relative.split('/').some((segment) => !segment || segment === '..' || segment === '.')) throw new Error('Invalid artifact path');
  const target = await fs.realpath(path.resolve(root, relative));
  if (!inside(root, target) || !(await fs.stat(target)).isFile()) throw new Error('Artifact path leaves its root');
  return fs.readFile(target);
};
const artifacts = new Map();
for (const name of ['production', 'preview']) {
  const root = await fs.realpath(options[`--${name}`]);
  const manifest = JSON.parse(await readInside(root, 'release-artifact.json'));
  const profile = manifest.profile;
  if (manifest.schemaVersion !== 1 || profile?.profile !== name || profile.scopePath !== `/${name}/`
    || profile.dbName !== (name === 'production' ? 'QuestNoteDB' : 'QuestNotePreviewDB')
    || !/^[a-f0-9]{64}$/.test(profile.artifactId) || profile.artifactId !== manifest.artifactId
    || profile.contentBundleUrl !== `data/releases/${profile.contentBundleSha256}/catalog.json`) {
    throw new Error(`Wrong ${name} assembled artifact or scope; expected /${name}/`);
  }
  // Refuse stale or edited directories before any browser state is created.
  for (const [relative, entry] of Object.entries(manifest.files || {})) {
    const bytes = await readInside(root, relative);
    if (entry.sha256 !== hash(bytes) || entry.bytes !== bytes.length) throw new Error(`Artifact integrity mismatch: ${name}/${relative}`);
  }
  const index = (await readInside(root, 'index.html')).toString('utf8');
  if (!index.includes(`<meta name="questnote-artifact" content="${profile.artifactId}">`)
    || !index.includes('src/bootstrap.js')) throw new Error('Release bootstrap or artifact marker missing');
  const bundle = JSON.parse(await readInside(root, profile.contentBundleUrl));
  const version = (await readInside(root, 'src/version.js')).toString('utf8');
  const cacheNames = ['CACHE_NAME', 'PET_IMAGE_CACHE', 'MAILBOX_RUNTIME_CACHE'].map((key) => {
    const match = version.match(new RegExp(`export const ${key} = ['"]([^'"]+)['"];`));
    if (!match || !match[1].startsWith(`questnote-${name}-`)) throw new Error(`Invalid artifact ${key}`);
    return match[1];
  });
  artifacts.set(name, { root, manifest, profile, cacheNames, fault: 'none', requests: [],
    expected: { petCount: bundle.petsData.pets.length, seriesCount: bundle.seriesCatalog.series.length,
      firstPool: bundle.poolsData.pools.find((pool) => pool.active === true) || null } });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const FAULTS = new Set(['none', 'missing503', 'corrupt', 'profile-null', 'index-marker-mismatch', 'all503', 'legacy']);
const server = http.createServer(async (request, response) => {
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (request.headers.host !== new URL(origin).host) { response.writeHead(403).end('Unexpected host'); return; }
    const url = new URL(request.url, origin);
    response.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/test/control' && request.method === 'POST') {
      if (request.headers.origin !== origin || request.headers['x-harness-token'] !== token) { response.writeHead(403).end(); return; }
      let body = '';
      for await (const bytes of request) { body += bytes; if (body.length > 2048) throw new Error('Control request too large'); }
      const value = JSON.parse(body);
      if (!artifacts.has(value.profile) || !FAULTS.has(value.fault) || (value.fault === 'legacy' && value.profile !== 'production')) throw new Error('Invalid fixture control');
      const artifact = artifacts.get(value.profile);
      artifact.fault = value.fault;
      artifact.requests = [];
      response.setHeader('Content-Type', 'application/json'); response.end('{}'); return;
    }
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    if (url.pathname === '/test/') {
      response.setHeader('Content-Type', MIME['.html']);
      response.end('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>Assembled artifact acceptance</title><h1>QuestNote assembled artifact acceptance</h1><p>Fresh loopback origin. Synthetic local data only. No deployment.</p><pre id="results">Running…</pre><div id="clients"></div><script type="module" src="./suite.js"></script></html>'); return;
    }
    if (url.pathname === '/test/suite.js') {
      response.setHeader('Content-Type', MIME['.js']);
      response.end(await fs.readFile(new URL('./release-artifact-browser-test.js', import.meta.url))); return;
    }
    if (url.pathname === '/test/config') {
      response.setHeader('Content-Type', MIME['.json']);
      response.end(JSON.stringify({ runId, token, origin, legacyCommit, legacyCacheNames, profiles: Object.fromEntries([...artifacts].map(([name, artifact]) => [name,
        { profile: artifact.profile, cacheNames: artifact.cacheNames, expected: artifact.expected }])) })); return;
    }
    if (url.pathname === '/test/audit') {
      response.setHeader('Content-Type', MIME['.json']);
      response.end(JSON.stringify(Object.fromEntries([...artifacts].map(([name, artifact]) => [name, artifact.requests])))); return;
    }
    const match = /^\/(production|preview)\/(.*)$/.exec(decodeURIComponent(url.pathname));
    if (!match) { response.writeHead(404).end(); return; }
    const [, name, rawRelative] = match;
    const artifact = artifacts.get(name);
    const relative = rawRelative || 'index.html';
    artifact.requests.push({ path: relative, destination: request.headers['sec-fetch-dest'] || '', fault: artifact.fault });
    if (artifact.requests.length > 2500) artifact.requests.shift();
    if (name === 'production' && relative === 'service-worker.js' && url.searchParams.get('v') === '344') {
      response.setHeader('Content-Type', MIME['.js']); response.end(legacyWorker); return;
    }
    if (artifact.fault === 'legacy' && relative === 'index.html') {
      response.setHeader('Content-Type', MIME['.html']); response.end(legacyIndex); return;
    }
    if (artifact.fault === 'all503' || (artifact.fault === 'missing503' && relative === 'src/app.js')) {
      response.writeHead(503).end('Synthetic required-file failure'); return;
    }
    let bytes = await readInside(artifact.root, relative);
    // Deliberate fault cases change bytes; every normal response remains byte-for-byte original.
    if (artifact.fault === 'corrupt' && relative === artifact.profile.contentBundleUrl) bytes = Buffer.concat([bytes, Buffer.from(' corrupt')]);
    if (artifact.fault === 'profile-null' && relative === 'src/releaseProfile.js') bytes = Buffer.from('export const RELEASE_PROFILE = null;\n');
    if (artifact.fault === 'index-marker-mismatch' && relative === 'index.html') {
      const marker = artifact.profile.artifactId;
      const changed = (marker[0] === '0' ? '1' : '0') + marker.slice(1);
      bytes = Buffer.from(bytes.toString('utf8').replace(`content="${marker}"`, `content="${changed}"`));
    }
    response.setHeader('Content-Type', MIME[path.extname(relative)] || 'application/octet-stream');
    response.end(bytes);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 400).end(error.message);
  }
});
server.listen(0, '127.0.0.1', () => console.log(`Assembled artifact tests: http://127.0.0.1:${server.address().port}/test/`));
