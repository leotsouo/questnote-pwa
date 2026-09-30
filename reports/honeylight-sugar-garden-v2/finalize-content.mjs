import fs from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { approvePipelineStage, loadPipelineStatus, stagePoolCandidate } from '../../scripts/cardPoolPipeline.mjs';
import { authoringRoot, seriesId, workspace } from './revise.mjs';

const read = async (file) => JSON.parse(await fs.readFile(path.join(workspace, file)));
const write = async (file, value) => fs.writeFile(path.join(workspace, file), JSON.stringify(value, null, 2) + '\n');
const before = await loadPipelineStatus(authoringRoot, seriesId);
const previousImages = before.stages.find((s) => s.stage === 'images');
if (!previousImages.approved || previousImages.outputHash !== 'b602c823a88e2552525be188a214b4e475f4a109dd002d8e6f30a3f3259f1cfb') throw new Error('Expected human-approved image revision');
const brief = await read('brief.json');
brief.releaseVersion = '3.4.33';
const series = await read('series.json');
series.releaseVersion = brief.releaseVersion;
const pool = await read('pool.json');
pool.presentation = {
  themeKey: 'default', animationKey: 'none', heroPetId: 'pet_ur10',
  featuredPetIds: ['pet_ur09', 'pet_ssr12', 'pet_ssr13'], badge: '糖庭新地域',
  eyebrow: '糖晶溫室與暖香烘焙街，為每一個小進展留下甜味。',
  tagline: '每一步努力，都值得一點甜。',
  detailsNote: '12 隻皆從第一抽開放，無解鎖、無贈寵。雙 UR：焦糖布蕾海獺、千層奶霜天鵝；主打角色不另加權。',
  candidateNote: '僅含蜜光糖庭 12 隻夥伴，不含其他系列寵物。',
};
await write('brief.json', brief);
await write('series.json', series);
await write('pool.json', pool);
for (const stage of ['brief', 'plan', 'content', 'prompts']) {
  const status = await loadPipelineStatus(authoringRoot, seriesId);
  if (status.errors.length) throw new Error(JSON.stringify(status.errors));
  const current = status.stages.find((s) => s.stage === stage);
  await approvePipelineStage(authoringRoot, seriesId, stage, current.outputHash, { reviewer: 'agent-delegated-release-preparation-2026-10-01', acknowledgeWarnings: true });
}
const reviewed = await loadPipelineStatus(authoringRoot, seriesId);
const currentImages = reviewed.stages.find((s) => s.stage === 'images');
if (!isDeepStrictEqual(previousImages.files, currentImages.files)) throw new Error('Human approved pixels changed');
await approvePipelineStage(authoringRoot, seriesId, 'images', currentImages.outputHash, { reviewer: 'user-approved-identical-image-bytes-carried-forward-2026-10-01', acknowledgeWarnings: true });
await write('release-content-review.json', { reviewedAt: new Date().toISOString(), delegation: 'User authorized all release preparation without further questions, withholding only the production push.', changes: ['Select release version 3.4.33', 'Add existing default presentation: cute swan hero, otter and both SSR featured; existing standard reveal'], humanImageApproval: { originalOutputHash: previousImages.outputHash, currentOutputHash: currentImages.outputHash, identicalImageFiles: currentImages.files, originalUserApproval: 'human-image-approval.json', newGenerationCalls: 0 }, releaseApproval: 'PENDING_USER_FINAL_GO_AHEAD' });
const dryRun = await stagePoolCandidate(authoringRoot, seriesId, { dryRun: true });
const built = await stagePoolCandidate(authoringRoot, seriesId);
const repeated = await stagePoolCandidate(authoringRoot, seriesId);
if (built.candidateId !== dryRun.candidateId || !repeated.reused) throw new Error('Final candidate not reproducible');
const catalog = JSON.parse(await fs.readFile(path.join(built.candidateDir, 'catalog.json')));
const report = { recordedAt: new Date().toISOString(), dryRun, built, repeated, counts: { pets: catalog.petsData.pets.length, lore: catalog.loreData.lore.length, pools: catalog.poolsData.pools.length, series: catalog.seriesCatalog.series.length }, status: await loadPipelineStatus(authoringRoot, seriesId), supersededCandidate: '1ce366630024812a0be270e6f796ae99965457c47188e5f2556fe9a309133905', productionApproval: 'PENDING_USER_FINAL_GO_AHEAD' };
await fs.writeFile(path.join(import.meta.dirname, 'staging-final.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ candidateId: built.candidateId, candidateDir: built.candidateDir, counts: report.counts, reused: repeated.reused }));
