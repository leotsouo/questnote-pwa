/** Read back reviewed public HTTPS bytes; also confirm formal site remains unchanged. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { catalogSemanticHash } from '../scripts/featureReleaseReview.mjs';
const root = path.resolve(import.meta.dirname, '..'); const report = path.join(root, 'reports/awakening-implementation');
const pins = JSON.parse(await fs.readFile(path.join(report, 'artifacts.json'))).preview;
const baseline = JSON.parse(await fs.readFile(path.join(report, 'formal-baseline.json')));
const base = 'https://leotsouo.github.io/questnote-pwa-preview/';
const get = async (url) => {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
      if (!response.ok) throw Error(`HTTPS ${response.status}: ${url}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw new Error(`HTTPS read failed: ${url}`, { cause: lastError });
};
const sha = (b) => createHash('sha256').update(b).digest('hex');
const raw = await get(new URL('release-artifact.json?awakening=' + Date.now(), base)); assertHash(raw, pins.manifestSha256, 'preview manifest');
function assertHash(bytes, expected, name) { if (sha(bytes) !== expected) throw Error(`HTTPS byte mismatch: ${name}`); }
const manifest = JSON.parse(raw); const files = Object.keys(manifest.files).filter((file) => file === 'index.html' || file === 'service-worker.js' || file === 'manifest.webmanifest'
  || file.startsWith('src/') || file.startsWith('data/') || file.startsWith('assets/pets/awakening/') || file.startsWith('assets/expeditions/'));
const checks = []; let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => { while (next < files.length) { const file = files[next++]; const bytes = await get(new URL(file, base)); assertHash(bytes, manifest.files[file].sha256, file); checks.push({ path: file, sha256: sha(bytes), bytes: bytes.length }); } }));
const formalBase = 'https://leotsouo.github.io/questnote-pwa/';
const formalRaw = await get(new URL('release-artifact.json?awakening=' + Date.now(), formalBase)); assertHash(formalRaw, baseline.manifestSha256, 'formal baseline');
const formal = JSON.parse(formalRaw); if (formal.artifactId !== baseline.artifactId) throw Error('Formal deployment changed');
const oldCatalogBytes = await get(new URL(formal.profile.contentBundleUrl, formalBase)); assertHash(oldCatalogBytes, formal.files[formal.profile.contentBundleUrl].sha256, 'published catalog');
const oldCatalog = JSON.parse(oldCatalogBytes); const currentCatalogBytes = await get(new URL(manifest.profile.contentBundleUrl, base));
assertHash(currentCatalogBytes, manifest.files[manifest.profile.contentBundleUrl].sha256, 'new catalog');
if (catalogSemanticHash(oldCatalog) !== catalogSemanticHash(JSON.parse(currentCatalogBytes))) throw Error('Published pool/Lore/catalog values changed');
Object.assign(baseline, { contentBundleSha256: formal.profile.contentBundleSha256, contentBundleSemanticSha256: catalogSemanticHash(oldCatalog), publishedCatalogVerified: true });
await fs.writeFile(path.join(report, 'formal-baseline.json'), JSON.stringify(baseline, null, 2) + '\n');
const result = { status: 'passed', artifactId: manifest.artifactId, manifestSha256: sha(raw), sourceCommit: manifest.sourceCommit, verifiedAt: new Date().toISOString(),
  previewUrl: base, productionUnchanged: formal.artifactId, originalCatalogValuesPreserved: true, checks: checks.sort((a, b) => a.path.localeCompare(b.path)) };
await fs.writeFile(path.join(report, 'preview-https.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: 'passed', httpsFiles: checks.length, artifactId: manifest.artifactId, formalUnchanged: true }));
