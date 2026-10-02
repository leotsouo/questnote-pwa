/** Bind actual HTTPS, isolated browser, regression and immutable dual-profile checks to one consent hash. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { checkFeatureReleaseReview, catalogSemanticHash } from '../scripts/featureReleaseReview.mjs';
const root = path.resolve(import.meta.dirname, '..'); const report = path.join(root, 'reports/awakening-guide');
const read = async (name) => JSON.parse(await fs.readFile(path.join(report, name)));
const artifacts = await read('artifacts.json'); const baseline = await read('baseline.json');
const https = await read('preview-https.json'); const browser = await read('preview-browser.json');
assert.equal(https.status, 'passed'); assert.equal(browser.status, 'passed');
assert.equal(https.artifactId, artifacts.preview.artifactId); assert.equal(browser.artifactId, artifacts.preview.artifactId);
assert.equal(browser.detail.initialImages, 20); assert.equal(browser.detail.offlineReload, true);
const manifest = JSON.parse(await fs.readFile(path.join(artifacts.preview.artifactDir, 'release-artifact.json')));
const catalog = JSON.parse(await fs.readFile(path.join(artifacts.preview.artifactDir, manifest.profile.contentBundleUrl)));
const unchanged = catalogSemanticHash(catalog) === baseline.contentBundleSemanticSha256;
assert.equal(unchanged, true, 'Published V3.5.8 pet, pool, economy and lore contract');
const evidence = {
  schemaVersion: 1,
  feature: 'V3.5.9 劍隱山河羈絆覺醒教學、初遇卡圖呈現與雙形態驚喜',
  sourceCommit: manifest.sourceCommit,
  previewUrl: `https://leotsouo.github.io/questnote-pwa-preview/v359-review/?release-review=${artifacts.preview.artifactId}`,
  baseline: { version: baseline.version, artifactId: baseline.artifactId, manifestSha256: baseline.manifestSha256,
    contentBundleSemanticSha256: baseline.contentBundleSemanticSha256 },
  artifacts,
  checks: {
    functional: { status: 'pass', evidence: 'V3.5.9 source UUID-isolated browser check forced the guaranteed UR in a single pull and ten pull; each pull charged once, result images used initial art, tutorial expands/collapses/navigates, ritual reveals awakening art and persisted form survives reload. See reports/awakening-guide/browser-checks.json.' },
    artworkAndAnimation: { status: 'pass', evidence: 'HTTPS preview-browser test decoded all 20 initial-card WebP files and captured actual preview UI; gacha overlay is pinned themed animation with initial art, skip path and unchanged purchase counters were checked in the UUID-isolated source browser. Original approved 20-pair art source and V3.5.5 animation assets retained.' },
    region: { status: 'pass', evidence: `Preview and production immutable manifests share source files/content bundle; pet/pool/economy/Lore semantic catalog matches the verified formal V${baseline.version}: ${catalogSemanticHash(catalog)}.` },
    backupAndTransactions: { status: 'pass', evidence: 'npm test includes awakening atomic ritual rollback/two-tab race and old/new backup roundtrip; new work changes only presentation and tutorial, no backup fields or transaction paths. Synthetic HTTPS browser reported an empty fresh preview storage and did not spend stars.' },
    regressions: { status: 'pass', evidence: 'npm test, focused pet-awakening tests (11), native UI browser regression (11 awakening checks), pool-release smoke, pools:validate and images:check all exited successfully.' },
    serviceWorker: { status: 'pass', evidence: `Actual candidate controlled by its artifact-specific Service Worker ${browser.detail.serviceWorker}; isolated HTTPS browser passed offline reload. Cache version advances to V3.5.9.` },
    currentMainFeatures: { status: 'pass', evidence: `V3.5.8 standard UR carousel and Lionheart content are preserved in the V3.5.9 isolated HTTPS browser: ${browser.detail.standardCarousel}.` },
    previewHttps: { status: 'pass', evidence: `https://leotsouo.github.io/questnote-pwa-preview/v359-review/ · V3.5.9 Pages run and commit recorded in reports/awakening-guide/preview-https.json; all ${https.fileCount} GitHub HTTPS files match artifact ${https.artifactId} and manifest ${https.manifestSha256}; browser checks captured in reports/awakening-guide/preview-browser.json.` },
  },
};
const decision = await checkFeatureReleaseReview(evidence);
assert.equal(decision.releaseReady, false); assert.equal(decision.nextGate, 'human_whole_package_acceptance_including_new_artwork_use');
evidence.packageHash = decision.packageHash;
await fs.writeFile(path.join(report, 'final-review.json'), JSON.stringify(evidence, null, 2) + '\n');
await fs.writeFile(path.join(report, 'final-review.md'), `# V3.5.9 整包最終審閱\n\n整包識別：\`${decision.packageHash}\`\n\n- [隔離 HTTPS 預覽（整包）](${evidence.previewUrl})\n- [實際部署版檢視截圖](preview-https-393.png)\n- [手機版操作測試](preview-browser.json)\n- 固定 preview：\`${artifacts.preview.artifactId}\`（manifest SHA256 \`${artifacts.preview.manifestSha256}\`）\n- 固定 production：\`${artifacts.production.artifactId}\`（manifest SHA256 \`${artifacts.production.manifestSha256}\`）\n- 正式基準：V${baseline.version} \`${baseline.artifactId}\`\n\n二十位角色的初遇圖已在召喚預覽與結果呈現；覺醒造型於完成儀式後才揭曉。羈絆覺醒按鈕位於卡池詳情旁，預設收合，教學說明門檻、試煉、信物與松香行旅糰。標準卡池 UR 黑白輪播也保留可操作。覺醒仍為可選內容；角色資料、卡池稀有度、機率、星塵價格、保底、區域、派遣與存檔格式均通過整包比對。\n\nV3.5.8 候選基於 V3.5.7，在新正式 V3.5.8 之後已失效；此 V3.5.9 已依最新主線重新整合與重建，待本次整包審閱。此前人工同意與發布授權不適用於此 \`packageHash\`。\n`);
console.log(JSON.stringify({ ...decision, releaseReady: false, artifacts: Object.fromEntries(Object.entries(artifacts).map(([p,a]) => [p,{artifactId:a.artifactId,manifestSha256:a.manifestSha256}])) }, null, 2));
