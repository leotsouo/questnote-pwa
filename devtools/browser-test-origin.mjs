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

/** Fresh profiles open the guided tour (V3.x); the old onboarding "略過教學" screen is gone. */
export async function skipGuidedTour(page) {
  await page.locator('#app-loader').waitFor({ state: 'hidden' });
  await page.locator('[data-guided-action="skip"]').click();
  await page.locator('[data-guided-action="confirm-skip"]').click();
  await page.locator('.guided-coach').waitFor({ state: 'detached' });
}

/** Seeded legacy currency opens the one-time encounter migration notice (V3.9.10); close it if shown. */
export async function closeMigrationNotice(page) {
  const close = page.locator('#specified-invitation-dialog[open] [data-invitation-action="close"]');
  if (await close.waitFor({ timeout: 3000 }).then(() => true, () => false)) await close.click();
}

/** Ignored evidence folder: the runner's per-test folder, else .dev-backups/evidence/browser/<name>. */
export function evidenceDir(name) {
  return process.env.QUESTNOTE_BROWSER_EVIDENCE_DIR || path.join(root, '.dev-backups', 'evidence', 'browser', name);
}
