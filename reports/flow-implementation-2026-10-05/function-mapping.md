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
| Backup replacement KEEP | restoreBackup / safeReplaceAllStores / replaceAllStores | src/backupService.js / src/db.js | Existing snapshot validation and atomic all-store replacement; unchanged. |

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
