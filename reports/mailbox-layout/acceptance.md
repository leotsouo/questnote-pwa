# V3.4.16 mailbox layout repair

The reported V3.4.13 growth-gift letter reproduces the cropped filter chips at 430×932 with a simulated 59px top / 34px bottom safe area. The 36px chips occupied a filter row reduced to 29.17px by flex shrink. The sheet also repeated the 59px safe inset even though its maximum height already places it below the unsafe top edge.

The header, offline notice and filters now retain their intrinsic height. The body is the shrinking scroll container, and the sheet uses 12px top padding. No message, reward, claim identity, database schema or saved state changed. The service-worker cache and app version are synchronized at V3.4.16; the existing stylesheet remains in precache.

- Before: [screenshot](before.png); after: [screenshot](after.png).
- The isolated browser check failed on the old CSS and passes after the repair.
- 16 browser cases passed: 430×932, 320×568, 932×430 and 1280×900; sweet/default themes; growth-gift and shorter Frost announcement. Checks cover toolbar/chip bounds, reading area, fixed toolbar while scrolling and reachable gift button without claiming.
- `npm test`: 169 tests and all 34 summon logic assertions passed.
- JavaScript syntax and `git diff --check` passed.

Run `node devtools/browser-test-server.mjs 8768`, then `node devtools/mailbox-layout-browser-test.mjs`. Requires Playwright and Edge; `PLAYWRIGHT_MODULE` can supply an installed Playwright module URL. Each run uses disposable browser storage, blocks service workers and external requests, and never submits a report or claims a gift. Screenshots are refreshed by the test. These are desktop Chromium viewport checks with simulated safe-area values, not physical iPhone Safari acceptance.
