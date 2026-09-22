# QuestNote roadmap execution

Baseline: `a1a0030` (`codex/summon-perf`); local main `aada9a7` is its ancestor.
Implementation branch: `codex/card-pool-pipeline`. No deployment is authorized.

## Ownership and dependencies

- Main agent: M1 implementation, shared-file ownership, integration and acceptance review.
- `pool_contract_design`: M4 pure contract in an isolated worktree; main reviewed and copied its four files. Now investigating UI integration, read-only.
- `gacha_transaction_design`: M2A writer/transaction and M3A investigation complete; M5 reuse investigation, read-only.
- `backup_compatibility`: historical fixtures and independent M1 review; exclusive ownership of backupSchema.js and backup-safety.test.mjs during the review fixes.
- M4 design can proceed independently. M2A runtime integration follows validated M1 primitives.
- M5 waits for the content contract; production catalog changes are not part of the initial work.
- M3A is required before a release candidate can be declared deployable.
- M2B, full PWA UX, broad UI refactoring and optional performance work remain deferred.

## Status

- M1: accepted locally on 2026-09-23 (Asia/Taipei). Review findings fixed and revalidated.
- M2A: investigation complete; isolated implementation starts from the M1 checkpoint.
- M4: pure contract/fixtures integrated after main review; UI/presentation/authoring validation implementation in the pool-contract worktree. Main freezes those files until integration.
- M5 / M3A: investigation only. No formal catalog or release changes.

## Validation

- Baseline: npm test passed (8 tests + 34 assertions); images:check passed (72 × 2).
- Main reran M4's 40 pure tests successfully. Covers both existing pools plus two independent unpublished fixture pools.
- Integrated Node checks: 65 tests (17 backup, 40 contract, 8 existing) and 34 logic assertions passed.
- Native browser: all 15 cases passed, including reading the saved synthetic backup from disk through the actual file chooser, restoring it, all-store abort, malformed stored-state export rejection, nested input zero-write rejection and real DOM injection regressions.
- Browser harness uses a random isolated database and refuses a service-worker-controlled origin. No production database was opened.

## Risks and rollback

- Strict backup validation may reject previously accepted incomplete or unknown formats.
- Preserve original backup files; verify a downloaded backup by reading it back before recovery drills.
- M1 keeps DB version 3 and the existing stores. Restore must commit all stores or none.
- Runtime changes remain local and reviewable; no merge, push, deployment or live database operation.

## Unresolved / follow-up

- Historical exporters verified; three synthetic fixtures reproduce actual historical export functions (see fixtures README).
- M1 review findings (nested omissions and collection overriding catalog presentation) fixed; main reviewed the actual diff and reran acceptance checks.
- Backup profiles without an actual historical exporter remain unsupported unless they satisfy the complete current shape. Fixed quest/exploration definitions require an explicit future backup adapter when changed.
- Production deployed artifact and oldest supported running client are unknown; blocks release verification only.
- Complete Task/Habit/Workshop transaction improvements remain M2B, not a prerequisite for content authoring.
