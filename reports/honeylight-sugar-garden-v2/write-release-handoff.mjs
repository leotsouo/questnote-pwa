import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = import.meta.dirname;
const read = async (name) => JSON.parse(await fs.readFile(path.join(root, name)));
const pins = await read('release-pins.json');
const staging = await read('staging-final.json');
const artifact = await read('artifact-browser.json');
const update = await read('actual-update-browser.json');
const deployment = await read('deployment-preparation.json');
assert.equal(artifact.failed, 0);
assert.equal(artifact.passed, 12);
assert.equal(artifact.observations.production.artifactId, pins.production.artifactId);
assert.equal(artifact.observations.preview.artifactId, pins.preview.artifactId);
assert.equal(update.results.length, 8);
assert(update.results.every((r) => r.ok));
assert.equal(deployment.artifactId, pins.production.artifactId);
assert.equal(deployment.everyGitBlobMatchesReviewedArtifact, true);
assert.equal(deployment.productionPushed, false);
assert(staging.status.stages.every((s) => s.approved));
const former = await read('before-public-copy-release-pins.json');
const oldBundle = JSON.parse(await fs.readFile(path.join(former.production.root, 'data/releases', former.production.catalogSha256, 'catalog.json')));
const finalBundle = JSON.parse(await fs.readFile(path.join(pins.production.root, 'data/releases', pins.production.catalogSha256, 'catalog.json')));
const series = finalBundle.seriesCatalog.series.find((s) => s.id === 'honeylight_sugar_garden_v2');
const comparable = structuredClone(finalBundle);
comparable.seriesCatalog.series.find((s) => s.id === series.id).description = oldBundle.seriesCatalog.series.find((s) => s.id === series.id).description;
assert.deepEqual(comparable, oldBundle, 'Only public series copy changed after manual summon acceptance');
const manual = {
  recordedAt: new Date().toISOString(), finalPreviewUrl: 'http://127.0.0.1:53486/questnote-pwa-preview/',
  finalArtifactId: pins.preview.artifactId, finalCandidateId: pins.candidateId,
  syntheticContent: false, isolatedTestPlayer: true, livePlayerDatabaseAccess: false,
  finalPreviewSeed: { ownedPets: 12, stardust: 3000, adventureEnergy: 60, urPity: 99 },
  finalUiChecks: ['Full app boot', 'Four pool choices including Honeylight', 'Series filter shows 12/12', 'UR filter shows exactly sea otter and swan', 'Cute swan description and full Lore render', 'Rates 55/30/10/3/2, prices 100/1000, SSR30/UR100', 'Hero and all three featured images decoded'],
  priorManualSummonAcceptance: { origin: 'http://127.0.0.1:50518', artifactId: former.preview.artifactId,
    reasonStillApplicable: 'Strict comparison confirms only the public series description changed; pool, all pets, Lore, images and runtime are identical.',
    single: { wallet: [3000, 2900], rarity: 'UR', pet: '焦糖布蕾海獺', urPity: [99, 0], duplicateFragments: 20 },
    ten: { wallet: [2900, 1900], count: 10, highest: 'UR', urPet: '千層奶霜天鵝', duplicates: 10, fragments: 44 },
    collection: '12/96; Honeylight 12/12; UR filter two; both UR full Lore and stage images; swan original 1254 px decoded',
    reload: '1900 stardust, 60 energy, selected Honeylight and SSR/UR pity 8/30 and 8/100 retained',
    screenshots: ['ur-summon-preview.jpg', 'ten-pull-preview.jpg'],
  },
  finalScreenshot: 'final-app-preview.jpg', deviceLimitation: 'Physical iPhone installation/standalone behavior is not inferred from desktop acceptance.',
};
await fs.writeFile(path.join(root, 'manual-app-acceptance.json'), JSON.stringify(manual, null, 2) + '\n');
const handoff = `# 蜜光糖庭 V3.4.33 — 正式推送前交接

發布前準備完成；正式版尚未推送，最後核准只由使用者給予。12 隻配置 N3／R3／SR2／SSR2／UR2；雙 UR 焦糖布蕾海獺與千層奶霜天鵝。12 隻第一抽開放，無解鎖／贈寵，價格／稀有度機率／保底沿用既有設定。核准圖片 bytes 完全保留，本次發布準備沒有圖片生成呼叫或額外費用。

## 審核與產物

- Active candidate：\`${pins.candidateId}\`；五階段核准有效，stage dry-run／build／rebuild 同 hash。
- Artifact source：\`${pins.sourceCommit}\`。後續 evidence 提交及 main 整合不改此 runtime/content 快照；不因文件 HEAD 變更重新組裝已驗收產物。
- Production artifact：\`${pins.production.artifactId}\`；manifest SHA-256：\`${pins.production.manifestSha256}\`。
- Preview artifact：\`${pins.preview.artifactId}\`；manifest SHA-256：\`${pins.preview.manifestSha256}\`。
- Catalog SHA-256：\`${pins.production.catalogSha256}\`。96 pets／96 Lore／4 pools／4 series；已發布 84 隻逐筆保留。
- production scope：\`/questnote-pwa/\`／QuestNoteDB；preview scope：\`/questnote-pwa-preview/\`／QuestNotePreviewDB，各自獨立 cache。
- Authoring 全備份：528 files，逐檔 hash 通過，位置見 [authoring-backup.json](authoring-backup.json)。舊 receipts／原圖／草稿／三個 candidate／前版產物與證據全保留，不得發布被取代候選。

## 實際驗證

- 最終 \`npm test\`：192 個 main Node cases＋11 個 theme cases，0 failures；reveal-flow 35 assertions PASS，見 [node-tests-final.txt](node-tests-final.txt)。
- \`pools:validate\`、96×2 WebP check、獨立 synthetic pipeline release rehearsal 通過。synthetic fixture 沒有混入真實候選。
- [real-content-validation.json](real-content-validation.json)：兩隻 UR 正常抽與第100抽保底、SSR30保底、單抽／十連扣款、無跨池／贈禮／解鎖。
- [artifact-browser.json](artifact-browser.json)：最終 production／preview 原始 bytes 的 12/12 native browser 驗收，包含舊 SW 過渡、profile隔離、503離線與成長教學。
- [actual-update-browser.json](actual-update-browser.json)：真正 V3.4.32 → V3.4.33 的 8/8 一鍵更新驗收，五個 stores／theme／未儲存文字保留、多視窗與進行中操作阻擋、完全快取503可更新。
- [manual-app-acceptance.json](manual-app-acceptance.json)：真實內容、隔離測試玩家，單抽／十連雙UR演出、故事原圖與reload持久化；最後公開簡介收斂前後僅此一欄不同，且最終產物已重新跑兩套 native 驗收。實體 iPhone 安裝／standalone 尚無桌面可替代的 device 證據。
- [final-app-preview.jpg](final-app-preview.jpg)；可互動預覽：${manual.finalPreviewUrl}（本機 server 需繼續執行）。3000 測試星塵與全12隻收藏只在隔離預覽，不是正式贈寵設定。

## 最後一個發布關卡

正式站仍 V3.4.32：gh-pages \`505da31a7a97084c9a2b6e2b94842e2a3f1bef97\`；舊 artifact \`fbb07931fc76df36bef063435230a8ecfe1dc264613af6c3d85adebb1831b017\`，7個正式HTTPS檔案讀回一致。

本機發布分支 \`${deployment.branch}\`，提交 \`${deployment.deploymentCommit}\`，parent 是上述 gh-pages。407 個 staged／committed Git blobs 均與不可變產物一致；分支沒有 remote push。完整位置／hash／復原界線見 [deployment-preparation.json](deployment-preparation.json)。Source PR／main 整合與 Pages 發布分開紀錄在 [source-integration.json](source-integration.json)。

等使用者明確說「可以發布」後，先 fetch 並確認正式分支與HTTPS baseline仍一致，再正常 fast-forward 推送此已審核提交到 gh-pages；禁止 force push。確認 Pages build 成功與正式 HTTPS artifact／manifest／catalog bytes一致，再宣告發布完成。若正式 baseline 已變，先整合新增變更與驗證，不能覆蓋他人更新。

需要撤回卡池時用保留所有96個pet IDs／Lore／圖片的 forward release 關閉新池，不部署84隻舊 bundle、不刪玩家資料。candidate 的 releaseReady:false 保留原意，不冒充最終正式核准。

## 正式卡池發布後才討論

依使用者最後指示，發布完成後進入規劃模式討論：把新增角色後的「工坊可製作食物檢視」及「是否新增探險地區」納入未來卡池發布流程。本次只記錄後續需求，未新增食譜、地區或改流程，也未啟動這些工作。
`;
await fs.writeFile(path.join(root, 'release-handoff.md'), handoff);
await fs.writeFile(path.join(root, 'source-pr-body.md'), `蜜光糖庭新增12隻甜點／糖果幻獸，雙 UR 為焦糖布蕾海獺與千層奶霜天鵝。全部第一抽開放，維持100星塵、55/30/10/3/2機率與SSR30／UR100保底。沿用已核准原圖及既有召喚演出。

補齊 source 先前缺少的已發布霜誓峽灣，再加入本池，累積96寵物／96 Lore／4卡池／4系列；已發布84隻與 frozen legacy bytes 保留。三項舊測試改驗證既有池精確候選及legacy欄位，而不再假設只有72隻／2池。原草稿reservations、所有核准快照與不可變候選保留，active candidate僅使用 ${pins.candidateId}。

Validation：npm test 203 cases、35 reveal assertions、catalog validation、96×2 WebP checks、隔離pipeline rehearsal通過；最終assembled artifacts 12/12 browser驗收，真正V3.4.32→V3.4.33更新8/8，存檔與離線保留。單抽、十連雙UR與圖鑑詳情另有人工隔離UI驗收；證據見 reports/honeylight-sugar-garden-v2/release-handoff.md。

此PR只整合來源與發布準備；正式gh-pages仍V3.4.32。已驗證 production artifact ${pins.production.artifactId} 與本機部署提交 ${deployment.deploymentCommit}，只有使用者最後明確批准後才推送正式版。未部署backend、未新增付費服務或generation呼叫。工坊食物／探險新地區的流程規劃留到正式發布完成後。
`);
console.log('Final release handoff validated and written.');
