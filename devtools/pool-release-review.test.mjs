import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseReviewHash, releaseReviewDecision } from '../scripts/poolReleaseReview.mjs';

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
  ]) {
    const modified = structuredClone(original); change(modified);
    assert.equal(releaseReviewDecision(modified).releaseReady, false);
  }
  original.artifacts.preview.artifactDir = 'moved-but-byte-identical-directory';
  assert.equal(releaseReviewHash(original), packageHash, 'Locations do not replace immutable byte identity');
});
