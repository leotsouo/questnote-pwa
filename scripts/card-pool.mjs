#!/usr/bin/env node
/** Human-reviewed content staging only. There is deliberately no publish command. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createPipelineWorkspace, loadPipelineStatus, approvePipelineStage,
  validatePipelineWorkspace, stagePoolCandidate } from './cardPoolPipeline.mjs';
import { authorPoolWorkspace } from './lib/poolAuthoring.mjs';
import { approveAllStages, writeCodexHandoff, writeReviewPage } from './lib/poolWorkflow.mjs';

const args = process.argv.slice(2);
const [command, id, stage] = args;
const option = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const root = path.resolve(option('--root') || path.join(import.meta.dirname, '..'));
try {
  let result;
  if (command === 'init') {
    const briefPath = option('--brief');
    if (!briefPath) throw new Error('init requires --brief <file>');
    const brief = JSON.parse(await fs.readFile(path.resolve(briefPath), 'utf8'));
    if (id !== brief.seriesId) throw new Error('Command series ID differs from brief.seriesId');
    result = await createPipelineWorkspace(root, brief);
  } else if (command === 'status') result = await loadPipelineStatus(root, id);
  else if (command === 'validate') result = await validatePipelineWorkspace(root, id);
  else if (command === 'approve') result = await approvePipelineStage(root, id, stage, option('--hash'), {
    acknowledgeWarnings: args.includes('--ack-warnings'), reviewer: option('--reviewer') || 'local-author',
    reviewerType: option('--reviewer-type'),
  });
  else if (command === 'author') result = await authorPoolWorkspace(root, id, { dryRun: args.includes('--dry-run') });
  else if (command === 'codex-handoff') result = await writeCodexHandoff(root, id);
  else if (command === 'approve-all') result = await approveAllStages(root, id, {
    reviewer: option('--reviewer'), acknowledgeWarnings: args.includes('--ack-warnings'), through: option('--through') || 'images',
  });
  else if (command === 'review-page') result = await writeReviewPage(root, id, { out: option('--out') });
  else if (command === 'stage') result = await stagePoolCandidate(root, id, { dryRun: args.includes('--dry-run') });
  else throw new Error('Use init <id> --brief <file> | status <id> | approve <id> <stage> --hash <hash> [--ack-warnings] [--reviewer <name> --reviewer-type ai|human|synthetic] | validate <id> | stage <id> [--dry-run] | author <id> [--dry-run] | codex-handoff <id> | approve-all <id> --reviewer <name> [--ack-warnings] [--through <stage>] | review-page <poolId> [--out <dir>]');
  console.log(JSON.stringify(result, null, 2));
  if (result.ok === false || result.errors?.length) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error.code || 'PIPELINE_FAILED', error: error.message }, null, 2));
  process.exitCode = 1;
}
