import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { APP_STYLE_PARTS } from '../src/styleParts.js';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('index.html links the base stylesheet parts first, in cascade order', () => {
  const links = [...read('index.html').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(links.slice(0, APP_STYLE_PARTS.length), [...APP_STYLE_PARTS]);
  assert.ok(!links.includes('src/styles.css'), 'the aggregate entry is for dev tools only');
  assert.equal(new Set(links).size, links.length);
});

test('the dev-tool aggregate imports exactly the same parts in the same order', () => {
  const imports = [...read('src/styles.css').matchAll(/@import url\('\.\/([^']+)'\);/g)].map((match) => `src/${match[1]}`);
  assert.deepEqual(imports, [...APP_STYLE_PARTS]);
});

test('every part exists, is non-empty and is precached by the source service worker', () => {
  const worker = read('service-worker.js');
  for (const part of [...APP_STYLE_PARTS, 'src/styleParts.js']) {
    assert.ok(read(part).length > 0, part);
    assert.ok(worker.includes(`'${part}',`), `${part} missing from PRECACHE_URLS`);
  }
  assert.ok(!worker.includes("'src/styles.css',"));
});

test('parts are self-contained: balanced braces and no relative url() that the move would break', () => {
  for (const part of APP_STYLE_PARTS) {
    const css = read(part).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.equal(css.split('{').length, css.split('}').length, part);
    assert.ok(!/url\(/.test(css), `${part} must not use url(); paths would resolve from src/styles/`);
  }
});
