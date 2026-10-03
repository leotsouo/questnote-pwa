# V3.6.1 相遇碎片與指定邀請正式發布

2026-10-03，使用者明確要求「幫我推上正式版」。

- [PR #68](https://github.com/leotsouo/questnote-pwa/pull/68) CI 通過，合併來源 `e8e4315bb7898b87c2ca871156f66ebc33767d96`。artifact 來源為已整合最新主線的功能 HEAD `d0e71a3634f975e1c35795eec6c05ac885ec169a`。
- Pages `82f73e0a0f44f86a9c1ff47495e253e88559fc29` 的 [run 37127507820](https://github.com/leotsouo/questnote-pwa/actions/runs/37127507820) 成功。
- artifact `8f8d1662cfdc810a2dc96efadc6ee038e56852aecde1b66295c93ae3f3c0b74c`，manifest SHA256 `87c7efe543f675a7c76f9f3ce3e23618074b4aaec8092a2b6c2da3b5b7df3aba`。611 Git blob 相符；610 可服務 HTTPS 檔案於 2026-10-03T13:52:42Z 全部讀回相符。
- 發布前 artifact `c65c038a0a6ed9c2db0d6b043c2c2a649ec03a3a653ebe55b40fe74f775502be`，Pages `d2dba3c7b8f7f0823227af19d2cbe147dd975bcd`。新舊 catalog hash 均 `da32429aa6caf259c31f6fb8b613585144bb7ccfc653733cff583b099f03456d`；128角色、六卡池保留。
- npm test 310+14+12 次測試及揭示斷言通過。新 production/preview immutable 產物瀏覽器17/17通過，含舊 worker 保護、離線邀請、重播不扣款、同行與成長課程。
- 正式站完整 App 載入，召喚頁「指定邀請」可開啟「你想與誰同行？」角色畫面；未在正式存檔加入測試貨幣或提交邀請交易。

正式啟用取消升星、共用相遇碎片、SSR100/UR200指定邀請、原卡池角色登場及親密度養成。一次性原子遷移保留／補償舊星級與碎片，保留既有專長；保底、機率、故事門檻維持原規則。詳見 docs/encounter-fragments-design.md。

沒有後端或 HTTPS Preview 發布；本機示範入口不進正式產物。舊 PWA 視窗依正常更新 guard 關閉後重新線上開啟，不要清資料。實機 iPhone／VoiceOver 仍待裝置驗收。

本機證據位於 `C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/v361-release/`：artifact-browser-qa.json、live-verification.json、production-invitation.png。

磁碟不足時改以硬連結準備獨立發布目錄；Git 保留原始行尾並逐檔核對。未完成的 encounter-v361-pages 目錄保留，沒有清除舊草稿。
