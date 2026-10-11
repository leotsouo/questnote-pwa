# 首頁新增任務文字溢出修正

來源基準：`origin/main` `59fb831b8aac12357bb5ec52dea15f4c65f5a21e`（V3.9.10），已用遠端 main ref 核對。修正分支 `codex/fix-add-task-overflow`，來源版本更新為 V3.9.11。後續已經PR #105整合並發布至正式站，詳見[正式發布收據](add-task-layout-production-2026-10-11.md)；以下保留修正階段的重現與驗證紀錄。

## 重現與原因

在隔離的原生 IndexedDB 測試首頁，以 430 × 637、繁體中文、一般模式、標準字體略過首次教學，首頁標題旁 `.twilight-add-task` 即重現。這個入口在三種主題都有使用。

教學完成／略過後會透過 `::after` 加上「新增任務」，但 `font-size-settings.css` 的共用圖示規則以及 `theme-system.css` 的固定圖示按鈕規則優先序較高，覆蓋 `guided-onboarding.css` 的横向 flex、字級與自動高度。實測 display=grid、font-size=25px、按鈕高度48px、scrollHeight=66px；圖示與文字分成上下兩列並伸出下緣。

修正只提高帶文字入口規則的優先序，並指定1.5行高；恢復圖示和文字並排，高度依內容調整。一般模式實測118 × 48、16px字體、24px行高、scrollHeight=48px。易讀模式原本的較大字體與留白仍生效。未加入文字裁切或 overflow:hidden。

## 驗證

- 新增 `devtools/add-task-layout-browser-test.mjs`，使用現有 synthetic-only server、獨立測試DB、阻擋所有外部請求與SW，未寫入正式站或送出回報。
- 相同測試在修正前因48px按鈕／66px內容而失敗，修正後通過146組：145組可操作首頁排版與點擊檢查，另1組教學進行中排版檢查（教學鎖定的非目標入口不點擊）。
- 組合含空／非空任務、三種主題、一般／易讀模式、320／430／1280px、標準／大／特大，以及根字體32px的200%壓力測試。檢查可見新增入口的水平／垂直內容範圍、視窗範圍，以及點擊後開啟任務表單。
- `npm test` 通過：12個 focused checks、395 + 14 + 12個 Node tests、全部 reveal-flow logic assertions；無失敗。
- 修改的JS語法檢查、`git diff --check`通過。離線closure測試確認版本／快取一致；已有的guided-onboarding.css預快取項目沿用。
- 已目視檢查一般／易讀按鈕截圖。畫面與computed geometry證據存於本機忽略目錄 `.dev-backups/test-runs/add-task-layout-20261011/`，透過專案producer登錄。

執行瀏覽器測試：提供 `QUESTNOTE_PLAYWRIGHT_PACKAGE`（Playwright package路徑；預設playwright）後執行 `node devtools/add-task-layout-browser-test.mjs`。若需保存截圖與JSON，設定 `QUESTNOTE_ADD_TASK_REPORT_DIR`並使用專案worktree-artifact producer。可用 `QUESTNOTE_BROWSER_ENGINE`切換已安裝的引擎；本輪使用Chromium/Chrome。

## 限制與下一步

本輪未使用iPhone實機或iOS Safari/WebKit；本機没有可用WebKit執行檔。根字體200%測試不等同iOS系統文字設定或Safari pinch zoom。沒有宣稱完成正式PWA、standalone或SW控制中的實機驗收；發布前仍應在iPhone PWA補測430 × 637與實際文字設定。現有修正與回歸測試已可獨立審查和回退。
