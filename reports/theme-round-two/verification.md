# 三套美術風格：第二輪驗證

2026-09-30，本機分支 `codex/three-theme-refinement`，來源提交 `1e8e4e987a40ffe377f306a5246b3edf81a5fb9d`，V3.4.26。這是完成設計與功能回歸的本機預覽，未合併 main、未發布網站、未部署後端。

## 完成範圍

- 仍只有 `default` / `sweet` / `twilight`，保留偏好與備份相容性；名稱為星夜遠行、晨光花園、暮光冒險手帳。
- 首頁、圖鑑、召喚優先完成；同一設計系統延伸到探險、更多、設定、習慣、成就、工坊、手冊、教學、分享與既有彈窗。
- 三張真正生成的灰影幼狼場景、六個品牌概念、固定的「同行星芽」主 App Icon、完整 PNG 尺寸與 maskable 圖示。
- 角色只在實際擁有／陪伴該角色時呈現；其他角色保留原圖，不以灰狼替代所有寵物。
- 完成／取消完成、獎勵已領取、進度、親密度、短角色反應沿用真實資料；任務獎勵、隊伍 1～3 隻規則、卡池內容與服務層未修改。

## 實際執行結果

| 檢查 | 結果／證據 |
|---|---|
| `npm test`，Node 24 | 177 既有測試 + 11 theme 測試 = **188 PASS / 0 FAIL**，另有原召喚邏輯 assertions 全通過；[輸出](node-tests.txt) |
| 變更 JS / MJS 語法 | 18 modules 通過 `node --check`；[輸出](syntax-checks.txt) |
| Typecheck | 不適用：這是原生 JavaScript 靜態 PWA，repository 沒有 TypeScript 或前端編譯步驟；沒有假報 TypeScript PASS |
| 卡池／圖片 | catalog validation 無錯誤與警告；72 寵物 × 2 圖片尺寸通過；[卡池](catalog-validation.txt)、[圖片](image-validation.txt) |
| pipeline release rehearsal | 真正組装 production / preview 的合成驗證 artifact，planner PASS；未發布；[輸出](pipeline-release-tests.txt) |
| 真實三套手機畫面 | **202 PASS / 0 FAIL**：393×852 與 320×693，12 個 view，無橫溢、底部導航、44px 主操作、首任務可見、長文字、reduced motion、圖片解碼、進度語意、偏好 reload；[輸出](world-browser-tests.txt) |
| 任務互動 | **68 PASS / 0 FAIL**：實際完成／取消／重複完成、首次星塵 +80 / 能量 +3 / 親密度 +20、編輯取消、子任務、tabs、空陪伴；再次完成不重複發獎；[輸出](task-interaction-tests.txt) |
| 最後捲動回歸 | **68 PASS / 0 FAIL**，最終 source reload 後重跑任務；已領獎測試存檔不被重設；[輸出](final-task-scroll-tests.txt) |
| 圖鑑互動 | **33 PASS / 0 FAIL**：角色詳情、原圖、關閉回焦點、更換及恢复陪伴；[輸出](collection-interaction-tests.txt) |
| 彈窗互動 | **81 PASS / 0 FAIL**：新增表單、取消刪除、巢狀原圖、信箱、派遣選隊及焦點／捲動；[輸出](dialog-interaction-tests.txt) |
| 原生瀏覽器鍵盤與比較 | ArrowDown 繞回星夜、End 到暮光且保留焦點；CURRENT 圖片解碼、同步、四主要頁及設定切換；[輸出](keyboard-comparison-checks.txt) |
| 本機 preview build | 真正組裝 **325 files**，content / import / cache / precache hash closure 驗證成功；[build](preview-build.txt)、[不可變 artifact 驗證](preview-artifact-verification.txt) |

任務文字實測對比 default **15.08**、sweet **10.79**、twilight **11.06**；導航文字為 **9.15 / 5.17 / 4.60**。Node theme 檢查也覆蓋 solid surfaces 上的文字、狀態及主要按鈕角色。這些數值不是所有插畫像素與所有 UI 狀態的全面自動 AA 認證。

