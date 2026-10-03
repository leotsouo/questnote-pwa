# 完整 App 本機設計檢視

2026-10-03：使用者明確指定仍在測試，不上正式版。

入口：`http://127.0.0.1:8033/devtools/encounter-app-preview.html`。此頁載入目前分支的實際 index、App 模組、服務與樣式；底部「召喚」頁的召喚操作下方提供「指定邀請」。不是單獨的邀請原型。

示範頁僅允許 localhost，將 App IndexedDB 映射至 session 隨機 `QuestNoteTest-AppEncounter-*` 存檔；首次提供六位已收藏角色、2450 星塵和 242 相遇碎片。重新整理保留該 session 的操作。阻擋遠端及寫入 fetch，不註冊 service worker。沒有正式存檔或後端變更。

瀏覽器實測：完整 App 載入並顯示 2450 星塵、242 碎片；指定邀請入口可開啟原生 dialog，列出跨系列角色、已相遇及故事鎖定狀態；關閉後焦點回到入口。邀請動畫／交易驗收另見 invitation-pool-arrival-review.md。本次僅新增開發檢視頁，JS 語法檢查及 git diff --check 通過。

畫面證據：

- [App 召喚頁入口](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-app-entry.png)
- [App 指定邀請畫面](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-app-gallery.png)

僅本機功能分支；沒有 merge、push、正式網站或後端發布。
