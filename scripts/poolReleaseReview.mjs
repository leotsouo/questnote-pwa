/** Read-only final SOP gate. Records are local evidence, not digital signatures. Never deploys. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { verifyReleaseArtifact } from './verify-release-artifact.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const plain = (v) => typeof v === 'string' && v.trim().length > 0;
const require = (condition, message) => { if (!condition) throw new Error(message); };
export function releaseReviewHash(evidence) {
  const artifacts = Object.fromEntries(['preview', 'production'].map((profile) => [profile,
    { artifactId: evidence.artifacts[profile].artifactId, manifestSha256: evidence.artifacts[profile].manifestSha256,
      scopePath: evidence.artifacts[profile].scopePath }]));
  return hash(JSON.stringify({ sourceCommit: evidence.sourceCommit, candidateId: evidence.candidateId,
    candidateManifestSha256: evidence.candidateManifestSha256, artifacts, previewUrl: evidence.previewUrl, checks: evidence.checks }));
}

export function releaseReviewDecision(evidence) {
  const packageHash = releaseReviewHash(evidence);
  const accepted = evidence.humanAcceptance;
  const authorized = evidence.publicationAuthorization;
  const humanAccepted = accepted?.packageHash === packageHash && plain(accepted.reviewer) && Number.isFinite(Date.parse(accepted.acceptedAt));
  const publicationAuthorized = authorized?.packageHash === packageHash && authorized.phrase === '可以發布'
    && plain(authorized.reviewer) && Number.isFinite(Date.parse(authorized.approvedAt));
  return { packageHash, releaseReady: !!(humanAccepted && publicationAuthorized),
    nextGate: !humanAccepted ? 'human_whole_package_acceptance' : !publicationAuthorized ? 'explicit_publication_authorization' : 'publish_reviewed_bytes' };
}

export function artworkReviewMatchesBrief(approvals) {
  const brief = approvals?.brief;
  if (brief?.sopVersion !== 2 || brief.purpose === 'synthetic'
    || (brief.imageReviewMode !== undefined && !['human', 'ai-self'].includes(brief.imageReviewMode))) return false;
  const expected = brief.imageReviewMode === 'ai-self' ? 'ai' : 'human';
  const receipt = approvals.receipts?.find((item) => item.stage === 'images');
  return receipt?.reviewerType === expected && plain(receipt.reviewer);
}

export async function checkPoolReleaseReview(evidence) {
  require(evidence?.schemaVersion === 1 && /^[a-f0-9]{40}$/.test(evidence.sourceCommit || ''), 'Review requires a source commit');
  require(plain(evidence.previewUrl) && /^https?:\/\//.test(evidence.previewUrl), 'Review requires actual isolated preview URL');
  const manifests = [];
  let artworkApproved = true;
  let candidate;
  for (const profile of ['preview', 'production']) {
    const pins = evidence.artifacts?.[profile];
    require(pins, `Missing ${profile} artifact pins`);
    await verifyReleaseArtifact({ ...pins, profile });
    const manifest = JSON.parse(await fs.readFile(path.join(pins.artifactDir, 'release-artifact.json')));
    require(manifest.sourceCommit === evidence.sourceCommit && manifest.candidateManifestSha256 === evidence.candidateManifestSha256,
      'Artifact source/candidate differs from the reviewed package');
    const candidateBytes = await fs.readFile(path.join(pins.artifactDir, 'release-input/candidate.json'));
    require(hash(candidateBytes) === evidence.candidateManifestSha256, 'Archived candidate hash differs from review');
    const c = JSON.parse(candidateBytes);
    require(c.sopVersion === 2 && c.candidateId === evidence.candidateId, 'Review requires this SOP 2 candidate');
    require(manifest.profile.contentBundleSha256 === c.files['catalog.json'], 'Runtime catalog differs from reviewed candidate');
    for (const [file, expected] of Object.entries(c.files)) {
      if (file === 'catalog.json') continue;
      const output = file.startsWith('companion/') ? file.slice('companion/'.length)
        : file.startsWith('assets/pets/') ? file : `release-input/${file}`;
      require(manifest.files[output]?.sha256 === expected, `Artifact differs from reviewed candidate input: ${file}`);
    }
    candidate = c;
    const approvals = JSON.parse(await fs.readFile(path.join(pins.artifactDir, 'release-input/approvals.json')));
    artworkApproved &&= artworkReviewMatchesBrief(approvals);
    manifests.push(manifest);
  }
  require(manifests[0].profile.contentBundleSha256 === manifests[1].profile.contentBundleSha256
    && JSON.stringify(manifests[0].sourceFiles) === JSON.stringify(manifests[1].sourceFiles), 'Preview and production must use the same content/source bytes');
  require(candidate.files['ecosystem.json'], 'Review is missing companion inputs');
  const ecosystem = JSON.parse(await fs.readFile(path.join(evidence.artifacts.preview.artifactDir, 'release-input/ecosystem.json')));
  for (const key of ['animation', 'workshop', 'specialties', 'region', 'transactions', 'serviceWorker']) {
    const check = evidence.checks?.[key];
    const reuse = key === 'region' && ecosystem.expedition.decision === 'reuse';
    require((check?.status === 'pass' || (reuse && check?.status === 'reuse')) && plain(check?.evidence), `Missing actual ${key} acceptance evidence`);
  }
  require(artworkApproved, 'Synthetic content or artwork review mode mismatch cannot become release ready');
  return { ok: true, ...releaseReviewDecision(evidence),
    limitations: 'Local review records are not signed identities; verify actual human consent and linked browser evidence before publishing.' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    require(process.argv.length === 3, 'Usage: node scripts/poolReleaseReview.mjs <evidence.json>');
    const result = await checkPoolReleaseReview(JSON.parse(await fs.readFile(process.argv[2], 'utf8')));
    console.log(JSON.stringify(result, null, 2));
    if (!result.releaseReady) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
