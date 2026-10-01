# 新增任務表單垂直捲動 — 正式發布收據

使用者檢視本機預覽後，要求整合進正式版。PR #35 已通過 main CI 並合併，source main commit 為 `5ab101cbff464c5b0d2a255808db9e166d150834`。發布 V3.4.41 後，後續 PR #36 的 V3.4.42 更新也已上線並保留相同表單樣式。

## V3.4.41 表單更新

- Production artifact：`467338c8913e5370fb5960926837ccbcdb781ca14f3fc84a78ca45b03aa427dc`；manifest SHA-256：`92df08c7f825ba56cf58b0dd56057750a2f99a09c1464444d30d0c85bbe6327f`；410 個檔案。全部 410 個 staged Git blobs 均與不可變產物吻合。
- Pages commit：`4e6744b352975eab2d821e7922426835596b461f`；[Pages run 36875482934](https://github.com/leotsouo/questnote-pwa/actions/runs/36875482934) 成功。
- 96 隻角色與 4 個卡池的 bundle SHA-256 維持 `8475965d22917f5594a56ba6b5bba21e9c4aa22c4b160b4c000e32608e2bc5df`；信箱 SHA-256 維持 `49c06b7f0dc976bda2034ee5a9a50abb14d894baa0903a6821016798b6b9a1bd`。正式 DB 為 `QuestNoteDB`、scope 為 `/questnote-pwa/`，均未更改。
- `npm test`、卡池驗證、圖片檢查、PR CI、strict artifact verification、12 項 assembled PWA 測試與 27 項正式產物表單版面測試通過。12 個正式 HTTPS 檔案的 SHA-256 均吻合。
- 45 組來源 CSS 版面檢查涵蓋 320、360、390、430、768px、三個主題及 16/24/32px 字體大小；正式 artifact 的 27 組版面檢查涵蓋 320、390、768px、三個主題及相同字體大小。測試使用長任務與子任務文字，檢查水平溢出、欄位越界、垂直捲動與觸控軸向。

## 目前正式版本

PR #36 後續發布 V3.4.42，以修復嵌入式瀏覽器啟動問題。Pages commit `f86c5b2371c16b87b98cf025b88b16099c59339b`、[Pages run 36875982334](https://github.com/leotsouo/questnote-pwa/actions/runs/36875982334) 均成功。讀回 V3.4.42 的 7 個 HTTPS 檔案並核對 SHA-256，其中 `src/ui-polish.css` 與 V3.4.41 相同；目前正式版因此仍含本次表單修正。

本次未更改任務規則、存檔結構、正式 DB、卡池資料、信箱或後端。裝置實際觸控行為尚未在 iPhone/Android 實機驗收。

驗收輸出見 [PWA 測試](artifact-browser-results.json)、[V3.4.41 表單版面](production-artifact-layout.json)、[V3.4.41 HTTPS 雜湊](production-live-hashes.json)、[V3.4.42 現行 HTTPS 核對](current-production-validation.json) 與 [表單截圖](assembled-production.png)。
