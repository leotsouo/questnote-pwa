# 霓霞仙膳功能支援 checkpoint

本機來源候選 V3.9.3；正式網站仍為 V3.9.2。官方資料目錄尚未新增本池。

已增加受控 theme／前奏／入場／稀有登場路由，以及共用 SVG 座標的晨昏雲廚場景。入場、前奏與角色登場仍由 summonTiming.js 決定時長；沒有抽卡或獎勵寫入。新增資源列入 source precache。

四個預分配 SSR／UR ID 使用既有覺醒狀態與交易：pet_ssr41、pet_ssr42、pet_ur31、pet_ur32。正式 pipeline 初始化後必須核對實際 allocation 一致。既有 27 位覺醒角色資料保持原樣；新目錄擴充必須四位完整成組且具有靈獸／仙女圖，部分或錯誤稀有度拒絕。其餘八位沒有覺醒 profile。

新增膳庭探索故事、五個里程碑、花露材料名稱與探索發現。地區資料和配方由後續 ecosystem gate 交付。備份固定地區清單增加 aurora_feast_garden，使正規化後的舊存檔可完整匯出／匯入；没有重寫玩家資料或 schema。

驗證：130 個 targeted tests 全部通過，涵蓋新增功能、舊覺醒、原圖 hash、惡魔最後試煉、工坊、備份、經濟、pool contract、共用時間、地區解碼、source SW 靜態資源。所有改動 JavaScript 通過 node --check，git diff --check 通過。

初次 targeted run 發現備份 validator 尚未接受新增探索地區，已修正明確 allowlist 並重跑通過。另一圖片測試在 sandbox 遇 OneDrive realpath EPERM，於可正常解析路徑的執行環境重跑通過；沒有省略該測試。

尚待：實際全池卡图、正式 authoring gates、來源場景與固定 artifact 的瀏覽器實測、全套 npm test、正式地區圖／離線、最終人工整包驗收。這份單元回歸紀錄不代表動畫已經視覺驗收或可以發布。
