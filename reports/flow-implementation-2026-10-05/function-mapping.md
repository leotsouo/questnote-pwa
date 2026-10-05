# Final Function Mapping — implementation ledger

Baseline: `872d144`. I01/I06/I03/I07 only; I02 not approved. Historical audit reports describe their named baseline; this mapping records current implementation. Updated per verified block; full final flow added at completion.

| Flow Step | Function | File | Responsibility |
| --- | --- | --- | --- |
| Habit form open / submit **MODIFIED I01** | openHabitForm / submit callback | src/ui.js | Transient saving guard, disabled submit/cancel, visible write failure and retry; distinguish committed write from follow-up refresh failure. Committed detached form cannot submit again. |
| Modal close / Escape / backdrop **MODIFIED I01** | dismissModal | src/ui.js | Preserve existing task saving protection; prevent dismissing a pending habit write. Normal cancel semantics unchanged. |
| Habit persistence KEEP | createHabit / updateHabit | src/habitService.js | Existing validation and IndexedDB write; no schema or same-name rule change. |
| Refresh after habit commit KEEP | refreshState / renderHabitsView | src/app.js / src/ui.js | Show saved state; write completion must not be confused with refresh failure. |
| Runtime/cache **MODIFIED** | APP_VERSION / CACHE_NAME / BUILD_TIME | src/version.js / service-worker.js | V3.8.1; synchronized cache identity. No module added to runtime/precache closure. |
| Subtask control **MODIFIED I06** | renderTaskCard | src/ui.js | Derive target/action label and aria-pressed from existing completed state. |
| Toggle subtask KEEP | toggleSubtaskComplete / task-card action callback | src/taskService.js / src/ui.js | Existing completion toggle and persistence; same click count. |
| Easy-read labels KEEP | decorateSeniorControls | src/seniorModeController.js | Existing visible label decoration now receives accurate subtask action text. |
| Initialization failure **MODIFIED I03** | initApp catch / hideLoader | src/app.js | Reattach existing loader with visible generic error and full-page reload action; normal successful removal unchanged. No inline reinitialization or DB reset. |
| Backup restore feedback **MODIFIED I07** | executeRestoreBackup | src/ui.js | Shared catch uses identical neutral feedback, without asserting uncommitted data or invalid file. No new phase state or retry action. |
| Backup replacement KEEP | restoreBackup / safeReplaceAllData / replaceAllStores | src/backupService.js / src/db.js | Existing snapshot validation and atomic all-store replacement; unchanged. |

## I01 verified block

Problem → pending duplicate / unhandled write rejection.
Implement → local form guard and honest failure boundary.
Local Test → 6 PASS in I01-local.log (actual-source mocks).
Scenario Test → real isolated App, cancel then reload, create habit; saved row visible in 03-habit-after.jpg. Native delayed/failure scenarios will be recorded in final browser evidence.
Regression Test → 9 PASS in I01-regression.log.
Before/After → direct concurrent writes → one pending submit, recoverable failed write, committed refresh errors do not invite recreation.

Only synthetic database used; no user database, remote feedback, reminders or release modified.

## I06 verified block

Problem → identical action name before/after completion, no pressed state.
Implement → action/name and aria-pressed derive from existing completed boolean; no persistence change.
Local Test → actual renderTaskCard with real escaping, I06-local.log PASS.
Scenario Test → real saved task with subtask; before label fixed/pressed null, after label cancel-complete/pressed true. Space toggles to false/complete label. Screenshots 04/05 and actual DOM observation.
Regression Test → 8 PASS in I06-regression.log.
Before/After → ambiguous completed action → accurate current state and next action; same layout/click count.

## I03 verified block

Problem → startup catch writes error to removed loader.
Implement → reattach existing host, generic Chinese message, focused full-page reload button.
Local Test → 2 PASS in I03-local.log; test mock lacked focus initially, corrected in test only.
Scenario Test → guarded native open failure, real visible error/reload; clicking reload returns saved task/habits. I03-browser-initial.json includes earlier independent harness-only I01 timeout, retained honestly; both I03 checks pass.
Regression Test → I03-regression.log, app-update and preview cache recovery; successful loader removal remains unchanged.
Before/After → hidden feedback → visible next action without inline reinitialization or database reset.

## I07 verified block

