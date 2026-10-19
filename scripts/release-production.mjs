#!/usr/bin/env node
/**
 * npm run release:production -- --confirm 可以發布
 * The whole production release in one run, used only after the user approves the dev → main PR:
 *   0. merge mailbox-only commits that main gained (patrol letters) into dev
 *   1. merge the PR (merge commit, never squash) once its checks pass
 *   2. assemble and verify the production artifact from that exact main commit
 *   3. publish it to gh-pages (normal push) and read every file back over HTTPS
 *   4. fast-forward dev to main so the next round continues on the same branch
 *   5. wrap up: write the release record into docs/final-integration.md, push dev, open the next PR
 *
 *   --dry-run   assemble and verify the production artifact from the current checkout; changes nothing
 *   --resume    the PR is already merged but the release did not finish: continue from the merged main
 *
 * See docs/release-flow.md. Card-pool releases additionally need the SOP's package acceptance first.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PROJECT_ROOT, TARGETS, assertCleanCheckout, assembleAndVerify, syncDeployClone, replaceTree,
  commitAndPush, verifyHttps, writeEvidence, git, sha256, log } from './lib/deploy.mjs';
import { FINAL_INTEGRATION, NEXT_PR_TITLE, extractSummary, taipeiDate, renderReleaseEntry, insertReleaseEntry,
  buildNextPullRequestBody, syncMailboxOnlyCommits, assertMergeCommitOnMain, releaseCommitSubjects }
  from './lib/releaseWrapUp.mjs';

const APPROVAL_PHRASES = ['可以發布', '可以'];
const MAILBOX = 'data/global-mailbox.json';
const RESUME_COMMAND = 'npm run release:production -- --confirm 可以發布 --resume';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const resume = args.includes('--resume');
const confirmIndex = args.indexOf('--confirm');
const confirmation = confirmIndex >= 0 ? args[confirmIndex + 1] : null;
const target = TARGETS.production;
const gh = (ghArgs) => execFileSync('gh', ghArgs, { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** GitHub takes a moment to move the PR head after a push; wait until it equals the pushed commit. */
async function waitForPullRequestHead(number, commit) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const head = JSON.parse(gh(['pr', 'view', String(number), '--json', 'headRefOid'])).headRefOid;
    if (head === commit) return;
    await sleep(5000);
  }
  throw new Error(`The PR head did not move to ${commit.slice(0, 7)} after the push.`);
}

/** `gh pr checks --watch` fails with "no checks reported" in the seconds before CI starts on a new head. */
async function watchChecks(number) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      gh(['pr', 'checks', String(number), '--watch', '--fail-fast']);
      return;
    } catch (error) {
      const text = `${error.stderr || ''}${error.stdout || ''}${error.message || ''}`;
      if (!/no checks reported/i.test(text) || attempt >= 8) throw error;
      await sleep(10000);
    }
  }
}

/** The merge is done; publish from main, then wrap up. Failing here is resumable. */
async function publishFromMergedMain(pr) {
  git(PROJECT_ROOT, ['fetch', 'origin']);
  try {
    assertCleanCheckout('dev');
  } catch (error) {
    throw new Error(`The PR is merged but the working tree is not clean, so the release cannot continue: ${error.message}\n`
      + `Commit or stash the changes, then run: ${RESUME_COMMAND}`);
  }
  git(PROJECT_ROOT, ['switch', 'main']);
  git(PROJECT_ROOT, ['merge', '--ff-only', 'origin/main']);
  const sourceCommit = assertCleanCheckout('main');
  log(`Assembling production artifact from main ${sourceCommit.slice(0, 7)} …`);
  const artifact = await assembleAndVerify(target);

  const clone = await syncDeployClone(target);
  // The mailbox is published to main and gh-pages with identical bytes. A difference means a letter
  // landed on only one side; stop instead of silently dropping or reverting it.
  const liveMailbox = await fs.readFile(path.join(clone, MAILBOX)).catch(() => null);
  if (liveMailbox && sha256(liveMailbox) !== artifact.manifest.files[MAILBOX].sha256) {
    throw new Error(`${MAILBOX} on gh-pages differs from main. Reconcile through the mailbox flow, then rerun with --resume. main is merged; nothing was published.`);
  }
  await replaceTree(clone, artifact.artifactDir);
  const deployCommit = await commitAndPush(clone, target, artifact,
    `V${artifact.version}: publish verified artifact ${artifact.artifactId}`);
  log(`Pushed gh-pages ${deployCommit.slice(0, 7)}; waiting for ${target.publicUrl} …`);
  const live = await verifyHttps(target, artifact);

  git(PROJECT_ROOT, ['switch', 'dev']);
  git(PROJECT_ROOT, ['merge', '--ff-only', 'main']);
  git(PROJECT_ROOT, ['push', 'origin', 'dev']);

  const summary = { target: 'production', url: target.publicUrl, version: artifact.version, pullRequest: pr.url,
    approval: confirmation, resumedAfterMerge: resume || undefined, sourceCommit, artifactId: artifact.artifactId,
    manifestSha256: artifact.manifestSha256, deployCommit, ...live, verifiedAt: new Date().toISOString(),
    devFollowsMain: git(PROJECT_ROOT, ['rev-parse', 'HEAD']) };
  const evidenceName = `release-v${artifact.version}-pr${pr.number}.json`;
  summary.evidence = await writeEvidence(evidenceName, summary);
  return { summary, evidenceName };
}

