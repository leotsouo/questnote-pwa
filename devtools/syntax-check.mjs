#!/usr/bin/env node
/**
 * Parse every runtime JavaScript file (src/, service-worker.js, src/bootstrap.js) with `node --check`.
 * The App has no build step, so a syntax error only shows up when a browser loads the file.
 * Exit code 1 lists every file that fails.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const targets = ['service-worker.js'];
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel);
    else if (/\.(js|mjs)$/.test(entry.name)) targets.push(rel);
  }
}
walk('src');
const failures = [];
for (const file of targets) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${file}\n${result.stderr.trim()}`);
}
if (failures.length) {
  console.error(`syntax-check: ${failures.length} file(s) failed\n${failures.join('\n\n')}`);
  process.exit(1);
}
console.log(`syntax-check: ${targets.length} files parsed`);
