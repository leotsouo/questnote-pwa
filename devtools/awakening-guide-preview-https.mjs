/** Verify every actual public preview byte matches the immutable V3.5.8 candidate. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const report = path.join(root, 'reports/awakening-guide');
const pins = JSON.parse(await fs.readFile(path.join(report, 'artifacts.json'))).preview;
const manifest = JSON.parse(await fs.readFile(path.join(pins.artifactDir, 'release-artifact.json')));
const url = `https://leotsouo.github.io/questnote-pwa-preview/`;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const jobs = [['release-artifact.json', pins.manifestSha256], ...Object.entries(manifest.files).map(([file, entry]) => [file, entry.sha256])];
let cursor = 0; const verified = []; const errors = [];
const worker = async () => {
  while (cursor < jobs.length) {
    const [file, expected] = jobs[cursor++];
    let last;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const response = await fetch(new URL(file + '?guide-artifact=' + pins.artifactId, url), { cache: 'no-store', signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw Error(`${response.status} ${file}`);
        const actual = digest(Buffer.from(await response.arrayBuffer()));
        if (actual !== expected) throw Error(`SHA mismatch for ${file}: ${actual}`);
        verified.push(file); last = null; break;
      } catch (error) { last = error; if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1))); }
    }
    if (last) errors.push(last.message);
  }
};
await Promise.all(Array.from({ length: 8 }, worker));
assert.deepEqual(errors, []);
assert.equal(verified.length, jobs.length);
const publicManifest = JSON.parse(await fetch(new URL('release-artifact.json?guide-check='+Date.now(), url), { cache: 'no-store' }).then((r) => r.text()));
assert.equal(publicManifest.artifactId, pins.artifactId);
const output = { status: 'passed', verifiedAt: new Date().toISOString(), previewUrl: url, artifactId: pins.artifactId,
  manifestSha256: pins.manifestSha256, fileCount: verified.length, sourceCommit: manifest.sourceCommit, errors };
await fs.writeFile(path.join(report, 'preview-https.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
