# Remove shared summon omen — 2026-10-08

The user confirmed the circle below the Honeylight candy and requested removing the same design from other pools. Removed the shared `dream-bloom-omen` DOM element from `createOverlay`, including the redundant glacier-specific removal. All five supported summon templates now omit this object. Pool scenery, candy, rarity timing, results and reveal ornaments remain intact.

Based on origin/main `45e1c29`. Source version/cache advanced together to V3.8.7; the controller is already in the precache closure. No push, merge or deployment.

Validation: Node 24.18.0; changed JavaScript syntax checks pass; 23 targeted tests pass (Honeylight, shared summon timing, Lionheart and app update); 34 real-browser animation tests pass, zero failures. The browser matrix covers five templates × single/ten × full/reduced motion, verifies the absent DOM object, unchanged results and successful summary cleanup. Existing phase skipping, complete debut/replay, both URs, SSR queue, image fallback and failure recovery also pass. Diff whitespace check passes with CRLF enabled.

Browser evidence: isolated loopback `http://127.0.0.1:52242/devtools/honeylight-animation-preview.html?auto`, title `PASS — Honeylight animation`; player IndexedDB access is explicitly prohibited by the harness. Removed-circle visual review uses actual current controller markup and scene/CSS.

App-managed worktree registered to this chat, branch `codex/remove-summon-omen`. Standard create/Adopt wrappers failed their existing JSON local-file verification; fallback task/owner/Hold metadata is recorded in ignored `.dev-backups/task-lifecycle/remove-summon-omen.json`. Retain the checkout while its commit is local and unintegrated.