/**
 * Write the release record, push dev and open the next PR. Every step checks whether it is already
 * done, so running it again (--resume) never duplicates a record or a PR.
 */
async function wrapUp(pr, { summary, evidenceName }) {
  const result = { record: 'unchanged', nextPullRequest: 'none' };
  const mergeCommit = pr.mergeCommit?.oid || pr.mergeCommit;
  const subjects = releaseCommitSubjects({ git, cwd: PROJECT_ROOT, mergeCommit });
  const entry = renderReleaseEntry({
    version: summary.version, date: taipeiDate(summary.verifiedAt),
    pullRequest: { number: pr.number, url: pr.url }, approval: confirmation || '可以發布',
    mergeCommit, artifactId: summary.artifactId, deployCommit: summary.deployCommit,
    verifiedFiles: summary.verifiedFiles, summary: extractSummary(pr.body, subjects),
    resumed: resume, evidenceName,
  });
  const file = path.join(PROJECT_ROOT, FINAL_INTEGRATION);
  const { markdown, inserted } = insertReleaseEntry(await fs.readFile(file, 'utf8'), entry, summary.version, pr.number);
  if (inserted) {
    await fs.writeFile(file, markdown);
    git(PROJECT_ROOT, ['add', FINAL_INTEGRATION]);
    const trailer = process.env.RELEASE_COMMIT_TRAILER ? `\n\n${process.env.RELEASE_COMMIT_TRAILER}` : '';
    git(PROJECT_ROOT, ['commit', '-m', `Record the V${summary.version} production release in final-integration.md${trailer}`]);
    result.record = git(PROJECT_ROOT, ['rev-parse', '--short', 'HEAD']);
  }
  // Push even when nothing was inserted: a previous run may have committed the record but not pushed it.
  git(PROJECT_ROOT, ['push', 'origin', 'dev']);

  const open = JSON.parse(gh(['pr', 'list', '--head', 'dev', '--base', 'main', '--state', 'open', '--json', 'number,url']));
  if (open.length) {
    result.nextPullRequest = open[0].url;
  } else if (git(PROJECT_ROOT, ['rev-list', '--count', 'origin/main..HEAD']) === '0') {
    result.nextPullRequest = 'pending: dev has no commit ahead of main yet; open it with the first new commit';
  } else {
    const bodyFile = path.join(os.tmpdir(), `questnote-next-pr-${process.pid}.md`);
    await fs.writeFile(bodyFile, buildNextPullRequestBody({ version: summary.version, pullRequest: { number: pr.number } }));
    try {
      result.nextPullRequest = gh(['pr', 'create', '--base', 'main', '--head', 'dev', '--title', NEXT_PR_TITLE,
        '--body-file', bodyFile]);
    } finally {
      await fs.rm(bodyFile, { force: true });
    }
  }
  return result;
}

