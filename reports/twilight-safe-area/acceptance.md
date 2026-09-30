# V3.4.26 暮光安全區與紙頁銜接

Source branch: `codex/twilight-safe-area`, based on fetched `origin/main`
`e346722`. This report originally recorded the source-only handoff. Production
publication is now verified in [the release receipt](production-release.md);
the separate hosted Preview was not updated. The preserved root checkout was not edited.

## Changes

- Synchronize the root/body theme markers. Twilight uses a dark root color scheme
  and `#172330` root/body background, while the journal and form controls stay light.
  Earlier themes restore their original root styling when selected.
- Keep the existing cover viewport and translucent Apple status-bar metadata.
  The app's existing safe padding remains applied once. Its background fills that
  inset with night color; a non-interactive fixed inset cover protects it on scroll.
  Paper texture begins below the top inset. Dialog/overlay stacking is retained.
- Back the complete 28px paper radius with the night scene by pairing 28px bottom
  padding with a 28px overlap. Bond content stays above the paper; bookmark and
  add-task entry remain in place.
- Version/cache identifiers are synchronized at V3.4.26. Existing runtime files
  are already in the precache closure. No save schema or catalog changes.

## Verified locally

- `npm ci` completed with Node 24.18.0. `npm test` passed all 183 Node cases
  (177 maintained cases and six theme cases), plus the summon/reveal logic assertions.
  See [full output](npm-test.log).
- `node --check` passed for the changed preferences/version modules, Service Worker,
  and the focused browser check. `git diff --check` passed.
- The focused [browser check](../../devtools/twilight-safe-area-browser-test.mjs)
  passed 79 cases in headless Edge, using disposable contexts on a loopback source
  origin, blocked Service Workers, and blocked non-local requests. No uncaught app
  errors or console errors were recorded. See [results](after-checks.json).
- Covered 430 × 932, 320 × 740 and 1280 × 900, with simulated 59/34px and zero
  safe insets, across all 13 app views. Checks include top pixel color before/after
  scrolling, safe positioning of headings/mailbox, full paper overlap and both
  corner pixels, bond clearance, no horizontal overflow, paper footer, theme
  switching, and persisted theme/tasks after startup. Empty home is also checked.
- Inspected the homepage, settings, empty state, narrow and desktop screenshots.
  The [comparison page](comparison.html) shows the original and fixed layouts.
  Baseline screenshots load the original CSS/preferences from `origin/main` in
  memory, without resetting or replacing checkout files. Random companion dialogue
  may differ; the companion/task fixture configuration is identical.

## Physical iPhone acceptance — pending

Browser screenshots simulate layout insets; they do not render native iOS chrome.
On iPhone 14 Pro Max / iOS 26, verify from the existing home-screen App:

1. Home, settings and expedition have a continuous dark top background, readable
   time/signal/battery text, and no controls behind the Dynamic Island.
2. Scroll and switch pages; the top remains dark and the bottom remains paper-colored.
3. Inspect both home paper corners and bond content, with and without tasks.
4. Switch to both earlier themes and back; close/reopen and confirm the theme and
   user data persist. Do not clear site data or reinstall to perform this check.

The user subsequently requested publication; the immutable artifact release is
recorded in [production-release.md](production-release.md).

## Reproduce

Start `node devtools/browser-test-server.mjs 8773`, then run
`node devtools/twilight-safe-area-browser-test.mjs http://127.0.0.1:8773`.
If Playwright is not installed in the checkout, set `PLAYWRIGHT_MODULE` to the
installed Playwright module URL. Use `--before` to capture the current
`origin/main` baseline. Open `/reports/twilight-safe-area/comparison.html` on the
same loopback server to inspect the saved comparison.
