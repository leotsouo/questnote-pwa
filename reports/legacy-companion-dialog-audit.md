# 夥伴相關視窗盤點

本輪只有使用者指定的獨立餵食入口改接夥伴手記；以下其他項目僅盤點，未修改。以目前本機來源為準，未部署。

## 與手記直接相關、仍使用另一套視窗的入口

| 視窗 | 實際入口與差異 | 來源 |
| --- | --- | --- |
| 舊角色詳情 | 首頁夥伴非圖片區、部分教學目標、暱稱儲存後、覺醒「返回角色詳情」；仍重複顯示肖像、角色身份、親密度、故事與暱稱 | `src/ui.js` 的 `openPetDetailModal`、`openNicknameModal`、`openTeachingTarget`；`src/petAwakeningController.js` 的 close action |
| 設定／修改暱稱 | 手記「修改暱稱」關閉手記後開 `.nickname-modal`；儲存／清除後又開舊角色詳情 | `src/ui.js` 的 `openNicknameModal`；兩套 identity renderer 的 `app-nickname` action |
| 故事與同行約定 | 手記入口開 `.bond-reader`；章節列表、閱讀／回應、選擇任務或習慣都走通用 `#modal-body` | `src/bondJourneyController.js`、`src/bondJourneyView.js` |
| 羈絆覺醒／守諾試煉 | 手記入口開 `.awakening-reader`，有独立步驟和排版，結束返回舊詳情；這是現行功能，不應僅因外框不同就刪除 | `src/petAwakeningController.js`、`src/petAwakeningView.js` |
| 寵物原圖檢視器 | 首頁夥伴圖片、舊詳情圖片開獨立 overlay；用途是放大看圖，不是重複的養成頁，可保留獨立但統一視覺 | `src/ui.js` 的 `openPetImageViewer`／`openPetImageViewerBySrc` |

## 其他沿用通用視窗的相關功能

- 探險旅程報告、探險獎勵：`showJourneyReport`／`showExpeditionRewardModal`。
- 稱號管理：`openTitleManagementModal`。
- 每日祝福轉盤：`openDailyWheelModal`。
- 舊單抽／十連結果頁（default、sweet）：目前為新相遇展示失敗時的 fallback，`playPostPullPresentation` 明確保留；不是一般正常入口，不宜視為無用程式刪除。

任務／習慣表單、刪除確認等也使用通用 modal，但與本次夥伴手記整合用途不同，不能只憑同一個容器就判定為過時介面。本盤點是來源與入口追查，沒有為驗證而觸發召喚、領獎或刪除。

## 本輪已處理的餵食入口

`openPetFeedModal` 改為轉接手記並聚焦食物選擇。首頁餵食、舊詳情的餵食、覺醒導引的培養親密度共用這個入口。關閉返回原頁；正式 renderer 與本機記憶體 renderer 均支援。

驗證：19 項相關 Node tests 通過；隔離正式 renderer 與本機預覽瀏覽器驗證首頁入口、舊詳情入口、選中角色、餵食扣庫存、升級解鎖、三主題／兩尺寸、故事與覺醒入口、空庫存工坊。沒有變更上述待討論視窗。
