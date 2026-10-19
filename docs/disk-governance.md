# 磁碟與 repo 大小

舊的 worktree 生命週期工具與每週磁碟維護已經移除。新模式只有一個工作區，沒有需要追蹤的臨時副本。需要舊工具時從 tag `pre-cleanup-2026-10-14` 取回。

## 規則

- **一個工作區。** 不建立 git worktree，不另外 clone 來開發。`node_modules/` 只有這一份。
- **證據不進 git。** 截圖、瀏覽器錄影、暫存 HTML 審查頁、log 放在被 ignore 的 `.dev-backups/evidence/`。`reports/` 只放精簡的 markdown 摘要（必要時加小型 JSON）；`.gitignore` 會擋下 `reports/` 裡的圖片、影片、HTML 與 log。
- **卡池草稿用完就清。** 創作期間的 staging、approvals、候選圖可以留在 `dev`；發布完成後只保留驗證工具真正會讀的檔案，其餘移除，歷史由 git tag 保留。細節見 [card-pool-spec.md](card-pool-spec.md#發布完成後清理草稿)。
- **組裝產物放在 repo 外。** `prepare-release`、`preview:deploy`、`release:production` 都把 artifact 寫到系統暫存目錄的 `questnote-releases/`，可以隨時刪除。
- **部署用的 clone** 在 `.dev-backups/preview-repo/` 與 `.dev-backups/pages-repo/`（已 ignore）。它們只是快取，刪掉後下次部署會重新 clone。

## 本機可以安全刪除的東西

`.dev-backups/evidence/` 的舊截圖與 log、`.dev-backups/preview-repo/`、`.dev-backups/pages-repo/`、系統暫存目錄的 `questnote-releases/`、`node_modules/`（之後 `npm ci`）。`.dev-backups/` 裡其他資料（存檔備份、回報匯出）先確認內容再處理。

## 已停用的排程

Windows 工作排程器裡的「QuestNote Disk Maintenance」屬於舊工具，腳本移除後不會再有作用。用系統管理員 PowerShell 移除：

```powershell
Unregister-ScheduledTask -TaskName 'QuestNote Disk Maintenance' -Confirm:$false
```
