# 星辰夥伴賽 MVP 驗收 — 2026-10-09

## 範圍與來源

- 來源基線：`origin/main` 的 `4bfdd99`。
- 工作分支：`codex/daily-companion-race`，工作目錄 `.worktrees/daily-companion-race`。
- 核心與備份提交：`135b4b4`。畫面、離線修正與本報告見後續提交。
- App 版本：3.9.2；本機完成，尚未 push、合併或部署。
- [玩法與資料設計](../docs/daily-companion-race.md)。當前圖鑑 160 位夥伴均符合參賽 ID 格式，沒有排除未收藏夥伴。

## 完成內容

每日祝福入口、每日三場、每場四位等機率選手、5～500 星塵下注、3.8 倍總返還、免費觀賽、確認畫面的當日最大損失、三條輪替賽道、十秒動畫與略過、減少動態、觀賽歷史、IndexedDB 原子結算、備份格式與舊版遷移、版本與 SW 預快取均已完成。

順帶修正驗收直接觸發的兩項離線問題：

1. SW 安裝先等待所有回應的 headers，再讀 body；在 `no-store` 回應下可能堵住 HTTP 連線。現在立即讀取 body，仍等全部驗證完成才寫快取。最小重現確認原流程會停住、修正後可安裝，另有受限連線的回歸測試。
2. 原有寵物圖片 inline error handler 的 `URL` 被 `document.URL` 字串遮蔽，離線遇到未快取圖片會拋錯。改用 `globalThis.URL`，原圖也不可用時顯示 `?`，不再停在「圖片載入中」。瀏覽器明確測試 framed 與 legacy 兩種 fallback。

## 驗證結果

| 檢查 | 結果 |
| --- | --- |
| `npm test` | 通過，361 + 14 + 12 = 387 次 Node 測試執行，另有產品流程與召喚邏輯 assertions 全數通過 |
| 新功能與備份 targeted tests | 核心與備份初次 29/29 通過；新增 SW 回歸後，賽事與工坊離線 targeted tests 18/18 通過 |
| JS／MJS 語法 | 全部 13 個新增／修改的 JS／MJS 檔案通過；最後 UI 與瀏覽器測試修改另重驗 |
| `git diff --check` | 通過 |
| 真實瀏覽器 | Chrome 154，390×844 與 1280×900，九組流程通過，無未處理 page error |

九組瀏覽器流程：

1. 圖片衍生圖與原圖都不存在時，兩種 fallback 正常。
2. 由每日祝福進入，確認畫面顯示勝率／380 返還／1,500 最大損失；實際播放十秒動畫，收據與已提交餘額一致。
3. 免費觀賽使用場次、不改餘額，略過動畫顯示已存結果。
4. 動畫中關閉、重新載入後，三場紀錄與餘額完全相同，沒有第四場下注表單。
5. 兩個分頁同場同時下注，恰好一個回傳 duplicate，扣款與派彩只有一次。
6. 原生 IndexedDB wallet 寫入故意失敗，wallet 與賽事同時回滾。
7. 真實備份匯出、清除賽事 meta、原子還原後紀錄相同。
8. 減少動態直接顯示結果；三種主題無水平溢出，手機／桌面截圖已檢視。
9. 原生 SW 完成安裝後，Playwright 關閉網路、重新載入，仍可開賽並結算。

核心測試另涵蓋四個等大小勝者結果、拒絕採樣、95% 數學返還、無效下注／級距／餘額／未知選手／第四場、三場全輸扣 1,500 後為零、重複操作、免費觀賽後不能補押、跨日重置、舊日下注與時鐘倒退拒絕、舊備份遷移及竄改派彩拒絕。

## 證據位置

以下為此工作目錄內、經磁碟治理登記保留的 ignored 產物：

- `.dev-backups/test-runs/race-suite-2/suite.log`：完整測試日誌。
- `.dev-backups/test-runs/race-browser-5/results.json` 與 `browser.log`：最終九組驗收結果，errors 為空。
- 同目錄的 `mobile-default.png`、`mobile-sweet.png`、`mobile-twilight.png`、`mobile-running.png`、`desktop-receipt.png`、`offline-receipt.png`。

先前失敗：browser-1 的測試流程未跳過新版引導；browser-2 卡在 SW 安裝；browser-3 已通過離線賽事，但抓到圖片 fallback 的未處理錯誤。均已修正，browser-4 與最終 browser-5 通過。舊診斷保留供追溯，不代表目前仍失敗。

## 驗收界線與下一步

測試僅使用臨時 localhost 與合成資料庫，沒有讀寫真實玩家進度。尚未在實體 iPhone／Android 上驗收，也尚未合併或部署；下一步是分支 review，若要發布再走專案既有 immutable artifact 流程。

本機時鐘／開發者工具／還原舊備份可影響個人進度；本版沒有伺服器端防作弊。離線需先完成一次線上快取，未見過的夥伴圖片可能顯示 placeholder，但不妨礙下注與結算。
