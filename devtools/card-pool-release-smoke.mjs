/** Disposable synthetic SOP rehearsal against the real runtime and full existing catalog. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { createPipelineWorkspace, loadPipelineStatus, approvePipelineStage, stagePoolCandidate } from '../scripts/cardPoolPipeline.mjs';
import { prepareReleaseArtifact } from '../scripts/releaseArtifact.mjs';
import { planGachaTransaction } from '../src/gachaTransactionCore.js';

const repository = path.resolve(import.meta.dirname, '..');
const runRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'questnote-pool-rehearsal-'));
const source = path.join(runRoot, 'source');
await fs.mkdir(source);
for (const name of ['src', 'data', 'assets', 'content/release-compatibility']) {
  await fs.cp(path.join(repository, name), path.join(source, name), { recursive: true });
}
for (const name of ['index.html', 'manifest.webmanifest', 'service-worker.js']) {
  await fs.copyFile(path.join(repository, name), path.join(source, name));
}
execFileSync('git', ['init', '--quiet', source]);
execFileSync('git', ['-C', source, '-c', 'user.name=Synthetic Rehearsal', '-c', 'user.email=fixture@example.invalid',
  'commit', '--quiet', '--allow-empty', '-m', 'Synthetic full-catalog release rehearsal']);
const read = async (relative) => JSON.parse(await fs.readFile(path.join(source, relative), 'utf8'));
const write = async (relative, value) => fs.writeFile(path.join(source, relative), JSON.stringify(value, null, 2) + '\n');
const poolId = 'acceptance_pool'; const seriesId = 'acceptance_series';
const brief = { schemaVersion: 1, seriesId, poolId, seriesName: '合成驗收卡池',
  concept: 'Automated synthetic validation only. Not approved product content.',
  rarityPlan: { N: 1, R: 2, SR: 1, SSR: 1, UR: 1 }, presentationTemplate: 'default',
  cost: 75, rates: { N: 0.55, R: 0.3, SR: 0.1, SSR: 0.03, UR: 0.02 }, pity: { ssr: 30, ur: 100 },
  unlock: { key: 'expansion', threshold: 3, rewardDraftId: 'r_2' }, releaseVersion: '3.4.6' };
await createPipelineWorkspace(source, brief);
const workspace = `content/pet-series/${seriesId}`;
const plan = await read(`${workspace}/plan.json`);
for (const pet of plan.pets) { pet.name = `驗收${pet.petId}`; pet.design = 'Synthetic solid-color placeholder for integration tests only.'; }
await write(`${workspace}/plan.json`, plan);
const official = await read('data/pets.json'); const officialLore = await read('data/pets-lore.json');
const pets = []; const lore = []; const prompts = {};
for (const [index, entry] of plan.pets.entries()) {
  const template = official.pets.find((pet) => pet.rarity === entry.rarity);
  const pet = { ...template, id: entry.petId, name: entry.name, seriesId,
    speciesType: 'synthetic', element: 'light', visualTheme: `Synthetic square ${entry.petId}`,
    image: `assets/pets/${entry.petId}.png`, poolTags: [entry.phase === 'unlock' ? `${poolId}_expanded` : poolId] };
  delete pet.imageVariants; delete pet.presentation;
  pets.push(pet);
  lore.push({ ...officialLore.lore.find((item) => item.id === template.id), id: entry.petId });
  prompts[entry.petId] = { prompt: 'Synthetic solid-color square. Integration fixture; not generated product artwork.',
    negativePrompt: 'No production use.', provenance: { method: 'sharp synthetic fixture' } };
  const bytes = await sharp({ create: { width: 512, height: 512, channels: 4,
    background: { r: 30 + index * 25, g: 90, b: 160, alpha: 1 } } }).png().toBuffer();
  await fs.writeFile(path.join(source, workspace, 'images', `${entry.petId}.png`), bytes);
}
await write(`${workspace}/pets.json`, { pets });
await write(`${workspace}/pets-lore.json`, { version: 1, lore });
await write(`${workspace}/prompts.json`, { schemaVersion: 1, prompts });
for (const stage of ['brief', 'plan', 'content', 'prompts', 'images']) {
  const status = await loadPipelineStatus(source, seriesId);
  await approvePipelineStage(source, seriesId, stage, status.stages.find((item) => item.stage === stage).outputHash,
    { acknowledgeWarnings: true, reviewer: 'automated synthetic fixture; not product approval' });
}
const candidate = await stagePoolCandidate(source, seriesId);
const again = await stagePoolCandidate(source, seriesId);
if (!again.reused || candidate.candidateId !== again.candidateId) throw new Error('Candidate did not reproduce');
const bundle = JSON.parse(await fs.readFile(path.join(candidate.candidateDir, 'catalog.json'), 'utf8'));
const draw = planGachaTransaction({ allPets: bundle.petsData.pets, poolsData: bundle.poolsData, selectedPoolId: poolId,
  count: 10, wallet: { key: 'wallet', stardust: 10000 }, collection: [], rng: () => 0 });
if (draw.wallet.stardust !== 9250 || !draw.result.unlockProgress.justUnlocked || draw.result.results.length !== 10
  || draw.result.results.some((item) => item.pet.poolTags.includes(`${poolId}_expanded`))
  || draw.grants.claimedIds.length !== 1) throw new Error('Generated content failed the actual gacha planner');
const artifacts = {};
for (const profile of ['production', 'preview']) {
  const result = await prepareReleaseArtifact({ projectRoot: source, outputRoot: path.join(runRoot, 'artifacts'),
    profile, scopePath: `/${profile}/`, candidateDir: candidate.candidateDir });
  artifacts[profile] = { artifactId: result.artifactId, artifactDir: result.artifactDir };
}
const report = { syntheticOnly: true, releaseReady: false, runRoot, candidateId: candidate.candidateId,
  candidateDir: candidate.candidateDir, petCount: official.pets.length + pets.length, newPoolId: poolId,
  reused: again.reused, gachaPlanner: 'PASS', artifacts };
const reportPath = path.join(runRoot, 'rehearsal.json');
await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, reportPath }, null, 2));
