import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { approvePipelineStage, loadPipelineStatus, stagePoolCandidate } from '../../scripts/cardPoolPipeline.mjs';
import { authoringRoot, seriesId, workspace } from './revise.mjs';
const reportRoot = import.meta.dirname;
const root = path.resolve(reportRoot, '../..');
const previous = JSON.parse(await fs.readFile(path.join(reportRoot, 'staging-final.json')));
const before = await loadPipelineStatus(authoringRoot, seriesId);
const previousImages = before.stages.find((s) => s.stage === 'images');
assert.equal(previousImages.approved, true);
for (const name of ['brief.json', 'series.json']) {
  const value = JSON.parse(await fs.readFile(path.join(workspace, name)));
  value.releaseVersion = '3.4.34';
  await fs.writeFile(path.join(workspace, name), JSON.stringify(value, null, 2) + '\n');
}
for (const stage of ['brief', 'plan', 'content', 'prompts', 'images']) {
  const status = await loadPipelineStatus(authoringRoot, seriesId);
  assert.deepEqual(status.errors, []);
  const current = status.stages.find((s) => s.stage === stage);
  if (stage === 'images') assert.deepEqual(current.files, previousImages.files);
  await approvePipelineStage(authoringRoot, seriesId, stage, current.outputHash, {
    reviewer: stage === 'images' ? 'user-approved-identical-pixels-v3434-version-carry-forward' : 'agent-delegated-concurrent-main-integration', acknowledgeWarnings: true,
  });
}
const dryRun = await stagePoolCandidate(authoringRoot, seriesId, { dryRun: true });
const built = await stagePoolCandidate(authoringRoot, seriesId);
const repeated = await stagePoolCandidate(authoringRoot, seriesId);
assert.equal(dryRun.candidateId, built.candidateId);
assert.equal(repeated.reused, true);
const catalog = JSON.parse(await fs.readFile(path.join(built.candidateDir, 'catalog.json')));
const previousCatalog = JSON.parse(await fs.readFile(path.join(previous.built.candidateDir, 'catalog.json')));
assert.deepEqual(catalog, previousCatalog, 'Version integration must not change approved content');
await fs.copyFile(path.join(reportRoot, 'staging-final.json'), path.join(reportRoot, 'before-concurrent-update-staging.json'), fs.constants.COPYFILE_EXCL);
await fs.writeFile(path.join(reportRoot, 'staging-final.json'), JSON.stringify({ ...previous, recordedAt: new Date().toISOString(), dryRun, built, repeated, status: await loadPipelineStatus(authoringRoot, seriesId), supersededCandidates: [...previous.supersededCandidates, previous.built.candidateId], concurrentUpdate: { main: 'bc3fb784d99ec9cd85d92333c8707c10bf8a8cbe', production: '3942a7f35287a0aa2c3ac343b45115ec4948a380', releaseVersion: '3.4.34', unchangedContent: true, unchangedPixels: true } }, null, 2) + '\n');
await fs.cp(workspace, path.join(root, 'content/pet-series', seriesId), { recursive: true });
const versionPath = path.join(root, 'src/version.js');
let version = await fs.readFile(versionPath, 'utf8');
version = version.replace("APP_VERSION = '3.4.33'", "APP_VERSION = '3.4.34'").replaceAll('questnote-preview-cache-v3433-series-drag', 'questnote-preview-cache-v3434-honeylight').replace(/BUILD_TIME = '[^']+'/, `BUILD_TIME = '${new Date().toISOString()}'`);
await fs.writeFile(versionPath, version);
const workerPath = path.join(root, 'service-worker.js');
await fs.writeFile(workerPath, (await fs.readFile(workerPath, 'utf8')).replaceAll('questnote-preview-cache-v3433-series-drag', 'questnote-preview-cache-v3434-honeylight'));
for (const name of ['RELEASE-REVIEW.md', 'AUTHORING-LOCATION.md']) {
  const note = path.join(root, 'content/pet-series', seriesId, name);
  const text = await fs.readFile(note, 'utf8');
  await fs.writeFile(note, text.replaceAll('V3.4.33', 'V3.4.34').replaceAll(previous.built.candidateId, built.candidateId)
    + '\n並行更新整合：保留 main PR #17 的圖鑑系列篩選觸控／滑鼠拖曳修正，正式 baseline 已是 V3.4.33，蜜光糖庭改用 V3.4.34；核准內容和PNG逐檔不變。先前已準備產物與部署提交只保留歷史，不得推送。\n');
}
console.log(JSON.stringify({ candidateId: built.candidateId, releaseVersion: '3.4.34', approvedContentUnchanged: true }));
