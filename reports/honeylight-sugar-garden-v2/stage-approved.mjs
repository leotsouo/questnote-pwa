import fs from 'node:fs/promises';
import path from 'node:path';
import { approvePipelineStage, loadPipelineStatus, stagePoolCandidate } from '../../scripts/cardPoolPipeline.mjs';
import { authoringRoot, seriesId, workspace } from './revise.mjs';

const reviewedHash = 'b602c823a88e2552525be188a214b4e475f4a109dd002d8e6f30a3f3259f1cfb';
const before = await loadPipelineStatus(authoringRoot, seriesId);
if (before.errors.length || before.stages.find((s) => s.stage === 'images').outputHash !== reviewedHash) throw new Error('Approved image revision differs');
await approvePipelineStage(authoringRoot, seriesId, 'images', reviewedHash, {
  reviewer: 'user-explicit-image-approval-2026-10-01', acknowledgeWarnings: true,
});
await fs.writeFile(path.join(workspace, 'human-image-approval.json'), JSON.stringify({
  recordedAt: new Date().toISOString(), reviewedImageHash: reviewedHash,
  userMessage: '卡图已核准，现在继续工作一直到，一直到最后等我说可以了之后推送到正式版。 所以到离正式版最后一步之前都不需要过问我。',
  scope: 'Approve current twelve images; authorize staging, isolated acceptance and all release preparation. Production push remains pending explicit final go-ahead.',
}, null, 2) + '\n');
const dryRun = await stagePoolCandidate(authoringRoot, seriesId, { dryRun: true });
const built = await stagePoolCandidate(authoringRoot, seriesId);
const repeated = await stagePoolCandidate(authoringRoot, seriesId);
if (built.candidateId !== dryRun.candidateId || repeated.candidateId !== built.candidateId || !repeated.reused) throw new Error('Candidate reproduction mismatch');
const catalog = JSON.parse(await fs.readFile(path.join(built.candidateDir, 'catalog.json')));
if (catalog.petsData.pets.length !== 96 || catalog.poolsData.pools.length !== 4 || catalog.seriesCatalog.series.length !== 4) throw new Error('Cumulative catalog counts differ');
const report = { recordedAt: new Date().toISOString(), dryRun, built, repeated, counts: { pets: 96, lore: catalog.loreData.lore.length, pools: 4, series: 4 }, status: await loadPipelineStatus(authoringRoot, seriesId), productionApproval: 'PENDING_USER_FINAL_GO_AHEAD' };
await fs.writeFile(path.join(import.meta.dirname, 'staging.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ candidateId: built.candidateId, candidateDir: built.candidateDir, reproducible: repeated.reused, counts: report.counts }, null, 2));
