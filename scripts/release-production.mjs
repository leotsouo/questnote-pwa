#!/usr/bin/env node
/**
 * npm run release:production -- --confirm 可以發布
 * The whole production release in one run, used only after the user approves the dev → main PR:
 *   1. merge the PR (merge commit, never squash) once its checks pass
 *   2. assemble and verify the production artifact from that exact main commit
 *   3. publish it to gh-pages (normal push) and read every file back over HTTPS
 *   4. fast-forward dev to main so the next round continues on the same branch
 *
 *   --dry-run   assemble and verify the production artifact from the current checkout; changes nothing
 *
 * See docs/release-flow.md. Card-pool releases additionally need the SOP's package acceptance first.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PROJECT_ROOT, TARGETS, assertCleanCheckout, assembleAndVerify, syncDeployClone, replaceTree,
  commitAndPush, verifyHttps, writeEvidence, git, sha256, log } from './lib/deploy.mjs';

const APPROVAL_PHRASES = ['可以發布', '可以'];
const MAILBOX = 'data/global-mailbox.json';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const confirmIndex = args.indexOf('--confirm');
const confirmation = confirmIndex >= 0 ? args[confirmIndex + 1] : null;
const target = TARGETS.production;
const gh = (ghArgs) => execFileSync('gh', ghArgs, { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

try {
  if (dryRun) {
    const artifact = await assembleAndVerify(target);
    console.log(JSON.stringify({ dryRun: true, version: artifact.version, artifactId: artifact.artifactId,
      manifestSha256: artifact.manifestSha256, files: Object.keys(artifact.manifest.files).length + 1,
      dbName: artifact.manifest.profile.dbName, scopePath: artifact.manifest.profile.scopePath }, null, 2));
    process.exit(0);
  }
  if (!APPROVAL_PHRASES.includes(confirmation)) {
    throw new Error('Pass the user\'s actual approval: --confirm 可以發布 (or 可以). Never run this without it.');
  }
  assertCleanCheckout('dev');
  git(PROJECT_ROOT, ['fetch', 'origin', '--prune']);
  if (git(PROJECT_ROOT, ['rev-parse', 'HEAD']) !== git(PROJECT_ROOT, ['rev-parse', 'origin/dev'])) {
    throw new Error('Local dev and origin/dev differ; push dev and let the PR checks run first.');
  }
  if (git(PROJECT_ROOT, ['rev-list', '--count', 'HEAD..origin/main']) !== '0') {
    throw new Error('origin/main has commits that dev lacks (for example mailbox patrol commits). Merge origin/main into dev, push, redeploy the preview and re-confirm.');
  }

  const pr = JSON.parse(gh(['pr', 'view', 'dev', '--json', 'number,state,isDraft,baseRefName,headRefOid,url']));
  if (pr.state !== 'OPEN' || pr.baseRefName !== 'main') throw new Error(`Expected one open dev → main PR; found ${pr.state} → ${pr.baseRefName}.`);
  if (pr.headRefOid !== git(PROJECT_ROOT, ['rev-parse', 'HEAD'])) throw new Error('The PR head is not the local dev commit.');
  log(`Checking CI for PR #${pr.number} …`);
  gh(['pr', 'checks', String(pr.number), '--watch', '--fail-fast']);
  if (pr.isDraft) gh(['pr', 'ready', String(pr.number)]);
  gh(['pr', 'merge', String(pr.number), '--merge']);

  git(PROJECT_ROOT, ['fetch', 'origin']);
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
    throw new Error(`${MAILBOX} on gh-pages differs from main. Reconcile through the mailbox flow, then rerun. main is merged; nothing was published.`);
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
    approval: confirmation, sourceCommit, artifactId: artifact.artifactId, manifestSha256: artifact.manifestSha256,
    deployCommit, ...live, verifiedAt: new Date().toISOString(), devFollowsMain: git(PROJECT_ROOT, ['rev-parse', 'HEAD']) };
  summary.evidence = await writeEvidence(`release-v${artifact.version}.json`, summary);
  console.log(JSON.stringify(summary, null, 2));
  log('Done. Add a short entry to docs/final-integration.md on dev and open the next 持續整合 PR with the first new commit.');
} catch (error) {
  console.error(`release:production failed: ${error.message}`);
  process.exitCode = 1;
}
