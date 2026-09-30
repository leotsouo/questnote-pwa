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

Release artifact, browser gates and live receipt will be added after publication.
