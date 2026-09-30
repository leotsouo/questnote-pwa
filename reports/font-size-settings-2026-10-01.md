# App 字體大小設定 — 本機待檢視

來源：最新 origin/main `23d8cdc`，獨立分支 `codex/font-size-settings`。本機版本 V3.4.35；尚未 push、合併、發布預覽站或正式站。

## 行為

- 更多 → 設定，頂部新增字體大小：標準（100%）、大（125%）、特大（150%）。舊資料與首次使用維持標準。
- 原生 radio 支援鍵盤方向鍵與觸控；選擇後立即套用、保存到 IndexedDB，並顯示文字預覽與儲存結果。儲存失敗還原先前選擇。
- 字體偏好包含在 JSON 備份；舊備份自動補標準，非法字體值在備份驗證時拒絕。
- 使用既有原子資料更新，避免美術風格與字體設定同時儲存互相覆蓋。
- 活躍 CSS 的固定 px 字體與文字 token 換成等值 rem，標準大小相同；插圖、間距與觸控最小尺寸維持原有尺寸。表單保留 iPhone 至少 16px 的防聚焦縮放規則。
- 放大模式允許按鈕換行、任務說明換行、主視覺隨文字增加高度，底部導覽預留額外空間；窄螢幕字體選項改為一列一個。
- 同步版本/cache identity，字體 CSS 納入離線 precache。

## 驗證

- `npm test`：195 + 11 個測試通過，0 失敗；召喚 Node logic assertions 全部通過。新增的 3 個字體／備份測試已接入 npm test。
- 變更 JavaScript 及 SW 的 `node --check` 通過；`git diff --check` 通過。
- `devtools/font-size-persistence-test.html`：瀏覽器原生 IndexedDB 的並行儲存、切換風格保留字體、切換字體保留風格全部 PASS；完成後恢復測試前偏好。
- 360px 手機模擬：重新載入後仍保留特大；設定副標題由 12px 變成 18px、提醒介紹由 13px 變成 19.5px。
- 320px / 390px × 三種風格 × 三種大小 × 四個主頁：共 72 組版面檢查，見 `font-size-matrix.json`。任務與圖鑑篩選項有畫面外座標，已確認位於原本可橫向捲動的 `.filter-bar`，並非頁面溢出。
- 最終 320×740、特大、三種風格 × 設定/任務/召喚/圖鑑/探險：15 組的頁面 clientWidth 與 scrollWidth 均為 305px（桌面捲軸占 15px），檢查的 p/h1/h2/h3/button 未發現隱藏文字的水平溢出，見 `font-size-final-checks.json`。
- 320px 特大新增任務彈窗可填寫並儲存；長任務標題與說明可換行。SSR 純展示演出可按繼續返回；意見回報表單可開啟，未送出回報。
- 原生 radio 方向鍵測試：從「大」按左鍵切到「標準」，根字體恢復 16px。
- 430px 三種字體預覽截圖存於 `font-size-screenshots/`。

## 檢視方式與限制

本機伺服器：`node devtools/browser-test-server.mjs 8877`，開啟 `http://127.0.0.1:8877/index.html`。此 origin 為隔離測試資料，不是使用者的正式存檔。

本次使用桌面瀏覽器的手機 viewport 模擬；未聲稱完成 iPhone/Android 實機、系統文字大小或安裝版 PWA 驗收。72 組矩陣以空收藏、空探險資料檢查主頁；長任務另以本機測試資料驗證，未窮舉所有寵物/召喚/探險狀態。

下一步：使用者檢視三種字體大小並確認後，再依 immutable artifact 發布流程處理正式站。不要從本工作目錄直接覆蓋正式站。
