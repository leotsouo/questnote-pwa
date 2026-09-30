import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const expected = '3942a7f35287a0aa2c3ac343b45115ec4948a380';
assert.equal(git(['rev-parse', 'origin/gh-pages']), expected, 'Production advanced; reconcile baseline first');
const paths = ['release-artifact.json', 'src/version.js', 'src/releaseProfile.js', 'service-worker.js'];
const files = [];
for (const relative of paths) {
  const response = await fetch(`https://leotsouo.github.io/questnote-pwa/${relative}`, { cache: 'no-store' });
  assert.equal(response.status, 200);
  const actual = Buffer.from(await response.arrayBuffer());
  const expectedBytes = execFileSync('git', ['show', `${expected}:${relative}`]);
  assert.deepEqual(actual, expectedBytes, `Live production differs: ${relative}`);
  files.push({ path: relative, sha256: createHash('sha256').update(actual).digest('hex'), bytes: actual.length });
}
await fs.writeFile(new URL('./production-baseline.json', import.meta.url), JSON.stringify({ checkedAt: new Date().toISOString(),
  deploymentCommit: expected, version: '3.4.33', originMain: git(['rev-parse', 'origin/main']), productionUnchanged: true, files }, null, 2) + '\n');
console.log('Live production baseline verified: V3.4.33, four exact files');
