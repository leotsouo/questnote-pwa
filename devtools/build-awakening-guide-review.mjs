/** Bind actual HTTPS, isolated browser, regression and immutable dual-profile checks to one consent hash. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { checkFeatureReleaseReview, catalogSemanticHash } from '../scripts/featureReleaseReview.mjs';
const root = path.resolve(import.meta.dirname, '..'); const report = path.join(root, 'reports/awakening-guide');
const read = async (name) => JSON.parse(await fs.readFile(path.join(report, name)));
const artifacts = await read('artifacts.json'); const baseline = await read('baseline.json');
const https = await read('preview-https.json'); const browser = await read('preview-browser.json');
const pages = await read('preview-pages.json'); const deployment = await read('preview-deployment.json');
const productionPreparation = await read('production-prepared.json');
assert.equal(https.status, 'passed'); assert.equal(browser.status, 'passed');
assert.equal(pages.status, 'passed'); assert.equal(pages.commit, deployment.commit);
assert.equal(https.artifactId, artifacts.preview.artifactId); assert.equal(browser.artifactId, artifacts.preview.artifactId);
assert.equal(browser.detail.initialImages, 20); assert.equal(browser.detail.offlineReload, true);
for (const field of ['standardCarousel', 'poolDetailsNeighbor', 'collapsedAndExpanded', 'guideText', 'freshBrowserStorage', 'gachaTotalPullsUnchanged']) {
  assert.equal(browser.detail[field], true, `HTTPS preview failed ${field}`);
}
assert.deepEqual(browser.blockedExternalOrigins, []); assert.deepEqual(browser.errors, []);
const manifest = JSON.parse(await fs.readFile(path.join(artifacts.preview.artifactDir, 'release-artifact.json')));
const catalog = JSON.parse(await fs.readFile(path.join(artifacts.preview.artifactDir, manifest.profile.contentBundleUrl)));
const unchanged = catalogSemanticHash(catalog) === baseline.contentBundleSemanticSha256;
assert.equal(unchanged, true, 'Published V3.5.7 pet, pool, economy and lore contract');
const evidence = {
  schemaVersion: 1,
  feature: 'V3.5.8 劍隱山河羈絆覺醒教學、初遇卡圖呈現與雙形態驚喜',
  sourceCommit: manifest.sourceCommit,
  previewUrl: `https://leotsouo.github.io/questnote-pwa-preview/?release-review=${artifacts.preview.artifactId}`,
  baseline: { version: baseline.version, artifactId: baseline.artifactId, manifestSha256: baseline.manifestSha256,
    contentBundleSemanticSha256: baseline.contentBundleSemanticSha256 },
  artifacts,
  checks: {
    functional: { status: 'pass', evidence: 'V3.5.8 source UUID-isolated browser check forced the guaranteed UR in a single pull and ten pull; each pull charged once, result images used initial art, tutorial expands/collapses/navigates, ritual reveals awakening art and persisted form survives reload. See reports/awakening-guide/browser-checks.json.' },
    artworkAndAnimation: { status: 'pass', evidence: 'HTTPS preview-browser test decoded all 20 initial-card WebP files and captured actual preview UI; gacha overlay is pinned themed animation with initial art, skip path and unchanged purchase counters were checked in the UUID-isolated source browser. Original approved 20-pair art source and V3.5.5 animation assets retained.' },
    region: { status: 'pass', evidence: `Preview and production immutable manifests share source files/content bundle; pet/pool/economy/Lore semantic catalog matches the verified formal V${baseline.version}: ${catalogSemanticHash(catalog)}.` },
    backupAndTransactions: { status: 'pass', evidence: 'npm test includes awakening atomic ritual rollback/two-tab race and old/new backup roundtrip; new work changes only presentation and tutorial, no backup fields or transaction paths. Synthetic HTTPS browser reported an empty fresh preview storage and did not spend stars.' },
    regressions: { status: 'pass', evidence: 'npm test, focused pet-awakening tests (11), native UI browser regression (11 awakening checks), pool-release smoke, pools:validate and images:check all exited successfully.' },
    serviceWorker: { status: 'pass', evidence: `Actual candidate controlled by its artifact-specific Service Worker ${browser.detail.serviceWorker}; isolated HTTPS browser passed offline reload. Cache version advances to V3.5.8.` },
    currentMainFeatures: { status: 'pass', evidence: `V3.5.7 standard UR preview is preserved and interactive; awakening tutorial toggle sits beside pool details in the V3.5.8 isolated HTTPS browser: ${browser.detail.standardCarousel}, ${browser.detail.poolDetailsNeighbor}.` },
    previewHttps: { status: 'pass', evidence: `HTTPS preview commit ${deployment.commit} completed Pages run ${pages.runUrl}; all ${https.fileCount} GitHub HTTPS files match artifact ${https.artifactId} and manifest ${https.manifestSha256}; browser checks captured in reports/awakening-guide/preview-browser.json.` },
  },
};
const decision = await checkFeatureReleaseReview(evidence);
assert.equal(decision.releaseReady, false); assert.equal(decision.nextGate, 'human_whole_package_acceptance_including_new_artwork_use');
assert.equal(productionPreparation.packageHash, decision.packageHash);
assert.equal(productionPreparation.artifactId, artifacts.production.artifactId);
assert.equal(productionPreparation.everySourceAndGitBlobMatches, true);
Object.assign(deployment, { status: 'preview-verified-awaiting-whole-package-acceptance', httpsFilesVerified: https.fileCount,
  pagesRunId: pages.runId, pagesRunUrl: pages.runUrl, pagesConclusion: pages.conclusion, verifiedAt: pages.verifiedAt });
await fs.writeFile(path.join(report, 'preview-deployment.json'), JSON.stringify(deployment, null, 2) + '\n');
evidence.packageHash = decision.packageHash;
await fs.writeFile(path.join(report, 'final-review.json'), JSON.stringify(evidence, null, 2) + '\n');
await fs.writeFile(path.join(report, 'final-review.md'), `# V3.5.8 整包最終審閱\n\n整包識別：\`${decision.packageHash}\`\n\n- [隔離 HTTPS 預覽（整包）](${evidence.previewUrl})\n- [實際部署版檢視截圖](preview-https-393.png)\n- [手機版操作測試](preview-browser.json)\n- [Pages 部署驗證](preview-pages.json)\n- 固定 preview：\`${artifacts.preview.artifactId}\`（manifest SHA256 \`${artifacts.preview.manifestSha256}\`）\n- 固定 production：\`${artifacts.production.artifactId}\`（manifest SHA256 \`${artifacts.production.manifestSha256}\`）\n- 正式基準：V${baseline.version} \`${baseline.artifactId}\`\n- 本機待核准的正式產物副本已逐檔比對：\`${productionPreparation.preparedDeploymentCommit}\`（尚未推送）\n\n二十位角色的初遇圖已在召喚預覽與結果呈現；覺醒造型於完成儀式後才揭曉。羈絆覺醒按鈕位於卡池詳情旁，預設收合，教學說明門檻、試煉、信物與松香行旅糰。標準卡池 UR 黑白輪播也保留可操作。覺醒仍為可選內容；角色資料、卡池稀有度、機率、星塵價格、保底、區域、派遣與存檔格式均通過整包比對。\n\nV3.5.6 的舊預覽未納入最新 V3.5.7 主線；此 V3.5.8 是重新整合、重建並待審核的整包。此前人工同意與發布授權不適用於此 \`packageHash\`。\n`);
console.log(JSON.stringify({ ...decision, releaseReady: false, artifacts: Object.fromEntries(Object.entries(artifacts).map(([p,a]) => [p,{artifactId:a.artifactId,manifestSha256:a.manifestSha256}])) }, null, 2));
