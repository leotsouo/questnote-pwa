#!/usr/bin/env node
import path from 'node:path';
import { prepareReleaseArtifact } from './releaseArtifact.mjs';

const usage = 'node scripts/prepare-release.mjs --project-root <repo> --output-root <outside-repo> --profile production|preview --scope /path/ [--candidate-dir <dir> | --bundle-path <json> --asset-root <dir>] [--dry-run]';
const options = {};
const keys = { '--project-root': 'projectRoot', '--output-root': 'outputRoot', '--profile': 'profile',
  '--scope': 'scopePath', '--candidate-dir': 'candidateDir', '--bundle-path': 'bundlePath', '--asset-root': 'assetRoot' };
try {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { console.log(usage); process.exit(0); }
  for (let i = 0; i < args.length; i += 1) {
    const name = args[i];
    if (name === '--dry-run') { options.dryRun = true; continue; }
    if (!keys[name] || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(usage);
    if (Object.hasOwn(options, keys[name])) throw new Error(`Duplicate option: ${name}`);
    options[keys[name]] = args[++i];
  }
  options.projectRoot = path.resolve(options.projectRoot || '.');
  const result = await prepareReleaseArtifact(options);
  console.log(JSON.stringify({ artifactId: result.artifactId, artifactDir: result.artifactDir,
    manifestPath: result.manifestPath, fileCount: result.fileCount, dryRun: result.dryRun,
    reused: result.reused, releaseReady: false, liveBaseline: 'UNKNOWN' }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
