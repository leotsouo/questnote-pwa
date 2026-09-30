# V3.4.32 — one-tap update and home-screen icon help

Runtime source: `f38c78e` (includes `2135b77`). Production candidate is pinned in `one-tap-update-pins.json`; only its `production` entry may be published. The V3.4.33 generation is an ephemeral native-browser fixture, never a production release.

More and Settings now expose “檢查並更新”, “重新載入 App”, and “更新主畫面圖示”. A verified waiting release gets a dismissible update prompt. Foreground checks run at launch, return to foreground and every five minutes. Updates are user-initiated; downloads never force a reload. Complete asynchronous UI operations and visible editors/dialogs veto a reload. The UI becomes inert while pending DB writes drain. The waiting worker checks every cached file and digest, then rejects activation if another in-scope window (including legacy/uncontrolled clients) remains. It never claims uncontrolled clients and still ignores legacy `SKIP_WAITING`. A successful controller switch reloads the same window; bootstrap confirms the worker's artifact identity even when update() fetched new bytes at the previous worker URL.

The real 180px 同行星芽 icon is previewed. The guide opens backup settings and the existing install URL. It preserves manifest ID, scope, start URL and database; it never deletes storage, unregisters workers or uninstalls the PWA. iOS cannot be instructed by web code to replace an existing Home Screen icon. Users first export JSON, add the same site in Safari, verify/restore the new installation, and retain the old entry until data is confirmed. Physical iPhone icon replacement, standalone safe-area and VoiceOver remain device checks. V3.4.31 lacks the button and requires one final natural close/reopen to obtain V3.4.32.

Validation:

- npm test: 192 primary + 11 theme cases pass; maintained reveal assertions pass. Changed JavaScript syntax and diff whitespace checks pass.
- Three worlds, 320/393px, 12 views: 210 checks pass; preceding home seam remains a full 24px overlap.
- Two actual assembled generations on a fresh guarded loopback origin: 7 cases pass. Waiting-download behavior, full asynchronous-operation veto, unsaved task text, another app window, one-click cached update with all artifact HTTP returning 503, current-version checks, and icon/backup navigation. Same iframe stays open during upgrade; all five stores remain exact except the expected mailbox fetch timestamp.
- Assembled production/preview safety: 12 cases pass, including fail-closed bootstrap, legacy migration, scope/database isolation, eviction repair, wrong hashes/503, offline boot and saved lessons.
- Strict artifact verifier passes production, preview and test-only fixture. All 84-pet/3-pool production catalogs, mailbox and asset hashes match V3.4.31. No backend, schema, reward or progression rule changes.

Publication verified:

- PR #16 merged at `599a926ae8d36c5082110c9c89df3d12c12cf632`; PR CI run `36760174105` passed.
- Production artifact `fbb07931fc76df36bef063435230a8ecfe1dc264613af6c3d85adebb1831b017`, manifest SHA-256 `b7d1d28a9e0cc287cdae31bf6b6752e25d8b61fd98aef5aae540a0156a0d2c4f`. All 371 staged Git blobs matched before push.
- gh-pages commit `505da31a7a97084c9a2b6e2b94842e2a3f1bef97`; Pages deployment run `36760461750` completed successfully. The source main checkout was not copied onto Pages.
- 16 focused HTTPS reads match reviewed bytes, including manifest, bootstrap, worker, controller, UI, icons, mailbox and 84-pet/3-pool catalog.
- Hosted PWA naturally migrated from V3.4.31, displayed V3.4.32 / worker enabled, reported “目前已是最新版本”, and its “重新載入 App” button successfully reloaded the same tab. No production fixtures or gameplay actions were added; existing stored state was left intact.
- Hosted controls verified at 393/320px. Primary/reload targets are 44px; icon entry is 72px; no horizontal overflow. On 320px the two controls stack, and the guide has a working vertical scroll area. Actual 393px screenshots: `one-tap-update-live-controls.jpg`, `one-tap-update-icon-guide.jpg`.
- Remote backup tags `codex/update-backup-v3.4.31-source` → `ce1efbf8394d100a78c5b0de411d8199de25744b` and `codex/update-backup-v3.4.31-pages` → `52c12fde44ce505c627051142daca17f3440dea0`. Earlier V3.4.29 design backups remain preserved. A rollback restores compatible presentation files as a new descendant commit; never force-push or clear player storage.
