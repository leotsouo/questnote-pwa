# 黯冠王庭最終覺醒：惡魔的趣味

來源基準：`origin/main`，`8935bb298c7919817ae77babd14fc91435b2cb46`。
本機功能分支：`codex/demon-final-task`。候選 App 版本 V3.9.1；尚未 push、合併或發布。

## 行為

- 七位可覺醒的黯冠王庭夥伴，完成既有試煉後，提出使用者指定的問題。
- 回答必填，去除頭尾空白，最多 2000 字。每位夥伴固定一個任務 ID，重複／並行送出保留第一次回答。
- 任務名為「惡魔的趣味」，回答保存在任務內容。建立時排入今日，未完成時跨日持續列在今日計畫；沒有開始日或截止日。
- 紫色特殊任務框與文字標記；一般與長輩模式皆只提供完成，不提供編輯、刪除、移出今日或取消完成。
- 資料服務在原生 IndexedDB 交易內檢查鎖定；儀式同一交易核對對應任務完成，未完成不消耗食物或信物。
- 保留原本 Lv.5、同行故事、三筆新日常、一筆新邊境派遣及食物儀式。劍隱山河規則不變；既有已覺醒成果不追溯加關。
- 沿用 task store 與覺醒 schema 1，備份保留任務身分、回答與完成紀錄，拒絕無效或矛盾的系統任務。

## 驗證

- `npm test` 全部通過：三組 Node test runner 合計 380 tests，加上 product-flow 與 reveal-flow assertions。完整 log：`.dev-backups/demon-final-unit-tests-final.log`。
- 所有變更 JavaScript 語法檢查通過，`git diff --check` 通過。
- 原生 Chrome、393×852 手機與 1280×900 桌面：覺醒瀏覽器 suite 12 checks 通過、無 page errors。隔離 loopback 合成 DB，禁止外部網路，未操作玩家存檔。
- 新增實測涵蓋：空回答拒絕、實際 UI 回答建立、特殊框、隱藏禁止操作、資料 API 鎖定、跨日、備份還原、七位夥伴的完成／不可撤銷、重複送出與並行儀式僅成功一次。
- 原生驗證與圖片：`.dev-backups/test-runs/demon-final-task-20261008-final/`；清楚的任務卡圖片與 focused 驗證：`.dev-backups/test-runs/demon-final-task-20261008-focused-final/`。
- 首輪 sandbox 不能開啟 loopback 或建立臨時 Git fixture；在正常隔離測試權限下重跑通過。旧 food-only 測試更新為先通過新最終任務；實際主題覆蓋框線的問題已修正。
- 實體 iPhone／已安裝 PWA 尚未驗證；本次完成的是本機功能，沒有部署證據。

## 工作區保留

重用原本受保護的 `main-integration` checkout，未建立新大型副本。兩份既有未追蹤交接文件原樣保留，不納入提交。
標準 worktree-create 與 lifecycle Touch 皆因 policy JSON「not a verified local file」停止；沒有繞過驗證或清理任何材料。此文件記錄實際 owner/task/activity 作補充：owner 為本次 Codex chat，task 為黯冠最終覺醒互動，activity 為 2026-10-08。
狀態 **Hold**：成果為尚未 push 的本機功能提交；測試 logs、失敗診斷及圖片保留在 ignored `.dev-backups`。不自動清理、push 或部署。
