# V3.4.26 verified production release — 2026-09-30

The user explicitly requested publishing the implemented fix to GitHub production.
The release uses the existing immutable artifact flow and configured `gh-pages`
publishing branch; the source checkout was never copied directly to Pages.

- [PR #10](https://github.com/leotsouo/questnote-pwa/pull/10) merged after
  [CI](https://github.com/leotsouo/questnote-pwa/actions/runs/36733340720) passed
  the maintained suite, catalog validation and image checks. Source merge:
  `fa70beb4c90e71a4c732cb60a9da1b7f4b6d9fe9`.
- Production artifact: `9c2bd9c3ac2ebdb9202f6f2b942df8346cca9b6c2c8e4ecd64f3e3a06592ff37`.
  Manifest SHA-256: `e9755c2be942bf170345e31ca6e77721b4e708edc5f55e15f45560de7c7ef453`.
  Strict verification passed, and all 349 staged Git blobs matched the pinned
  artifact before commit/push. See [artifact pins](release-pins.json).
- Pages commit: `acf74ec254b761bd7eaab509256e020762702a46`.
  [Build and deployment](https://github.com/leotsouo/questnote-pwa/actions/runs/36734233393)
  completed successfully. All [16 live HTTPS hashes](live-hashes.json), including
  the manifest, version, twilight CSS, preferences, worker, mailbox and catalog,
  match the exact pinned artifact bytes.
- All [12 assembled-artifact browser cases](release-browser.json) passed,
  including legacy-worker transition, offline startup, DB/cache isolation and
  resumable growth lessons. Source acceptance passed 183 Node cases plus summon
  assertions and 79 isolated layout cases; see [acceptance](acceptance.md).
- A fresh disposable hosted browser confirmed V3.4.26, the matching verified
  worker, persisted root/body twilight styling and no horizontal overflow after
  reload. No user browser storage or production feedback submissions were used.
  See [observations](live-browser.json), [home](live-home.png) and
  [settings](live-settings.png). These screenshots use simulated 59/34px insets.

The existing approved 84-pet / three-pool bundle
`3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32`
and candidate metadata were retained by their original hashes. Live baseline
version/manifest/mailbox bytes were read back before assembly; the production
mailbox bytes were preserved. No backend deployment or save migration occurred.
Preview was assembled for isolated acceptance only, not published.

Production: [QuestNote](https://leotsouo.github.io/questnote-pwa/).
Close older QuestNote tabs and home-screen windows, then reopen online for natural
verified-worker activation. Do not clear site data. Physical iPhone 14 Pro Max /
iOS 26 status-bar text and Dynamic Island acceptance remain device-specific and
are still pending; desktop browser results do not claim this check passed.
