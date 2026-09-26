# QuestNote roadmap execution

> Historical M1–M5 execution log. For deployed versions, use [final integration](final-integration.md); for current responsibilities and branch roles, use [project governance](project-governance.md). The milestone notes and old release evidence below describe their original dates; they are not current deployment instructions.

Baseline: `a1a0030` (`codex/summon-perf`); local main `aada9a7` is its ancestor.
Implementation branch at the time: `codex/card-pool-pipeline`. The reviewed integration was subsequently merged to source `main` and published as a separate production artifact; see the current record above.

## Ownership and dependencies

- Main agent: M1 implementation, M2A/M4 diff review and integration, M3A runtime/bootstrap, regression validation and final decisions.
- `pool_contract_design`: isolated M4 implementation, independent M3A review and full-artifact native browser harness completed, reviewed and integrated. No active edits.
- `gacha_transaction_design`: isolated M2A and M5 implementations completed and frozen. Main reviewed the five M5 files and integrated only those files; no worktree runtime snapshots were copied back.
- `backup_compatibility`: M1 historical fixtures/review and isolated M3A assembler completed. Main reviewed and integrated the four assembler files, adding published grant-identity compatibility validation.
- M4 design can proceed independently. M2A runtime integration follows validated M1 primitives.
- M5 waits for the content contract; production catalog changes are not part of the initial work.
- M3A is required before a release candidate can be declared deployable.
- M2B, full PWA UX, broad UI refactoring and optional performance work remain deferred.

## Status

- V3.4.8 release preparation integrates accepted UI VP-01 through VP-05 with the five-stage-approved frost_oath_fjord candidate (84 pets/Lore, 3 pools/series). Runtime source is fixed at b588cd97094c1dbca7fca73cef7918166023f29b on codex/release-v3.4.8. Production artifact 2c3a9312a4cac620c1982bc90c884da6b0db3c35acd41cfe3b682d440c3fb6ad and the separate preview have passed local acceptance; a byte-preserving Pages artifact commit is prepared locally. Source catalogs remain separate from release assembly. No push or Pages settings change has occurred; user review and publication approval are pending. See [V3.4.8 release review](../reports/release-v3.4.8/README.md) for pinned inputs, actual tests, previews, known external gates and publication sequence.
- M1: accepted locally on 2026-09-23 (Asia/Taipei). Review findings fixed and revalidated.
- M2A: accepted locally after pure and native IndexedDB acceptance, including shared-record writers and M1 round-trip.
- M4: accepted locally after contract/CLI, actual DOM/reveal/quote tests and a 390px responsive check. Existing catalog content remains unchanged.
- M5: accepted locally after independent/main review, 12 focused tests, full-catalog synthetic SOP rehearsal and all 8 assembled-candidate native browser cases. No production catalog writes.
- M3A: accepted locally after full assembled-artifact native acceptance. Actual hosting/CDN and still-installed client coverage remain external release gates. No deployment.

## Validation

- Baseline: npm test passed (8 tests + 34 assertions); images:check passed (72 × 2).
- Main reran M4's 40 pure tests successfully. Covers both existing pools plus two independent unpublished fixture pools.
- Final integrated Node checks: 113 tests and 34 existing logic assertions passed after M1/M2A/M4/M3A/M5 integration; 72 × 2 image checks and official pool validation also passed.
- Native browser: all 15 cases passed, including reading the saved synthetic backup from disk through the actual file chooser, restoring it, all-store abort, malformed stored-state export rejection, nested input zero-write rejection and real DOM injection regressions.
- Browser harness uses a random isolated database and refuses a service-worker-controlled origin. No production database was opened.
- M1 integration regression: 14 browser cases passed again after M2A/M4 (external file chooser was already verified in the original 15-case run).
- M2A: 25 native cases passed, including 12 transaction fault points, independent connections, threshold crossing, once-only gifts and shared wallet/collection mutations.
- M4: 11 native cases passed, including both new fixture pools, actual-rarity gifts, legacy presentation and repeat-ten cancel/changed-quote behavior. At 390px, the gacha panel has no horizontal overflow.
- M3A: 6 native SW lifecycle cases passed (two controlled iframe clients), plus 10 Node runtime/bootstrap checks and 12 assembler tests.
- Full assembled artifacts: all 8 native cases passed, including four first-boot failures with zero app imports/DB opens, actual aada9a7 worker logic with two legacy clients, natural activation, full application initialization, profile DB isolation and cached boot under HTTP 503. Test origin was ephemeral and cleaned afterward.
- Verified artifact IDs: production `1098039898dea0f3ff30bb8b5d60b9566fccb6f35a4a73494e4634447c32e75c`, preview `47e9b53c3254339e07a19cca5288bac66c5129d72170ab2d8dfb83bf5ef65012`. These identify tested bytes, not a deployment.
- M5: 12 focused tests cover exact-hash approval, immutable prior outputs, downstream invalidation, reservations, two sequential pool source promotions, invalid content/assets, no-write dry-run, candidate/WebP tampering, orphan staging and internal/external junctions.
- Full-catalog SOP rehearsal added 6 synthetic pets to the existing 72, assembled a third pool, reproduced the identical candidate, and used the actual gacha planner to verify its 75/750 pricing, frozen ten-pull candidates and once-only unlock gift. Both release profiles assembled successfully. Synthetic colors and copied Lore are test fixtures, not approved product content.
- Final candidate `94c3278daff0dda183118dd6de995f64382212ef73acb9b39dac4f00b2fbc537` passed all 8 full-artifact native browser cases with 78 pets. Production artifact `1e7240e8dc7b6c0a143b11c6aea2e33731f87a2adb40613be80828653c2348ae` and preview `0e91564f82404058a1a475fbf2be45ad6295216834826b24f30f53f085bc6028` loaded the same verified catalog hash `40b15ced368c20f2794a00d4948d515ce8c7c58c441e3a97419d4c31c779c3f2`. The ephemeral origin was cleaned after the run. These are synthetic test artifacts, not production releases.

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
- M5 v1 supplies AI handoff files and approved-input assembly, not a connected image/text generation service. Product brief, Lore, visual quality and prompts still need human/AI review. Local approval receipts are audit records, not authenticated signatures.
- Hard-kill recovery does not automatically take over an authoring lock. Follow card-pool-pipeline.md to verify the original process stopped, preserve the lock record, and remove only that lock before resuming.
