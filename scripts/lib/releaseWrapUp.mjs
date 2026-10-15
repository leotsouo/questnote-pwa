/**
 * Pure and git-only helpers for the steps around a production release: syncing mailbox-only
 * commits from main, recognizing a half-finished release, and writing the release record.
 * Nothing here touches the network; git access is injected so tests can use temporary repositories.
 */

export const MAILBOX_FILE = 'data/global-mailbox.json';
export const FINAL_INTEGRATION = 'docs/final-integration.md';
export const NEXT_PR_TITLE = '持續整合：dev → main';

const SUMMARY_MAX_CHARS = 600;
const COMMIT_LIST_MAX = 15;

function collapse(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

/**
 * The "what changed" sentence for the release record. A PR body can carry it as
 * "**一句話：** …" or as a "## 一句話…" heading followed by a paragraph; otherwise the commit
 * subjects of the release are listed.
 */
export function extractSummary(prBody, commitSubjects = []) {
  const body = String(prBody || '').replace(/\r\n/g, '\n');
  // The paragraph ends at a blank line or at the end of the text; `$` would stop at the first line break.
  const inline = /^\*\*一句話[：:]\*\*\s*([\s\S]+?)(?:\n\s*\n|(?![\s\S]))/m.exec(body);
  if (inline) return { source: 'pr', text: collapse(inline[1]).slice(0, SUMMARY_MAX_CHARS) };
  const heading = /^#{1,6}\s*一句話[^\n]*\n+([\s\S]+?)(?:\n\s*\n|(?![\s\S]))/m.exec(body);
  if (heading) return { source: 'pr', text: collapse(heading[1]).slice(0, SUMMARY_MAX_CHARS) };
  const subjects = commitSubjects.map(collapse).filter(Boolean).slice(0, COMMIT_LIST_MAX);
  if (!subjects.length) return { source: 'none', text: '' };
  return { source: 'commits', text: subjects.map((subject) => `「${subject}」`).join('、'), subjects };
}

/** YYYY-MM-DD in Asia/Taipei, the calendar the project's records use. */
export function taipeiDate(isoTimestamp) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(isoTimestamp));
}

export function renderReleaseEntry({ version, date, pullRequest, approval, mergeCommit, artifactId, deployCommit,
  verifiedFiles, summary, resumed = false, evidenceName }) {
  const lines = [];
  lines.push(`# V${version} 已發布 — ${date}`);
  lines.push('');
  const pr = `[PR #${pullRequest.number}](${pullRequest.url})`;
  const intro = `${pr} 經使用者「${approval}」與 CI 通過後，以 merge commit 合併為 \`${mergeCommit}\`。`;
  const what = summary?.text
    ? (summary.source === 'commits' ? `這輪的 commit：${summary.text}。` : `${summary.text.replace(/[。.]+$/, '')}。`)
    : '';
  const published = `正式 artifact \`${artifactId}\`，gh-pages \`${deployCommit}\`；${verifiedFiles} 個檔案的 Git blob 與正式 HTTPS 內容逐檔相符，\`dev\` 已 fast-forward 到 \`main\`。`;
  lines.push([intro, what, published].filter(Boolean).join(''));
  if (resumed) {
    lines.push('');
    lines.push('這次發布中途停過，用 `--resume` 從合併之後接著完成。');
  }
  if (evidenceName) {
    lines.push('');
    lines.push(`證據：\`.dev-backups/evidence/${evidenceName}\`。`);
  }
  lines.push('');
  return lines.join('\n');
}

function detectEol(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

export function hasReleaseEntry(markdown, version) {
  const escaped = String(version).replace(/\./g, '\\.');
  return new RegExp(`^#{1,3} V${escaped}(?![\\d.])`, 'm').test(markdown);
}

/** Newest entries go first. Returns the same text untouched when this version is already recorded. */
export function insertReleaseEntry(markdown, entry, version) {
  if (hasReleaseEntry(markdown, version)) return { markdown, inserted: false };
  const eol = detectEol(markdown);
  const normalized = entry.replace(/\r?\n/g, eol);
  return { markdown: `${normalized}${eol}${markdown}`, inserted: true };
}

export function buildNextPullRequestBody({ version, pullRequest }) {
  return [
    '## 這一輪',
    '',
    `V${version} 已正式發布（見 PR #${pullRequest.number} 與 \`docs/final-integration.md\`）。這個 PR 是下一輪的驗收入口。`,
    '',
    '### 目前內容',
    `- V${version} 發布紀錄。`,
    '',
    '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
    '',
  ].join('\n');
}

export function onlyMailboxFiles(changedFiles) {
  return changedFiles.length > 0 && changedFiles.every((file) => file === MAILBOX_FILE);
}

/**
 * The mailbox patrol pushes mailbox-only commits to main at any time. When those are the only
 * commits dev lacks, merge them into dev (a merge, never a rebase) and push, so a release does not
 * stop for them. Anything else on main still stops the release.
 * `git(cwd, args)` runs git and returns trimmed stdout; it must throw on a non-zero exit.
 */
export function syncMailboxOnlyCommits({ git, cwd, log = () => {} }) {
  git(cwd, ['fetch', 'origin']);
  const behind = Number(git(cwd, ['rev-list', '--count', 'HEAD..origin/main']));
  if (behind === 0) return { merged: false, commits: 0 };
  const changed = git(cwd, ['diff', '--name-only', 'HEAD...origin/main']).split('\n').filter(Boolean);
  if (!onlyMailboxFiles(changed)) {
    const shown = changed.slice(0, 8).join(', ');
    throw new Error(`origin/main has ${behind} commit(s) that dev lacks and they change more than the mailbox `
      + `(${shown}${changed.length > 8 ? ', …' : ''}). Merge origin/main into dev, push, redeploy the preview and re-confirm.`);
  }
  log(`origin/main has ${behind} mailbox-only commit(s); merging them into dev.`);
  git(cwd, ['merge', '--no-edit', 'origin/main']);
  git(cwd, ['push', 'origin', 'HEAD:dev']);
  return { merged: true, commits: behind };
}

/**
 * A release whose PR is already merged can be resumed only when that merge commit is part of
 * origin/main; main may have moved on since (mailbox patrol commits), which is fine.
 */
export function assertMergeCommitOnMain({ git, cwd, mergeCommit }) {
  if (!mergeCommit) throw new Error('The merged PR has no merge commit to resume from.');
  try {
    git(cwd, ['merge-base', '--is-ancestor', mergeCommit, 'origin/main']);
  } catch {
    throw new Error(`Merge commit ${mergeCommit.slice(0, 7)} is not on origin/main; nothing to resume.`);
  }
}

/** Commit subjects of what the merged PR brought in: previous main (parent 1) up to the dev side (parent 2). */
export function releaseCommitSubjects({ git, cwd, mergeCommit }) {
  try {
    const parents = git(cwd, ['rev-list', '--parents', '-n', '1', mergeCommit]).split(' ');
    if (parents.length < 3) return [];
    return git(cwd, ['log', '--no-merges', '--format=%s', `${parents[1]}..${parents[2]}`]).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}
