/** Validate report references and captured bytes; no runtime behavior claims. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const base = fileURLToPath(new URL('./', import.meta.url));
const report = fs.readFileSync(path.join(base, 'audit.md'), 'utf8');
const headings = [...report.matchAll(/^## (\d+)\. /gm)].map((m) => Number(m[1]));
assert.deepEqual(headings, Array.from({ length: 17 }, (_, i) => i + 1));
console.log('PASS 17 required audit sections in order');
const fences = [...report.matchAll(/^```/gm)];
assert.equal(fences.length % 2, 0);
console.log(`PASS ${fences.length / 2} balanced ASCII fenced blocks`);
let checked = 0;
for (const match of report.matchAll(/\]\(([^)]+)\)/g)) {
  const [relative, fragment] = match[1].split('#');
  if (relative.startsWith('http')) continue;
  const file = path.resolve(base, relative);
  assert.ok(fs.existsSync(file), `Missing link ${match[1]}`);
  if (fragment?.startsWith('L')) {
    assert.ok(Number(fragment.slice(1)) <= fs.readFileSync(file, 'utf8').split('\n').length, `Bad line ${match[1]}`);
  }
  checked++;
}
console.log(`PASS ${checked} artifact/source references exist with valid line bounds`);
const notes = JSON.parse(fs.readFileSync(path.join(base, 'interaction-notes.json'), 'utf8'));
assert.ok(notes.database.startsWith('QuestNoteTest-Onboarding-'));
console.log('PASS synthetic database name and interaction notes');
const images = fs.readdirSync(base).filter((file) => file.endsWith('.jpg')).sort();
assert.equal(images.length, 11);
for (const image of images) {
  const bytes = fs.readFileSync(path.join(base, image));
  assert.equal(bytes.subarray(0, 2).toString('hex'), 'ffd8');
  console.log(`JPEG ${image}: ${bytes.length} bytes SHA256 ${crypto.createHash('sha256').update(bytes).digest('hex')}`);
}
const sourceRoot = path.resolve(base, '../../src');
const sources = fs.readdirSync(sourceRoot).filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(sourceRoot, file), 'utf8')).join('\n');
const names = [...new Set([...report.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]))];
const missing = names.filter((name) => !new RegExp('\\b' + name + '\\s*(?:\\(|=)').test(sources));
assert.deepEqual(missing, []);
console.log(`PASS ${names.length} distinct source function-like names found`);
console.log('LIMIT: validates references/structure; not every call-graph edge, native device behavior or occurrence rate.');
