# 每日通知修復與後端驗證 — 2026-10-02

## 來源與部署

- 維護來源為最新 `origin/main` 建立的隔離分支 `codex/fix-daily-reminder-delivery`，並整合主線截至 `cb28900` 的既有變更。
- 後端修復提交：`abc250d5e4618227f69ce173d8bcbe1907467488`；[PR #49](https://github.com/leotsouo/questnote-pwa/pull/49)。
- 正式 Worker `questnote-reminders` 版本：`cbbc6c62-d82a-4e08-99fc-fbacb117f042`，2026-10-02 15:45（Asia/Taipei）部署。
- D1 僅新增排程健康表；既有訂閱、金鑰與提醒投影保留。這是獨立後端修復，沒有組裝或發布新的前端 artifact。

## 已確認的問題與修改

原正式訂閱已過預定時間，但沒有任何每日派送記錄。近兩天 Worker 日誌與 GraphQL `workersInvocationsScheduled` 查詢沒有 scheduled invocation。重新註冊 Cron 並等候超過官方文件的 15 分鐘傳播期，仍未看到執行；Cloudflare 內部停跑原因尚未確認，不能宣稱是手機設定造成。

獨立、不接觸使用者資料的診斷 alarm 於 15:38:16、15:38:19、15:38:22 自行執行成功；驗證後已刪除臨時診斷 Worker。正式後端因此改用 SQLite-backed Durable Object alarm，每個分鐘預先保存下一次喚醒再處理到期工作；停用原 Cron，仍保留小批次、派送租約、日期去重與過期截止。授權的設定同步只確認喚醒存在，不把時間順延；部署啟動由獨立 Worker secret 保護。

另外修正漏掉前一天後跳過今天的恢復問題、延遲觸發使用實際執行時間判斷過期，以及當天尚未發送的通知改到較晚時間後重新排入。已接受的當天通知不重送。

## 實際驗證

| 項目 | 結果 |
| --- | --- |
| `npm test` | 268 項整合測試、34 項召喚流程斷言、11 項主題測試、5 項動畫測試全部通過 |
| 提醒專用邏輯 | 17 項通過，包含持續喚醒、故障後下次喚醒、管理啟動授權、漏日恢復、改時競態、去重、過期與加密 |
| `npm run test:reminders:runtime` | workerd／記憶體 D1／SQLite 測試物件通過真實 alarm 路徑；Apple、Android 加密推播完全攔截，沒有送往正式訂閱 |
| JS 語法與差異 | 變更 JS 的 `node --check` 與 `git diff --check` 通過 |
| CI | 修復提交 `abc250d` 的 [Validate](https://github.com/leotsouo/questnote-pwa/actions/runs/36980194848) 通過 |
| 正式背景執行一 | UTC 07:46:00.002 啟動、07:46:00.156 完成，`status=ok` |
| 正式背景執行二 | UTC 07:47:00.001 啟動、07:47:00.059 完成，`status=ok` |
| 正式健康 | `version=3`、`ready=true`、`driver=durable-alarm`、`healthy=true`；讀取健康 API 不會啟動 alarm 或產生派送記錄 |
| 既有資料 | 四筆安裝保持啟用；過期工作略過，沒有補送過期摘要 |

正式背景紀錄由平台自行喚醒產生，沒有使用手動派送或前景同步製造驗證結果。

## 尚待手機驗收

已請使用者將兩台手機的時間改成當下往後 3–5 分鐘，確認至少一項今日待辦／每日習慣及同步完成後關閉 App、鎖屏，分別確認實際收到通知。空摘要不發送，當天已接受的摘要也不重送。後端背景執行及加密模擬成功不能取代 iPhone／Android 實機收件；通知回報目前保持調查中。

習慣建議已依使用者確認在私密回報系統標記為已處理。本文不包含回報全文、安裝憑證、訂閱端點、私密金鑰或使用者內容。
