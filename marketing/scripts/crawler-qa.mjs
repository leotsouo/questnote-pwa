import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const base = process.argv[2];
const phase = process.argv[3];
assert.ok(/^https:\/\//.test(base));
assert.ok(['preview', 'production'].includes(phase));
const checks = [];
const meta = (html, key) => {
  const tags = html.match(/<meta\b[^>]*>/g) || [];
  const matches = tags.filter(tag => tag.includes(`="${key}"`));
  assert.equal(matches.length, 1, key);
  return matches[0].match(/content="([^"]*)"/)[1];
};
for (const agent of ['Line/14.0', 'Twitterbot/1.0', 'Discordbot/2.0', 'facebookexternalhit/1.1']) {
  const response = await fetch(base, { headers: { 'User-Agent': agent } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.equal(meta(html, 'og:title'), 'QuestNote｜小事完成，冒險繼續');
  assert.equal(meta(html, 'og:description'), '把生活裡的待辦變成冒險的 App。完成一件小事，和你的夥伴一起成長。');
  assert.equal(meta(html, 'og:url'), 'https://questnote.taste-compare.com/');
  assert.equal(meta(html, 'og:image'), 'https://questnote.taste-compare.com/assets/questnote-og-v2.jpg');
  assert.equal(meta(html, 'og:image:width'), '1200');
  assert.equal(meta(html, 'og:image:height'), '630');
  assert.equal(meta(html, 'twitter:card'), 'summary_large_image');
  for (const key of ['title', 'description', 'image']) assert.equal(meta(html, `twitter:${key}`), meta(html, `og:${key}`));
  assert.match(html, /rel="canonical" href="https:\/\/questnote.taste-compare.com\/"/);
  checks.push({ agent, status: response.status, rawMetadata: true });
}
const manifest = JSON.parse(await fs.readFile('../reports/marketing/build-manifest.json', 'utf8'));
for (const file of manifest.files.filter(file => file.path !== '_headers')) {
  const url = new URL(file.path.replace(/index.html$/, ''), base + '/');
  const response = await fetch(url);
  assert.equal(response.status, 200, file.path);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
  if (file.path.endsWith('questnote-og-v2.jpg')) {
    assert.match(response.headers.get('content-type'), /image\/jpeg/);
    const image = await sharp(bytes).metadata();
    assert.equal(image.width, 1200);
    assert.equal(image.height, 630);
  }
  checks.push({ file: file.path, status: response.status, sha256: file.sha256 });
}
const robots = await (await fetch(base + '/robots.txt')).text();
assert.doesNotMatch(robots, /Disallow:\s*\/\s*$/m);
await fs.writeFile(`../reports/marketing/share-preview/${phase}-validation.json`, JSON.stringify({ base, time: new Date().toISOString(), pass: true, checks }, null, 2));
console.log(JSON.stringify({ phase, pass: true, checks: checks.length }));
