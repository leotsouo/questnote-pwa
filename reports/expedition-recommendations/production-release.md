# 探險目標與專長推薦正式發布收據 — 2026-10-01

## 發布內容

QuestNote V3.4.40 已把探險組隊更新至正式站。派遣時先選探索、採集或羈絆目標，系統再推薦符合該目標專長、已擁有且可派遣的寵物；可一鍵帶入最多三隻，也能手動調整隊伍。未確認前不扣能量、不寫入旅程存檔。

## 來源與產物

- [PR #34](https://github.com/leotsouo/questnote-pwa/pull/34) 已合併；來源提交：`e31638dab2f49313d39f9af34fab79185cfaf3e6`。
- 正式產物 ID：`8c0d2bdc8c2314fd2f665ea877fe337211580800d4db1f864ea5000a320c8b24`。
- `manifest.json` SHA-256：`4d3c67839376d30b4cd8d471e92c66d0f2bbbdd7875c62b06abe1a44cd72d21d`。
- 410 個產物檔案逐一比對 gh-pages 暫存 Git blob，全部與不可變產物相符。
- gh-pages 提交：`964d9fa20ddc28fcb68207eee213534f0245bbd7`；[GitHub Pages 部署 run 36874334932](https://github.com/leotsouo/questnote-pwa/actions/runs/36874334932) 成功。

## 驗證

- 嚴格產物驗證通過；組裝產物瀏覽器驗收 12/12 通過，涵蓋既有 worker 更新、離線啟動、正式／預覽隔離與成長指引。
- 正式站 HTTPS 讀回 13 個檔案，全部符合發布 manifest 的 SHA-256，包含 `index.html`、Service Worker、版本資訊、派遣邏輯、主要 UI／樣式與卡池目錄。
- `data/global-mailbox.json` 的正式位元組維持原值，SHA-256 為 `49c06b7f0dc976bda2034ee5a9a50abb14d894baa0903a6821016798b6b9a1bd`；既有 7 封信件保留。
- 正式卡池仍有 96 隻寵物、4 個卡池；未更動既有存檔資料庫與部署路徑。

## 現有使用者更新

已有開啟中分頁或主畫面視窗的使用者，請先關閉所有 QuestNote 視窗，再保持連線重新開啟正式站，讓已驗證的 Service Worker 更新接手。不要清除網站資料或存檔。
