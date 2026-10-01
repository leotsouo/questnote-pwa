/** Preserve every previously published root catalog, including public mail. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { catalogSemanticHash } from '../scripts/featureReleaseReview.mjs';
const root = path.resolve(import.meta.dirname, '..'); const report = path.join(root, 'reports/awakening-implementation');
const pins = JSON.parse(await fs.readFile(path.join(report, 'artifacts.json'))).production;
const baseline = JSON.parse(await fs.readFile(path.join(report, 'formal-baseline.json')));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const base = 'https://leotsouo.github.io/questnote-pwa/';
const get = async (file) => {
  const response = await fetch(base + file + '?awakening-preservation=' + Date.now(), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.ok, true, file); return Buffer.from(await response.arrayBuffer());
};
assert.equal(sha(await get('release-artifact.json')), baseline.manifestSha256, 'Formal baseline changed');
const checks = [];
for (const file of ['achievements', 'bond-stories', 'categories', 'craftables', 'dailyWheelRewards', 'expeditions',
  'gift-affinities', 'global-mailbox', 'materials', 'pet-series', 'pets-lore', 'pets', 'pools', 'titles']) {
  const relative = `data/${file}.json`; const bytes = await get(relative);
  const proposed = await fs.readFile(path.join(pins.artifactDir, relative));
  assert.equal(catalogSemanticHash(JSON.parse(bytes)), catalogSemanticHash(JSON.parse(proposed)), `Published values changed: ${relative}`);
  checks.push({ path: relative, publishedSha256: sha(bytes), proposedSha256: sha(proposed), valuesAndOrderPreserved: true });
}
await fs.writeFile(path.join(report, 'formal-content-preserved.json'), JSON.stringify({ status: 'passed', verifiedAt: new Date().toISOString(),
  formalArtifactId: baseline.artifactId, proposedArtifactId: pins.artifactId, checks }, null, 2) + '\n');
console.log('PASS all fourteen published catalogs, public announcements, stories and expedition settings preserved');
