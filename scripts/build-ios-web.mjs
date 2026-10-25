#!/usr/bin/env node
/**
 * Assemble the verified `ios` release artifact and copy it to ios-web/ for `npx cap sync ios`.
 * The artifact is built outside the repository (the assembler refuses in-repo output) and then
 * copied file by file, so ios-web/ always equals one artifact exactly.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareReleaseArtifact } from './releaseArtifact.mjs';
import { verifyReleaseArtifact } from './verify-release-artifact.mjs';
import { createHash } from 'node:crypto';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(projectRoot, 'ios-web');
const outputRoot = path.join(os.tmpdir(), 'questnote-ios-artifacts');

const built = await prepareReleaseArtifact({ projectRoot, outputRoot, profile: 'ios', scopePath: '/' });
const manifestSha256 = createHash('sha256').update(await fs.readFile(built.manifestPath)).digest('hex');
await verifyReleaseArtifact({ artifactDir: built.artifactDir, artifactId: built.artifactId, manifestSha256,
  profile: 'ios', scopePath: '/' });
await fs.rm(webDir, { recursive: true, force: true });
await fs.cp(built.artifactDir, webDir, { recursive: true });
console.log(JSON.stringify({ profile: 'ios', artifactId: built.artifactId, webDir: 'ios-web', fileCount: built.fileCount }, null, 2));
