# QuestNote final integration

This is the current integration record. Earlier `reports/release-v3.4.8/` and authoring handoffs remain historical evidence, not the current deployment status.

## Source and ownership

- Integration source: `codex/final-integration`, isolated at `.worktrees/final-integration`, fast-forwarded into `main` at `d20c7ee395b0ebae98582ee39fd9650de5fc7cb9`.
- Shared Card Pool/UI base: `95a4f5d70233195050f1f0fce2eee3d9945c2b32`.
- Starting point: `codex/release-v3.4.8` at `7e2c7c2`, which already descends from UI tip `0bee84d` and includes the reviewed Glacier runtime integration `0de878a` and contrast fixes `b588cd9`.
- Compared actual root Card Pool dirty files against this tree. No functional runtime changes were omitted. Existing UI markup, scoped polish styles, dialog focus, transaction primitives and declarative pool contract are retained.
- No new Git text conflicts were introduced: the reviewed integration history was reused rather than replayed or overwritten. The original dirty root checkout and original worktrees remain untouched.
- The real `frost_oath_fjord` authoring workspace is now preserved in this branch, including raw approval snapshots and immutable candidate `697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131`. Exact-byte Git attributes prevent line-ending conversion from invalidating its hashes.
- Main owns runtime integration, review, deployment and browser validation. Independent agents reviewed branch coverage and hosting; a separate worktree implements missing user-flow tests. No concurrent core-file editing.

## Preview target and safety

Existing target: **https://leotsouo.github.io/questnote-pwa-preview/**, separate repository `leotsouo/questnote-pwa-preview`, Pages `main` at `/`, HTTPS enforced. Production remains the independent `questnote-pwa` repository and `/questnote-pwa/` scope.

Only the assembled **preview** profile may be published there: `QuestNotePreviewDB`, `questnote-preview-` cache namespace, `/questnote-pwa-preview/` scope. Original preview baseline was `a1a0030974761861dc1221e52aad4d0563bfc342`. Production now uses a separate release branch as described below; no storage reset, forced currency or synthetic catalog was used.

Normal TLS checks and existing credentials confirm live preview manifest/SW/version matched `a1a0030`, and production matched `aada9a7`, before this run. This verifies those files, not every installed client.

## Regression fix and rollback

The deployed old production SW can delete sibling preview caches during activation. Previously the preview stayed on 503 even online. V3.4.9 repairs a missing required asset only after its network bytes match this artifact's SHA-256, using a canonical URL and only its own cache. Wrong hashes, 503 and offline responses remain rejected. Active clients are never reloaded or force-claimed, and IndexedDB is not touched by recovery.

Risk: deleted offline bytes cannot be recreated until online. If the server now hosts a different artifact, missing old-version bytes are rejected; close all preview windows and reopen online to allow the verified update. Do not clear site data. A content withdrawal must retain acquired Pet/Lore/IDs; reverting to the old preview runtime is not a proven save-compatible rollback. Prefer a compatible forward fix.

Final review also found that the old preview manifest enabled ?perf=1 and its test-currency button. V3.4.9 starts without that query, disables diagnostics/dev modes in assembled artifacts, and rejects test currency before writes. Old shortcuts are covered by Node and actual artifact browser tests. No schema/ID changes were required.

## Validation and current state

The initial integration passed 141 Node tests, 34 logic assertions, 98 JavaScript syntax checks, native backup/gacha/UI workflows, the synthetic pipeline, and 11 immutable artifact browser cases. The subsequent V3.4.10 iPhone fixes passed 142 Node tests, 34 logic assertions, image and content validation, the synthetic pipeline, 10 summon, 13 pool-content, and 11 release-artifact browser cases. The task/habit/collection/theme/reload/backup browser flow also passed. Detailed initial evidence is under `reports/final-integration/`; the current iPhone checklist is `docs/iphone-final-acceptance.md`. Physical iPhone Safari, keyboard, standalone and safe-area behavior require the user's device check and are never inferred from a desktop viewport.

The canonical source catalogs intentionally remain the original 72 pets/two pools. The release assembler merges the approved real candidate into the versioned 84-pet/three-pool bundle and keeps frozen legacy catalogs for old clients. Synthetic test pools stay in temporary fixtures.

## Preview history and current release

