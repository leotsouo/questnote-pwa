# V3.9.1 黯冠最終覺醒互動 — 正式發布收據

使用者核准原文：「通過，推上正式版」。授權對應已檢視的「回答這個可怕的傢伙」互動；獨立工作樹只整合此功能，未帶入另一階段的夥伴照顧改動。

來源 [PR #89](https://github.com/leotsouo/questnote-pwa/pull/89) 合併於 `634fd1697c5152c95f39e5f60121bb2369fa935a`，CI [37803970104](https://github.com/leotsouo/questnote-pwa/actions/runs/37803970104) 通過。版本 V3.9.1；runtime source `90ada53051e31aae5eddece912e985c5d7b54862`。

正式 artifact `2859e1fac40801a11596e187e56f7f4b0f96567da4a4bfd918674ed22634e6a2`，manifest SHA256 `6e475ec25563c9e80a5dd7bddbcd0377c057cc075693760f2f09258b1a0d6410`。764 個 Git 檔案逐一確認原始 bytes。正式 gh-pages `d8ce527a93f7f457f01e248eeeb2d2f806eee7b6`，[Pages 37804253330](https://github.com/leotsouo/questnote-pwa/actions/runs/37804253330) 成功；[正式網址](https://leotsouo.github.io/questnote-pwa/)。HTTPS 逐檔結果見 `formal-https.json`（`.nojekyll` 為 Git marker，不以 HTTP 驗證）。

互動在回答前顯示「? ? ?」，按鈕「回答這個可怕的傢伙」。回答後先出現「哈、哈、哈……」，才揭示「惡魔的趣味」與無截止日、只能完成的今日系統任務。完成該任務才能進行最終覺醒，紫色特殊任務框保留；七位黯冠夥伴皆有交易與備份驗證。

驗證：完整 npm test（354 + 14 + 12 項，以及維護的流程斷言）、pools:validate、images:check 通過；隔離原生覺醒測試 3 組通過；固定 production/preview artifact 瀏覽器 18 項全過；V3.9.0 → V3.9.1 真實 SW 更新、舊存檔保留、快取替換與離線重播通過。正式 HTTPS fresh private Chrome 確認 V3.9.1 controller artifact 與離線重新載入，未使用使用者既有 IndexedDB，未送測試回報至正式後端。未做實體 iPhone 驗證。

首次固定 artifact 測試有兩項失敗：舊 harness 錯誤要求所有卡池都有 SR 保底，與其連帶的錢包初始化斷言。正式黯冠池原本沒有設定該欄位；修正驗證範圍為實際測試抽取的 standard pool，未改抽卡產品邏輯。初次失敗完整紀錄保留於 `artifact-browser-initial-failure.json`；修正後完整 18 項通過。保留正式 160 位角色、8 池與既有內容／公開信箱。

證據索引：`publication-consent.json`、`artifacts.json`、`formal-baseline.json`、`source-validation.json`、`artifact-browser.json`、`update-offline.json`、`deployment-staging.json`、`formal-https.json`、`formal-browser.json`。本地不可變產物與 ignored 檢查配方保留，工作樹 lifecycle Hold；未執行破壞性清理。
