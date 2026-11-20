// Fails when runtime files (src/**, service-worker.js, index.html) changed since <base-ref> but
// APP_VERSION did not: without a bump the cache name stays the same and users keep the old shell.
// Usage: node devtools/check-version-bump.mjs [base-ref]   (default origin/main)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isRuntimeFile = (file) => file.startsWith('src/') || file === 'service-worker.js' || file === 'index.html';

export function checkVersionBump(changedFiles, baseVersion, headVersion) {
  const runtimeFiles = changedFiles.filter(isRuntimeFile);
  if (!runtimeFiles.length || baseVersion !== headVersion) return { ok: true, runtimeFiles };
  return {
    ok: false,
    runtimeFiles,
    reason: `Runtime files changed but APP_VERSION is still ${headVersion}. Bump APP_VERSION and CACHE_NAME in src/version.js and the CACHE_NAME literal in service-worker.js.`,
  };
}

export function readAppVersion(versionSource) {
  const match = versionSource.match(/export const APP_VERSION = '([^']+)';/);
  if (!match) throw new Error('APP_VERSION not found in src/version.js');
  return match[1];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = process.argv[2] || 'origin/main';
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
  const changedFiles = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
  const baseVersion = readAppVersion(git('show', `${base}:src/version.js`));
  const headVersion = readAppVersion(readFileSync(new URL('../src/version.js', import.meta.url), 'utf8'));
  const result = checkVersionBump(changedFiles, baseVersion, headVersion);
  if (result.ok) {
    console.log(`Version bump check passed (${base} ${baseVersion} -> HEAD ${headVersion}, ${result.runtimeFiles.length} runtime file(s) changed).`);
  } else {
    console.error(`Version bump check failed against ${base}.\n${result.reason}\nRuntime files changed:\n${result.runtimeFiles.map((file) => `  ${file}`).join('\n')}`);
    process.exit(1);
  }
}
