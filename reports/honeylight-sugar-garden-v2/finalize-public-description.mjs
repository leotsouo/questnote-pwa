import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { approvePipelineStage, loadPipelineStatus, stagePoolCandidate } from '../../scripts/cardPoolPipeline.mjs';
import { authoringRoot, seriesId, workspace } from './revise.mjs';

const reportRoot = import.meta.dirname;
const featureRoot = path.resolve(reportRoot, '../..');
const before = await loadPipelineStatus(authoringRoot, seriesId);
const approvedImages = before.stages.find((s) => s.stage === 'images');
assert.equal(approvedImages.approved, true);
const previous = JSON.parse(await fs.readFile(path.join(reportRoot, 'staging-final.json')));
const series = JSON.parse(await fs.readFile(path.join(workspace, 'series.json')));
series.description = '山谷中的糖晶溫室與暖香烘焙街，住著十二隻把甜味化成魔法的夥伴。焦糖布蕾海獺照看暖池旁的小碟，千層奶霜天鵝用蓬鬆羽毛陪朋友慶祝；糖果晶翼與分享宴席的微光，為每一步努力留下一點甜。';
await fs.writeFile(path.join(workspace, 'series.json'), JSON.stringify(series, null, 2) + '\n');
for (const stage of ['content', 'prompts', 'images']) {
  const status = await loadPipelineStatus(authoringRoot, seriesId);
  assert.deepEqual(status.errors, []);
  const current = status.stages.find((s) => s.stage === stage);
  if (stage === 'images') assert.deepEqual(current.files, approvedImages.files, 'Approved pixels must remain identical');
  await approvePipelineStage(authoringRoot, seriesId, stage, current.outputHash, {
    reviewer: stage === 'images' ? 'user-approved-identical-pixels-public-copy-cleanup' : 'agent-delegated-player-facing-copy-review',
    acknowledgeWarnings: true,
  });
}
const dryRun = await stagePoolCandidate(authoringRoot, seriesId, { dryRun: true });
const built = await stagePoolCandidate(authoringRoot, seriesId);
const repeated = await stagePoolCandidate(authoringRoot, seriesId);
assert.equal(dryRun.candidateId, built.candidateId);
assert.equal(repeated.reused, true);
await fs.writeFile(path.join(reportRoot, 'staging-before-public-copy.json'), JSON.stringify(previous, null, 2) + '\n', { flag: 'wx' });
const catalog = JSON.parse(await fs.readFile(path.join(built.candidateDir, 'catalog.json')));
for (const [key, rows, file] of [['petsData', 'pets', 'pets.json'], ['loreData', 'lore', 'pets-lore.json'], ['poolsData', 'pools', 'pools.json'], ['seriesCatalog', 'series', 'pet-series.json']]) {
  const existing = JSON.parse(await fs.readFile(path.join(featureRoot, 'data', file)));
  for (const old of existing[rows]) {
    const next = catalog[key][rows].find((item) => item.id === old.id);
    if (key === 'seriesCatalog' && old.id === seriesId) assert.deepEqual({ ...next, description: old.description }, old);
    else assert.deepEqual(next, old);
  }
  await fs.writeFile(path.join(featureRoot, 'data', file), JSON.stringify(catalog[key], null, 2) + '\n');
}
await fs.cp(workspace, path.join(featureRoot, 'content/pet-series', seriesId), { recursive: true });
const report = { ...previous, recordedAt: new Date().toISOString(), dryRun, built, repeated,
  status: await loadPipelineStatus(authoringRoot, seriesId), supersededCandidates: [previous.supersededCandidate, previous.built.candidateId],
  copyReview: { changed: 'Only the new series public description: remove authoring instructions and use world narrative.', imagesUnchanged: true, runtimeUnchanged: true, generationCalls: 0 },
};
await fs.writeFile(path.join(reportRoot, 'staging-final.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ candidateId: built.candidateId, reproducible: repeated.reused, description: series.description }));
