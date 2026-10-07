import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseReviewHash, releaseReviewDecision, artworkReviewMatchesBrief } from '../scripts/poolReleaseReview.mjs';

const evidence = () => ({ sourceCommit: 'a'.repeat(40), candidateId: 'b'.repeat(64), candidateManifestSha256: 'c'.repeat(64),
  artifacts: { preview: { artifactDir: 'ignored-local-path', artifactId: 'd'.repeat(64), manifestSha256: 'e'.repeat(64), scopePath: '/preview/' },
    production: { artifactDir: 'another-path', artifactId: 'f'.repeat(64), manifestSha256: '1'.repeat(64), scopePath: '/app/' } },
  previewUrl: 'http://127.0.0.1/preview/', checks: { workshop: { status: 'pass', evidence: 'Synthetic unit-test evidence only' } } });

test('whole-package acceptance and explicit release authorization are separate exact-package gates', () => {
  const e = evidence();
  assert.equal(releaseReviewDecision(e).nextGate, 'human_whole_package_acceptance');
  const packageHash = releaseReviewHash(e);
  e.humanAcceptance = { reviewer: 'simulated human in unit test', acceptedAt: '2026-10-01T00:00:00Z', packageHash };
  assert.equal(releaseReviewDecision(e).nextGate, 'explicit_publication_authorization');
  e.publicationAuthorization = { reviewer: 'simulated human in unit test', approvedAt: '2026-10-01T00:00:00Z', packageHash, phrase: '可以發布' };
  assert.equal(releaseReviewDecision(e).releaseReady, true);
  e.publicationAuthorization.phrase = 'looks good';
  assert.equal(releaseReviewDecision(e).releaseReady, false);
});

test('changes to either artifact, source, candidate or acceptance evidence invalidate the final approval', () => {
  const original = evidence(); const packageHash = releaseReviewHash(original);
  original.humanAcceptance = { reviewer: 'simulated human in unit test', acceptedAt: '2026-10-01T00:00:00Z', packageHash };
  original.publicationAuthorization = { reviewer: 'simulated human in unit test', approvedAt: '2026-10-01T00:00:00Z', packageHash, phrase: '可以發布' };
  for (const change of [
    (e) => { e.sourceCommit = '2'.repeat(40); },
    (e) => { e.candidateManifestSha256 = '3'.repeat(64); },
    (e) => { e.artifacts.preview.artifactId = '4'.repeat(64); },
    (e) => { e.artifacts.production.manifestSha256 = '5'.repeat(64); },
    (e) => { e.checks.workshop.evidence += ' altered'; },
    (e) => { e.humanAcceptance.packageHash = '6'.repeat(64); },
    (e) => { e.publicationAuthorization.packageHash = '7'.repeat(64); },
    (e) => { e.humanAcceptance.acceptedAt = 'invalid'; },
    (e) => { e.publicationAuthorization.reviewer = ''; },
  ]) {
    const modified = structuredClone(original); change(modified);
    assert.equal(releaseReviewDecision(modified).releaseReady, false);
  }
  original.artifacts.preview.artifactDir = 'moved-but-byte-identical-directory';
  assert.equal(releaseReviewHash(original), packageHash, 'Locations do not replace immutable byte identity');
});

test('archived artwork receipt must match human, ai-self or legacy brief mode', () => {
  const approvals = (imageReviewMode, reviewerType, purpose) => ({
    brief: { sopVersion: 2, ...(imageReviewMode === undefined ? {} : { imageReviewMode }), ...(purpose ? { purpose } : {}) },
    receipts: [{ stage: 'images', reviewer: 'actual reviewer', reviewerType }],
  });
  assert.equal(artworkReviewMatchesBrief(approvals('human', 'human')), true);
  assert.equal(artworkReviewMatchesBrief(approvals('ai-self', 'ai')), true);
  assert.equal(artworkReviewMatchesBrief(approvals(undefined, 'human')), true);
  for (const item of [approvals('human', 'ai'), approvals('ai-self', 'human'), approvals(undefined, 'ai'),
    approvals('unknown', 'human'), approvals('ai-self', 'synthetic'), approvals('ai-self', 'ai', 'synthetic')]) {
    assert.equal(artworkReviewMatchesBrief(item), false);
  }
  const missingReviewer = approvals('ai-self', 'ai'); missingReviewer.receipts[0].reviewer = '';
  assert.equal(artworkReviewMatchesBrief(missingReviewer), false);
});
