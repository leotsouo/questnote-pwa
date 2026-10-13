#!/usr/bin/env node
/**
 * One-time repository slimming (no history rewrite). Everything removed stays available from
 * tag pre-cleanup-2026-10-14.
 *
 *   node devtools/slim-repo.mjs            list what would be removed (changes nothing)
 *   node devtools/slim-repo.mjs --apply    git rm the files and annotate markdown that linked to them
 *
 * After --apply, run: npm test && npm run pools:validate && npm run images:check && npm run test:pool:release
 * and commit when everything is green. Delete this script once it has been applied.
 *
 * Scope was derived by tracing every file read during npm test, pools:validate, images:check,
 * test:pool:release and release assembly: none of them read the files selected here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const TAG = 'pre-cleanup-2026-10-14';
const apply = process.argv.includes('--apply');
const git = (args, options = {}) => execFileSync('git', ['-c', 'core.quotepath=false', ...args],
  { encoding: 'utf8', maxBuffer: 1 << 28, ...options });
const tracked = (dir) => git(['ls-files', '-z', '--', dir]).split('\0').filter(Boolean);

const EVIDENCE = /\.(png|jpe?g|webp|gif|mp4|webm|html|log|gz|zip|js|mjs|css)$/i;
const batches = {
  // Closed pool workspaces keep only their small top-level JSON/Markdown (pet ID reservations,
  // briefs, plans, Lore). Snapshots, candidates, source images and review pages go.
  'pool drafts (content/pet-series)': tracked('content/pet-series').filter((file) => {
    const parts = file.split('/');
    if (parts[2] === '_template') return false;
    if (parts[2].startsWith('_lionheart_')) return true;
    return parts.length > 4 || !/\.(json|jsonl|md)$/.test(file);
  }),
  'proposal and awakening source art (content/)': [...tracked('content/pool-proposals'), ...tracked('content/awakening')]
    .filter((file) => /\.(png|jpe?g|webp|html)$/i.test(file)),
  'report screenshots, review pages and logs (reports/)': tracked('reports').filter((file) => EVIDENCE.test(file)),
  'inactive archive (src/_archive)': tracked('src/_archive'),
};

if (apply && git(['status', '--porcelain'])) throw new Error('Commit or stash other changes first; this script expects a clean checkout.');
if (!git(['tag', '--list', TAG]).trim()) throw new Error(`Tag ${TAG} is missing; fetch tags before removing anything.`);
if (git(['diff', '--stat', TAG, '--', 'content', 'reports', 'src/_archive']).trim() && !apply) {
  console.log(`Note: content/, reports/ or src/_archive already differ from ${TAG}.`);
}

const megabytes = (files) => (files.reduce((sum, file) => sum + (fs.existsSync(file) ? fs.statSync(file).size : 0), 0) / 1048576).toFixed(1);
const removed = new Set();
for (const [label, files] of Object.entries(batches)) {
  console.log(`${label}: ${files.length} files, ${megabytes(files)} MB`);
  for (const file of files) removed.add(file);
}
console.log(`Total: ${removed.size} files, ${megabytes([...removed])} MB`);
if (!apply) {
  console.log('\nDry run only. Re-run with --apply to remove them.');
  process.exit(0);
}

// Markdown that embedded or linked a removed file keeps its sentence and points at the tag instead.
// Hash-bound evidence folders keep their exact bytes, so they are left untouched.
const HASH_BOUND = ['reports/lionheart/', 'reports/chaos-demon-court/'];
let annotated = 0;
for (const file of [...tracked('reports'), ...tracked('docs')]) {
  if (!file.endsWith('.md') || HASH_BOUND.some((prefix) => file.startsWith(prefix))) continue;
  const original = fs.readFileSync(file, 'utf8');
  const updated = original.replace(/(!?)\[([^\]\n]*)\]\(([^)\s]+)\)/g, (whole, bang, text, target) => {
    if (/^[a-z]+:|^#/i.test(target)) return whole;
    let decoded;
    try { decoded = decodeURIComponent(target.split('#')[0].split('?')[0]); } catch { return whole; }
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), decoded));
    const gone = removed.has(resolved) || [...removed].some((name) => name.startsWith(`${resolved.replace(/\/$/, '')}/`));
    if (!gone) return whole;
    return `${text || path.posix.basename(resolved)}（${bang ? '圖片' : '檔案'}已移出 repo，見 tag ${TAG}：\`${resolved}\`）`;
  });
  if (updated !== original) { fs.writeFileSync(file, updated); annotated += 1; }
}

const spec = path.join(fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'questnote-slim-')), 'paths');
fs.writeFileSync(spec, [...removed].join('\0'));
git(['rm', '-q', '--pathspec-from-file', spec, '--pathspec-file-nul'], { stdio: 'inherit' });
git(['add', '--', 'reports', 'docs']);
console.log(`\nRemoved ${removed.size} files and annotated ${annotated} markdown files. Now run the validations and commit.`);
