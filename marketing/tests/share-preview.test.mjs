import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
const title = 'QuestNote｜小事完成，冒險繼續';
const description = '把生活裡的待辦變成冒險的 App。完成一件小事，和你的夥伴一起成長。';
const image = 'https://questnote.taste-compare.com/assets/questnote-og-v2.jpg';
function meta(key) {
  const matches = [...html.matchAll(new RegExp(`<meta (?:property|name)="${key}" content="([^"]+)"`, 'g'))];
  assert.equal(matches.length, 1, `${key} must be present exactly once in raw HTML`);
  return matches[0][1];
}
test('raw crawler HTML has one consistent canonical and campaign metadata set', () => {
  assert.equal([...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].length, 1);
  assert.ok(html.includes('<link rel="canonical" href="https://questnote.taste-compare.com/">'));
  assert.equal(meta('og:type'), 'website');
  assert.equal(meta('og:url'), 'https://questnote.taste-compare.com/');
  assert.equal(meta('og:title'), title);
  assert.equal(meta('twitter:title'), title);
  assert.equal(meta('og:description'), description);
  assert.equal(meta('twitter:description'), description);
  assert.equal(meta('og:image'), image);
  assert.equal(meta('twitter:image'), image);
  assert.equal(meta('twitter:card'), 'summary_large_image');
  assert.equal(meta('og:image:type'), 'image/jpeg');
  assert.equal(meta('og:image:width'), '1200');
  assert.equal(meta('og:image:height'), '630');
  assert.equal(meta('og:image:alt'), meta('twitter:image:alt'));
});
test('campaign image is an actual modest-size 1200 by 630 static JPEG', async () => {
  const bytes = await fs.readFile(new URL('../assets/questnote-og-v2.jpg', import.meta.url));
  const info = await sharp(bytes).metadata();
  assert.equal(info.format, 'jpeg');
  assert.equal(info.width, 1200);
  assert.equal(info.height, 630);
  assert.ok(bytes.length < 250_000);
  const robots = await fs.readFile(new URL('../robots.txt', import.meta.url), 'utf8');
  assert.equal(/^Disallow:\s*\/\s*$/m.test(robots), false);
});
