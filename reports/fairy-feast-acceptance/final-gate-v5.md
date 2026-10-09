# 霓霞仙膳 V3.9.5 整合包：重新綁定發布授權

收到對 v4 整包的「可以發布」，保存於 `publication-consent-v4.json`。發布前 fetch 發現 main 與正式網站已更新至 V3.9.4：競賽演出、賭場入口及其排版修正已正式發布。基線 HTTPS manifest bytes 與遠端 gh-pages 相符，見 `baseline-v5.json`。不能用 v4 的較舊來源覆蓋此更新。

已在本任務隔離分支合併最新 main，處理測試清單、Service Worker precache 與版本衝突；版本為 V3.9.5、cache 為 `questnote-preview-cache-v395-fairy-feast`。來源提交 `966c4c6848e1050484ba81f0d574d6299d438b2c`。已核准的卡池 catalog、17 張美術與玻璃罩 CSS bytes 均保持；正式競賽、賭場 controller/UI/CSS Git blobs 保持 main，見 `integration-v5.json`。檢視頁版本改由 frozen artifact 的 APP_VERSION 讀取，避免固定舊版標示。

完整 npm test、pools:validate、images:check、test:pool:release 全部通過。起初沙盒阻止臨時 Git fixture 與 realpath 操作；保留失敗日誌，在正常授權環境重跑後通過。完整日誌在此工作樹 `.dev-backups/fairy-v5-validation/`。

確切 v5 preview 上重新執行 10 項動畫與 11 項交易檢查，全數通過：`animations-v5.json`、`transactions-v5.json`。包含四位 SSR／UR 覺醒、料理原子扣除、新地區材料與里程碑、二十抽解鎖及贈寵、雙 UR 保底和備份還原。實際 App 在隔離 HTTP503 失效後可從快取重開，霓霞膳庭 1600×900 圖片載入、派遣視窗正常；見 `offline-v5.json`。此為本機模擬失效，未宣稱真機或正式 HTTPS 更新已驗證。

兩份新不可變產物與候選內容完整雜湊核對通過。各 profile pins 見 `artifacts-v5.json`，整包與閘門見 `release-review-v5.json`、`release-gate-v5.json`。packageHash 為 `def02180dcfa99d0ffc50ee6a2468148f469715731bec5472a93f69614c03f70`。重複 TEMP/qff13 的 1680 個檔案逐檔與保護區副本 SHA256 相符後清除；保護區產物已登錄 hold。

依 SOP 第 180 行：來源／產物有實質修改，須驗收最新 packageHash。v4 授權不冒充 v5 授權；待使用者明確核准此 V3.9.5 整合包。尚未 push、建立 PR、合併遠端 main 或部署。核准後再執行這些發布步驟，並核對 Pages、正式 HTTPS 檔案與 Service Worker 更新。

新檢視頁：http://127.0.0.1:60695/review/ 。`glass-v5.png` 為此 frozen artifact 實際玻璃罩畫面。Library prepared-upload 與三個 library_file_id 尚未完成，不以本機 IDs 代替。
