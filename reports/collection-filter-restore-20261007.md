# 圖鑑分類篩選修復 — 2026-10-07

原因：正式使用的 `encounterView.js` 接管圖鑑後，舊 `#collection-filters` 被隱藏，新畫面只實作收藏狀態，遺漏稀有度入口和條件。

修復：在現有主題的圖鑑加入常駐「分類篩選」與全部／N／R／SR／SSR／UR，和收藏狀態、系列、名稱搜尋取交集。按鈕自動換行、觸控高度至少 44px、使用 aria-pressed 並保留操作焦點；空結果的「顯示全部夥伴」重設所有條件。來源版本／SW 同步為 V3.8.2。

驗證：
- `npm test` 完整通過（exit 0；包含整合、release safety 與召喚流程斷言）。完整 log 位於本機 TEMP/questnote-collection-filter-npm-test.log。
- `node --check`：encounterView.js、version.js、service-worker.js、collection-filter-browser-test.mjs 通過；`git diff --check` 通過。
- 真實 Edge／隔離測試 DB：320、390、768px 全稀有度結果、收藏空結果、搜尋與系列組合、重設、焦點保留通過。
- default／sweet／twilight × normal／senior CSS 排版：按鈕可見、44px 觸控高度、無橫向溢出通過。Senior 此次為 CSS 排版檢查，未宣稱真機易讀切換／VoiceOver 驗證。
- 已目視 twilight 320px 截圖，符合現行按鈕、字體、留白與主題色。9 張截圖位於 `.dev-backups/test-runs/collection-filter-20261007`，已由 producer 登錄為 hold。
- `devtools/collection-filter-review.html` 在隔離 HTTP server 自動進入真正圖鑑並選 UR；真實瀏覽器驗證有結果，右側開啟此網址。

重跑瀏覽器檢查：設定 `QUESTNOTE_PLAYWRIGHT_PACKAGE` 指向可用 Playwright，`QUESTNOTE_FILTER_REPORT_DIR` 指向新的 ignored output，再透過 worktree-artifact producer 執行 `node devtools/collection-filter-browser-test.mjs`。

狀態：只完成本機來源修復與預覽，未 push、部署或變更正式環境。原有未追蹤 reports/font-scaling-test-2026-10-01.md 保留。iPhone 原生觸控與 VoiceOver 仍需真機驗收。
