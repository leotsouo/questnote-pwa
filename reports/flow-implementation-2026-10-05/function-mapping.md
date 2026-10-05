# Final Function Mapping — implementation ledger

Baseline: `872d144`. I01/I06/I03/I07 only; I02 not approved. Historical audit reports describe their named baseline; this mapping records current implementation. Updated per verified block; full final flow added at completion.

| Flow Step | Function | File | Responsibility |
| --- | --- | --- | --- |
| Habit form open / submit **MODIFIED I01** | openHabitForm / submit callback | src/ui.js | Transient saving guard, disabled submit/cancel, visible write failure and retry; distinguish committed write from follow-up refresh failure. Committed detached form cannot submit again. |
| Modal close / Escape / backdrop **MODIFIED I01** | dismissModal | src/ui.js | Preserve existing task saving protection; prevent dismissing a pending habit write. Normal cancel semantics unchanged. |
| Habit persistence KEEP | createHabit / updateHabit | src/habitService.js | Existing validation and IndexedDB write; no schema or same-name rule change. |
| Refresh after habit commit KEEP | refreshState / renderHabitsView | src/app.js / src/ui.js | Show saved state; write completion must not be confused with refresh failure. |
| Runtime/cache **MODIFIED** | APP_VERSION / CACHE_NAME / BUILD_TIME | src/version.js / service-worker.js | V3.8.1; synchronized cache identity. No module added to runtime/precache closure. |

## I01 verified block

Problem → pending duplicate / unhandled write rejection.
Implement → local form guard and honest failure boundary.
Local Test → 6 PASS in I01-local.log (actual-source mocks).
Scenario Test → real isolated App, cancel then reload, create habit; saved row visible in 03-habit-after.jpg. Native delayed/failure scenarios will be recorded in final browser evidence.
Regression Test → 9 PASS in I01-regression.log.
Before/After → direct concurrent writes → one pending submit, recoverable failed write, committed refresh errors do not invite recreation.

Only synthetic database used; no user database, remote feedback, reminders or release modified.
