/** Read verified evidence into a human review package; never author consent. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { checkFeatureReleaseReview } from '../scripts/featureReleaseReview.mjs';
const root = path.resolve(import.meta.dirname, '..'); const report = path.join(root, 'reports/awakening-implementation');
const local = process.argv[2]; assert.equal(new URL(local).hostname, '127.0.0.1');
const read = async (file) => JSON.parse(await fs.readFile(path.join(report, file)));
const artifacts = await read('artifacts.json'); const baseline = await read('formal-baseline.json');
const manifest = JSON.parse(await fs.readFile(path.join(artifacts.preview.artifactDir, 'release-artifact.json')));
const functional = await read('browser-acceptance.json'); assert.equal(functional.results.length, 11); assert.ok(functional.results.every((r) => r.ok));
const viewer = await read('viewer-acceptance.json'); assert.equal(viewer.status, 'passed'); assert.equal(viewer.scenarios.length, 20); assert.equal(viewer.artifactId, artifacts.preview.artifactId);
const demo = await read('demo-acceptance.json'); assert.equal(demo.status, 'passed'); assert.equal(demo.viewerReloadAfterDemo, true); assert.equal(demo.artifactId, artifacts.preview.artifactId);
const pool = await read('pool-browser.json'); assert.equal(pool.status, 'passed'); assert.equal(pool.artifacts.preview.artifactId, artifacts.preview.artifactId);
const worker = await read('artifact-browser.json'); assert.equal(worker.failed, 0);
const upgrade = await read('update-offline.json'); assert.equal(upgrade.status, 'passed'); assert.equal(upgrade.artifactId, artifacts.production.artifactId);
const https = await read('preview-https.json'); assert.equal(https.status, 'passed'); assert.equal(https.artifactId, artifacts.preview.artifactId);
const httpsBrowser = await read('preview-https-browser.json'); assert.equal(httpsBrowser.status, 'passed'); assert.equal(httpsBrowser.artifactId, artifacts.preview.artifactId);
const preserved = await read('formal-content-preserved.json'); assert.equal(preserved.status, 'passed'); assert.equal(preserved.proposedArtifactId, artifacts.production.artifactId);
const testLog = await fs.readFile(path.join(report, 'runtime-tests.log'), 'utf8');
const counts = [...testLog.matchAll(/ℹ pass (\d+)/g)].map((m) => Number(m[1])); assert.deepEqual(counts, [258, 11, 5]);
assert.ok(!/ℹ fail [1-9]/.test(testLog));
const evidenceRefs = async (files) => (await Promise.all(files.map(async (file) => {
  const bytes = await fs.readFile(path.join(report, file));
  return `${file} sha256=${createHash('sha256').update(bytes).digest('hex')}`;
}))).join('; ');
const pass = async (files, detail) => ({ status: 'pass', evidence: `${detail}; ${await evidenceRefs(files)}` });
const evidence = {
  schemaVersion: 1, feature: '劍隱山河二十隻覺醒與雲棧古道地圖重製 · V3.5.5',
  sourceCommit: manifest.sourceCommit, previewUrl: 'https://leotsouo.github.io/questnote-pwa-preview/?awakening-review=dd1896c0b4d6', baseline, artifacts,
  checks: {
    functional: await pass(['browser-acceptance.json'], '11 guarded actual-app checks; eligibility, inherited Lv5, deduplication, pause/switch, simultaneous journey, expedition participation and latest Today habit UI'),
    artworkAndAnimation: await pass(['viewer-acceptance.json', 'demo-acceptance.json'], `${local}/awakening-review/; all 20 pairs, 40 normal/reduced scenes, actual-size originals, new open-mouth toad 2bf6ab94c0a0, skip/replay and 320px; human use confirmation pending`),
    region: await pass(['pool-browser.json', 'formal-content-preserved.json'], 'cloudrest 960x540 WebP visible in actual region card; old SVG and source preserved; five milestones and all economic values unchanged'),
    backupAndTransactions: await pass(['browser-acceptance.json', 'update-offline.json'], 'native interrupted-transaction rollback; two-tab single ritual; old/new backup, titles and forms; latest formal 3.5.4 save retention'),
    regressions: await pass(['runtime-tests.log', 'syntax-check.json', 'content-validation.log', 'image-validation.log', 'release-pipeline.log', 'pool-browser.json', 'formal-content-preserved.json'], '274 Node cases plus reveal-flow assertions; full pool, stories, crafts, gifts, dispatch, announcement and Today-habit regression'),
    serviceWorker: await pass(['artifact-browser.json', 'update-offline.json'], '12 profile/recovery cases; formal 3.5.4 -> proposed 3.5.5 native worker update, cache replacement, save retention and offline form/image/map/replay/backup'),
    previewHttps: await pass(['preview-https.json', 'preview-https-browser.json'], `192 actual HTTPS bytes verified; fresh browser 80 form images, map, Today habits, replay and offline reload; Pages https://github.com/leotsouo/questnote-pwa-preview/actions/runs/36931393506 success, deployment 16076f1ae1ccd449f6de0e5218d4f346dcf8f906`),
  },
  reviewSurfaces: { viewer: `${local}/awakening-review/`, isolatedApp: `${local}/awakening-demo/`, map: `${local}/awakening-review/#map-review`, previewArtifactId: artifacts.preview.artifactId },
  publicationStatus: 'Awaiting human whole-package acceptance and explicit 可以發布. Formal V3.5.4 remains active.',
};
const gate = await checkFeatureReleaseReview(evidence); assert.equal(gate.releaseReady, false);
await fs.writeFile(path.join(report, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
await fs.writeFile(path.join(report, 'gate.json'), JSON.stringify(gate, null, 2) + '\n');
const h = gate.packageHash;
const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V3.5.5 覺醒與古道 · 整包審閱</title><style>
body{margin:0;background:#152d2b;color:#f6efdc;font:16px/1.8 system-ui}main{max-width:980px;margin:auto;padding:30px 20px}h1,h2{font-family:serif}a{color:#f1cf8d}nav{display:flex;gap:16px;flex-wrap:wrap}nav a{padding:10px 14px;border:1px solid #718773;border-radius:12px;min-height:24px}.meta{overflow-wrap:anywhere;color:#c6d6c3;font-size:13px}section{margin-top:30px;padding:22px;background:#203d38;border-radius:18px}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%;font-size:14px}td,th{text-align:left;padding:10px;border-bottom:1px solid #52705d}code{overflow-wrap:anywhere}.pair{display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap}.pair figure{margin:0;flex:1;min-width:min(280px,100%)}.note{color:#f3cf91}
</style></head><body><main><p>QuestNote · 新功能整包驗收</p><h1>覺醒之後，同行更遠</h1><p>V3.5.5：二十隻覺醒系統、張口朱息的丹砂鎮嶺蛤，以及重新繪製的雲棧古道。已接入正式V3.5.4「今日習慣」，目前仍在預覽；正式站尚未發布本包。</p>
<nav><a href="${local}/awakening-review/">二十組圖片與演出</a><a href="${local}/awakening-demo/">App 隔離試玩</a><a href="${evidence.previewUrl}" target="_blank" rel="noopener">HTTPS App 預覽</a><a href="${local}/awakening-review/#map-review">地圖新舊比較</a></nav>
<p class="meta">整包識別 ${h}<br>來源 ${manifest.sourceCommit}<br>Preview ${artifacts.preview.artifactId}<br>Production候選 ${artifacts.production.artifactId}</p>
<section><h2>這次要確認的圖片用途</h2><div class="pair"><figure><img src="toad-open-mouth-comparison.png" alt="丹砂鎮嶺蛤初遇與新覺醒張口朱息比較"><figcaption>鎮嶺蛤新圖：張口吐出朱息、厚重坐鎮、替來客留出清路。</figcaption></figure><figure><img src="region-393.png" alt="實際App雲棧古道地區卡片"><figcaption>實際地區卡片，新地圖960×540 WebP。</figcaption></figure></div><p>二十隻初遇相使用前版候選圖；其餘十九隻的覺醒相沿用現行第三版，鎮嶺蛤覺醒相使用本次新張口圖。未覺醒角色及抽卡结果仍使用第三版。原圖、舊SVG與歷史核准紀錄均保留。請重新確認這次雙形態用途、新蛤圖、二十段演出與新地圖。</p></section>
<section><h2>玩家流程</h2><p>已擁有角色、親密Lv.5且已領取Lv.5故事即可接下試煉。接下後完成三筆任務／習慣，再領取一次該角色參队、接下後出發的雲棧古道派遣獎勵。一次進行一隻，可暫停、換角、恢復，原同行約定可並行。</p><p>完成試煉保證取得專屬信物。儀式消耗信物一枚與松香行旅糰一份；所有稀有度相同。完成後解鎖雙形態、專屬篇章、稱號、陪伴回應與可重播演出。稱號自行裝備；圖鑑、原圖、詳情與首頁採角色保存的形態。抽卡機率、稀有度與派遣收益維持原設定。</p><p>三UR約五秒，其餘約三秒；可略過、重播，減少動態約0.6秒。試玩存檔已準備蛤覺醒、雕待儀式、猿試煉2/3，供直接操作；只影響本機隔離副本。</p></section>
<section><h2>驗收結果</h2><table><thead><tr><th>範圍</th><th>實測</th></tr></thead><tbody><tr><td>邏輯與來源</td><td>274項Node檢查、語法、完整內容與圖片驗證通過</td></tr><tr><td>覺醒</td><td>11組實際App檢查；門檻、去重、暫停換角、同行並行、派遣參隊、信物、今日習慣</td></tr><tr><td>交易與備份</td><td>中斷回滾、跨分頁單次儀式、材料不足、舊新備份、錯誤備份拒絕、雙形態保存與稱號</td></tr><tr><td>美術與演出</td><td>20組圖片、40場正常／減少動態演出；320px、略過、重播與查看原尺寸</td></tr><tr><td>原功能</td><td>保底、重複角色、工坊送禮、20隻專長、古道五里程碑、4章同行故事與公告保留</td></tr><tr><td>更新與離線</td><td>12組worker/profile驗證；正式3.5.4→候選3.5.5存檔保留、舊快取清除、離線圖片與操作</td></tr><tr><td>公開預覽</td><td>Pages成功；192個HTTPS檔案雜湊符合，80張形態圖片與地圖載入、演出和離線重載通過</td></tr></tbody></table><p><a href="evidence.json">綁定整包的證據與檔案雜湊</a> · <a href="gate.json">發布門檻狀態</a> · <a href="formal-content-preserved.json">十四份既有資料保留核對</a> · <a href="preview-https-browser.json">HTTPS實測</a></p><p class="note">這些是桌面Chromium與隔離環境的驗證；實體手機、已安裝PWA仍可依裝置另行檢查。</p></section>
<section><h2>發布前最後一步</h2><p>人工整包驗收與「可以發布」須綁定上述識別。這次新圖、新用途、演出及地圖尚未記錄人工核准；之前V3.5.3卡池的同意不能代替本包。取得同意後才合併來源與部署已核對的production產物，接著驗證正式HTTPS、Pages、存檔與快取更新。</p></section></main></body></html>`;
await fs.writeFile(path.join(report, 'review.html'), html);
await fs.writeFile(path.join(report, 'review.md'), `# 覺醒與雲棧古道 · V3.5.5\n\n整包：${h}\n\n[完整審閱](${local}/reports/awakening-implementation/review.html) · [演出](${local}/awakening-review/) · [隔離App](${local}/awakening-demo/) · [HTTPS](${evidence.previewUrl})\n\n274項Node與召喚斷言、11組覺醒App、20組雙形態／40場演出、原卡池回歸、12組worker及3.5.4→3.5.5離線更新均通過。192個HTTPS檔案符合，十四份既有資料含公告保留。\n\n尚未人工整包验收、尚無本包「可以發布」，不得合併或正式部署。原版圖片与歷史、先前3.5.4覺醒候選驗證保留於Git；有效整包是本次識別。覺醒文件獨立，未加入卡池SOP。\n`);
console.log(JSON.stringify(gate, null, 2));
