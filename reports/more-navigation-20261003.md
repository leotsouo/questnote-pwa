# 「更多」功能整理 — 2026-10-03

最初來源基線：`origin/main` 的 `0d3fbeb4e6fe904652d57bb600d5fb3f1dfe619f`。工作分支：`codex/more-page-organization`。下方依序記錄本機驗收與使用者後續授權的正式發布；目前部署狀態以最後的發布回執為準。

## 使用者流程

- 首要入口依序為：習慣、每日祝福、成就、工坊；接著是冒險手冊與設定。
- 使用教學、意見與問題回報、分享 QuestNote 及版本資訊集中於預設收合的「教學與支援」。點擊、Enter 或 Space 都能展開／收合；從支援頁返回時保留展開狀態。
- 美術風格功能仍在設定頁內，與提醒、字體及資料備份使用同一入口。設定文字列出這些功能，避免重複的風格捷徑佔據清單。
- 預設可見的選擇由 10 個獨立入口變為 6 個功能入口與 1 個支援入口。未刪除任何功能。
- 習慣、每日祝福和成就的提醒圓點保留；每日祝福仍會直接打開首頁祝福區塊。

## 圖片與美術

沒有修改圖片、SVG 圖示、美術素材、主題、色彩、字型或既有清單列的樣式。CSS 只加入原生 details 的標記隱藏與展開箭頭方向。瀏覽器比較調整前後「習慣」入口，確認圖示 HTML、列高度、padding、背景、邊框、圓角與標籤字型／色彩完全一致。

第一版執行期來源版本為 `3.5.22`；下述習慣頁修正後為 `3.5.23`，`src/version.js` 與 SW cache 同步為 `questnote-preview-cache-v3523-more-navigation`。未增加執行期檔案，原有 precache 已包含所有異動的 App 檔案。

## 驗收結果

- `npm ci --no-audit --no-fund`：成功。
- `npm test`：303 個 Node 測試通過；揭曉流程 Node logic assertions 全部通過。
- `node --check src/ui.js`、`src/version.js`、`service-worker.js`：全部通過。
- `git diff --check`：通過。
- 真實 Chrome 與原生 IndexedDB 驗收：五組檢查全部通過，結果見 [browser-results.json](more-navigation-20261003/browser-results.json)。
- 已驗證所有日常與支援入口、返回流程、原生鍵盤收合、版本資訊、每日祝福跳轉及設定內三種風格／提醒／備份功能。
- 三種主題、393px 手機、1280px 桌面及 320px 特大字體的收合／展開狀態皆無水平溢出。
- 使用隨機名稱的 `QuestNoteTest-*` 資料庫；阻擋外部網路，未使用玩家存檔、未送出正式回報，無執行期錯誤。

## 畫面

| 狀態 | 截圖 |
| --- | --- |
| 調整前手機畫面 | [before-mobile.png](more-navigation-20261003/before-mobile.png) |
| 調整後手機畫面 | [after-mobile.png](more-navigation-20261003/after-mobile.png) |
| 支援區塊展開 | [after-support-expanded.png](more-navigation-20261003/after-support-expanded.png) |
| 晨光花園 | [after-sweet.png](more-navigation-20261003/after-sweet.png) |
| 暮光冒險手帳 | [after-twilight.png](more-navigation-20261003/after-twilight.png) |
| 320px 特大字體 | [after-320-extra-large-collapsed.png](more-navigation-20261003/after-320-extra-large-collapsed.png) |
| 320px 特大字體展開 | [after-320-extra-large-expanded.png](more-navigation-20261003/after-320-extra-large-expanded.png) |
| 桌面 | [after-desktop.png](more-navigation-20261003/after-desktop.png) |

長頁的全頁截圖會把固定底部導覽列畫在擷取當下的可視區位置；實際操作已逐一捲動、點擊與驗證各入口。正式 iPhone 裝置尚未驗收。

## 後續：習慣頁統計區塊銜接

依使用者截圖修正統計外層突兀的方形底色。`habit-stats` 是排列四張卡片的容器，不應套用摘要卡的背景；從共用主題摘要樣式中排除此容器。下方間距由 12px 改為 16px，與內容卡片左右對齊。

四張統計卡的配色、邊框、圓角、padding、字型及數值皆與修改前完全一致，未改動圖片或功能。三種主題、393px 手機、724px 桌面、320px 特大字體皆通過透明外層、卡片對齊與無水平溢出檢查；建立第一個習慣仍可打開表單，無執行期錯誤。等待原有進場動畫結束後測量，實際卡片間距為 16px。

完整 `npm test` 再次通過 303 個 Node 測試與揭曉流程 assertions；版本／SW 語法與 `git diff --check` 通過。僅完成來源與本機預覽，尚未發布。

