# V3.8.0 最終正式發布收據

2026-10-04：使用者明確授權正式發布，要求先等待新手教學完成並拉取最新版。以 V3.7.0 最終主線 a46cf59 整合，不覆蓋舊根目錄草稿或教學 chat 工作區。

- Source：86af668460aeb15e69c6ebdea6f0edeab3c9a236。易讀整合 PR #75 的CI通過，main合併5b2695452173a9bda7dea987ace2fe8f3a5fc7b2；正式畫面複核的重複標籤修正 PR #76 CI通過，main合併eccc9f244800f114496aca0bc3e32ad1bc545b9e。
- Production artifact：8502e35740918ec4897d6d3646ae3303c689e129283e542c3ed66369a3ad0a96；manifest SHA256 ef56bbce49d9c2b7742f2ebb41b2fdef17b60461cc4b92504ea4eba48a2c4784；scope /questnote-pwa/，QuestNoteDB。
- Pages：fc8a1779df1a798bc3f143aaa8a1ea3c78a6d4a2；parent 774259f902c581171b6a8b0657a82506a72490dd；[最終Pages run37202724967](https://github.com/leotsouo/questnote-pwa/actions/runs/37202724967) 成功，正常快轉，沒有force push。
- [正式QuestNote](https://leotsouo.github.io/questnote-pwa/) 已上線V3.8.0，包含最新新手／四章成長教學與易讀模式。最終artifact保持原正式V3.7.0的catalog和公告內容，50枚贈禮identity保留；沒有更新後端或HTTPS preview。
- 619個Git blobs與固定artifact完全一致；HTTPS 617 runtime檔案加manifest共618項驗證通過，.nojekyll以Git blob驗證。最終固定production／preview產物嚴格驗證與18/18原生安裝、更新、離線、隔離、核心交易測試通過。
- 最終Node336+14+12與reveal assertions、Normal／Senior17組、guided21組、交叉guided3組通過。正式乾淨桌面context另驗證3.8.0、production artifact、QuestNoteDB、worker控制、可見單一標籤、模式保存及共有資料不變，詳live-browser.json。沒有植入合成貨幣／任務或修改既有使用者profile。

修復與Agent整合決策見integration.md；原始失敗、最後通過log及截圖均保留。最初正式產物173e026b…的發布收據留在production-release-initial.md；最終僅修正Senior作用域的重複pseudo label並同步build/cache，維持V3.8.0版本。第一次正式browser腳本點隱藏checkbox而timeout，改點使用者可見label後通過，沒有改動runtime來迎合測試。重複截图Git物件已有相同雜湊，使用既有blob完成staging，沒有變更全域權限或刪除證據。

實體iPhone、原生大文字與VoiceOver尚未驗收，不將桌面Chromium結果宣稱實機結果。主畫面PWA保持連線，關閉其他QuestNote視窗後重新開啟，或按「更新並重新載入」；不要清除網站資料。設定→易讀模式即可使用。
