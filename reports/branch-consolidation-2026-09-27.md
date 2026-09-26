# QuestNote 分支整合盤點 — 2026-09-27

基準：GitHub `main` = `363b056065029e09ee58450d8499cfab1bbe0ec1`，正式 `gh-pages` = `95b28b76346ee1e8b72af171aa091f971e7115ff`。盤點開始時有 14 個本機分支、12 個 worktrees、4 個遠端分支，沒有未結 PR。GitHub Pages 設定為 `gh-pages:/`，最新建置成功。

## 結論與整合

舊來源分支的已提交功能均已到 main；問題是舊 worktree、未提交副本與過時交接文件仍被當成新工作的起點。本次從最新 main 建立 `codex/consolidate-20260927`，只補入尚缺的免登入回報及歷史企劃文件，並統一協作規則。原工作區與未提交資料保留。

- 移入 `src/feedback*`、Worker/D1 原始碼、唯讀匯出工具與相關測試。共用 UI 只加入回報入口、初始化與導覽；保留已整合的教學、對話框焦點、圖片載入、UI polish、快取遺失修復及禁止 release 測試發幣。
- APP_VERSION/SW cache 同步為 V3.4.15（沿用回報草稿版本），precache 加入三個回報模組。沒有修改資料庫 schema、卡池內容或公開公告。舊 1,000 星塵公告另存為非 runtime 草稿。
- 預設 `npm test` 包含回報前後端測試；新增 GitHub Validate workflow、CODEOWNERS、PR 模板、README，並修正 AGENTS 中「沒有 npm test」的過時說法。
- 新增 [分支、分工與權限](../docs/project-governance.md) 作為唯一協作入口。舊 roadmap/企劃/audit 改標示歷史資料，保留原證據。

## 分支與未提交工作

「落後」以盤點基準 main 計算；祖先判定只涵蓋提交，另比對了每個 worktree 的 tracked/untracked 內容。

| 分支 | 基準差異 | 處置 |
| --- | --- | --- |
| `codex/card-pool-pipeline` | 落後 21 commits；根目錄仍混合多次工作的 dirty 檔案 | 卡池流程已整合；回報移入新主線；保留原草稿 |
| `codex/final-acceptance`、`codex/release-v3.4.8` | 同為 `7e2c7c2`，落後 16 | 舊驗收/版本快照；不重複合併 |
| `codex/final-integration` | 落後 7，遠端同名分支也是 main 祖先 | 已完成整合的歷史來源 |
| `codex/gacha-atomicity`、`codex/release-artifact` | 同為 `e9918f3`，落後 24；各有 dirty 副本 | 已納入 main；保留副本，禁止整包覆蓋 |
| `codex/pool-content-contract`、`codex/summon-perf` | 同為 `a1a0030`，落後 25 | contract、效能功能已納入 main |
| `codex/perf-baseline-v2` | 落後 36 | 效能與隔離基線已納入 main |
| `codex/ui-visual-polish` | 落後 19 | UI 已整合；不恢復舊版 UI |
| `codex/update-announcements-20260927` | 與 main 相同 | 公告已在來源和正式站；分支工作已完成 |
| 本機 `main` | 落後遠端 5，checkout 乾淨 | 整合完成後 fast-forward 同步 |
| 本機 `gh-pages` | 落後遠端 3，checkout 乾淨 | 只同步正式發布歷史，不能與 source 合併 |
| `codex/pages-v3.4.8` | 與 main 分歧的生成產物 | 歷史 artifact，刻意不合併回 main |

詳細原始清單：[working-tree-audit.json](branch-consolidation/working-tree-audit.json)。比對允許 CRLF/LF 相等；不可變內容仍保留原始 bytes，沒有重寫核准 snapshots。

- 根目錄 138 個修改/新增檔案與 main 相同；15 個不同、17 個在 main 缺少。不同項含舊 runtime、舊信箱、回報入口與依賴，不能視為全部待合併。
- gacha worktree 15 個相同；差異主要是尚無 release-profile DB 選擇、Glacier registry 與後續 pipeline 驗證。保留 main 的較新行為。
- pool-contract worktree 8 個相同；其他是尚無後續 Glacier、教學、dialog focus、UI/圖片與新版測試的舊快照。
- release-artifact worktree 4 個相同；舊 assembler 缺少 frozen legacy catalog 相容保護，舊 SW 缺少 verified cache recovery。
- final-acceptance worktree 2 個相同；第三個仍測試已退休的 App 減少動畫選項，main 已改成系統偏好並修正 viewport/focus 驗收。

舊根目錄還有 `2026-09-v3411-update-gift` 公告草稿，正式來源使用 `2026-09-v3411-frost-release`。前者附 1,000 星塵、後者 reward=null，不能宣稱這份工作已發布。已核對原公告任務：最後狀態確實為「已更正 V3.4.11、尚未部署」。本次將原 message ID 與完整內容保存在 [待發布稿](../content/mailbox-drafts/v3411-update-gift.json)，保留 main/gh-pages 已有六封公告；是否補發及正式發布仍單獨追蹤。

## 權限盤點

GitHub collaborators API 只回傳 `leotsouo`，角色 ADMIN；四個遠端分支 protected=false，rulesets 為空。CODEOWNERS 指向實際維護者，只提供審查路由；未啟用強制審查或改動權限。Validate workflow 的 token 只有 `contents: read`，沒有部署步驟。

回報 API 供使用者免登入寫入；D1 讀取/管理只經 Cloudflare 授權。Github 權限、Cloudflare 權限及文件責任分工互不等同。未讀取真實使用者回報、未把部署帳號或 token 寫入前端；部署 IDs 本身不是密鑰。既有後端的權限/部署驗收記錄見 [feedback.md](../docs/feedback.md)。

## 驗證

- `npm test`：169 tests、34 reveal-flow assertions 全數通過。
- 11 個涉及的 JS/MJS 檔案 `node --check` 通過。
- `npm run pools:validate`：0 errors/warnings；`npm run images:check`：72 隻 × 2 尺寸通過。
- 本機 Edge 390×844/1280×900：App 啟動、更多/設定入口、導覽 highlight、重新整理保留草稿、診斷 opt-in、回條遺失後重試僅存一筆、收件 ID、離線禁止送出、教學頁導覽、無水平溢出。0 uncaught page errors、0 外部請求、0 正式回報寫入。[瀏覽器結果](branch-consolidation/browser.json)、[手機截圖](branch-consolidation/feedback-mobile.png)、[桌面截圖](branch-consolidation/feedback-desktop.png)。
- 本機 `agent-browser` 未安裝，內建瀏覽器啟動失敗，改用 bundled Playwright 驅動本機 Edge。沒有據此宣稱通過實機 iPhone 或 installed-PWA 驗收。

## 發布狀態

本次整合來源，不發布 App/公告、不重新部署 Worker、不變更 Pages 設定。正式 App 仍為 V3.4.13，回報前端 V3.4.15 需要另外完成 artifact 發布。main 與 gh-pages 角色不同，不能為減少分支而合成同一條。

未刪除任何歷史分支或 worktree：其中四個舊 worktrees 與根目錄仍有未提交資料。以本報告停用其開發責任並保全原始工作；後續清理須先依實際檔案確認，而非只用 `git branch --merged`。