第一次彈窗檢查使用舊隱藏 FAB、閉合選單及單選隊伍假設，產生測試失敗；改為實際新版可見入口、先開選單，並依原 1～3 隻隊伍規則驗證後，81 項全通過。沒有為配合測試修改遊戲規則。

## 截圖與資料邊界

[完整 gallery](gallery.html)；[首頁 Before / After](home-before-after.jpg)；[12 張 Before](before-matrix.jpg)；[12 張 After](after-matrix.jpg)；[可操作並排預覽截圖](interactive-comparison.jpg)。另保存 18 張次要頁、三套 320px 首頁、三套任務彈窗與品牌測試。

主要矩陣使用同一份隔離驗證存檔：真實 `pet_n01` 灰影幼狼、9/72 收藏、親密 Lv.1 / 0 EXP、0/2 完成、0 星塵、0 能量。兩件任務明確標示「UI 測試」，收益由原服務計算；沒有填入假 KPI 或假玩家數據。彈窗截圖在完成回歸之後保存，該測試存檔為 80 星塵／3 能量／20 EXP；不得把它當成主矩陣的初始存檔。

切换三套本身只寫風格偏好、不改 gameplay stores。瀏覽手冊等頁面仍沿用原本導覽事件，可能寫 onboarding meta；不聲稱所有導覽都完全不寫資料。測試只在具有專用 guard 的 localhost 新 origin 執行，拒絕未知 IndexedDB，不清正式存檔、不送回報到正式 API。

## Artifact 與發布邊界

- Artifact ID：`76a7b2997d75167abeef1a7374beb76a4d8746857c8bc55e5e7dffca1eb47b9f`
- Manifest SHA-256：`a87e117d65168ba8686fcb5c8fe97d04d605faa811df3c077faf741a0049daaf`
- Profile `preview`，scope `/questnote-pwa-preview/`，來源為上述 `1e8e4e9`。
- 本機組裝先遇到 OneDrive 目錄 rename 限制，改用 Windows Temp 產物目錄後成功，未改 assembler 的安全驗證規則。
- 此 preview 使用 source 72 寵物 baseline。正式站上次發布使用已核准的 84 寵物 candidate；未來發布必須再次讀取最新正式 baseline，帶入已核准內容 candidate，不能用這個設計測試 artifact 覆蓋正式內容。
- `releaseReady=false`；這不是正式部署或 iPhone PWA 升級驗收證據。

## 裝置與驗證限制

393×852 / 320×693 是桌面瀏覽器的手機 viewport。實際 iPhone safe-area、原生日期選擇／鍵盤／觸控、VoiceOver，以及正式 PWA 升級與離線重開仍需實機驗收。本機互動 harness 刻意阻止 Service Worker，避免污染測試 origin；上述 artifact 的快取清單及 hash closure 驗證不代替裝置離線測試。App Icon 手機畫面是明確標示的 mockup。

## 查看方式

本輪保留的 server：`http://127.0.0.1:49869/`。

- `/devtools/theme-worlds/index.html`：點「準備互動比較」；三套並排可操作，互動後可同步。四主要頁能切 CURRENT／UPGRADED；其他頁僅新版。
- `/reports/theme-round-two/gallery.html`：完整實際截圖矩陣。
- `/devtools/theme-worlds/brand.html`：六個概念、final icon、小尺寸、淺／深背景與手機主畫面 mockup。
- `/index.html`：完整 App；更多 → 美術風格 → 三選一，重開保留偏好。此本機 origin 的資料為隔離測試資料。

重新啟動：在此 worktree 執行 `node devtools/ui-polish-server.mjs 0`，使用它印出的新 port。測試資料初始化後不要在沒有相同 session marker 的新分頁強行重建；安全工具會拒絕未知資料。
