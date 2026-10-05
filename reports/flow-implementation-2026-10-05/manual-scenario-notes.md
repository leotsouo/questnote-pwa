# Manual scenario and evidence notes

Date: 2026-10-05. Product final source: `7b5192c`, V3.8.1. Codex In-app Browser; real DOM and native IndexedDB on dedicated guarded loopback origins only.

- Origin 50483: QuestNoteTest-Onboarding-354ce6e4-a199-44a6-b97e-81dcd5d1d083.
- Origin 49682: QuestNoteTest-Onboarding-d746961d-974a-4eaf-9fb4-e66987681d25.
- Both server-owned UUID databases are synthetic; no production/user database opened, reset or deleted. No remote feedback submitted or push subscription enabled.
- Step A: Fresh second origin completed real guided practice, including reload at prefilled editor and completion/reward; first-run JSON records A PASS and subsequent test-selector failure honestly. Fixed-selector final rerun retains completed profile and validates returning flow (5/5 checks pass).
- Step B: Actual normal UI cancel/reload/create habit; one saved habit visible. Returning profile retains task, tutorial receipt and multiple synthetic habits after reload, without repeating mandatory core onboarding.
- Step C: Real reload at guided editor preserved checkpoint. Saved task/subtask state survives subsequent iframe reloads. Switching among live browser tabs and returning preserved current DOM. OS process kill, mobile suspension and device offline lifecycle not verified.
- Step D: Native transaction-completion callback delay + repeated submits gives one habit. Transaction-creation exception leaves no failed row, input/error remains and retry gives one row. Separate actual error-state screenshot retained; parent pressed Enter on actual create CTA and observed saved habit afterward. Invalid empty task form writes nothing.
- Step E: Normal Cancel creates no task; More→Habits→Tasks returns. Easy-read dirty Close opens existing continue/discard guard; Continue preserved exact text “保留既有易讀取消語意”; Discard returns focus to add-task and task count stays one. No new global dirty confirmation.
- Step F: Normal completed subtask announces cancel-complete and pressed=true; Space cancels to false. Easy-read Space completes, visible button reads “取消完成：整理書桌”, pressed=true. Existing persistent result feedback remains. No additional step/confirmation or hidden gesture introduced.
- I03: Startup IndexedDB open fault → visible host and focused reload CTA. Real click first run, Enter final run → successfully reloads original synthetic tasks/habits and reading preference. Final JSON 2/2 PASS.
- I07: Native restore before-transaction failure and observed native commit followed by readonly loading failure both show neutral inline/toast message. Original task IDs preserved. Two checks pass; this does not test OS crash/native transaction abort.

UX assessment: Saving label shows pending; failed habit retains input and action. Subtask action describes target and next operation in both presentations. Startup error has explicit retry. Successful paths retain their existing click count. No measured completion-rate, task-speed or low-familiarity participant study; these are observed semantics and flow continuity, not blanket UX acceptance.

Screenshot acceptance: 01 first-time baseline, 02 habit baseline, 03 saved habit, 04 completed subtask baseline, 05 final normal subtask, 06 initial startup recovery (includes old harness timeout in adjacent log), 07 neutral restore error, 08 retained habit/error/retry CTA, 09 six-scenario results, 10 visible easy-read subtask, 11 KEEP dirty guard, 12 clean final startup recovery. Saved screenshots inspected in the browser. 07/08/10 were recaptured after initial framing omitted the target; final saved images are the accepted captures. JPEG bytes are used, not renamed PNGs.

Test-tool failures: constructor precedence, hidden modal retained in DOM, hidden legacy add-task selector, and missing focus mock. Corrected only tools/mocks; retained failure logs. A premature locator check after reload was retried only after fresh state proved initialization/render had reset the initial action. No product rollback warranted by these tooling failures.
