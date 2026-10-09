# 霓霞仙膳整包工程驗收 — 2026-10-10

工程驗收完成；人工最終整包驗收與明確發布授權尚待取得。此前「通過繼續SOP」是卡图核准，不補寫成發布同意。沒有 push、合併、部署或正式玩家資料變更。

凍結 runtime source：`57f1db0bab7e405ca6ad7eefd453e1af6145330f`。候選 `2ccbb39bc330f69224010b6af9fd95df85fcabfd64e04ed46cd786f1285f4c03`。確切 preview／production pins 見 `artifacts-v2.json`；兩者內容與來源 bytes 相同，profile／scope 隔離。後續 commit 僅保存驗收工具與證據，不更改上述 runtime。

可操作動畫頁：http://127.0.0.1:56134/review/ 。新作晨昏雲廚地景；沿用正式抽卡、SSR／UR、覺醒控制器及共用時間。固定結果，不扣星塵、不寫收藏。伺服器停止後可用 `node devtools/fairy-feast-review-server.mjs reports/fairy-feast-acceptance/artifacts-v2.json` 重開，終端會列出新的網址。

## 實際檢查

- `transactions-modern-v2.json`：全新本機 origin、preview artifact 的真實 IndexedDB/API，11 組通過。料理製作及送禮、12 隻專長、初始／擴充解鎖、60分鐘5能量派遣及防重領、五個里程碑、兩次十連與20抽擴充贈寵、双UR保底、防並行重複扣款、四位SSR／UR完整新事件試煉及形態切換、備份重複還原。測試僅縮短派遣等待，並建立有效Lv.5故事前置。
- `animations-v2.json`：10 組完整／略過／重複／連點／減少動態／失敗圖片／中斷通過，演出前後交易狀態一致。完整入場含550ms離場約4000ms，單抽前奏3089ms；正常十連依實際六次稀有揭示依序展示。不能以十連總時長代替單張固定時長。
- App 實際操作：以 Enter 完成切池、原生UI單抽紫露星螢，星塵10450→10350、相遇碎片75→76，Escape關閉；圖片完整解碼、345.33×345.33、`object-fit: cover`。393px無橫向溢出。手機卡池、結果與派遣截圖附於本目錄。
- 修正稀有演出字色優先級，原始／甜夢／暮光皆為前景rgb(255,245,250)、背景rgb(70,55,88)、16px字級。393px頁面scrollWidth378；已修正64字hash造成的溢出。UR暮光手機截圖 `ur-twilight-mobile-v2.jpg`。
- 霓霞膳庭：實際地圖與派遣皆可操作；393px地圖插畫334×156、`object-fit: cover`、完整解碼；桌面裁切 `region-desktop-v2.jpg`。來源与圖片hash沿用已核准候選與製作紀錄。
- SW：全新本機preview origin實際安裝，測試伺服器啟用 `--network-test`，透過 `/network-fault/` 令所有artifact網路請求回傳503，再重新載入App。首頁、餘額10450／能量92、霓霞膳庭100%進度、地區插畫與派遣介面均正常；插畫在故障中解碼成功，見 `region-offline-v2.jpg`。已透過 `/network-restore/` 恢復。這是HTTP503故障注入，並非裝置飛航模式或正式HTTPS驗證。寵物圖片按需快取，未看過的寵物圖不保證離線已下載。

## 自動驗證及診斷

完整 `npm test`、`pools:validate`、`images:check`、`test:pool:release` 通過；完整日志留在此工作區 `.dev-backups/test-runs/fairy-validation-20261010` 與 `fairy-validation-20261010-recheck` 並登錄hold。app-update、release-artifact、preview-cache-recovery等更新協定測試亦在完整npm test內通過。CSS修正後8組相關卡池／時間測試通過。既有27個覺醒項目保持原值，19組覺醒測試通過。

第一次npm test暴露將覺醒寵物圖放入mandatory precache會違反既有按需快取規格；已撤除並全量重跑通過。首次動畫readonly驗收受到同origin另一App初始化寫入干擾；關閉該App後通過，診斷保留。首次完整App搭配舊式人工收藏fixture會與已轉換的相遇經濟標記衝突；已改用正式 `createCollectionEntry()` 在新origin重驗11組與App重新載入均通過，保留 `fixture-migration-diagnostic.json`。這些問題均未修改正式玩家存檔。

真機VoiceOver、原生字級、觸覺及效能尚待真機。正式HTTPS逐檔bytes與從舊正式版本更新需在取得發布同意後驗證，不以本機工程結果代簽。Library項目未建立，不補造library_file_id。
