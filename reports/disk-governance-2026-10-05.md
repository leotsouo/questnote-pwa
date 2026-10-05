# QuestNote Disk Governance acceptance — 2026-10-05

## Scope and implementation

Implemented on `codex/disk-governance`, from verified `origin/main` at `27da862ab00613c6193759d49db5a80cfe7e48f9`, reusing main-integration. No new QuestNote worktree, product/dependency/deployment change, push or branch deletion. The previous main-integration branch remains intact; its pre-existing untracked font-scaling report remains outside this commit.

The small JSON registry records task/owner, activity, Git and producer provenance. Official Git creation does not install or copy dependencies. New outputs require an explicit recipe, input hashes, file identities and SHA256; unknown existing outputs remain held. Completed inactive environments undergo fresh Git, live remote and process checks. Generated files are removed individually through verified handles; eligible worktrees use normal `git worktree remove`.

Lifecycle: active or <7 days retained; 7–14 days may clear proven disposable outputs; ≥14 days may remove clean completed managed worktrees with remote retention proof. Modified/untracked/local-only/unknown/nested/protected data remain held. Success evidence expires after 7 days only when explicitly ephemeral; failure evidence requires review and at least 14 days. Unique recovery and release evidence have no automatic expiry. Duplicate backups require a protected byte-identical recovery anchor. Own logs retain at most 20 reports / 30 days; own public dependency-cache content requires SHA512 and current registry metadata proof after 30 days.

Protected defaults include root, main-integration, guided-onboarding, Honeylight workspaces, swordwild-shanhe-release, authoring source/assets/data/backend, release/recovery and the governance installation. External App worktrees retain App ownership. Local `state/protected.json` can add protections.

## Measurements and first maintenance

NTFS AllocationSize and file identities are used; logical bytes and estimated reclaimable bytes are separate. Hardlinks are not counted as independently reclaimable copies. Unknown cloud/reparse contents are excluded and retained without hydration.

| Scope | Allocated GiB | Status |
|---|---:|---|
| .worktrees | 24.17 | Warning |
| Project | 28.33 | Healthy |
| All .dev-backups across project/worktrees | 8.17 | Healthy |
| Root .dev-backups alone | 2.72 | Included in aggregate above |
| Ordinary recognized test outputs | 0.0074 | Healthy |
| Tool-owned npm cache | 0 | Healthy |

The previous 22.89 GiB worktree measurement used the older main-integration checkout. Checking out current origin/main increased preserved source allocation; dependencies were not copied or installed in other worktrees.

First real DryRun: zero destructive candidates, zero errors, Git integrity PASS; all 26 worktrees retained. First formal maintenance: zero deletion actions, zero errors, Git integrity PASS; 26 registrations remain. C free space changed during runs, but **attributable disk reclaimed is 0 GiB**; background changes are not cleanup savings.

Capacity thresholds (Healthy / Warning / High / Critical): worktrees <20 / 20 / 30 / 40 GiB; project <40 / 40 / 60 / 80; all backups <10 / 10 / 12 / 15; tests and tool-owned shared cache <0.5 / 0.5 / 1 / 2. Standard creation refuses projected Critical allocation and more than 6 active managed tasks. Critical maintenance never widens deletion permission; unresolved Critical is reported with exit 2.

## Windows scheduling verification

`QuestNote Disk Maintenance` is installed for Sunday 03:00 Asia/Taipei, with missed-run recovery, IgnoreNew and Limited/Interactive logon, without stored credentials. Next scheduled run: 2026-10-11 03:00.

The actual Task Scheduler action completed with **LastTaskResult 0**, and a fresh maintenance report at `2026-10-04T20:09:07.420099Z` showed Git PASS, zero errors and zero actions. Earlier launcher path attempts failed and were corrected; a diagnostic-only execution was not treated as maintenance success.

Task Scheduler could not see the LocalAppData directory created through the Codex environment. The installation therefore uses the verified accessible, already ignored and protected project paths:

- `C:/Users/User/OneDrive/questnote-pwa/.dev-backups/disk-governance/runtime`
- `C:/Users/User/OneDrive/questnote-pwa/.dev-backups/disk-governance/state`

Runtime source files are pinned by SHA256 independently of the worktree branch. The launcher and metadata reader reject cloud/offline/recall/reparse files before content reads. No OneDrive availability or execution-policy settings were changed. The old small LocalAppData state was retained after SHA256-verified migration. Runtime is repinned after the independent implementation commit.

## Validation

- Governance regression: **28 assertions PASS**, including all nine required failure/safety scenarios, actual normal worktree removal in tiny isolated fixtures, preservation of dirty source, manual dependency patches, hardlink accounting, wrong-hash refusal, zero-write DryRun, capacity refusal, scheduler-visible default state and test-runs capacity accounting. Fixtures are independent of QuestNote and do not push.
- Existing core suites: **362 tests PASS, 0 failures** (336 + 14 + 12); reveal logic checks also passed.
- App startup smoke: **PASS** for eight HTTP resources and sharp in-memory encode/decode; only the owned temporary server was stopped.
- Dependency integrity: `npm ls --depth=0` PASS; main dependencies retained.
- PowerShell parsing / Git whitespace checks: PASS.
- Git maintenance sanity: snapshot of all refs and every registered HEAD/status plus `git fsck --connectivity-only` before/after: PASS.
- Root/guided status match prior preserved baseline; other 25 worktree HEADs match previous audit. Main ref remains `47b7c337a39612a4eb337a22c64e812dd22f7454`; all baseline ref objects still exist. Codex App's temporary `refs/codex/turn-diffs` entries rotated between earlier sessions; scripts did not modify them. Persistent branches/tags/recovery refs are preserved except the explicitly created implementation branch.
- Unexecuted: full browser UI, IndexedDB, mobile flows and production checks. This static PWA has no general typecheck/lint/build scripts; startup/core passing does not prove every feature.

Full logs and first-run JSON reports are retained in `C:/Users/User/.codex/visualizations/2026/10/04/01a1071c-61db-7e53-953d-db69380dc4fa/` (`governance-tests.log`, `governance-core-tests.log`, `governance-app-smoke.log`, `governance-first-dry-run.json`, `governance-first-maintenance.json`). Actual scheduled reports are in the installed state folder.

## Future operational flow and limits

Agents reuse an appropriate workspace, otherwise use the installed create wrapper with task/owner; App-managed creation remains supported with explicit adoption. Only execution environments install dependencies through the producer. Agents Touch activity and Complete/Hold with actual integration/retention evidence. Weekly maintenance clears unchanged expired ephemeral outputs, then removes eligible completed stale worktrees without force. Capacity checks reject standard new worktrees before 40 GiB and stop new test/cache output at Critical.

This prevents silent accumulation in the standard workflow. It cannot guarantee a hard global cap when unique authoring data grows or users/tools bypass the wrapper; such contents are reported and retained. Main integration of this feature commit is separate from the installed maintenance task; no merge, push or deploy is performed here.
