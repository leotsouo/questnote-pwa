# 工坊主題禮物與推薦

V3.4.33 來源改動。正式部署另走既有 immutable artifact 發布流程。

## 資料與內容維護

- `data/gift-affinities.json`：`schemaVersion: 1`，`giftAffinityTags` 以角色 ID 對應喜好標籤陣列。空陣列表示暫無主題喜好；新角色尚未設定時也只得到基本效果。
- 六種標籤：`nature` 自然、`fire` 火系、`machine` 機械、`astral` 星界、`frost` 冰霜、`harvest` 田園。設定可複選，不取決於暱稱、描述、物種或卡池。
- 初始設定依 Lore 的木／火／機械／星／冰屬性建立，搭配伊芙星靈、北海霸主、稻穗守望者、豆芽鹿、碗糕貓的明確例外。執行時只讀設定，不再猜測關鍵字。
- `data/craftables.json`：主題禮物使用 `favorite_bond_item` 與 `favoriteTags`。`effect.bondExp` 為基本效果，`favoriteBonusBondExp` 為命中喜好時的**總增加量**，多標籤命中不疊加。
- 新增嫩葉靈糰（嫩葉 8）、星晶酥（星界碎片 1、嫩葉 6）、極光冰酪（冰晶 3、嫩葉 2）、豐穗米餅（護符 3、嫩葉 2），基本 +75／喜好總計 +150。既有六種禮物的 ID、配方與效果保留。
- 星界蜜糖仍為 +100 通用禮物。火光肉乾移除犬型／名字關鍵字自動加成；非火系喜好的犬型夥伴取得基本 +75。
- 新角色進入來源目錄時，請同步加入喜好設定（可為空陣列），執行 `node --test devtools/workshop-gifts.test.mjs`。不得直接修改凍結角色快照或歷史發布目錄。

## 行為與介面

`loadGiftAffinities()` 在工坊初始化載入設定，送出時也會確認載入成功。`getGiftAffinityTags(pet)` 供角色詳情使用；`getFavoriteBonus(item, pet)` 統一回傳 `isFavorite`、`bondExp`、`matchedTags` 與 `reason`，供餵食、陪伴提示、預覽與實際送禮共用。

`getGiftRecommendations(item, pets, inventory, date)` 只列出 `owned` 角色，分成 `recommended` 與 `others`。排序先看每日上限，再看是否最高等級、親密度等級、累積經驗與 ID；每日上限者停用並置底。通用禮物列所有已擁有角色，不宣稱喜好推薦。

工坊依序選禮物、選夥伴、確認贈送 1 份，不預選收禮者。切換禮物清除對象；最後一份消耗後返回選禮物，成功訊息保留。每日每隻最多 5 份。Lv.5 可繼續收禮，畫面提醒仍會消耗禮物。

## 驗證方式

- `npm test` 包含工坊單元檢查；另執行 JS 語法、`npm run pools:validate`、`npm run images:check` 及 `npm run test:pool:release`。
- 手機與實際 IndexedDB：啟動 `node devtools/onboarding-browser-server.mjs`，以全新 origin 開啟 `/devtools/workshop-gifts-browser-test.html` 並執行驗收。測試資料只寫入伺服器產生的隨機資料庫；不刪除既存資料，不送出正式 feedback。
- 原生離線：啟動 `node devtools/onboarding-browser-server.mjs 0 --workshop-offline`，開啟 `/devtools/workshop-offline-test.html`。此 opt-in 模式允許原生 SW，並額外快取 DB 隔離 hook。測試切換後，伺服器對 App 檔案回傳 503，再驗證快取重新載入、推薦、預覽與送禮寫入；預設 onboarding 伺服器仍禁止 SW。
- 桌面瀏覽器的窄視窗驗收不等同 iPhone 實機測試。
