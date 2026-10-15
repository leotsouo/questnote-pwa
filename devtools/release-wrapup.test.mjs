import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  MAILBOX_FILE, extractSummary, taipeiDate, renderReleaseEntry, hasReleaseEntry, insertReleaseEntry,
  buildNextPullRequestBody, onlyMailboxFiles, syncMailboxOnlyCommits, assertMergeCommitOnMain, releaseCommitSubjects,
} from '../scripts/lib/releaseWrapUp.mjs';

const git = (cwd, args) => execFileSync('git', ['-C', cwd, '-c', 'core.autocrlf=false', '-c', 'user.name=Test',
  '-c', 'user.email=test@example.invalid', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

test('the summary comes from the PR body in either format, then from commit subjects', () => {
  assert.deepEqual(extractSummary('## 這一輪\n\n**一句話：** 三個測試納入 npm test，\n健康檢查全部通過。\n\n### 其他', ['x']),
    { source: 'pr', text: '三個測試納入 npm test， 健康檢查全部通過。' });
  assert.deepEqual(extractSummary('## 一句話總結\n\n統一開發流程。\n\n## 預覽', []),
    { source: 'pr', text: '統一開發流程。' });
  assert.deepEqual(extractSummary('沒有摘要的 PR 說明', ['修好 A', '加入 B', '']),
    { source: 'commits', text: '「修好 A」、「加入 B」', subjects: ['修好 A', '加入 B'] });
  assert.deepEqual(extractSummary('', []), { source: 'none', text: '' });
  assert.ok(extractSummary(`**一句話：** ${'字'.repeat(900)}`).text.length <= 600);
});

test('dates use the Asia/Taipei calendar', () => {
  assert.equal(taipeiDate('2026-10-15T17:30:00.000Z'), '2026-10-16');
  assert.equal(taipeiDate('2026-10-15T15:59:00.000Z'), '2026-10-15');
});

test('the release entry carries every fact needed to find the release again', () => {
  const entry = renderReleaseEntry({ version: '3.10.3', date: '2026-10-16', pullRequest: { number: 108, url: 'https://example.invalid/pull/108' },
    approval: '可以發布', mergeCommit: 'a'.repeat(40), artifactId: 'b'.repeat(64), deployCommit: 'c'.repeat(40), verifiedFiles: 865,
    summary: { source: 'pr', text: '健康檢查全部通過。' }, resumed: true, evidenceName: 'release-v3.10.3.json' });
  assert.match(entry, /^# V3\.10\.3 已發布 — 2026-10-16\n/);
  for (const needle of ['[PR #108](https://example.invalid/pull/108)', 'a'.repeat(40), 'b'.repeat(64), 'c'.repeat(40),
    '865 個檔案', '健康檢查全部通過。', '--resume', 'release-v3.10.3.json', '「可以發布」']) {
    assert.ok(entry.includes(needle), `missing ${needle}`);
  }
  assert.ok(!entry.includes('。。'), 'summary full stop is not doubled');
});

test('the record is inserted once, at the top, in the file own line-ending style', () => {
  const entry = '# V3.10.3 已發布 — 2026-10-16\n\n內容。\n';
  const first = insertReleaseEntry('# V3.10.2 已發布 — 2026-10-15\n\n舊的。\n', entry, '3.10.3');
  assert.equal(first.inserted, true);
  assert.ok(first.markdown.startsWith('# V3.10.3 '));
  assert.ok(first.markdown.includes('# V3.10.2 '));
  const again = insertReleaseEntry(first.markdown, entry, '3.10.3');
  assert.equal(again.inserted, false);
  assert.equal(again.markdown, first.markdown);
  const crlf = insertReleaseEntry('# V3.10.2 已發布\r\n\r\n舊的。\r\n', entry, '3.10.3');
  assert.equal(crlf.markdown.replace(/\r\n/g, ''), crlf.markdown.replace(/\r?\n/g, ''));
  assert.ok(!/(?<!\r)\n/.test(crlf.markdown), 'no bare LF in a CRLF file');
  // 3.10.1 must not count as the already-recorded 3.10.10 or vice versa
  assert.equal(hasReleaseEntry('# V3.10.10 已發布\n', '3.10.1'), false);
  assert.equal(hasReleaseEntry('## V3.10.1 已發布\n', '3.10.1'), true);
});

test('the next PR body points at the release and carries the project signature', () => {
  const body = buildNextPullRequestBody({ version: '3.10.3', pullRequest: { number: 108 } });
  assert.match(body, /V3\.10\.3 已正式發布（見 PR #108/);
  assert.match(body, /Generated with \[Claude Code\]/);
});

test('only a change confined to the mailbox file counts as mailbox-only', () => {
  assert.equal(onlyMailboxFiles([MAILBOX_FILE]), true);
  assert.equal(onlyMailboxFiles([]), false);
  assert.equal(onlyMailboxFiles([MAILBOX_FILE, 'src/ui.js']), false);
  assert.equal(onlyMailboxFiles(['data/global-mailbox.json.bak']), false);
});

/** A bare origin with main and dev, plus a working clone on dev. */
function makeRepos() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'questnote-wrapup-'));
  const origin = path.join(root, 'origin.git');
  const work = path.join(root, 'work');
  const patrol = path.join(root, 'patrol');
  execFileSync('git', ['init', '--bare', '-b', 'main', origin], { stdio: 'ignore' });
  // Clones must not inherit this machine's autocrlf=true, or every checkout looks like a content change.
  execFileSync('git', ['clone', '-c', 'core.autocrlf=false', origin, work], { stdio: 'ignore' });
  fs.mkdirSync(path.join(work, 'data'));
  fs.writeFileSync(path.join(work, MAILBOX_FILE), '{"messages":[]}\n');
  fs.writeFileSync(path.join(work, 'app.js'), 'one\n');
  git(work, ['add', '.']);
  git(work, ['commit', '-m', 'initial']);
  git(work, ['push', 'origin', 'HEAD:main']);
  git(work, ['switch', '-c', 'dev']);
  git(work, ['push', '-u', 'origin', 'dev']);
  execFileSync('git', ['clone', '-c', 'core.autocrlf=false', '-b', 'main', origin, patrol], { stdio: 'ignore' });
  return { root, origin, work, patrol };
}

test('mailbox-only commits on main are merged into dev and pushed', () => {
  const { work, patrol, origin } = makeRepos();
  fs.writeFileSync(path.join(work, 'app.js'), 'two\n');
  git(work, ['commit', '-am', 'dev change']);
  git(work, ['push', 'origin', 'dev']);
  fs.writeFileSync(path.join(patrol, MAILBOX_FILE), '{"messages":[{"id":"a"}]}\n');
  git(patrol, ['commit', '-am', 'chore(mailbox): publish a']);
  git(patrol, ['push', 'origin', 'main']);

  const messages = [];
  const result = syncMailboxOnlyCommits({ git, cwd: work, log: (message) => messages.push(message) });
  assert.deepEqual(result, { merged: true, commits: 1 });
  assert.equal(git(work, ['rev-list', '--count', 'HEAD..origin/main']), '0');
  assert.equal(git(work, ['rev-parse', 'HEAD']), git(origin, ['rev-parse', 'dev']), 'dev was pushed');
  assert.equal(fs.readFileSync(path.join(work, MAILBOX_FILE), 'utf8'), '{"messages":[{"id":"a"}]}\n');
  assert.equal(fs.readFileSync(path.join(work, 'app.js'), 'utf8'), 'two\n');
  assert.equal(messages.length, 1);
});

test('nothing to sync is a no-op, and any non-mailbox change on main stops the release', () => {
  const { work, patrol } = makeRepos();
  assert.deepEqual(syncMailboxOnlyCommits({ git, cwd: work }), { merged: false, commits: 0 });

  fs.writeFileSync(path.join(patrol, MAILBOX_FILE), '{"messages":[{"id":"b"}]}\n');
  fs.writeFileSync(path.join(patrol, 'app.js'), 'hotfix\n');
  git(patrol, ['commit', '-am', 'mailbox and code together']);
  git(patrol, ['push', 'origin', 'main']);
  const before = git(work, ['rev-parse', 'HEAD']);
  assert.throws(() => syncMailboxOnlyCommits({ git, cwd: work }), /change more than the mailbox \(.*app\.js.*data\/global-mailbox\.json|change more than the mailbox \(.*data\/global-mailbox\.json.*app\.js/);
  assert.equal(git(work, ['rev-parse', 'HEAD']), before, 'dev was not touched');
});

test('a release can resume only from a merge commit that is on origin/main, even after main moved on', () => {
  const { work, patrol } = makeRepos();
  fs.writeFileSync(path.join(work, 'app.js'), 'feature\n');
  git(work, ['commit', '-am', 'feature: add the thing']);
  git(work, ['push', 'origin', 'dev']);
  const devHead = git(work, ['rev-parse', 'HEAD']);
  git(work, ['switch', 'main']);
  git(work, ['merge', '--no-ff', '-m', 'Merge pull request #1 from dev', 'dev']);
  git(work, ['push', 'origin', 'main']);
  const mergeCommit = git(work, ['rev-parse', 'HEAD']);
  git(work, ['switch', 'dev']);

  assert.deepEqual(releaseCommitSubjects({ git, cwd: work, mergeCommit }), ['feature: add the thing']);
  git(work, ['fetch', 'origin']);
  assert.doesNotThrow(() => assertMergeCommitOnMain({ git, cwd: work, mergeCommit }));

  // main moves on (mailbox patrol); the merge commit is still an ancestor
  git(patrol, ['pull', '--ff-only']);
  fs.writeFileSync(path.join(patrol, MAILBOX_FILE), '{"messages":[{"id":"c"}]}\n');
  git(patrol, ['commit', '-am', 'chore(mailbox): publish c']);
  git(patrol, ['push', 'origin', 'main']);
  git(work, ['fetch', 'origin']);
  assert.doesNotThrow(() => assertMergeCommitOnMain({ git, cwd: work, mergeCommit }));

  assert.throws(() => assertMergeCommitOnMain({ git, cwd: work, mergeCommit: devHead.replace(/./, '0') }), /not on origin\/main|ambiguous|bad object|nothing to resume/i);
  assert.throws(() => assertMergeCommitOnMain({ git, cwd: work, mergeCommit: undefined }), /no merge commit/);
});
