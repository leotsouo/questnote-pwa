import test from 'node:test';
import assert from 'node:assert/strict';
import { featurePackageHash, featureReleaseDecision, catalogSemanticHash } from '../scripts/featureReleaseReview.mjs';
const evidence = () => ({ schemaVersion: 1, feature: 'synthetic feature gate test', sourceCommit: 'a'.repeat(40), previewUrl: 'https://example.invalid/preview/',
  baseline: { contentBundleSha256: 'b'.repeat(64) }, checks: { artworkAndAnimation: { status: 'pass', evidence: 'synthetic only' } },
  artifacts: { preview: { artifactId: 'c'.repeat(64), manifestSha256: 'd'.repeat(64), scopePath: '/preview/' }, production: { artifactId: 'e'.repeat(64), manifestSha256: 'f'.repeat(64), scopePath: '/production/' } } });
const consent = (e) => { const packageHash = featurePackageHash(e); return { ...e, humanAcceptance: { reviewer: 'synthetic-reviewer', acceptedAt: '2026-10-02T01:00:00Z', packageHash }, publicationAuthorization: { reviewer: 'synthetic-reviewer', approvedAt: '2026-10-02T01:00:00Z', packageHash, phrase: '可以發布' } }; };
test('feature evidence never fabricates acceptance; both exact-package decisions and explicit phrase required', () => {
  const e = evidence(); assert.equal(featureReleaseDecision(e).releaseReady, false);
  const approved = consent(e); assert.equal(featureReleaseDecision(approved).releaseReady, true);
  delete approved.publicationAuthorization; assert.equal(featureReleaseDecision(approved).releaseReady, false);
  const vague = consent(e); vague.publicationAuthorization.phrase = 'looks good'; assert.equal(featureReleaseDecision(vague).releaseReady, false);
});
test('catalog preservation ignores object serialization order but binds every value and array order', () => {
  const a = { pets: [{ id: 'pet_ur17', image: 'canonical.png' }], pools: [1, 2] };
  assert.equal(catalogSemanticHash(a), catalogSemanticHash({ pools: [1, 2], pets: [{ image: 'canonical.png', id: 'pet_ur17' }] }));
  assert.notEqual(catalogSemanticHash(a), catalogSemanticHash({ ...a, pools: [2, 1] }));
  assert.notEqual(catalogSemanticHash(a), catalogSemanticHash({ ...a, pets: [{ id: 'pet_ur17', image: 'awakened.png' }] }));
});
test('changes to source, either artifact, baseline, preview or actual validation revoke old consent', () => {
  for (const change of [(e) => { e.sourceCommit = 'b'.repeat(40); }, (e) => { e.previewUrl += '?new=1'; },
    (e) => { e.baseline.contentBundleSha256 = 'c'.repeat(64); }, (e) => { e.artifacts.preview.artifactId = 'a'.repeat(64); },
    (e) => { e.artifacts.production.manifestSha256 = 'a'.repeat(64); }, (e) => { e.checks.artworkAndAnimation.evidence = 'new art'; }]) {
    const e = consent(evidence()); change(e); assert.equal(featureReleaseDecision(e).releaseReady, false);
  }
});
