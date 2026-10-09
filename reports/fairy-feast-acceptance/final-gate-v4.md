# 霓霞仙膳：玻璃罩核准與最終發布閘門

使用者在本對話以「通過」核准 v4 玻璃罩視覺。實際核准範圍與產物 pin 見 `human-visual-approval-v4.json`；未將此語句擴大解讀為正式發布授權。

待驗收整包包含 12 隻靈獸（深淺各 6、兩張 UR）、4 隻 SSR／UR 仙女覺醒、新探險地區霓霞膳庭、材料與料理、20 抽特殊解鎖及贈寵、晨昏雲廚演出和核准的玻璃罩揭示。

本次 v4 的 10 項動畫檢查全部通過，交易狀態皆未改動，見 `animations-v4.json`。桌面與手機尺寸的玻璃罩檢視見 `glass-v4.md`。相對 v2，發布來源只有 `src/aurora-fairy-feast.css` 改動；JavaScript、Service Worker 來源、內容包與美術資源均相同，見 `evidence-reuse-v4.json`。因此沿用已通過的 v2 交易、料理、專長、探險及本機 HTTP503 快取復原證據，不宣稱重測了這些流程。

兩份 v4 發布包的完整檔案雜湊與候選內容核對通過，見 `release-gate-v4.json`。整包 packageHash：`a8e43a6b500a343b6b1ad27a9cfc3e65ef6c70a3e1e2877c2ba9fa6f047c8dbd`。確切整包與所有檢查來源見 `release-review-v4.json`。

尚待人工最終整包驗收及明確「可以發布」。依 `docs/new-card-pool-sop.md` 的發布閘門，同一次使用者對此確切整包說「可以發布」可同時記錄驗收與授權。尚未推送、合併或部署。正式 HTTPS、真機與正式 Service Worker 更新驗證須在發布階段執行。Library 上傳及三個 library_file_id 仍未完成，不以本機檔案或雜湊冒充 Library ID。

可操作檢視頁：http://127.0.0.1:55125/review/ 。
