# 系統公告與50枚相遇碎片 — V3.6.2

2026-10-03：使用者要求發一封系統公告並贈送使用者50碎片。公告標題「新的相遇，由你決定｜贈送 50 枚相遇碎片」，ID `2026-10-v362-encounter-fragments-gift-01`。每份本機資料領取一次、期限2026-11-03 23:59:59+08:00、最低V3.6.2；沒有跨帳號或跨裝置防重領承諾。保留原有11封信件及獎勵identity。

原V3.6.1信箱白名單未支援共用相遇碎片，故先增加 `encounterFragments` 獎勵類型，並將餘額、wallet、inventory和claimedIds放在同一META交易。拒絕無效數量、每封超過500、未完成遷移或餘額溢位；失敗不標記已領、可重試。獎勵預覽、单項領取狀態及一鍵領取摘要均顯示相遇碎片。發布工具拒絕最低版本小於3.6.2的碎片信。

- [PR #70](https://github.com/leotsouo/questnote-pwa/pull/70) CI通過，合併 `382dab5085ab61d2abc9e1953b1a6eadcb5d98a9`；artifact來源 `2846fc3825d75c06160186a731d009382bc5e0c2`。
- 正式artifact `0283c0bc6c4529211870c246f4f7a1d18563053de7adf06b537c46b85590a192`；manifest SHA256 `8d1ec777f25474a2fd56fc5c01765c6d540758bd28131a19caeece1bd2be44d8`，611個暫存Git blob與產物完全相符。
- Pages `46f857d7ca4cdb88db1736f2d4c993b69aa39fc9`，[run37128990874](https://github.com/leotsouo/questnote-pwa/actions/runs/37128990874)成功。正式HTTPS公告JSON與產物位元相同，hash `af88d34f8cf15d722ed5f3a682851fc8cd3542a5a18b50c7a819de200c629c8b`；獨立核對50枚附件、版本與到期時間。
- npm test 315+14+12共341次及揭示斷言通過，含5项碎片郵件測試。固定production/preview瀏覽器18/18通過；原生IndexedDB失敗回滾、50枚入帳、重開不重領通過。
- 真實App隔離示範UI：信件預覽「相遇碎片 ×50」，手動領取後242→292、星塵2450維持原值、領取按鈕消失、狀態已領取，前往召喚時立即顯示292。
- 正式610個HTTPS資源全部與固定產物相符，完成於2026-10-03T14:19:42Z；data/titles.json首次暫時連線失敗，單檔重試後hash相符。

既有正式瀏覽器正常更新按鈕受到另一個QuestNote視窗阻擋；未清資料、未強制啟用或代替使用者領取正式獎勵。需要關閉其他QuestNote分頁後更新至3.6.2，再刷新信箱。沒有後端或HTTPSPreview部署；同一正式產物同步包含信件，未建立虛假「已發放」紀錄。

本機公開證據位於 `C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/v362-release/`：artifact-browser-qa.json、mailbox-live.json、live-verification.json、local-gift-balance.png、gift-mail-preview.png。catalog沿用V3.6.1同一hash與128角色／六卡池。
