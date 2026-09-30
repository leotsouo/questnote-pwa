import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const pins = JSON.parse(await fs.readFile(new URL('./release-pins.json', import.meta.url)));
const pin = pins.production;
const manifest = JSON.parse(await fs.readFile(pin.root + '/release-artifact.json'));
const changed = execFileSync('git', ['diff', '--name-only', 'e49cc46', '704896b'], { encoding: 'utf8' }).trim().split('\n').filter((name) => manifest.files[name]);
const names = [...new Set([...changed, 'release-artifact.json', 'index.html', 'manifest.webmanifest', 'service-worker.js', 'src/version.js', 'src/releaseProfile.js', 'data/global-mailbox.json', 'data/releases/f00f02ed3dc6414a7bdc41b1032d1f021e6a19edd1b1f5792f27725ec07abc45/catalog.json'])];
const results = [];
for (const name of names) {
  const response = await fetch('https://leotsouo.github.io/questnote-pwa/' + name, { cache: 'no-store' });
  assert.equal(response.status, 200, name);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const expected = name === 'release-artifact.json' ? pin.manifestSha256 : manifest.files[name].sha256;
  assert.equal(sha256, expected, name);
  results.push({ name, sha256, bytes: bytes.length });
}
await fs.writeFile(new URL('./production-live-hashes.json', import.meta.url), JSON.stringify({ checkedAt: new Date().toISOString(), artifactId: pin.artifactId, files: results }, null, 2));
console.log(`Verified ${results.length} production HTTPS files`);
