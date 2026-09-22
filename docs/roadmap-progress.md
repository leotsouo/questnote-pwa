# QuestNote roadmap execution

Baseline: `a1a0030` (`codex/summon-perf`); local main `aada9a7` is its ancestor.
Implementation branch: `codex/card-pool-pipeline`. No deployment is authorized.

## Ownership and dependencies

- Main agent: M1 implementation, M2A/M4 diff review and integration, M3A runtime/bootstrap, regression validation and final decisions.
- `pool_contract_design`: isolated M4 implementation accepted after main review; independent M3A review found first-boot and scope gaps. Now owns only the full-artifact native browser harness.
- `gacha_transaction_design`: isolated M2A implementation accepted after main review. Now owns only M5 pipeline, image-tool extraction, focused tests and SOP in its worktree; M2A files frozen.
- `backup_compatibility`: M1 historical fixtures/review and isolated M3A assembler completed. Main reviewed and integrated the four assembler files, adding published grant-identity compatibility validation.
- M4 design can proceed independently. M2A runtime integration follows validated M1 primitives.
- M5 waits for the content contract; production catalog changes are not part of the initial work.
- M3A is required before a release candidate can be declared deployable.
- M2B, full PWA UX, broad UI refactoring and optional performance work remain deferred.

## Status

- M1: accepted locally on 2026-09-23 (Asia/Taipei). Review findings fixed and revalidated.
- M2A: accepted locally after pure and native IndexedDB acceptance, including shared-record writers and M1 round-trip.
- M4: accepted locally after contract/CLI, actual DOM/reveal/quote tests and a 390px responsive check. Existing catalog content remains unchanged.
- M5: isolated staging pipeline implementation in progress; contract fixed at schema 1. No production catalog writes.
- M3A: accepted locally after full assembled-artifact native acceptance. Actual hosting/CDN and still-installed client coverage remain external release gates. No deployment.

## Validation

- Baseline: npm test passed (8 tests + 34 assertions); images:check passed (72 × 2).
- Main reran M4's 40 pure tests successfully. Covers both existing pools plus two independent unpublished fixture pools.
- Integrated Node checks: 99 tests and 34 existing logic assertions passed after M2A/M4/M3A runtime and assembler integration.
- Native browser: all 15 cases passed, including reading the saved synthetic backup from disk through the actual file chooser, restoring it, all-store abort, malformed stored-state export rejection, nested input zero-write rejection and real DOM injection regressions.
- Browser harness uses a random isolated database and refuses a service-worker-controlled origin. No production database was opened.
- M1 integration regression: 14 browser cases passed again after M2A/M4 (external file chooser was already verified in the original 15-case run).
- M2A: 25 native cases passed, including 12 transaction fault points, independent connections, threshold crossing, once-only gifts and shared wallet/collection mutations.
- M4: 11 native cases passed, including both new fixture pools, actual-rarity gifts, legacy presentation and repeat-ten cancel/changed-quote behavior. At 390px, the gacha panel has no horizontal overflow.
- M3A: 6 native SW lifecycle cases passed (two controlled iframe clients), plus 10 Node runtime/bootstrap checks and 12 assembler tests.
- Full assembled artifacts: all 8 native cases passed, including four first-boot failures with zero app imports/DB opens, actual aada9a7 worker logic with two legacy clients, natural activation, full application initialization, profile DB isolation and cached boot under HTTP 503. Test origin was ephemeral and cleaned afterward.
- Verified artifact IDs: production `1098039898dea0f3ff30bb8b5d60b9566fccb6f35a4a73494e4634447c32e75c`, preview `47e9b53c3254339e07a19cca5288bac66c5129d72170ab2d8dfb83bf5ef65012`. These identify tested bytes, not a deployment.

## Risks and rollback

- Strict backup validation may reject previously accepted incomplete or unknown formats.
- Preserve original backup files; verify a downloaded backup by reading it back before recovery drills.
- M1 keeps DB version 3 and the existing stores. Restore must commit all stores or none.
- Runtime changes remain local and reviewable; no merge, push, deployment or live database operation.
- M2A preserves old successful draw semantics and the existing missing-pet grant recovery; it does not infer lost duplicate fragments. Older running clients do not acquire new transaction guarantees until upgraded.
- M3A release bootstrap must obtain a verified controlling worker before opening DB. A waiting update cannot interrupt an existing operation. Production/preview scopes must be fixed, unique per profile and mutually non-overlapping on their origin.

## Unresolved / follow-up

- Historical exporters verified; three synthetic fixtures reproduce actual historical export functions (see fixtures README).
- M1 review findings (nested omissions and collection overriding catalog presentation) fixed; main reviewed the actual diff and reran acceptance checks.
- Backup profiles without an actual historical exporter remain unsupported unless they satisfy the complete current shape. Fixed quest/exploration definitions require an explicit future backup adapter when changed.
- Latest recorded Pages deployment is confirmed at aada9a73e6cf0381fc03359dafd78b70b274cce2 (run 30220073263). ZIP expired; live CDN bytes, preview hosting and still-installed client baselines remain unverified. Details and evidence links are in release-artifacts.md.
- Complete Task/Habit/Workshop transaction improvements remain M2B, not a prerequisite for content authoring.
- Legacy health-check source-string probes refer to replaced implementation details and excluded authoring files; modern acceptance tests are authoritative for this change. Rework those probes in maintainability follow-up.
- Fixed a release compatibility gap before M5 integration: root authoring catalogs may advance after review, but unversioned release URLs always use the hash-verified aada9a7 catalog snapshot. Never promote new content into content/release-compatibility/.
- Current recorded Pages deployment uses branch-driven dynamic Pages publishing. Formal release must verify/change that hosting path to publish the prepared artifact; merging raw source is not the approved artifact-release SOP.
