# V3.4.13 成長教學驗收

日期：2026-09-27（Asia/Taipei）

## 內容

保留首次使用的任務、召喚、陪伴與探險引導。在「更多 → 使用教學」新增升星、親密度、探險領獎、工坊製作送禮四章，每章三步。提示使用真實目錄、庫存、冷卻與上限；可只閱讀、暫停、續看或自願實作。

`onboardingV1` 以 schema 2 保存各章進度，保留舊版核心步驟。閱讀完成與實作完成分開記錄；僅成功的業務操作推進實作。教學不建立任務、不發獎、不代為消耗資源。升星增加明確的碎片花費確認。

## 驗收證據

- 全部 Node tests：154 通過，0 失敗。最後微調後再跑集中 onboarding tests：12 通過。
- 召喚邏輯：34 項斷言通過。全部變更 JavaScript 的 `node --check` 和 `git diff --check` 通過。
- 獨立 UUID 資料庫的 10 個瀏覽器案例全部通過：首次與跳過、無資源閱讀、暫停續看、升星花費與取消、撫摸冷卻、派遣與領獎、製作與贈送、喜好與每日上限、功能跳轉與版面、備份恢復與重置。
- 實作測試使用隔離的合成資源及測試推進時間，實際扣款、派遣、領獎、製作與贈送皆經產品服務和 DOM 控件。未修改正式用戶資料。
- 手動鍵盤 Enter/Tab、收起/展開、定位後焦點已檢查；390×844、320×640、1280×900 幾何檢查無橫向溢出，提示不覆蓋底部導覽。另目視檢查深色與甜美風格。
- 正式與預覽 immutable artifacts 均通過 SHA-256、清單、scope、資料庫與 worker 身分嚴格驗證。334 個發布檔案逐一對比 Git blob，位元組完全相同；信箱沿用原正式版內容。
- 12 個 assembled-artifact 瀏覽器案例全部通過，run ID `4702c902-53f6-4aed-ae28-6607f44d54ad`。包括混版拒絕、舊 worker 關閉所有 client 後安全更新、正式/預覽隔離、快取修復、全面 HTTP 503 下離線啟動，以及工坊教學離線重開續到製作步驟。
- UUID 測試資料庫及 artifact harness 自建的快取/資料庫已清理。

## 發布身分

- Source commit: `2a6290086e116747d4fd73582339213dbf757900`
- Pages commit: `179d4ca72df46509ff853a05616d255b617aa442`
- Production artifact: `50d28286fbd64c66ed3842d058b3d428bd21afff169bd2715aed18d7aa647acb`
- Production manifest SHA-256: `db82b85059b089a3d36b043595727a85a536b5d356c2dd3ec064b7cb0033dead`
- Local preview artifact: `41d2b623dc7a7f54f0a73aa50fad520c77e1914c99943f2e4ba7bf0a28f8fc84`（僅供本次隔離驗收，未更新線上 Preview）
- Content bundle SHA-256: `3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32`；維持 84 隻寵物、3 個召喚池。

## 範圍限制

此輪使用桌面 Chromium 真實瀏覽器與裝置尺寸模擬；未實測實體 iPhone 的 Safari/主畫面 App 或真實螢幕閱讀器。減少動態效果沿用既有系統偏好，定位捲動也尊重該偏好。原工作區所有既有未提交修改均保留；發佈使用當前正式 main 的隔離 clone，未夾帶其他工作。

## 線上部署確認

GitHub Pages [run 36260266663](https://github.com/leotsouo/questnote-pwa/actions/runs/36260266663) 已成功發布 `179d4ca72df46509ff853a05616d255b617aa442`。正式站 14 個必要檔案（含 manifest、index、教學模組、UI、樣式、worker、版本、信箱、完整目錄）的 HTTPS SHA-256 全部與本次產物相符。

線上瀏覽器完成關閉舊分頁再重開的安全更新，顯示 V3.4.13 與已啟用的 Service Worker。「更多 → 使用教學」顯示四個成長章節，舊使用者沒有首次歡迎彈窗。既有資源數值在更新前後保留。本次未更新獨立的線上 Preview 站。
