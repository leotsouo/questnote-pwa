# 晴信原野 V3.8.8 最終整包驗收

## 本次整包

正式站仍是 V3.8.6。先前 V3.8.7 候選獲使用者以「通過 可以發佈」核准，但來源升格測試揭露 12 隻新角色缺少可用的四章羈絆故事。該原包沒有部署；原話及原 `packageHash` 保留在 `release-evidence.json`。補齊故事後的 v2 包也尚未申請驗收時，`origin/main` 加入已合併的 V3.8.7 召喚共用圓環移除，因此再整合最新主線，為合併後的 App 設定 V3.8.8，產出本 v3 包。v2 包及報告保留，不當成已核准。

新池 `sunward_letters`「晴信原野」維持 12 隻角色、同一批核准卡圖、原有機率／價格／保底、工坊食物與偏好、探險專長，以及沿用迷霧森林／豐穗遠郊。12 隻新角色各有四章同行故事與獨立紀念物。最新主線的信箱公告與召喚動畫改動均納入來源；新池使用原生召喚揭露，沒有額外贈寵或解鎖。

| 項目 | 固定身分 |
| --- | --- |
| 待驗收 `packageHash` | `dbd4edac53f41bfdeecc9b16b95d0ab85b6cf1441d566dfb2f2cd978935ad3bd` |
| Reviewed source commit | `c2e5f9556c57eae3289df2679907db2998179e54` |
| 最新納入的 App 來源主線 | `6b9f60fca7ee69bdadf627f6d93ea84a83f926d5` |
| 後續獨立信箱主線 | `61d7a139ad4f1225828b5633c9efdd7d2e39a4dd`，已合入分支；信箱不屬於固定 App 產物 |
| Candidate ID | `0b00ab77a5a8aad3cf9e93271d98a25c91df1d89ee9d7faf4837d105f7944cda` |
| Candidate manifest SHA-256 | `ef369dc1c14761d5fb961c879222c7e158b4360296d6e67dc58a793c1d3a4bcb` |
| Production artifact ID | `aa7b16b74f1d9e8a122a20ecbb41b54ed2a0c9fdd3e53fd1a6053f980829b692` |
| Production manifest SHA-256 | `3a5eca233afc3445c20732200ddb1b9c1cae834d2753ad196a0f29962409b168` |
| Preview artifact ID | `d981811c6005106c132368374e093150f356265b3d349a26f44e7296dcf94152` |
| Preview manifest SHA-256 | `4162017b01ea38ef061bf95b4bc2a8398dcc7301fe7bbe965e8c74bafc470b0b` |

本機路徑與 scope 見 `artifacts-v3.json`；審查 pin、各項證據與新整包雜湊見 `release-evidence-v3.json`。這兩份產物各有 665 個檔案，逐檔 SHA／profile／SW 驗證通過。

## 驗證結果

- 已變動 JavaScript 的 `node --check`、`git diff --check`、整合後 `npm test`：通過。完整測試輸出保存於 `main-reconciliation-npm-test.log`。
- `npm run pools:validate`：7 池、0 errors／warnings；`npm run images:check`：140 隻寵物的 card／stage 圖和 8 張地區插畫通過。這兩項在 v2 升格後執行；整合主線未改動寵物與地區素材。
- 整合後 `npm run test:pool:release`：通過，輸出保存於 `main-reconciliation-pool-smoke.log`。
- 固定 V3.8.8 production／preview 瀏覽器 run `2c959c47-9021-4e90-8694-dbb59c505f2b`：**19 passed，0 failed**。涵蓋初啟、隔離存檔、原生十連一次扣 1000／SR 保證／重複碎片、送禮、工坊、探險、三主題手機版面與模擬 200% 文字、更新保護、快取損壞與完整離線啟動。
- 原有 12 張卡圖及其衍生圖 bytes 沒有重產。舊包實際動畫模組的 SSR／UR、略過、減少動態與 160 px 卡面審查可沿用；新固定產物原生召喚由上項瀏覽器測試通過。最新主線的共用圓環移除另有 34 項實際瀏覽器動畫驗證於 `reports/summon-omen-removal/validation.md`。
- `poolReleaseReview.mjs`：`ok: true`，`releaseReady: false`，下一關 `human_whole_package_acceptance`。舊整包的驗收與發布同意沒有移植到新雜湊。

## 尚待驗證與發布關卡

實體手機、已安裝 PWA 的觸控／鍵盤／跨網路更新仍需真機確認。網站發布後須依 SOP 比對 Pages 建置、`gh-pages` Git blobs、正式 HTTPS 每個非獨立信箱檔案的 bytes／SHA，並確認正式畫面與離線載入。`data/global-mailbox.json` 應保留現行獨立公告，不用舊 artifact 覆寫。

來源尚未合併 `main`；production artifact 尚未推送 `gh-pages`；正式 HTTPS 尚未更新。主線於本整包固定後新增的 `61d7a13` 只改動獨立 `data/global-mailbox.json`，分支已保留，後續部署須沿用最新信箱而非產物封存的舊版。只有使用者對本頁**新的** `packageHash` 完成整包驗收並再次明確說「可以發布」，才能記錄新 acceptance／authorization，執行來源整合與正式站部署。
