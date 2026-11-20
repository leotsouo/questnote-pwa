// Runs every devtools/*-browser-test.mjs one at a time (they each start their own server)
// and leaves logs plus summary.md in .dev-backups/evidence/<date>/browser/.
// Usage: npm run verify:browser [-- --only <name fragment> ...] [--timeout <minutes>]
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const only = args.flatMap((arg, i) => (arg === '--only' ? [args[i + 1]] : []));
const timeoutIndex = args.indexOf('--timeout');
const timeoutMs = (timeoutIndex >= 0 ? Number(args[timeoutIndex + 1]) : 5) * 60_000;
const TAIL_LINES = 40;

const now = new Date();
const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const outDir = path.join(root, '.dev-backups', 'evidence', day, 'browser');
await fs.mkdir(outDir, { recursive: true });

const tests = (await fs.readdir(path.join(root, 'devtools')))
  .filter((name) => name.endsWith('-browser-test.mjs'))
  .filter((name) => !only.length || only.some((part) => name.includes(part)))
  .sort();
if (!tests.length) {
  console.error(`No browser tests match ${only.join(', ')}`);
  process.exit(1);
}

function run(file, evidenceDir) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [path.join('devtools', file)], {
      cwd: root,
      env: { ...process.env, QUESTNOTE_BROWSER_EVIDENCE_DIR: evidenceDir },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      // Windows: kill the whole tree so Edge and the test server do not outlive the run.
      if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      else child.kill('SIGKILL');
    }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: timedOut ? 'timeout' : code, ms: Date.now() - started, output });
    });
  });
}

const rows = [];
for (const file of tests) {
  const name = file.replace(/\.mjs$/, '');
  const evidenceDir = path.join(outDir, name);
  process.stdout.write(`${name} ... `);
  const result = await run(file, evidenceDir);
  const ok = result.code === 0;
  await fs.writeFile(path.join(outDir, `${name}.log`), result.output);
  const tail = result.output.trimEnd().split(/\r?\n/).slice(-TAIL_LINES).join('\n');
  const error = ok ? '' : (result.code === 'timeout' ? `timed out after ${timeoutMs / 60_000} min` : (tail.split('\n').find((line) => /Error|FAIL|assert/i.test(line)) || tail.split('\n').at(-1) || `exit ${result.code}`));
  rows.push({ name, ok, ms: result.ms, code: result.code, evidenceDir, error, tail });
  console.log(`${ok ? 'PASS' : 'FAIL'} (${(result.ms / 1000).toFixed(1)}s)`);
  if (!ok) console.log(tail.split('\n').map((line) => `    ${line}`).join('\n'));
}

const passed = rows.filter((row) => row.ok).length;
const failed = rows.length - passed;
const totalSeconds = rows.reduce((sum, row) => sum + row.ms, 0) / 1000;
const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 300);
const rel = (p) => path.relative(root, p).replace(/\\/g, '/');
const summary = [
  `# Browser verification ${now.toISOString()}`,
  '',
  `${passed} passed, ${failed} failed, ${rows.length} total, ${totalSeconds.toFixed(1)} s.`,
  '',
  '| Test | Result | Time | Evidence | Error |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map((row) => `| ${row.name} | ${row.ok ? 'PASS' : 'FAIL'} | ${(row.ms / 1000).toFixed(1)} s | ${rel(row.evidenceDir)} (log: ${rel(path.join(outDir, `${row.name}.log`))}) | ${cell(row.error)} |`),
  '',
  ...rows.filter((row) => !row.ok).flatMap((row) => [`## ${row.name} (exit ${row.code})`, '', '```', row.tail, '```', '']),
].join('\n');
const summaryPath = path.join(outDir, 'summary.md');
await fs.writeFile(summaryPath, summary);
console.log(`\n${passed} passed, ${failed} failed (${totalSeconds.toFixed(1)} s). Summary: ${summaryPath}`);
process.exit(failed ? 1 : 0);
