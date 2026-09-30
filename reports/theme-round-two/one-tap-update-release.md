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

Deployment and hosted verification are recorded below after publication.
