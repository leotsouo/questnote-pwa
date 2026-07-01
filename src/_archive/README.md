# QuestNote 封存模組（`_archive`）

這些模組是 V2.3.0 健康檢查中發現的疑似孤兒模組。

目前未被正式功能引用。

先封存，不直接刪除。

未來如果恢復搜尋、標籤、Quick Add，可再評估取回。

## 封存清單（V2.3.2）

| 檔案 | 原用途 |
|------|--------|
| `appStatsService.js` | Quick Add / 搜尋 / 標籤使用統計 |
| `quickAddService.js` | 快速新增任務解析 |
| `searchService.js` | 全域搜尋 |
| `tagService.js` | 任務標籤 |

## 取回方式

1. 將需要的檔案移回 `src/`。
2. 修正 import 路徑（`../` 改回同層或相對 `src`）。
3. 在 UI 與 `service-worker.js` PRECACHE_URLS 重新掛載。
4. 執行 `runAppHealthCheck()` 確認無 import 衝突。
