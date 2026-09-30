蜜光糖庭原本使用 `animationKey: none`，只播放通用稀有度演出。此變更新增糖晶溫室入場、一次性的糖果／奶霜抽卡前奏、海獺焦糖與天鵝奶霜雙 UR 出場，以及 SSR 暖金盛宴效果；使用既有已核准 PNG 和本地 CSS/SVG，沒有額外生成費用或音效。

演出仍只接收已提交結果，前奏略過接完整 SSR+ queue，保留十連順序與重複角色。補上焦點恢復、減少動態及有 base URL 預覽頁的缺圖回退。卡圖 bytes、抽卡經濟與所有舊已發布角色維持不變。

卡池流程現在要求企劃前核對最新正式部署與 reviewed source baseline，明確填寫動畫決策／分鏡，並在發布準備綁定實際動畫驗收與 source/candidate/artifact hashes。

驗證：209 個 Node 測試與 reveal-flow assertions；catalog 與 96×2 圖片驗證；Pipeline release rehearsal；動畫瀏覽器驗證14/14、完整產物12/12、實際V3.4.33→V3.4.34更新8/8。證據與截圖位於 `reports/honeylight-animation/`。

這是來源變更與本地發布準備。正式 `gh-pages` 未推送，等待使用者最後發布核准；舊無專屬動畫產物不可發布，工坊食物／探險區域規劃留到正式卡池發布後討論。
