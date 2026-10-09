/** Reproducible bounded validation with logs stored in the registered output. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const output = path.resolve(root, process.env.QUESTNOTE_POOL_PREVIEW_REPORT_DIR || '.dev-backups/test-runs/pool-awakening-preview');
fs.mkdirSync(output, { recursive: true });
const runs = [
  ['syntax', ['--check', 'src/poolAwakeningPreview.js']],
  ['encounter-syntax', ['--check', 'src/encounterView.js']],
  ['guide-syntax', ['--check', 'src/petAwakeningView.js']],
  ['sw-syntax', ['--check', 'service-worker.js']],
  ['targeted', ['--test', 'devtools/pool-awakening-preview.test.mjs', 'devtools/pet-awakening.test.mjs', 'devtools/chaos-demon-court.test.mjs', 'devtools/aurora-fairy-feast.test.mjs']],
  ['browser', ['devtools/pool-awakening-preview-browser-test.mjs']],
  ['full', null],
];
const results = [];
for (const [name, args] of runs) {
  const result = args ? spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', windowsHide: true, env: { ...process.env, QUESTNOTE_POOL_PREVIEW_REPORT_DIR: path.join(output, 'browser') } })
    : spawnSync('npm test', { cwd: root, shell: true, encoding: 'utf8', windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
  fs.writeFileSync(path.join(output, name + '.log'), (result.stdout || '') + (result.stderr || '') + (result.error?.stack || ''));
  results.push({ name, status: result.status, ok: result.status === 0 });
  console.log(`${result.status === 0 ? 'PASS' : 'FAIL'} ${name}`);
  if (result.status !== 0) console.log((result.stdout || '').slice(-2500) + (result.stderr || '').slice(-2500));
}
fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(results, null, 2) + '\n');
if (results.some((result) => !result.ok)) process.exitCode = 1;