try {
  if (dryRun) {
    const artifact = await assembleAndVerify(target);
    const report = { dryRun: true, version: artifact.version, artifactId: artifact.artifactId,
      manifestSha256: artifact.manifestSha256, files: Object.keys(artifact.manifest.files).length + 1,
      dbName: artifact.manifest.profile.dbName, scopePath: artifact.manifest.profile.scopePath };
    // Read-only preview of the release record, from the open dev → main PR (or the last merged one).
    try {
      const open = JSON.parse(gh(['pr', 'list', '--head', 'dev', '--base', 'main', '--state', 'open', '--limit', '1',
        '--json', 'number,url,body']));
      const source = open[0] || JSON.parse(gh(['pr', 'list', '--head', 'dev', '--base', 'main', '--state', 'merged',
        '--limit', '1', '--json', 'number,url,body,mergeCommit']))[0];
      if (source) {
        const head = git(PROJECT_ROOT, ['rev-parse', 'HEAD']);
        report.recordPreview = renderReleaseEntry({ version: artifact.version, date: taipeiDate(new Date().toISOString()),
          pullRequest: { number: source.number, url: source.url }, approval: '可以發布',
          mergeCommit: source.mergeCommit?.oid || '(merge commit)', artifactId: artifact.artifactId,
          deployCommit: '(gh-pages commit)', verifiedFiles: report.files,
          summary: extractSummary(source.body, git(PROJECT_ROOT, ['log', '--no-merges', '--format=%s', 'origin/main..HEAD'])
            .split('\n').filter(Boolean)), evidenceName: `release-v${artifact.version}-pr${source.number}.json` });
        report.recordPreviewSource = `PR #${source.number} @ ${head.slice(0, 7)}`;
      }
    } catch (error) {
      report.recordPreview = `unavailable: ${error.message.split('\n')[0]}`;
    }
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }
  if (!APPROVAL_PHRASES.includes(confirmation)) {
    throw new Error('Pass the user\'s actual approval: --confirm 可以發布 (or 可以). Never run this without it.');
  }
  // A release that stopped after switching to main leaves the checkout there; --resume starts from dev.
  if (resume && git(PROJECT_ROOT, ['rev-parse', '--abbrev-ref', 'HEAD']) === 'main'
    && !git(PROJECT_ROOT, ['status', '--porcelain'])) {
    git(PROJECT_ROOT, ['switch', 'dev']);
  }
  assertCleanCheckout('dev');
  git(PROJECT_ROOT, ['fetch', 'origin', '--prune']);

  let pr;
  if (resume) {
    // The PR is already merged: find it, and make sure its merge commit is on main.
    const merged = JSON.parse(gh(['pr', 'list', '--head', 'dev', '--base', 'main', '--state', 'merged', '--limit', '1',
      '--json', 'number,url,title,body,mergeCommit']));
    if (!merged.length) throw new Error('No merged dev → main PR found to resume.');
    pr = merged[0];
    assertMergeCommitOnMain({ git, cwd: PROJECT_ROOT, mergeCommit: pr.mergeCommit?.oid });
    log(`Resuming release of PR #${pr.number} (merge commit ${pr.mergeCommit.oid.slice(0, 7)}).`);
  } else {
    if (git(PROJECT_ROOT, ['rev-parse', 'HEAD']) !== git(PROJECT_ROOT, ['rev-parse', 'origin/dev'])) {
      throw new Error('Local dev and origin/dev differ; push dev and let the PR checks run first.');
    }
    const sync = syncMailboxOnlyCommits({ git, cwd: PROJECT_ROOT, log });
    if (sync.merged) log(`Merged ${sync.commits} mailbox-only commit(s) from main into dev and pushed.`);

    const view = JSON.parse(gh(['pr', 'view', 'dev', '--json', 'number,state,isDraft,baseRefName,headRefOid,url']));
    if (view.state !== 'OPEN' || view.baseRefName !== 'main') throw new Error(`Expected one open dev → main PR; found ${view.state} → ${view.baseRefName}.`);
    if (sync.merged) await waitForPullRequestHead(view.number, git(PROJECT_ROOT, ['rev-parse', 'HEAD']));
    else if (view.headRefOid !== git(PROJECT_ROOT, ['rev-parse', 'HEAD'])) throw new Error('The PR head is not the local dev commit.');
    log(`Checking CI for PR #${view.number} …`);
    await watchChecks(view.number);
    // CI can take minutes; look at the working tree again right before the irreversible step.
    assertCleanCheckout('dev');
    git(PROJECT_ROOT, ['fetch', 'origin']);
    if (git(PROJECT_ROOT, ['rev-parse', 'HEAD']) !== git(PROJECT_ROOT, ['rev-parse', 'origin/dev'])) {
      throw new Error('dev changed while CI was running; stop and re-confirm.');
    }
    if (view.isDraft) gh(['pr', 'ready', String(view.number)]);
    gh(['pr', 'merge', String(view.number), '--merge']);
    pr = JSON.parse(gh(['pr', 'view', String(view.number), '--json', 'number,url,title,body,mergeCommit']));
  }

  const published = await publishFromMergedMain(pr);
  let wrapUpResult;
  try {
    wrapUpResult = await wrapUp(pr, published);
  } catch (error) {
    console.log(JSON.stringify(published.summary, null, 2));
    throw new Error(`The release is published and verified, but the wrap-up failed: ${error.message}\n`
      + `Run again to finish it: ${RESUME_COMMAND}`);
  }
  published.summary.wrapUp = wrapUpResult;
  published.summary.evidence = await writeEvidence(published.evidenceName, published.summary);
  console.log(JSON.stringify(published.summary, null, 2));
  log('Done. The release record is in docs/final-integration.md and dev is pushed.');
} catch (error) {
  console.error(`release:production failed: ${error.message}`);
  process.exitCode = 1;
}
