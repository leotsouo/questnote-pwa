import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const read = async (name) => JSON.parse(await fs.readFile(new URL(name, import.meta.url)));
const pins = await read('./release-pins.json');
const staging = await read('./staging-final.json');
const desktop = await read('./presentation-browser.json');
const mobile = await read('./presentation-mobile-browser.json');
const artifact = await read('./artifact-browser.json');
const update = await read('./actual-update-browser.json');
const manual = await read('./manual-app-acceptance.json');
const deployment = await read('./deployment-preparation.json');
const backup = await read('./authoring-backup.json');
assert.equal(desktop.failed, 0); assert.equal(mobile.failed, 0); assert.equal(artifact.failed, 0);
assert.equal(update.results.length, 8); assert.ok(update.results.every((item) => item.ok));
assert.equal(manual.single.walletAfter, 2900); assert.equal(manual.ten.walletAfter, 1900); assert.equal(manual.ten.names.length, 10);
assert.equal(manual.ten.layout.scrollWidth, manual.ten.layout.width);
assert.equal(manual.artifactId, pins.preview.artifactId);
assert.equal(deployment.artifactId, pins.production.artifactId); assert.equal(deployment.everyGitBlobMatchesReviewedArtifact, true);
assert.equal(backup.candidateId, pins.candidateId); assert.equal(backup.everyFileVerified, true); assert.equal(staging.approvedPixelsUnchanged, true);
const runtimeDiff = execFileSync('git', ['diff', pins.sourceCommit, '--name-only', '--', 'src', 'data', 'assets', 'scripts', 'index.html', 'service-worker.js', 'package.json', 'content/release-compatibility'], { encoding: 'utf8' }).trim();
assert.equal(runtimeDiff, '', 'Pinned source runtime changed after artifact assembly');
const review = { reviewedAt: new Date().toISOString(), sourceCommit: pins.sourceCommit, candidateId: pins.candidateId,
  production: pins.production, preview: pins.preview,
  animation: { desktopPassed: desktop.passed, mobilePassed: mobile.passed, failed: 0, previewUrl: 'http://127.0.0.1:54939/devtools/honeylight-animation-preview.html' },
  app: { passed: artifact.passed, updatePassed: update.results.length, manual, previewUrl: manual.previewUrl },
  approvedPngCount: 12, approvedPngBytesUnchanged: true, authoringArchiveFileCount: backup.fileCount,
  deploymentCommit: deployment.deploymentCommit, productionPushed: false, sourceAutoMerged: false,
  finalGate: 'Explicit user approval before formal source integration/production push; recheck latest refs and live production first.',
  limitations: ['Chromium desktop and 393×852 viewport emulation verified; no physical iPhone/Safari run was performed.'],
  deferredUntilPoolPublished: ['Workshop craftable food review', 'Expedition region review'],
};
await fs.writeFile(new URL('./animation-review.json', import.meta.url), JSON.stringify(review, null, 2) + '\n');
await fs.writeFile(new URL('./release-handoff.md', import.meta.url), `# 蜜光糖庭動畫發布交接 — 2026-10-01（Asia/Taipei）

專屬入場、糖果／奶霜抽卡前奏、暖金 SSR、焦糖海獺與奶霜天鵝雙 UR 已完成。使用既有核准 PNG 和本地 CSS/SVG，無新生成、音效、付費 API 或新增依賴。所有舊已發布內容、機率、保底與卡圖原始 bytes 保持不變。

- Runtime source：\`${pins.sourceCommit}\`；新 candidate：\`${pins.candidateId}\`。保留原 84-pet canonical baseline、所有舊 receipts／candidates；12 PNG hashes 相同。
- Production：\`${pins.production.artifactId}\`，manifest SHA-256：\`${pins.production.manifestSha256}\`。
- Preview：\`${pins.preview.artifactId}\`，manifest SHA-256：\`${pins.preview.manifestSha256}\`。兩者412個檔案逐檔驗證，dry-run／重建／重用一致。
- 本機發布提交：\`${deployment.deploymentCommit}\`，分支 \`${deployment.branch}\`；parent仍是V3.4.35正式\`${deployment.parentCommit}\`，412 Git blobs與審核產物完全相同，未推送。
- Node tests 220/220、reveal-flow assertions、catalog與96×2圖片、Pipeline release rehearsal均通過。動畫桌面${desktop.passed}/14、393×852手機尺寸${mobile.passed}/14；完整App${artifact.passed}/12、實際V3.4.35→V3.4.36更新8/8。
- 真實隔離App：3000→2900星塵的單抽保底天鵝UR，接著十連→1900星塵、10項結果含重複角色完整呈現。每次僅扣一次；手機總覽無水平溢出。測試只在全新本機origin，不改正式站／個人存檔。
- 完整authoring archive共${backup.fileCount}檔逐SHA驗證，位置與清單見authoring-backup.json。

可操作App預覽：${manual.previewUrl}
純動畫重播：${review.animation.previewUrl}
詳細證據：animation-review.json、presentation-browser.json、presentation-mobile-browser.json、artifact-browser.json、actual-update-browser.json、manual-app-acceptance.json。

尚未自行merge來源或推送gh-pages。使用者說「可以發布」後，先重新核對origin/main、origin/gh-pages及正式HTTPS。source整合的runtime須與上述pin完全一致；若有其他改動，重新驗證／組裝。確認後才以準備提交fast-forward發布，再驗證Pages建置與正式HTTPS bytes。舊無專屬動畫的0e00ce0發布提交及其產物只保留歷史，不可推送。

目前驗收為Chromium與手機尺寸模擬，未宣稱實體iPhone／Safari通過。工坊可製作食物／探險區域的流程規劃，依使用者要求留到正式卡池發布後討論；每次新企劃先同步最新正式版與reviewed source baseline。
`);
console.log(JSON.stringify({ animation: review.animation, appPassed: artifact.passed, updatePassed: 8, productionPushed: false }));
