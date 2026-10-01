/** Feature whole-package gate; current-source artifacts, no authoring candidate promotion. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { verifyReleaseArtifact } from './verify-release-artifact.mjs';
const requireValue = (v, message) => { if (!v) throw Error(message); };
const plain = (v) => typeof v === 'string' && v.trim().length > 0;
export function featurePackageHash(evidence) {
  return createHash('sha256').update(JSON.stringify({ schemaVersion: evidence.schemaVersion,
    feature: evidence.feature, sourceCommit: evidence.sourceCommit, previewUrl: evidence.previewUrl,
    baseline: evidence.baseline,
    artifacts: Object.fromEntries(['preview', 'production'].map((p) => [p, { artifactId: evidence.artifacts[p].artifactId,
      manifestSha256: evidence.artifacts[p].manifestSha256, scopePath: evidence.artifacts[p].scopePath }])),
    checks: evidence.checks })).digest('hex');
}
export async function checkFeatureReleaseReview(evidence) {
  requireValue(evidence?.schemaVersion === 1 && plain(evidence.feature) && /^[a-f0-9]{40}$/.test(evidence.sourceCommit || ''), 'Feature/source identity required');
  requireValue(/^https?:\/\//.test(evidence.previewUrl || ''), 'Actual preview required');
  const manifests = [];
  for (const profile of ['preview', 'production']) {
    await verifyReleaseArtifact({ ...evidence.artifacts?.[profile], profile });
    const m = JSON.parse(await fs.readFile(path.join(evidence.artifacts[profile].artifactDir, 'release-artifact.json')));
    requireValue(m.sourceCommit === evidence.sourceCommit && m.inputVerification === 'source-catalogs'
      && m.candidateManifestSha256 === null, 'Feature release must use current source catalogs, not an old authoring candidate');
    manifests.push(m);
  }
  requireValue(isDeepStrictEqual(manifests[0].sourceFiles, manifests[1].sourceFiles)
    && manifests[0].profile.contentBundleSha256 === manifests[1].profile.contentBundleSha256, 'Profiles differ in source/content');
  requireValue(manifests[0].profile.contentBundleSha256 === evidence.baseline?.contentBundleSha256,
    'This feature release must preserve the already-published pet/pool/Lore catalog');
  for (const name of ['functional', 'artworkAndAnimation', 'region', 'backupAndTransactions', 'regressions', 'serviceWorker', 'previewHttps']) {
    requireValue(evidence.checks?.[name]?.status === 'pass' && plain(evidence.checks[name].evidence), `Missing actual ${name} validation`);
  }
  const packageHash = featurePackageHash(evidence);
  const accepted = evidence.humanAcceptance;
  const authorized = evidence.publicationAuthorization;
  const humanAccepted = accepted?.packageHash === packageHash && plain(accepted.reviewer) && Number.isFinite(Date.parse(accepted.acceptedAt));
  const publicationAuthorized = authorized?.packageHash === packageHash && authorized.phrase === '可以發布'
    && plain(authorized.reviewer) && Number.isFinite(Date.parse(authorized.approvedAt));
  return { ok: true, packageHash, releaseReady: Boolean(humanAccepted && publicationAuthorized),
    nextGate: !humanAccepted ? 'human_whole_package_acceptance_including_new_artwork_use' : !publicationAuthorized ? 'explicit_publication_authorization' : 'publish_reviewed_bytes',
    limitation: 'Read-only evidence gate; cannot create consent or deploy. Old release authorizations never count.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const result = await checkFeatureReleaseReview(JSON.parse(await fs.readFile(process.argv[2], 'utf8'))); console.log(JSON.stringify(result, null, 2)); if (!result.releaseReady) process.exitCode = 1; }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
