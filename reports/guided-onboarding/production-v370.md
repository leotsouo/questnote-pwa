# V3.7.0 新手與成長教學正式發布

2026-10-04，使用者明確要求「把他送上正式版」。

- PR #72：https://github.com/leotsouo/questnote-pwa/pull/72，CI 通過，來源合併 621366f63f4887a49b77fc1284e11b840b1b9f82。
- PR #73：https://github.com/leotsouo/questnote-pwa/pull/73，啟動時序修正 CI 通過，來源合併 601edf244a8cdb057df0d508867ff6fd90496378。
- 固定 artifact 來源 23e3b4ca6a22b7562a1363c80047eb73f25a79c2，production artifact b0b22f41b2ff4407b3c21e77a72eaa53ad3936b6ff2fd28da97b19c757191868，manifest SHA256 bec523509deb2067221dd2837af8acb42d2fcc131bce6aed049e8295d3722f0b，scope /questnote-pwa/。
- Pages 提交 3dbba4025a549f2079a722327f3725f0a2309efb，[部署 run 37200384239](https://github.com/leotsouo/questnote-pwa/actions/runs/37200384239) 成功。
- 617 Git blobs 全部與固定產物相符；616 個可服務 HTTPS 檔案在 2026-10-04T12:00:05.416Z 全數雜湊與長度相符，.nojekyll 以 Git blob 驗證。production artifact 的 CRLF 原始 bytes 保留，因此 Git whitespace check 將 CRLF 標示為 trailing whitespace；沒有為消除警告改動已固定產物。
- 正式 App 正常從 V3.6.2 更新為 V3.7.0，Service Worker 已啟用，四章教學已實際可見；未清除網站資料或植入正式測試貨幣／任務。hosted-app-v370.json、production-growth-v370.png 為實際正式畫面證據。

首次使用者使用真實新增／完成控制練習一件小事，交易與獎勵原子化、可續接與再次練習。「帶著夥伴繼續成長」正式提供重逢與指定邀請、陪伴故事與同行約定、探險報告、工坊製作與送禮四章。接上目前正式相遇系統，不恢復舊升星控制；最新公告及 50 枚贈禮 reward identity 保留。

完整 Node 測試 327 + 14 + 12 與揭示斷言通過；核心教學隔離瀏覽器 21/21；成長章節六項實際操作檢查；固定 production/preview artifact 原生瀏覽器 18/18，包含舊 worker guard、離線、指定邀請、資源領取、工坊教學續接。原始失敗、修正原因與最後通過紀錄见 integration-v370.md 與相關 JSON/log；首次 HTTPS Node 因信任庫失敗，改用 --use-system-ca 後通過，未關閉 TLS 驗證。

發布前正式 artifact 0283c0bc6c4529211870c246f4f7a1d18563053de7adf06b537c46b85590a192；新舊 catalog hash 均 da32429aa6caf259c31f6fb8b613585144bb7ccfc653733cff583b099f03456d。既有卡池與內容完整保留。未部署 backend 或 HTTPS Preview。

實機 iPhone／VoiceOver、真人獨立操作仍未驗證。舊 PWA 使用正常更新 guard：保持連線，關閉其他 QuestNote 視窗後重新開啟或按「更新並重新載入」，不要清除資料。
