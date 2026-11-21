# 信任帳本

## 2026-11-20 基準（首次盤點，commit 73d35f4，V3.17.1）

| 指標 | 數字 |
|---|---|
| 規範檔字元數 | CLAUDE.md 13,352 bytes（AGENTS.md 60，只指向它） |
| 規則條數（約） | 49：已被檢查涵蓋 8／可寫成檢查 12／需要判斷 29 |
| 逃生口 | eslint-disable 0、跳過的測試 0、TODO/FIXME 0、空 catch 1（`src/invitationPresentation.js:105`） |
| lint 警告（被容忍） | 23，全是 `no-unused-vars` |
| 未被檢查涵蓋的目錄 | `ios/`（只有 CI 編譯，無測試）、`index.html` 與 `src/styles/*.css`（無 lint，只有 source-level 測試）；全專案無型別檢查 |
| 靠記憶執行的檢查 | 5：`npm run check`（本機無 pre-commit）、`test:pool:release`、24 支 `*-browser-test.mjs`、e2e-flows／e2e-final-user、版本與 cache 名稱同步 |
| 已知失敗的檢查 | `npm run check` 內 0（lint 0 error、語法 148 檔、534 測試全過、catalog、圖片皆 exit 0）；之外 1 類：24 支 `*-browser-test.mjs` 預設跑不起來（`playwright` 不在 `package.json`，實跑 `today-habits-browser-test.mjs` 得 `ERR_MODULE_NOT_FOUND`，要靠 `PLAYWRIGHT_MODULE` 環境變數） |
| 檢查耗時 | lint 9s、語法 11s、測試 118s、catalog 2s、圖片 12s，合計約 2.5 分鐘 |
| CI 強制力 | `validate.yml` 在 `dev → main` PR 上跑同一組；`main` 無分支保護，CI 失敗仍可合併 |
| 修正類 commit | 2026-08-01 以來 644 個 commit 中約 52 個（8%）；revert 0 |
| 易誤用 API（src） | `innerHTML` 139、`setTimeout` 64、`requestAnimationFrame` 45、`addEventListener` 257 對 `removeEventListener` 21 |
| 最大檔案 | `src/healthCheckService.js` 3,994 行、`src/ui.js` 1,978 行、兩個樣式檔各 3,000+ 行 |

## 2026-11-21 第一輪加固後（V3.17.2）

| 指標 | 基準 | 現在 |
|---|---|---|
| 規範檔字元數 | 13,352 | 13,782（刪 4 條被檢查取代的規則，加 3 條新工具說明） |
| lint 警告 | 23（容忍） | 0，`--max-warnings 0`，`no-unused-vars` 為 error |
| 單元測試 | 534，手寫清單 | 544，glob 自動納入 |
| 靠記憶執行的檢查 | 5 | 2：`npm run verify:browser`、`test:pool:release` |
| 本機自動執行 | 無 | pre-commit（lint＋語法）、pre-push（`npm run check`） |
| 版本／cache 同步 | 文字提醒 | 測試＋PR 的 CI 步驟 |
| 瀏覽器測試 | 24 支跑不起來 | 25 支單一入口，14–25 分鐘（視機器負載）；最後一次全跑 23 過、2 失敗：暮光 safe-area（待使用者決定）與 bond-journey（撞到每支 5 分鐘上限，單獨跑 224 秒通過，上限已調為 10 分鐘，調整後尚未全跑驗證） |
| 已知失敗的檢查 | 1 類 | 1 支（同上，未設容忍清單） |
| 固定字元視窗 | 30 處（都在 healthCheckService） | 16 處未清；devtools 有測試擋 |
| 功能地圖 | 無 | `docs/feature-map.md`，測試保鮮，巡覽實走 17 個畫面 |

本輪 agent 的錯與被擋下的地方：worktree 從 `main` 而非 `dev` 開出（功能地圖漏了快速語音，新測試在合併時當場擋下）；3 次偶發的瀏覽器測試失敗。

等級：**1**（檢查自動執行，全過才推得出去）。升 2 的條件：最近 10 次任務沒有同類糾正重複出現。

---

（以下為首次盤點時的結論）目前等級：**0 → 接近 1**（有單一指令與 CI，但本機提交不會自動擋、CI 不擋合併）。目標：**完整（等級 3）**。
