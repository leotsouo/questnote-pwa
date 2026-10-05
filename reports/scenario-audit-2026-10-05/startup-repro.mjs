// Limited CODE reproduction: actual source statements, synthetic DOM only.
// This does not establish browser visual appearance or real startup failure frequency.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/app.js', import.meta.url), 'utf8');
const hideLoaderStatement = source.match(/const hideLoader = \(\) => loader\?\.remove\(\);/)?.[0];
assert.ok(hideLoaderStatement, 'Expected actual hideLoader statement');
const catchSource = source.slice(source.lastIndexOf('  } catch (err) {'));
assert.ok(catchSource.indexOf('hideLoader();') < catchSource.indexOf('loader.textContent ='), 'Actual outer catch removes loader before writing error');
const errorStatement = catchSource.match(/loader\.textContent = `載入失敗：\$\{err\.message\}`;/)?.[0];
assert.ok(errorStatement, 'Expected actual startup error statement');

const host = { children: [] };
const loader = {
  textContent: 'Loading',
  get isConnected() { return host.children.includes(this); },
  remove() { host.children = host.children.filter((node) => node !== this); },
};
host.children.push(loader);
assert.equal(loader.isConnected, true);
const err = new Error('synthetic IndexedDB failure');
new Function('loader', 'err', `${hideLoaderStatement}\nhideLoader();\n${errorStatement}`)(loader, err);
assert.equal(loader.textContent, '載入失敗：synthetic IndexedDB failure');
assert.equal(loader.isConnected, false);
assert.equal(host.children.length, 0);
console.log('PASS CODE reproduction: actual startup catch writes failure message to removed loader; synthetic host has no error node.');
