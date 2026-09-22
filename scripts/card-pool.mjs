#!/usr/bin/env node
/** Human-reviewed content staging only. There is deliberately no publish command. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createPipelineWorkspace, loadPipelineStatus, approvePipelineStage,
  validatePipelineWorkspace, stagePoolCandidate } from './cardPoolPipeline.mjs';

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
  });
  else if (command === 'stage') result = await stagePoolCandidate(root, id, { dryRun: args.includes('--dry-run') });
  else throw new Error('Use init <id> --brief <file> | status <id> | approve <id> <stage> --hash <hash> [--ack-warnings] | validate <id> | stage <id> [--dry-run]');
  console.log(JSON.stringify(result, null, 2));
  if (result.ok === false || result.errors?.length) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error.code || 'PIPELINE_FAILED', error: error.message }, null, 2));
  process.exitCode = 1;
}
