# QuestNote final integration

This is the current integration record. Earlier `reports/release-v3.4.8/` and authoring handoffs remain historical evidence, not the current deployment status.

## Source and ownership

- Branch: `codex/final-integration`, isolated at `.worktrees/final-integration`.
- Shared Card Pool/UI base: `95a4f5d70233195050f1f0fce2eee3d9945c2b32`.
- Starting point: `codex/release-v3.4.8` at `7e2c7c2`, which already descends from UI tip `0bee84d` and includes the reviewed Glacier runtime integration `0de878a` and contrast fixes `b588cd9`.
- Compared actual root Card Pool dirty files against this tree. No functional runtime changes were omitted. Existing UI markup, scoped polish styles, dialog focus, transaction primitives and declarative pool contract are retained.
- No new Git text conflicts were introduced: the reviewed integration history was reused rather than replayed or overwritten. The original dirty root checkout and original worktrees remain untouched.
- The real `frost_oath_fjord` authoring workspace is now preserved in this branch, including raw approval snapshots and immutable candidate `697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131`. Exact-byte Git attributes prevent line-ending conversion from invalidating its hashes.
- Main owns runtime integration, review, deployment and browser validation. Independent agents reviewed branch coverage and hosting; a separate worktree implements missing user-flow tests. No concurrent core-file editing.

## Preview target and safety

Existing target: **https://leotsouo.github.io/questnote-pwa-preview/**, separate repository `leotsouo/questnote-pwa-preview`, Pages `main` at `/`, HTTPS enforced. Production remains the independent `questnote-pwa` repository and `/questnote-pwa/` scope.

Only the assembled **preview** profile may be published there: `QuestNotePreviewDB`, `questnote-preview-` cache namespace, `/questnote-pwa-preview/` scope. Original preview baseline is `a1a0030974761861dc1221e52aad4d0563bfc342`. No production push, Pages setting change, merge to source main, storage reset, forced currency or synthetic catalog is authorized or performed.

Normal TLS checks and existing credentials confirm live preview manifest/SW/version matched `a1a0030`, and production matched `aada9a7`, before this run. This verifies those files, not every installed client.

## Regression fix and rollback

The deployed old production SW can delete sibling preview caches during activation. Previously the preview stayed on 503 even online. V3.4.9 repairs a missing required asset only after its network bytes match this artifact's SHA-256, using a canonical URL and only its own cache. Wrong hashes, 503 and offline responses remain rejected. Active clients are never reloaded or force-claimed, and IndexedDB is not touched by recovery.

Risk: deleted offline bytes cannot be recreated until online. If the server now hosts a different artifact, missing old-version bytes are rejected; close all preview windows and reopen online to allow the verified update. Do not clear site data. A content withdrawal must retain acquired Pet/Lore/IDs; reverting to the old preview runtime is not a proven save-compatible rollback. Prefer a compatible forward fix.

## Validation and current state

Acceptance is in progress. Final results and artifact/deployment pins are saved under `reports/final-integration/`; the iPhone checklist is `docs/iphone-final-acceptance.md`. Physical iPhone Safari, keyboard, standalone and safe-area behavior require the user's device check and are never inferred from a desktop viewport.

The canonical source catalogs intentionally remain the original 72 pets/two pools. The release assembler merges the approved real candidate into the versioned 84-pet/three-pool bundle and keeps frozen legacy catalogs for old clients. Synthetic test pools stay in temporary fixtures.
