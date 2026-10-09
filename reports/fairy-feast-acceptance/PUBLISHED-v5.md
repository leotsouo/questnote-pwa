# 霓霞仙膳 V3.9.5 已正式發布

正式網站：https://leotsouo.github.io/questnote-pwa/ 。使用者明確說「可以發布 V3.9.5 整合版」，核准 packageHash `def02180dcfa99d0ffc50ee6a2468148f469715731bec5472a93f69614c03f70`。授權與成功閘門保存於 `publication-consent-v5.json`、`release-review-v5-authorized.json`、`release-gate-v5-authorized.json`。

來源 PR #97（https://github.com/leotsouo/questnote-pwa/pull/97）經 CI 成功後合併，merge `2c1b95ada8d655020bbb15792baee432004950ee`；主線 CI 亦成功。來源 promotion `f3095fcbaf2f86643045241612b4e09b76bd6dfb` 同步核准 candidate 的四份 catalog、四份 companion 與 36 張初始角色資源，逐筆保留舊 catalog entries；固定 legacy compatibility snapshot 未改。覺醒與地區資源原已在來源。完整 npm test、內容與圖片檢查通過。

正式發布使用核准原 bytes，未從 promotion／merge 後來源重建：

- production artifact：`2235b544cd0e05856ee8bda232c79ef6f4361e2cc7128dae805c4e4512d07e31`
- manifest SHA256：`88e3db37adf4a3eb0dfb942067fbdb47e6e21dd285ed893aef6ef5480262cc97`
- reviewed source：`966c4c6848e1050484ba81f0d574d6299d438b2c`
- gh-pages：`c8ef5ab07d3a2de35078444e663338883662ace0`
- Pages 成功：https://github.com/leotsouo/questnote-pwa/actions/runs/37982103181

840 個部署 Git blobs 與 840 個正式 HTTPS 檔案（含 manifest）全部雜湊相符。首次一張舊縮圖 HTTP503，保留首輪報告並僅重試該檔，HTTP200 且雜湊相符，沒有忽略失敗。見 `deployment-v5.json`、`pages-run-v5.json`、`production-https-first-pass-v5.json`、`production-https-v5.json`。

12 隻靈獸、深淺各 6、2 UR；只有 2 SSR 與 2 UR 可覺醒。霓霞膳庭、材料與料理、20 抽解鎖／贈寵、晨昏雲廚與玻璃罩隨核准包發布。固定 preview 10 項動畫、11 項交易／料理／派遣／覺醒、HTTP503 快取重載通過。固定 production／preview 額外 19 項瀏覽器驗證全通過，涵蓋啟動、舊 worker transition、DB/cache 隔離、壞檔拒絕與離線流程；見 `artifact-browser-v5.json`。

網站產物更新不代表所有已開啟 App 已套用。實際既有正式 client 顯示 V3.8.5，正常更新提示需先關閉其他 QuestNote 視窗。未繞過保護、未關閉使用者分頁、未執行正式遊戲交易；本次額外正式驗證分頁已關閉。使用者可關閉其他 QuestNote 分頁後，在保留的 App 按更新。見 `formal-client-before-v5.json`。

尚待：既有 client 套用更新、實體手機驗證、Library prepared-upload 與三個 library_file_id。本次工具清單沒有 Library upload capability，不以本機檔案／artifact ID 冒充 Library ID。核准材料與源工作樹保留 hold。完整回執見 `publication-receipt-v5.json`。
