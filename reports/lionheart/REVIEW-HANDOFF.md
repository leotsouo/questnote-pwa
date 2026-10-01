# 獅心城・逆造之誓：人工審圖交付

目前停在 SOP 2 的人工 images gate。brief、plan、content、prompts 已由 Codex 以真實 AI reviewer 逐階段記錄 exact hash；卡圖尚未人工核准，沒有本池 candidate、preview／production artifact、合併或正式推送。

## 可操作檢視

- 卡圖：http://127.0.0.1:51373/art/ 。12 隻、完整／160px 切換、Lore／對話、四章羈絆、故事設計、自查與修訂前版。
- 動畫：http://127.0.0.1:51373/animation/ 。實際工作區模組／样式／卡圖，完整入場、短轉場、單抽、含重複雙 UR 的十連、個別 UR／SSR、減少動態、略過／繼續／重播。這是製作檢視，不是最終整包驗收。
- 重新啟動：在此工作區執行 `node devtools/lionheart-review-server.mjs`，使用它回傳的新本機 URL。伺服器只接受 loopback GET，來源目錄不寫入正式資料；伴隨的檢查頁僅使用該隨機 origin 的隔離 IndexedDB。

## 完成內容

12 張卡圖與 21 次生成／定向修訂原圖已保存。格里芬完整純生物、沒有任何裝備或實體冠冕；奇美拉單一活體獅首、血肉與人工結構並存。故事與羈絆保持兩者敵意；無光／暗系角色。

全部 12 隻有明確既有派遣專長、偏好及理由、完整 Lore／對話，另有 48 章羈絆故事。舊 116 份故事透過可選補充欄位保持原樣。新食物使用既有三種材料；獅心城含派遣、一般歸程、額外發現與五段完整里程碑。里程碑請領改為獎勵與領取記錄同交易，避免重複發放。

專屬演出使用本地 SVG／CSS 與卡圖，雙 UR、兩 SSR 分開揭示；固定展示不呼叫抽卡、扣款、收藏或保底 API。手機尺寸及完整／160px 卡圖已實際檢視。高品質 PNG 原圖保留；核准後由既有組裝工具製作正式尺寸資源。

## 費用查核

使用者要求由 AI 查核插件費用，費用未知或需額外付款即不使用。官方 [Codex image generation 文件](https://learn.chatgpt.com/docs/image-generation) 說明內建生成計入一般 Codex 使用額度；查核時帳號 included usage 可用、沒有已購點數。本次只呼叫內建 `image_gen.imagegen`，沒有購買點數、增加訂閱、啟用付費 API 或第三方產圖插件。逐次實際提示詞、參考、檔案 SHA-256、尺寸與費用依據見 `content/pet-series/lionheart_inverse_oath/generation-records.json`；工具沒有回傳 model／seed，據實記 null。

## 實際驗證

`engineering-checks.json`、各 `*-final.log` 記錄 JS 語法檢查、完整 `npm test`、正式舊目錄驗證、圖片檢查、本池草稿驗證及發布流程 smoke 全部成功。release smoke 是 synthetic rehearsal，不代表本池 releaseReady。

`browser-check.json` 記錄實際服務驗證：12 隻專長、116 舊＋12 新羈絆故事、製作與送禮（奇美拉 +150／格里芬 +75）、三隻派遣／領取拒絕重複、10 次並發只發 5 次里程碑（星塵 480／齒輪 5／徽章與稱號）。`animation-check.json` 保存十連真實展示順序及六次稀有揭示；兩次重複 UR 均保留。這些是本機製作證據，最終 artifact 的存檔／Service Worker／完整瀏覽器驗收仍須在人工審圖後執行。

## 接續 SOP

1. 使用者核准目前卡圖或指定修訂；對應目前 images hash `c773a85f40b2ac2de4022ea6be79bf61eea2ef5b3ea29c3d0a8a6b27bf5957cf`。未收到人工核准前，不記錄 human approval。
2. 卡圖核准後建立不可變 candidate，組裝隔離 preview／production，重新驗證整包並開啟使用 pinned artifact 的動畫檢視頁。
3. 人工最終整包驗收與綁定最新 packageHash 的明確「可以發布」後，才合併來源、推送產物、核對正式 HTTPS。

必要補充支援完成前的第一份 authoring workspace 已完整保存在 `content/pet-series/_lionheart_before_bond_baseline_20261002/`，不改寫舊 baseline／receipts／原圖。現在的新工作區 baseline 為 `d3be04bd6d4100aee4ce216ef178686664b3240a79d11a344282fb213991d4ce`。根 checkout 的歷史草稿未改動。
