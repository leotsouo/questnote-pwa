#!/usr/bin/env node
/**
 * npm run preview:deploy
 * Assemble the preview-profile artifact from the clean `dev` checkout, publish it to the one
 * fixed preview site, and read every file back over HTTPS. Each run overwrites the same URL.
 *
 *   --review-dir <dir>   also replace the fixed review pages at <preview>/reports/review/
 *   --dry-run            assemble and verify locally; no clone, commit or push
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { TARGETS, REVIEW_PATH, assertCleanCheckout, assembleAndVerify, syncDeployClone, replaceTree,
  replaceDirectory, commitAndPush, verifyHttps, writeEvidence, log } from './lib/deploy.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const reviewIndex = args.indexOf('--review-dir');
const reviewDir = reviewIndex >= 0 ? args[reviewIndex + 1] : null;
const target = TARGETS.preview;

try {
  if (reviewIndex >= 0 && (!reviewDir || !(await fs.stat(path.join(reviewDir, 'index.html')).catch(() => null)))) {
    throw new Error('--review-dir must be a directory containing index.html');
  }
  const sourceCommit = assertCleanCheckout('dev');
  log(`Assembling preview artifact from dev ${sourceCommit.slice(0, 7)} …`);
  const artifact = await assembleAndVerify(target);
  log(`Artifact ${artifact.artifactId} (V${artifact.version}, ${Object.keys(artifact.manifest.files).length + 1} files) verified locally.`);
  const summary = { target: 'preview', url: target.publicUrl, version: artifact.version, sourceCommit,
    artifactId: artifact.artifactId, manifestSha256: artifact.manifestSha256, dbName: artifact.manifest.profile.dbName,
    cacheNamespace: artifact.manifest.profile.cacheNamespace, scopePath: artifact.manifest.profile.scopePath,
    reviewUrl: `${target.publicUrl}${REVIEW_PATH}/`, dryRun };
  if (!dryRun) {
    const clone = await syncDeployClone(target);
    await replaceTree(clone, artifact.artifactDir, { keep: [REVIEW_PATH] });
    if (reviewDir) await replaceDirectory(clone, REVIEW_PATH, path.resolve(reviewDir));
    summary.deployCommit = await commitAndPush(clone, target, artifact,
      `Preview V${artifact.version}: artifact ${artifact.artifactId} from dev ${sourceCommit.slice(0, 7)}`);
    log(`Pushed ${summary.deployCommit.slice(0, 7)}; waiting for ${target.publicUrl} …`);
    Object.assign(summary, await verifyHttps(target, artifact), { verifiedAt: new Date().toISOString() });
    summary.evidence = await writeEvidence('preview-deploy-latest.json', summary);
  }
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(`preview:deploy failed: ${error.message}`);
  process.exitCode = 1;
}
