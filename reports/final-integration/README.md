# Final integration acceptance — V3.4.9

Current source of truth: [integration record](../../docs/final-integration.md).

## Delivery

- Source branch: `codex/final-integration`.
- Frozen runtime commit: `5eb3d55c7e4be854a3531314ed349d55b913d8d9`.
- Live HTTPS: https://leotsouo.github.io/questnote-pwa-preview/
- Published Preview commit: `689a4a0582d8fd45e2747fb927b55cb5f63eec2c`.
- Preview artifact: `1a23fcd14d8ba55372636ad3c09a0316b504bd81f496d46fee3ceda5bcf274e8`.
- Preview manifest SHA256: `a1d642a5aa164d07c30df47c371a0a7b409c6ca628d6c772a51850fd51da1238`.
- Catalog SHA256: `3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32`.
- 84 real pets/Lore; three pools including Frost. No synthetic release content.

## Evidence

- `validation.json`: actual suite counts, failed-attempt resolutions, scope and device limits.
- `node-tests.txt`:141 tests passed, no failed/skipped;34 logic assertions passed.
- `syntax.json`:98 JavaScript files checked.
- `synthetic-pipeline.json`: final end-to-end isolated rehearsal, repeat reuse, real gacha planner, both release profiles.
- `artifact-verification.json`: exact331-file inventory, hash/profile/scope/precache checks,84 original PNGs/168 variants, deterministic repeat/dry-run.
- `preview-deployment.json`: non-force Preview publication and successful Pages run.
- `live-verification.json`: all331 files downloaded over verified HTTPS and hash-matched; production's three critical files unchanged.
- `live-browser.json`: actual hosted UI/version/update/theme/390px checks. No physical iPhone claim.

The prior V3.4.8 and initial V3.4.9 artifacts remain local historical outputs; they were not published during this task. Only the exact Preview artifact above was pushed. The production-profile artifact was used only in isolated browser fixtures.

## Reproduce focused acceptance

Run from the final-integration worktree:

```text
npm test
npm run images:check
npm run pools:validate
npm run test:pool:release
node devtools/final-user-browser-server.mjs
node devtools/release-browser-server.mjs
node devtools/release-artifact-browser-server.mjs --production <verified-production-artifact-dir> --preview <verified-preview-artifact-dir>
```

Use each fresh loopback URL printed by its server. Do not run mutating test harnesses on the live Preview, source production origin or over an existing user database. The final-user harness installs its UUID guard before importing the unchanged app and cleans only its owned test database. The artifact harness owns its entire fresh loopback origin and tests actual SW/IndexedDB behavior.

[15-step iPhone acceptance](../../docs/iphone-final-acceptance.md) is the remaining device exercise. Source main remains unchanged; direct merge is NOT READY because production Pages currently deploys raw main, and the device check is pending. No automatic rollback of user saves is permitted.
