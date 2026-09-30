# V3.4.30 review, integration and rollback

User approved the three-world upgrade and production publication on 2026-10-01 (Taipei), with the old design retained for rollback.

Review used [Review Bugbot](C:/Users/User/.agents/skills/review-bugbot/SKILL.md). One P2: custom habit description emoji could be replaced by aria-hidden UI SVG. The description is now excluded and the isolated WORLDS suite checks both initial and edited text. User authorization to repair release findings persists. No repeat review was requested.

Latest source main before integration: 9dde3c8. Latest production was V3.4.29: Pages commit 13d3f5db135243b6a30d85148d2fa3d9c2c7bf0f, artifact 49298afea132cd13c832dbd62ad13edfc7f788cc383b3906fea80c8cf7757a37, manifest SHA-256 6affc46b80a570af2f9d8f59f3ea27129ce4f4ea47a9c223cd5f1d86bfd59b2e. Live HTTPS descriptor agrees.

Remote immutable backup refs (pushed before publication):
- codex/design-backup-v3.4.29-source — source 9dde3c8
- codex/design-backup-v3.4.29-pages — complete 350-file production tree 13d3f5d

Recent daily-reminder logic, reminder settings and pet prompt fixes were merged from current main. V3.4.30 retains the prompt below the illustration as a 44px action, across the three worlds. Notification icon follows the approved fixed primary brand. Core persistence and service logic equal current main; no backend deployment.

## Rollback

Do not clear site storage or restore an old player backup. First compare the current release catalog, assets, mailbox and save contract with the retained V3.4.29 artifact. For this UI-only release they must match. If later releases change content or save schema, prepare a compatible forward release that restores presentation while retaining current catalogs, acquired pet/Lore IDs, reminder store and player data.

For an immediate compatible rollback, create a fresh branch from current origin/gh-pages, restore the tracked tree from codex/design-backup-v3.4.29-pages, check all 350 original blobs against that tag and its release manifest, then commit/push that new descendant to gh-pages after authorization. Never force-push or reset the publishing branch. Preserve any mailbox-only changes. The old worker must activate naturally after all newer clients close, then reopen online; do not use forced claim or erase caches/storage. Verify HTTPS artifact identity and browser activation. Existing original source and twilight CSS are retained.

## Release receipt

[PR #14](https://github.com/leotsouo/questnote-pwa/pull/14) merged at 30a842f41937c38f621618b8dc62c7bbb7b50083. Reviewed artifact source eb9be8f47343180fa63f6a55ecf2a9d6349b78b6 is an ancestor and its runtime tree equals the integrated source. [PR CI](https://github.com/leotsouo/questnote-pwa/actions/runs/36742929689) and [main CI](https://github.com/leotsouo/questnote-pwa/actions/runs/36743220949) passed.

Production artifact: 1f204115bb343502ceb8f978f1160130fec07f7828458116c9447f4cd27f8247; manifest SHA-256 536f4ebc92e4a967b2a40c8c5d890969543cc9fc44d69c2a134bff8723f05d36; 368 files, /questnote-pwa/. All 368 staged Git blobs exactly matched before push. Pages commit be4fd23cc3ba5e5dac0561ab017b6eccb58609c2; [Pages run](https://github.com/leotsouo/questnote-pwa/actions/runs/36744356289).

The existing catalog SHA-256 3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32, all 84 pets, three pools, and 266 existing catalog/mailbox/pet-image files have identical hashes. The approved real candidate was reused. No backend was deployed. Preview cf3a27b860681f1481bf12fb1dc50856c0881516d8fe35e82b3ac36fd3528af0 was assembled only for isolated acceptance; it was not published.

Validation: 197 Node cases plus maintained summon assertions pass; syntax checks pass; 204 integrated three-world browser checks pass at 393×852 / 320×693, including both habit-description regressions, three choices/persistence, all 12 views, 44px targets, no horizontal overflow, text contrast, reduced motion and decoded art. All 12 assembled artifact tests pass: strict bootstrap, safe legacy transition, profile isolation, recovery/503/wrong hash and offline startup/lesson resume.

Exact V3.4.29 backup was recovered with git -c core.autocrlf=false archive; strict verifier passed all 350 files. Windows default archive/checkouts can transform line endings, so a future rollback must preserve raw Git blobs. The dedicated ephemeral design-rollback harness proved V3.4.29 → V3.4.30 → V3.4.29 naturally activates each worker after clients close, restores the old presentation and preserves all five stores' records, including a completed task/reward flag, actual wallet, owned companion/bond, habit text, reminder settings and twilight preference. Only globalMailboxState.lastFetchedAt is excluded because every startup legitimately polls the unchanged mailbox; all read/claimed IDs remain exact. Synthetic fixtures only, no real subscription/network reminder enabled.

Physical iPhone standalone/VoiceOver/safe-area and native time-picker remain device-specific acceptance. Existing clients should close QuestNote windows and reopen online for natural activation; never clear site storage.


Pages run 36744356289 completed successfully. [21 live HTTPS hashes](live-hashes.json) match the pinned artifact, including all three scenes, the brand icon, theme CSS, runtime, worker, catalog and mailbox. Old remote refs remain pinned.

Hosted 393×852 verification naturally closed/reopened the preexisting controlled client until the pinned V3.4.30 worker became active. More shows V3.4.30 / 已啟用; settings shows the artifact cache identity and all three authored choices, with twilight preference retained. No preference, subscription or gameplay action was changed during hosted verification. [DOM evidence](hosted-browser.json) and [mobile picker screenshot](live-theme-picker.jpg).