- V3.4.9 was published from source commit `5eb3d55c7e4be854a3531314ed349d55b913d8d9` as artifact `1a23fcd14d8ba55372636ad3c09a0316b504bd81f496d46fee3ceda5bcf274e8`, Preview commit `689a4a0582d8fd45e2747fb927b55cb5f63eec2c`. Its [Pages deployment](https://github.com/leotsouo/questnote-pwa-preview/actions/runs/35859738328) completed successfully, and the hosted default/sweet views were checked at 390x844.
- The V3.4.10 source commit `99510064dce30e63c8055f1022b9ad52552d05be` fixes pool hero swaps and bottom-nav motion, uses small pet images first for summon and collection, removes result-screen repeat draws, and removes the app-level reduced-animation setting while preserving the system preference.
- The V3.4.10 Preview artifact `ac75c41f18d2e46d1ed769dbba1a32319b1fae1da6178cdea199079f2a0f4a34` was assembled from that commit with preview scope `/questnote-pwa-preview/`, `QuestNotePreviewDB`, and 84 pets / three pools. Its manifest SHA-256 is `db865baa424d26cc0737fa21d4806d512218972ba76c4c63fb0b4b21a5f1edec`. The separate Preview repository commit is `d2c8d33905e4140eafd88c7380db8798aa9378c6`.
- The V3.4.10 [Pages deployment](https://github.com/leotsouo/questnote-pwa-preview/actions/runs/35868716778) completed successfully. Live HTTPS serves the pinned artifact ID and source commit; all 11 checked runtime/catalog files matched the local artifact SHA-256 values. Closing and reopening the agent-owned Preview tab completed the safe SW update without clearing storage. At 390×844, live Bloom/Frost switching updated the pool title and hero asset together, hid the previous hero during loading, kept the bottom navigation at the same position, and produced no horizontal overflow. Other iPhone-specific behavior remains for physical-device acceptance.
- The user confirmed the earlier iPhone issues were fixed, then reported the version information touching the card edge. V3.4.11 source commit `fb95dddcd900f81e8b96658609550273656f0975` restores mobile card padding and gives the long cache identifier a smaller, breakable text style. Default and sweet 390×844 regression checks passed with a full-length cache fixture; all 142 Node tests and 34 logic assertions still pass.
- Current Preview artifact: `db2b88364437440eb06ae76644942d52df651ad3881c569c2a93d44242fccf3a`, manifest SHA-256 `c4ee881d70477f32ec1f98cb6435e6e79440dcb46f7458e45551cc4755c1978f`, Preview repository commit `b89a6a665090392b161cd2caec6e00af00b2cc9b`. The [V3.4.11 Pages deployment](https://github.com/leotsouo/questnote-pwa-preview/actions/runs/35873755268) succeeded. Live HTTPS identity and six runtime/catalog hashes match; after a safe close/reopen update, the 390×844 hosted page shows 20px version-card inset, a fully contained cache identifier, and no horizontal overflow. The device-specific Safari check remains with the user.

## Production release and remaining risks

The user approved integrating the tested version into `main` and publishing it. Because GitHub Pages previously published directly from source `main`, Pages was first moved to a `gh-pages` branch at the identical old commit `aada9a73e6cf0381fc03359dafd78b70b274cce2`. Four live production file hashes remained unchanged after that configuration switch. Source `main` was then fast-forwarded to the validated integration commit; Pages continues to read only `gh-pages`.

The production profile assembled from the approved Frost candidate has artifact ID `8f856947cadaae13d87f761dadba2dfceb59d4711f8ff7fb5f2dc68404a67936` and manifest SHA-256 `98c19438c8ae6824c460d58b63aaf0fe887e4570d0d6ab37b0bc274416326cd3`. Its complete 331-file tree, including 84 pets and three pools, was committed byte-for-byte to `gh-pages` at `0c37bcebee2b15f7882897cf35d3f6692edaff29`. The immutable artifact passed strict verification and all 11 assembled-artifact browser cases, including legacy-worker transition, offline/503, profile isolation and no debug currency. The [production Pages run](https://github.com/leotsouo/questnote-pwa/actions/runs/35876850998) publishes that commit. Live HTTPS returned matching artifact identity and 12 checked runtime/catalog/image hashes; a read-only 390×844 browser visit completed the safe worker transition, showed V3.4.11 and all three pool choices, and had no horizontal overflow.

Existing installed clients may need to close all QuestNote tabs and standalone windows, then reopen online to activate the new verified worker. Do not clear site data. If a future issue requires withdrawing the new pool, retain acquired pet IDs, Lore and collection references; reverting directly to the old runtime is not a proven save-compatible rollback, so use a compatible forward fix or disable the pool while preserving catalog entries. Physical iPhone standalone, keyboard, safe-area and offline-reopen behavior remains device-specific acceptance. Broader M2B/PWA UX work remains deferred.
