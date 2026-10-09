# 卡池覺醒翻面預覽驗證

2026-10-10（Asia/Taipei）。本機候選 V3.9.8，分支 `codex/pool-awakening-preview`，基於 fetch 後的 `origin/main` `fa5a13e785a0d3a1f9eac5967425437dcf8537ea`。保留根目錄與 main-integration 既有草稿；未推送、合併或部署。

卡池角色詳情以實際兩相素材提供全彩翻面；焦點與全部夥伴卡片提供入口提示。劍隱山河 20 位、黯冠王庭 7 位、霓霞仙膳 4 位，共 31 位。只顯示造型預覽，不寫覺醒狀態、收藏、錢包、形態偏好或獎勵。既有召喚、養成與儀式流程保留。新增 module 已列入 SW precache，版本及 cache 名稱同步。

驗證結果：

- 修改的 runtime JS／SW 與新增測試腳本語法檢查通過。
- 相關 Node tests：26/26 通過，涵蓋兩相資產對應、全角色素材存在、保留 canonical／初遇抽卡素材、無覺醒角色、轉義與教學文字。
- 完整 `npm test` 通過：372 + 14 + 12 個 Node tests、product-flow safety 與 reveal-flow assertions 無失敗。完整日誌：`.dev-backups/test-runs/pool-awakening-final/full.log`。
- 最後一項修改為詳情開啟時重置捲動位置；修改後重跑 JS 語法、26 個相關 tests 與以下全部瀏覽器驗證，皆通過，不重跑無關測試。
- Chrome headless、隔離 loopback origin、實際卡池 renderer：全部 31 位未持有角色正確全彩翻面／翻回、快速反轉、重開回到初遇、Enter／Space、焦點保留通過。
- 375×812 手機與 1280×900 桌面截圖已目視確認；手機無水平溢出，開啟／翻面時捲動位置為 0，卡圖完整呈現。
- 系統 Reduce Motion、App 減少動態、長輩模式皆直接切換；覺醒舞台圖失敗時嘗試原圖，兩者失敗仍保留初遇相並可重試。
- 測試期間攔截全部 IndexedDB put/add/delete/clear 與遊戲交易回呼：0 次寫入；沒有覺醒的卡池不提供翻面控制。
- 展示頁使用相同實際元件及 31 位素材，攔截 IndexedDB open 仍能操作；pageErrors 為空。最終紀錄：`.dev-backups/test-runs/pool-awakening-viewport-final/results.json`。
- `git diff --check` 通過。

早期瀏覽器 fixture 缺少 isExpanded 回呼、切池前未關閉詳情，均已修正；鍵盤載圖失焦與詳情沿用捲動位置的產品問題也已修正並回歸。失敗診斷由治理工具保留，最終沒有未處理失敗。

設計檢查的 gradient-text／dark-glow 為共用未使用樣式誤掃，僅在獨立測試頁持久化忽略；展示頁縮小樣式引用後自動掃描無問題。既有 App 樣式中的稀有度邊線、敘事引用邊線屬本次範圍外，保留原設計。没有對全站套用忽略。

Stop hook 再核對：歷史 `devtools/pool-awakening-preview.html` 與前一來源 revision 的差異為零；CSS 稀有度上邊線與敘事 blockquote 左邊線已存在於 `fa5a13e`。這些既有項目保留，不擴大本任務或追加忽略。新展示頁的 cream-palette 是沿用 twilight 的既有語意色彩，按維持既有設計的例外處理；radial-halo 的 `#779b82` 來自匯入但未掛載的 sanctuary scenery，屬誤判。兩者只對新展示頁追加持久化忽略；沒有修改 App 視覺或 runtime。完整 detector 輸出存於登記為 hold 的 `.dev-backups/impeccable-stop-triage.json`。

互動展示：`devtools/pool-awakening-flip-preview.html`。執行 `node devtools/onboarding-browser-server.mjs 0` 後，使用其 loopback port 開啟該頁；展示不載入 App 或遊戲交易。

實體 iPhone 尚未檢查；本次完成本機來源與桌面／手機 viewport 驗證，正式發布須另走既有 artifact 流程。
