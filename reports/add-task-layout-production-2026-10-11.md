# V3.9.11 首頁新增任務按鈕 — 正式發布收據

依使用者在修正與設計例外提交後的「部署」授權，V3.9.11 已發布到 [正式站](https://leotsouo.github.io/questnote-pwa/)。首次完整 HTTPS 與正式瀏覽器驗證完成於2026-10-11 17:17（台灣時間）。

## 來源與部署

- 修正：`ab4c6dd84986cb2c805ec411918f52c5ac15d48a`；使用者批准的單檔教學提醒設計例外：`03865436eeb029a6926f32d08333a6cf9de59eb8`。
- [PR #105](https://github.com/leotsouo/questnote-pwa/pull/105) 經 CI 合併至 main：`d918497f44ef020324254d0790be56341d228572`。
- [PR CI](https://github.com/leotsouo/questnote-pwa/actions/runs/38126763060) 與 [main CI](https://github.com/leotsouo/questnote-pwa/actions/runs/38126898369) 均成功。
- Production artifact：`0ce07b33df5ba32f8f0d2ad682146cbaeda948c8ca32f240070be970c43454fd`。
- Manifest SHA-256：`b37aff34882e8a123d010319ad1c38c2e9c70149153928716f04db03b2733c9c`。
- gh-pages：`5a7a83f5983c5eef8e86be71931cd05eb5fbe56e`，從`d53b7aaecc85d8c79681e6b50f696d4322a7b1f3`普通fast-forward發布。
- [Pages run 38127601886](https://github.com/leotsouo/questnote-pwa/actions/runs/38127601886) 的build與deploy全部成功。

## 驗證與範圍

來源完整 `npm test`、JS語法檢查、diff檢查與design detector均通過；146組首頁排版檢查涵蓋空／非空清單、三主題、一般／易讀、320／430／1280px與200%根字體壓力。既有原生assembled PWA suite的18項檢查全部通過，包含舊worker轉換、失敗時拒絕啟動、驗證後啟動、production／preview隔離、離線啟動、資源重建及存檔保留。

固定production與preview產物均通過strict artifact verification；836個部署Git blobs的SHA-256與固定產物逐一吻合。正式HTTPS的835個檔案（包含manifest）逐一吻合；`.nojekyll`是僅在Git驗證的hosting設定。

正式站fresh disposable Chrome context顯示V3.9.11、正確artifact、`QuestNoteDB`、`/questnote-pwa/`與相同artifact的控制worker。430 × 637下，一般模式按鈕118 × 48、scrollHeight=48；易讀模式140 × 56、scrollHeight=56，均無水平／垂直內容溢出，兩個入口均可開啟並關閉任務表單，無page errors。未提交任務或向正式後端送出POST，未存取使用者既有瀏覽器資料。

比對正式基準後，只有`index.html`、`service-worker.js`、`src/guided-onboarding.css`、`src/releaseProfile.js`與`src/version.js`的runtime bytes改變。完整runtime檔案清單、catalog bundle `53f3cf3aea133c9186cbaf0396dfd54241d5fb0bb4debbf57601cd4d2c944046`與所有角色／卡池／圖片均保留。動態公開信箱精確保留SHA-256 `0f2cf40578f9f70d06b0ccf9d60f9c1623ba8d5267a99a6923244ee406183ef9`；未部署後端或preview網站。

發布前的第一次輸入檢查發現Windows checkout與正式檔案的換行不同。已逐檔核對LF正規化後與Git內容完全相同，保存原checkout bytes並保留未修改正式runtime與最新信箱的精確bytes；更新index stat後Git diff／cached diff為空，無額外來源變更。後續artifact及所有Git／HTTPS檢查均成功。初次一般模式截圖受固定導覽列遮擋，不作可讀性證據；後續置中截圖另存並核對命中位置。

## 證據與裝置限制

本機證據位於專案producer登錄且長期hold的忽略目錄：

- `.dev-backups/test-runs/v3911-build-r2/`：固定production／preview產物、pins與公開基準。
- `.dev-backups/test-runs/v3911-pwa/pwa-results.json`：18項原生PWA驗收。
- `.dev-backups/test-runs/v3911-pages-prepare/deployment.json`：836個Git檔案與正式提交。
- `.dev-backups/test-runs/v3911-live/live-results.json`：835個HTTPS檔案與正式瀏覽器identity、geometry及表單檢查。
- `.dev-backups/test-runs/v3911-live-views/`：置中後一般／易讀按鈕、viewport截圖與命中位置檢查。
- `.dev-backups/test-runs/v3911-build/`：已處理的換行diagnostics及原輸入備份，仍保留。

本輪驗證為桌面Chrome的行動viewport及原生service worker，不是iPhone／iOS Safari實機或standalone驗收。iPhone補測仍待實機條件。舊App視窗若仍顯示先前版本，請關閉所有QuestNote分頁及主畫面視窗，再連網重新開啟；不用清除網站資料。
