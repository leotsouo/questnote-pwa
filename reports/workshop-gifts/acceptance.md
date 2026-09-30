# 工坊主題禮物驗收 — 2026-10-01

來源：`codex/workshop-gift-affinities`，從最新 `origin/main` 的 `d73aa36` 開始；版本 V3.4.33。僅完成來源實作，未部署預覽或正式站。

## 已通過

- `npm test`：202 個主要 Node 測試、11 個主題測試與 summon 邏輯斷言全部通過。後續新增的完整來源 Worker 斷網快取檢查亦通過；`node --test devtools/workshop-gifts.test.mjs` 最終 11/11 通過。
- JS 語法檢查、`npm run pools:validate`（無錯誤／警告）、`npm run images:check`（72 角色 ×2 尺寸）、`npm run test:pool:release`（隔離 production／preview artifact 演練）通過。
- [browser-results.json](browser-results.json)：11/11 原生 IndexedDB 與實際工坊 UI 檢查通過。只使用 `QuestNoteTest-Onboarding-*` 的伺服器隨機測試資料庫，不開啟使用者 DB，也不送出正式 feedback。
- 涵蓋先選禮物、切換禮物清除收禮者、火系 +150／非喜好犬型 +75、實際配方扣料、喜好名單為空、通用蜜糖 +100、每日 5 份、最高等級、快速連點與服務並行呼叫，以及最後一份成功訊息保留。
- 三種主題在 393px、320px 的工坊內容均無橫向溢出。另以瀏覽器實際點擊「確認贈送 1 份」，看到火光肉乾 ×2 → ×1、赤焰獅崽 Lv.1 → Lv.3、今日收禮 0/5 → 1/5。
- [mobile-preview.png](mobile-preview.png)：隔離資料的推薦／確認畫面。
- Node 執行實際 `service-worker.js` 的 install/fetch handler，預快取完整真實來源檔案後切斷網路，新增禮物模組、設定與配方仍以相同位元組從快取回傳，首頁 navigation 也成功；不是僅檢查清單字串。

## 尚未驗證

[native-offline-result.json](native-offline-result.json) 記錄內建瀏覽器的原生 Worker 註冊／啟用逾時。109 個 App 預快取 URL 的本機 HTTP 讀取均成功，但原生 Worker 未完成啟用，因此本輪沒有宣稱原生瀏覽器離線重載通過。

重現：`node devtools/onboarding-browser-server.mjs 0 --workshop-offline`，以全新 origin 開啟 `/devtools/workshop-offline-test.html`。此測試有 30 秒註冊／啟用上限；啟用成功後會將 App 檔案回應切成 503，再測試快取重載與送禮。

桌面窄視窗驗收亦不代表 iPhone 實機的觸控／safe-area 已驗證。
