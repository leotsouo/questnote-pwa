# 信任設定（trust-harden 每次讀這頁）

盤點日：2026-11-20。專案規範 `CLAUDE.md` 優先於本檔。

## 技術與子專案

- 純靜態瀏覽器 PWA：原生 ES modules（`src/` 147 檔、約 38,750 行）、`service-worker.js`、`index.html`，無編譯、無型別。
- `backend/feedback/`、`backend/reminders/`：Cloudflare Worker（有 node 測試，不可擅自部署）。
- `ios/`：Capacitor 殼與 Widget（Swift），只在 GitHub Actions macOS 上編譯，本機無 Mac。
- 工具：`scripts/`、`devtools/`（185 個 `.mjs`）。Node 24，沒有 Python。

## 檢查指令

| 指令 | 涵蓋 | 耗時 | 執行方式 |
|---|---|---|---|
| `npm run lint` | `src`、`service-worker.js`、`devtools`、`scripts`、`backend`（no-undef 等，23 個 unused 警告） | 9s | CI；本機靠記憶 |
| `node devtools/syntax-check.mjs` | 148 個 runtime 檔 | 11s | CI；本機靠記憶 |
| `npm test` | 70 個測試檔、534 測試 + 揭示流程 | 118s | CI；本機靠記憶 |
| `npm run pools:validate` | catalog | 2s | CI；本機靠記憶 |
| `npm run images:check` | 寵物與地區圖片 | 12s | CI；本機靠記憶 |
| `npm run test:pool:release` | 卡池 pipeline／release | 未量 | 靠記憶 |
| `devtools/*-browser-test.mjs`（24 支） | 各畫面瀏覽器流程 | — | 靠記憶，且預設跑不起來（缺 `playwright`） |
| `e2e-flows`(8765)／`e2e-final-user`(8766) | 教學、任務、習慣、陪伴、備份 | 未量 | 靠記憶，需看得見的視窗 |
| `ios.yml` | iOS 編譯 | CI | 推 `dev` 且動到 `ios/**` 時自動 |

**全部檢查的單一指令：** `npm run check`（約 2.5 分鐘）。CI `validate.yml` 在 `dev → main` PR 跑同一組，但 `main` 沒有分支保護，失敗不擋合併；本機沒有 pre-commit／pre-push 掛鉤。

## agent 如何啟動與驗證

- `preview_start {name: "questnote"}`（`.claude/launch.json`，8000 埠；常被 GAIA 佔用，先確認）。測前清 Service Worker 與 Cache；隱藏的窗格會凍結 transition。
- 手機尺寸走流程 → 看 console 與設定頁「最近錯誤」→ 截圖放 `.dev-backups/evidence/`（不進 git）。
- 預覽站：推 `dev` 後 `npm run preview:deploy`。
- 沒有功能地圖（使用者用語 ↔ 模組／選擇器的對照）。

## 等級

- 目標：**完整（等級 3，只看證據就合併）**。
- 目前（2026-11-21）：**1**。pre-commit 跑 lint＋語法，pre-push 跑 `npm run check`（`.githooks/`，`npm ci` 自動啟用），lint 0 警告即失敗，`npm test` 用 glob。瀏覽器驗證單一入口是 `npm run verify:browser`（約 15 分鐘，靠記憶執行，證據在 `.dev-backups/evidence/<日期>/browser/summary.md`）；功能地圖在 `docs/feature-map.md`。上方指令表是首次盤點的狀態。
- `main` 不開分支保護（使用者決定；每日巡查會直接推 `main`）。
- 等級 3 之前不做外層自動化。

## 與本流程有關的專案限制

- 只在 `dev` 上 commit；不 force push、不改寫歷史、不建 worktree／功能分支；不直接推 `main`。
- 不改存檔格式、hash 鎖定檔、`data/global-mailbox.json`；不部署後端；不呼叫付費服務。
- 動 runtime 檔要同步 `src/version.js` 與 `service-worker.js` 的 `CACHE_NAME`／precache。
- 證據（截圖、錄影、HTML、log）只放 `.dev-backups/evidence/`；`reports/` 只放 markdown 摘要。
- 安裝任何會被 agent 載入的工具（含掛鉤工具）前先過 SkillSpector；一般 npm 依賴不必。
- 修 bug 先寫會失敗的測試，並加進 `package.json` 的 `test` 清單。
