import { execFileSync } from 'node:child_process';
import path from 'node:path';

/** Build one mailbox-only descendant with a private index; never touch checkout/index/refs. */
export function commitMailbox({ root, stateDir, branch, base, bytes, eventId }) {
  if (!['main', 'gh-pages'].includes(branch) || !/^[a-f0-9]{40}$/.test(base) || !/^[A-Za-z0-9_-]+$/.test(eventId)) throw new Error('Invalid mailbox commit identity');
  const env = { ...process.env, GIT_INDEX_FILE: path.join(stateDir, `index-${branch}`) };
  const command = (args, options = {}) => execFileSync('git', args, { cwd: root, encoding: 'utf8', timeout: 120000, env, ...options }).trim();
  command(['read-tree', base]);
  const blob = command(['hash-object', '-w', '--stdin'], { input: bytes });
  command(['update-index', '--add', '--cacheinfo', `100644,${blob},data/global-mailbox.json`]);
  const tree = command(['write-tree']);
  return command(['commit-tree', tree, '-p', base], { input: `chore(mailbox): publish ${eventId}\n` });
}
