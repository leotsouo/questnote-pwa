# V3.4.37 production release — 2026-10-01

The user explicitly approved production publication. Publication is complete at https://leotsouo.github.io/questnote-pwa/.

- Source PR: https://github.com/leotsouo/questnote-pwa/pull/23; merged main commit `1604423914762c57ba5474b76a6da642339306dd`.
- Reviewed runtime source: `704896b876b0316b4182da7052b36ffc5c464a31`; runtime files match merged main.
- Production artifact: `a63513a696737209d41aa8ec6a1d7f1c1540b390b7e893beaa9c0b19f2a6c1f5`.
- Manifest SHA-256: `99ed4e59d944563a479fb9fde0d945b11fee1befb8fb7ab2f93aa2fa037be0a1`.
- Pages commit: `a5e563b03d80f1bb3eadad2631871eb3c9807b52` (fast-forward from `9e815676db8ff3e203391894090a52b1d5090129`).
- Successful Pages deployment: https://github.com/leotsouo/questnote-pwa/actions/runs/36780180601.

All 413 deployed Git blobs match the pinned production artifact. Regression checks passed: 207 primary, 11 theme, and 5 Honeylight cases (223 total), plus reveal-flow logic assertions and changed JavaScript syntax checks. Both immutable artifact verifications and 12 assembled artifact browser cases passed. Twenty live HTTPS files match their pinned hashes; see `production-live-hashes.json` and `artifact-browser-results.json`.

This release includes the standard/large/extra-large font preference and enlarged-layout repairs described in `../font-size-audit-2026-10-01.md`. Latest main workshop gift functionality and Honeylight animations remain present. The approved 96-pet/four-pool catalog has SHA-256 `f00f02ed3dc6414a7bdc41b1032d1f021e6a19edd1b1f5792f27725ec07abc45`. Mailbox bytes, production DB identity and `/questnote-pwa/` scope are preserved.

The existing production browser detects the verified waiting update. Its activation was blocked by the existing other-open-window safety guard. No player storage was cleared and no forced worker activation was used; activation in that existing browser is not claimed. Close other QuestNote windows and use the in-app update action to apply the release. Actual iPhone system text-size behavior has not been tested on a physical iPhone.

`deployment-preparation.json` describes the pre-push preparation state; this receipt and the successful Pages run are the final publication evidence.
