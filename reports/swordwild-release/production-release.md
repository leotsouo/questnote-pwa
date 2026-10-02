# 劍隱山河 V3.5.3 正式發布完成

2026-10-02（台灣時間）。使用者對整包回覆「整包驗收通過，可以發布」後，門檻檢查通過，合併來源並部署同一份已驗收的不可變產物。

- [正式 App](https://leotsouo.github.io/questnote-pwa/)；[來源 PR #42](https://github.com/leotsouo/questnote-pwa/pull/42)，合併提交 `ed81995648ba9b60c27207ba1ab3148afa6b2688`。
- [正式 Pages 部署](https://github.com/leotsouo/questnote-pwa/actions/runs/36920817976)成功；提交 `4a1808126b9f6805ddb11c7b16ce1a1d8225ebf8`。主線 CI 成功。
- artifact：`5a3ea973a884ae5dcc14c0ffd062963831724de3caa87e284ab37d9a766fd2f8`。manifest SHA-256：`07c63616a676c43edc06078e087c3cb8bcb01aa1024655f6fdf32fce22c3bfad`。
- 整包識別：`8dd5cbdce1e6ff6478a2f865a9e5f7dcde19ef1a1024ad20a4cc0b279c1ae12e`；[人工驗收](release-review.json)及[發布門檻](release-gate.json)保留原綁定。文件補記沒有重建或替換產物。
- 488 個正式產物 Git 檔案核對；177 個正式 HTTPS 檔案（含 manifest、動畫模組、20 張圖）雜湊相符。
- [正式瀏覽器驗證](production-https-browser.json)：3.5.3、QuestNoteDB、20 張卡圖、3 UR、80 章、新食物與古道、預設原卡池、離線重開均通過。
- [舊版更新驗證](production-update.json)：在隔離瀏覽器先載入雜湊核對的 V3.5.2 fixture，再按原生更新按鈕接收正式 HTTPS V3.5.3；存檔 probe 保留、116 角色、新版快取啟用、舊版 App 快取淘汰、離線重開通過。測試先前過早讀取重新載入中的頁面，修正等待真正主框架導航後通過；正式程式沒有因此更動。

發布內容包含二十位角色、單一「俠」印的本池專屬入場與抽卡動畫、松香行旅糰、逐隻偏好及派遣專長、雲棧古道與親密度故事。原有卡池、親密度旅程、派遣推薦及公告均保留。

一般更新請在 App 按「更新並重新載入」；若提示其他 QuestNote 視窗仍開著，先關閉其他 App 分頁再更新。不要清除網站資料。桌面 Chromium 驗證不代表 iPhone 實機驗收。

覺醒另以獨立討論草案整理；現行第三版卡圖仍為正式卡圖，未加入覺醒功能。
