/** Starts the synthetic-only loopback server on a free port for a standalone browser test. */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function startTestOrigin(args = []) {
  const server = spawn(process.execPath, ['devtools/onboarding-browser-server.mjs', '0', ...args], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'inherit'] });
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Test server startup timeout')), 15000);
    let text = '';
    server.stdout.on('data', (bytes) => {
      text += bytes;
      const match = text.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
    server.once('error', reject);
  });
  return { origin, close: () => server.kill() };
}

/** Ignored evidence folder: the runner's per-test folder, else .dev-backups/evidence/browser/<name>. */
export function evidenceDir(name) {
  return process.env.QUESTNOTE_BROWSER_EVIDENCE_DIR || path.join(root, '.dev-backups', 'evidence', 'browser', name);
}