Problem → shared catch incorrectly asserts incomplete data write / invalid backup even after commit.
Implement → identical neutral inline/toast text; no phase flags, persistence or confirmation changes.
Local Test → 3 PASS in I07-local.log (restore failure, postcommit refresh failure, success).
Scenario Test → guarded native transaction-creation failure before restore and readonly failure after observed native restore commit. Both show neutral text and existing task IDs remain. I07-browser.json and screenshot 07.
Regression Test → 22 PASS in I07-regression.log.
Before/After → unsupported data-loss/file diagnosis → reload/check-data instruction without promising committed/aborted status.

## 全產品功能級 Mapping（最終 source）

| Flow Step | Function | File | Responsibility |
| --- | --- | --- | --- |
| 啟動驗證 | `bootApplication()` | [src/bootstrap.js:6](../../src/bootstrap.js#L6) | 驗證 release scope/artifact 後開 App |
| 初始化 **MODIFIED I03** | `initApp()` | [src/app.js:512](../../src/app.js#L512) | 資料/目錄/UI；失敗可見 host 與整頁 reload |
| 資料初始化 KEEP | `openDB()` | [src/db.js:50](../../src/db.js#L50) | 開既有 DB 與版本遷移 |
| 狀態刷新 KEEP | `refreshState()` | [src/app.js:242](../../src/app.js#L242) | 讀取共享狀態並要求所需畫面刷新 |
| UI 綁定 KEEP | `initUI()` | [src/ui.js:595](../../src/ui.js#L595) | 註冊原有功能與 modal 互動 |
| 主導航 KEEP | `switchView()` | [src/ui.js:1414](../../src/ui.js#L1414) | 五個主入口與更多子頁 |
| 模態退出 **MODIFIED I01** | `dismissModal()` | [src/ui.js:1557](../../src/ui.js#L1557) | 保存中 task/habit 阻擋退出；保留易讀 dirty guard |
| 模態關閉 KEEP | `closeModal()` | [src/ui.js:1592](../../src/ui.js#L1592) | 隱藏原 overlay、恢復焦點；不移除其 DOM |
| 首次教學 KEEP | `prepareGuidedOnboarding()` | [src/guidedOnboardingService.js:7](../../src/guidedOnboardingService.js#L7) | 空存檔開始；既有存檔不強制教學 |
| 教學中斷 KEEP | `recoverGuidedOnboarding()` | [src/guidedOnboardingService.js:21](../../src/guidedOnboardingService.js#L21) | 續接持久化 checkpoint |
| 教學任務 KEEP | `commitTutorialTask()` | [src/guidedOnboardingService.js:59](../../src/guidedOnboardingService.js#L59) | task 與教學狀態同交易 |
| 教學獎勵 KEEP | `claimTutorialReward()` | [src/guidedOnboardingService.js:73](../../src/guidedOnboardingService.js#L73) | receipt/task/wallet/companion 同交易 |
| 任務表單 KEEP | `openTaskForm()` | [src/ui.js:3184](../../src/ui.js#L3184) | 最小內容、選填進階、原保存防重 |
| 任務保存 KEEP | `createTask()` | [src/taskService.js:88](../../src/taskService.js#L88) | 建立任務與原驗證 |
| 主任務完成 KEEP | `toggleTaskComplete()` | [src/taskService.js:225](../../src/taskService.js#L225) | 切換完成與呼叫既有獎勵流程 |
| 任務卡 **MODIFIED I06** | `renderTaskCard()` | [src/ui.js:3106](../../src/ui.js#L3106) | 派生子任務目標/下一步 label/pressed |
| 子任務保存 KEEP | `toggleSubtaskComplete()` | [src/taskService.js:194](../../src/taskService.js#L194) | 原完成切換與持久化 |
| 習慣表單 **MODIFIED I01** | `openHabitForm()` | [src/ui.js:7798](../../src/ui.js#L7798) | saving guard/error/input retry/已提交刷新邊界 |
| 習慣保存 KEEP | `createHabit()` | [src/habitService.js:88](../../src/habitService.js#L88) | 既有驗證/ID/保存；未新增同名規則 |
| 習慣編輯 KEEP | `updateHabit()` | [src/habitService.js:124](../../src/habitService.js#L124) | 保留原 ID 與設定驗證 |
| 習慣打卡 KEEP | `completeHabitToday()` | [src/habitService.js:416](../../src/habitService.js#L416) | 既有日期/領獎規則 |
| 習慣取消/封存 KEEP | `archiveHabit()` | [src/habitService.js:157](../../src/habitService.js#L157) | 保留歷史記錄與封存语意 |
| 召喚 KEEP | `executeDraw()` | [src/gachaService.js:30](../../src/gachaService.js#L30) | 提交 wallet/stats/collection 等同交易 |
| 召喚結果 KEEP | `presentCommittedEncounters()` | [src/encounterView.js:286](../../src/encounterView.js#L286) | 提交後呈現；不重抽 |
| 指定邀請 KEEP | `inviteCompanion()` | [src/encounterEconomyService.js:17](../../src/encounterEconomyService.js#L17) | 碎片與取得角色同交易 |
| 圖鑑 KEEP | `renderCollectionView()` | [src/ui.js:6366](../../src/ui.js#L6366) | 篩選/詳情/角色入口 |
| 陪伴 KEEP | `setCompanion()` | [src/collectionService.js:332](../../src/collectionService.js#L332) | 共享收藏記錄中設定單一陪伴 |
| 故事約定 KEEP | `createBondJourneyController()` | [src/bondJourneyController.js:6](../../src/bondJourneyController.js#L6) | 故事/目標/暫停/領取介面 |
| 覺醒 KEEP | `createAwakeningController()` | [src/petAwakeningController.js:5](../../src/petAwakeningController.js#L5) | 條件/進度/ready/覺醒介面 |
| 派遣 KEEP | `startExpedition()` | [src/expeditionService.js:212](../../src/expeditionService.js#L212) | 成本與預定結果同交易 |
| 探險領取 KEEP | `claimExpeditionRewards()` | [src/expeditionService.js:294](../../src/expeditionService.js#L294) | 重新檢查資格並提交結果 |
| 探索里程碑 KEEP | `claimExplorationMilestone()` | [src/explorationService.js:532](../../src/explorationService.js#L532) | 領取記錄與獎勵同交易 |
| 營地 KEEP | `upgradeCamp()` | [src/campService.js:21](../../src/campService.js#L21) | 既有資源成本/營地交易 |
| 工坊 **UNCHANGED I02** | `craftItem()` | [src/workshopService.js:347](../../src/workshopService.js#L347) | 既有頁內鎖與分次扣料/道具/stats；待 Review |
| 送禮 KEEP | `useBondItem()` | [src/workshopService.js:507](../../src/workshopService.js#L507) | 既有庫存/收件條件/親密度流程 |
| 每日祝福 KEEP | `performDailyCheckIn()` | [src/dailyCheckInService.js:231](../../src/dailyCheckInService.js#L231) | 日期/資源領取交易 |
| 成就 KEEP | `renderAchievementsView()` | [src/ui.js:8495](../../src/ui.js#L8495) | 解鎖、領取與稱號入口 |
| 手冊 KEEP | `renderHandbookView()` | [src/ui.js:8214](../../src/ui.js#L8214) | 彙整紀錄、目標與功能跳轉 |
| 信箱 KEEP | `claimMailboxReward()` | [src/mailboxService.js:610](../../src/mailboxService.js#L610) | 原資格/claimed 檢查與獎勵交易 |
| 回報 KEEP | `initFeedback()` | [src/feedbackController.js:8](../../src/feedbackController.js#L8) | 本機草稿、預覽與送出/receipt |
| 分享 KEEP | `shareQuestNote()` | [src/shareService.js:13](../../src/shareService.js#L13) | 系統分享或複製 fallback |
| 提醒 KEEP | `syncReminders()` | [src/reminderService.js:121](../../src/reminderService.js#L121) | 本機 dirty 狀態與已有同步/重試 |
| 易讀呈現 KEEP | `decorateSeniorControls()` | [src/seniorModeController.js:184](../../src/seniorModeController.js#L184) | 從正確 label 產生可見文字 |
| 備份預覽 KEEP | `previewBackup()` | [src/backupService.js:516](../../src/backupService.js#L516) | 覆蓋前顯示資料摘要 |
| 恢復回饋 **MODIFIED I07** | `executeRestoreBackup()` | [src/ui.js:8963](../../src/ui.js#L8963) | 原恢復流程；catch 改中性且一致 |
| 恢復替換 KEEP | `restoreBackup()` | [src/backupService.js:615](../../src/backupService.js#L615) | 驗證/遷移後呼叫原全 stores 交易 |
| 資料替換 KEEP | `replaceAllStores()` | [src/db.js:279](../../src/db.js#L279) | 同一 transaction clear/put 全 stores |
| 更新 KEEP | `initAppUpdates()` | [src/updateController.js:161](../../src/updateController.js#L161) | 原 verified worker 與安全更新 gate |
| 重置 KEEP | `handleReset()` | [src/ui.js:9268](../../src/ui.js#L9268) | 保留兩次確認及原重置流程 |