- [修正後手機畫面](more-navigation-20261003/habit-layout/after-default-mobile.png)
- [修正前桌面畫面](more-navigation-20261003/habit-layout/before-desktop.png)
- [修正後桌面畫面](more-navigation-20261003/habit-layout/after-desktop.png)
- [量測與驗收結果](more-navigation-20261003/habit-layout/results.json)

## 首次發布準備（已由新主線取代，未推送）

使用者於預覽與習慣頁修正後明確要求「幫我推上正式版」。整合最新 `origin/main` 的 `15e6a3e`，保留正式 V3.5.22 的召喚更新；凍結執行期來源為 `dbe2b40a0ac98fa63a82acf6d4f343170341b548`。版本為 V3.5.23。

2026-10-03T09:53:11Z 正式 HTTPS 與 gh-pages 讀回的舊 artifact 同為 `9373470b03eff9a04955a9401377a787dcb9ff471d7c11a292418eb46dcb6818`。新版完整 catalog bytes 保持 `da32429aa6caf259c31f6fb8b613585144bb7ccfc653733cff583b099f03456d`，474 份美術素材及公告、材料、禮物與地區資料完全保留。

production artifact 為 `c33e24557bbf95f242eb6728ddf03f6f709e166afe795ca60a46d5cc9cc2f726`，preview artifact 為 `c039b7179314d7b37406356ae4040306e292714f5132ca72fc5b2af7c7a9c025`。manifest SHA-256、來源與 scope 見 [已取代的 artifacts.json](more-navigation-20261003/release/superseded-v3523/artifacts.json)。preview 僅用於隔離的本機組裝驗收。

整合後 `npm test` 309 項及 reveal-flow assertions 全數通過，語法、卡池與圖片檢查通過。組裝產物原生瀏覽器驗收 16 項通過，另驗證真實可見的支援頁入口與習慣透明外層。兩個 profile 的 DB/cache 隔離、legacy worker 遷移、cache eviction、503 離線啟動及教學進度保留均通過。

部署準備 commit `c606f9227d1707862b0405924bea236c83effb97` 的 606 個 staged／committed Git blobs 皆與凍結產物一致，tree `bd66d982787cd8900ef5883b52b9b5151393a1a0`。PR 驗證期间主線新增一鍵領取，因此此產物未推送。完整準備證據保留在 `release/superseded-v3523/`。

## V3.5.24 正式發布準備

整合最新主線 `47b7c337a39612a4eb337a22c64e812dd22f7454`（PR #65），保留一鍵領取及先前召喚更新。只有版本與 cache 常數產生衝突；保留最新 SW 的 `src/rewardClaimService.js` precache。凍結執行期來源為 `b3cb204442339ac56f934d614170dedb2f8558ad`，版本為 V3.5.24；相對 main 僅有本次更多頁、習慣頁與版本更新。

2026-10-03T10:01:51Z 再次核對正式 HTTPS 與 gh-pages：仍為 V3.5.22 artifact `9373470b03eff9a04955a9401377a787dcb9ff471d7c11a292418eb46dcb6818`，部署 commit `4aa9aa10dcd79810f781f8c2f40318d5d45401b6`。完整卡池 SHA-256、474 份美術素材與所有公告／附屬資料均保持正式值，詳見 [baseline.json](more-navigation-20261003/release/baseline.json)。

新版 production artifact：`c65c038a0a6ed9c2db0d6b043c2c2a649ec03a3a653ebe55b40fe74f775502be`，manifest SHA-256：`853de50d8210179fb753f7ab228cd506e375e1bd0df2d49d4542324c5de142f0`。preview artifact：`9681825588494d99f7a805274f6c9d44a126dd21d553d5d76cdde109bc4bcf8b`。兩個產物均已固定驗證；preview 用於本機隔離驗收，見 [artifacts.json](more-navigation-20261003/release/artifacts.json)。

整合後 `npm test` 三組分別通過 292、14、12 項（總執行 318 項，包含套件原本重複執行的一鍵領取測試），reveal-flow assertions、JS 語法、卡池與圖片驗證皆通過。新版產物原生瀏覽器驗收 16 項通過，更多頁實際支援入口與習慣透明外層驗收通過；沒有使用玩家的正式資料庫或送出正式回報。

部署準備 commit `127920b0dfd716edd24bdb02b018adfc49ca436d` 的 607 個 staged／committed Git blobs 全數與產物一致，沒有移除檔案。見 [deployment-preparation.json](more-navigation-20261003/release/deployment-preparation.json)、[原生瀏覽器驗收](more-navigation-20261003/release/artifact-browser-qa.json)及[更多頁](more-navigation-20261003/release/assembled-more.png)／[習慣頁](more-navigation-20261003/release/assembled-habits.png)截圖。本節仍是發布前準備；成功以後續 Pages 與正式 HTTPS 回執為準。
