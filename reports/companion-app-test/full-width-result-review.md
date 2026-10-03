# V3.5.18：結果插畫與整張卡片齊邊

2026-10-03，本機完整 App 記憶體試演；前一提交 `a1c9bdc`，分支 `codex/companion-app-art-test`。新版連結：http://127.0.0.1:4193/?review=v3518。

使用者回報風眼誓鴉十連結果仍有側邊白條。V3.5.17 只移除圖片高度上限、保持 440px 正方形小圖，沒有完成「整張結果卡片滿版」。本次移除圖片 440px 上限及結果容器左右 20px padding，改為 100% 寬的正方形 `.reveal-art`；圖片絕對定位填滿框內寬高、object-fit cover，移除圖片框線、圓角與陰影。文字、招呼及按鈕各自保留正常內距。現有正方形插畫仍保留完整構圖，較矮視窗自然捲動。

試演 bootstrap 顯示實際 `APP_VERSION`，頁籤標題及工具列標示 V3.5.18，CSS 與身份展示模組 URL 使用相同版本參數。既有開啟頁面不會因伺服器檔案更新而自動重建，需辨識實際載入版本。舊頁籤的瀏覽器控制曾逾時，沒有宣稱它已刷新；本次交付為已驗證的 V3.5.18 頁面。

## 實際驗證

原始尺寸見 [QA JSON](full-width-browser-qa.json)。使用既有角色及固定展示結果，沒有新增正式存檔欄位、API 或美術資源。

- **確切回報路徑**：霜誓峽灣／晨光花園／正常固定十連，風眼誓鴉，角色揭露 1 / 4。完整抽卡及登場後的真實結果，非手動注入 DOM。
- 桌機結果容器、圖片框及圖片寬高均為 683.33px。三者左座標 283px、右座標 966.33px；兩側間距 0。原圖解碼為 960 × 960，border 0，object-fit cover。
- 393 × 852、晨光花園：圖片與容器均寬 360.67px，圖片高 360.67px；左右間距 0。dialog clientWidth 與 scrollWidth 同為 361px。
- 320 × 852、200% 字級：三套 Theme 的圖片與容器均為 272 × 272px；左右間距 0。dialog clientWidth 與 scrollWidth 同為 272px。手機排版使用同一角色的減少動態單次結果，與十連逐張共用結果模板。
- 桌機保留正常動畫，手機測試使用減少動態。圖片新增容器不改動既有角色、台詞、碎片、結果順序、下一位計時器或卡池切換時間。
- 手機 QA 頁無 console warning／error，關閉結果及再次開啟可操作。

## 檢查與交付

`npm test` 303 項及 reveal-flow 斷言通過；記憶體展示相關 18 項通過。修改 JavaScript 的 `node --check` 及 `git diff --check` 通過。版本及 cache 同步至 V3.5.18；本機試演不註冊 service worker。本次只保存本機來源，不合併、推送或發布。

已更新 `docs/new-card-pool-sop.md`：不能以正方形小圖冒充結果卡片滿版，須量測圖片與結果容器左右邊緣一致，驗證確切回報角色／Theme／流程並標示版本。工程通過，人工最終體驗仍待使用者確認；iPhone VoiceOver、原生字級及觸覺仍為實機待驗。

截圖：[使用者回報](screenshots/full-width-crow-before.png)、[正常十連桌機](screenshots/full-width-crow-ten-desktop.png)、[393px 滿版結果](screenshots/full-width-crow-393.png)、[320px／200%](screenshots/full-width-crow-320-200.png)。前後對照：http://127.0.0.1:4193/reports/companion-app-test/ceremony.html。
