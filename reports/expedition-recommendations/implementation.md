# 探險目標與專長推薦 — 2026-10-01

來源起點：`origin/main` 的 `71b57cd247feb7406c17c20461c72c9fe94a8c23`。功能分支：`codex/expedition-specialty-recommendations`。版本與 SW cache 同步為 V3.4.40；僅本機 source，尚未合併、推送或部署。

派遣流程先選探索／採集／羈絆目標，再選寵物。推薦與實際收益共用目標對應：探路增加探索進度、採集增加材料、同行增加隊伍親密度。推薦只包含已擁有且可派遣的符合專長夥伴，專長等級優先，再以陪伴、稀有度、親密度與 ID 排序。按「一鍵帶入推薦隊伍」帶入最多三隻，可手動換寵。沒有符合專長時明示原因並停用推薦按鈕，其他夥伴仍可手動出發。切換目標保留現有隊伍，直到使用者再次帶入推薦。

選目標、帶入推薦與手動調整均不寫入存檔、不消耗能量；按確認後才由既有交易服務建立旅程。初次開啟不預選陪伴寵物。教學文字已同步更新。

驗證：

- Node.js v24.18.0；`npm ci` 成功。
- `npm test` 通過：218 個整合測試、11 個主題測試、5 個蜜光動畫測試與全部 reveal-flow assertions。紀錄在 `../expedition-recommendations-regression.log`。
- 新增推薦邏輯檢查覆蓋三種目標的實際收益、專長优先於不符合目標的高星陪伴寵物、排除未擁有／忙碌寵物、最多三隻、穩定排序、空名單及輸入資料不變。
- 所有修改的 JS、SW 及瀏覽器腳本語法檢查通過；`git diff --check` 通過。
- `devtools/expedition-recommendations-browser-test.mjs` 使用 `onboarding-browser-server.mjs` 提供的隔離資料庫。三種目標、一鍵帶入、手動選擇其他專長、換寵與上限、切換目標保留選擇、焦點恢復、確認前無資料寫入、確認後扣除首次旅程 1 點能量與忙碌寵物排除皆通過。
- Edge 無頭瀏覽器：320、393、1440px × default／sweet／twilight × 根字體 16／24px，共 18 組無 modal 橫向溢出。截圖與 `browser-results.json` 在本目錄。這些是桌面瀏覽器版面檢查，尚未做 iPhone／Android 實機驗收。

重跑瀏覽器檢查：先啟動 `node devtools/onboarding-browser-server.mjs 0`，再以 `PLAYWRIGHT_MODULE` 指向可用 Playwright module，執行 `node devtools/expedition-recommendations-browser-test.mjs <server-origin>`。
