# V3.9.2 星辰夥伴賽正式發布 — 2026-10-09

使用者檢視本機預覽後，以「幫我推上正式版」明確授權發布。正式網址：https://leotsouo.github.io/questnote-pwa/ 。

## 來源與發布身份

- 功能 [PR #91](https://github.com/leotsouo/questnote-pwa/pull/91)，main 合併 `bc216baa9bfbf8aabaf1f7347b3ca98baf0702bf`。
- 功能 commit：`135b4b4`（交易／備份），`dc00b86`（介面／離線／驗證）。
- PR [CI 37874699357](https://github.com/leotsouo/questnote-pwa/actions/runs/37874699357) 與 main [CI 37874817683](https://github.com/leotsouo/questnote-pwa/actions/runs/37874817683) 成功。
- production artifact：`58f2c847388b6b2028fac79fbb42f6a54bea7a88732e3ba5292a0bdbf7b72fe2`。
- manifest SHA-256：`1fa1a59af449f5824ff13b4f872d9b14983295cdc3381cc78c1f36f9eafb7268`。
- gh-pages：`48be5954b60dcd1c27d5d192922f6753b1e5597b`，以 `83da938f1c8a6bbe388b211e15c76b96156fa089` 為 parent，正常 fast-forward 推送。
- [Pages 37876583079](https://github.com/leotsouo/questnote-pwa/actions/runs/37876583079) 成功。
- 160 位夥伴／8 池保持原目錄；contentHash `71aefb86f17b64f793d310a9ac10b28e0d670bfdc6c4e1a09f269bc24af7a014`。發布前讀回最新公告，保留其 Git 原始 bytes；SHA-256 `78ead11960d5d574d320fa7b0286d423828925f116c2110c5ea5064eb9f6f957`。

## 驗證

- 本機完整 `npm test` 共 387 項測試執行通過，另有產品流程／召喚 assertions；13 個 JavaScript／MJS 語法檢查通過。原始功能證據見 [實作紀錄](../daily-companion-race-2026-10-09.md)。
- 固定 production／preview 產物原生瀏覽器檢查 18/18 通過。
- 固定 production 的 500 星塵下注、保存賽果、略過、備份還原與離線重載／免費觀賽通過；無 page errors。
- V3.9.1 到 V3.9.2 原生 SW 更新通過；測試存檔的 2,468 星塵、收藏及所有既有玩家進度欄位保持一致，新賽事初始為空。信箱背景更新正常改變 `lastFetchedAt`／`lastSeenGeneratedAt`；閱讀及領取進度保持一致。
- gzip 回應、更新後舊快取移除、離線啟動與觀賽通過。
- 768 個部署 Git blobs 全數與固定產物雜湊一致；767 個正式 HTTPS 檔案（含 manifest，不含 `.nojekyll`）全部回讀一致。
- 正式網址全新隔離 Chrome 確認 V3.9.2、頁面 marker／原生 SW artifactId 相同、四位賽事選手、離線重載與賽事入口，無 page errors。見 [正式瀏覽器證據](formal-browser.json)、[線上截圖](formal-mobile-race.png)及[離線截圖](formal-offline-race.png)。

## 證據與範圍

本目錄保存 artifact pins、發布授權、基線、Git 部署、HTTPS 回讀、固定產物及正式瀏覽器驗收 JSON。不可變完整產物與完整日誌保留在本任務 worktree 的 `.dev-backups/release-runs/`，由磁碟治理登記為 `release-evidence`／`hold`。

首次產物組裝的快照缺少 `.nojekyll`、公告 checkout 換行不同，均修正組裝方式後重新產生完整產物；未放寬雜湊／檔案清單檢查。瀏覽器驗收調整教學初始化等待、舊版成就初始化，以及明確辨識信箱兩個背景 metadata 欄位。修正後重跑相應檢查，正式產物 bytes 保持不變；先前失敗證據仍保留。

正式瀏覽器使用全新私有 Chrome context／390×844 viewport，未操作使用者既有本機存檔，也未發送後端測試訊息。實體 iPhone／Android 與既有安裝 PWA 的裝置驗收尚未執行。
