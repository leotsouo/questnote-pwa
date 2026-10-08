/** Verify every formal HTTPS file against the human-authorized immutable artifact. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { checkPoolReleaseReview } from '../scripts/poolReleaseReview.mjs';
const root = path.resolve(import.meta.dirname, '..'); const report = path.join(root, 'reports/chaos-demon-court');
const evidence = JSON.parse(await fs.readFile(path.join(report, 'release-review.json')));
const decision = await checkPoolReleaseReview(evidence); assert.equal(decision.releaseReady, true);
const pins = evidence.artifacts.production; const base = 'https://leotsouo.github.io/questnote-pwa/';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const get = async (file) => {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(new URL(file + '?awakening-artifact=' + pins.artifactId, base), { cache: 'no-store', signal: AbortSignal.timeout(30000) });
      assert.equal(response.ok, true, `HTTP ${response.status}: ${file}`); return Buffer.from(await response.arrayBuffer());
    } catch (error) { last = error; if (attempt < 2) await new Promise((r) => setTimeout(r, 1000)); }
  }
  throw new Error(`Formal HTTPS failed: ${file}`, { cause: last });
};
const manifestBytes = await get('release-artifact.json'); assert.equal(sha(manifestBytes), pins.manifestSha256, 'Formal manifest');
const manifest = JSON.parse(manifestBytes); assert.equal(manifest.artifactId, pins.artifactId);
const files = Object.keys(manifest.files); const checks = []; let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < files.length) {
    const file = files[next++]; const bytes = await get(file);
    assert.equal(sha(bytes), manifest.files[file].sha256, file); checks.push({ path: file, sha256: sha(bytes), bytes: bytes.length });
  }
}));
await fs.writeFile(path.join(report, 'production-https.json'), JSON.stringify({ status: 'passed', verifiedAt: new Date().toISOString(), httpsUrl: base,
  artifactId: pins.artifactId, manifestSha256: pins.manifestSha256, sourceCommit: manifest.sourceCommit, packageHash: decision.packageHash,
  verifiedFiles: checks.length + 1, checks: checks.sort((a, b) => a.path.localeCompare(b.path)) }, null, 2) + '\n');
console.log(`PASS formal manifest and all ${checks.length} files match the approved artifact`);
