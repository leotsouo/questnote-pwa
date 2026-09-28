# V3.4.17 companion feeding entry

The feeding modal existed in `src/ui.js`, but only called itself after a feed and had no initial navigation path. The task companion card and owned collection pet details now expose a visible 餵食 action. Both open the same item picker and use the existing `useBondItem` rules for inventory, the daily limit and bond EXP. Unowned pets have no feeding action. With no food in stock, the modal links to the workshop craft tab.

Visual evidence at 393×852: [task companion](home.png), [feeding modal](feed.png), [sweet theme](feed-sweet.png), [owned collection detail](collection-detail.png).

`devtools/companion-feeding-browser-test.mjs` passed on an isolated loopback browser profile. It fed the active companion and a different owned collection pet, checked that each received its own bond EXP and consumed one item, then followed the empty inventory path to crafting. It also checked that an unowned pet has no feeding action. The browser profile blocks external requests and service workers; it does not open a user's save or submit production feedback.

`npm test` passed all 169 Node cases and the reveal-flow assertions. Syntax checks for changed JavaScript and `git diff --check` passed. Desktop Chromium was used at a phone-sized viewport; physical iPhone Safari remains a device check.
