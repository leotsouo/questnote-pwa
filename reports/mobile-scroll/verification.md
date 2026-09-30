# Mobile scroll without page zoom — 2026-09-30

Source branch: `codex/mobile-scroll-only`, based on fetched `origin/main`.
Runtime version: 3.4.23. Initial local checks below preceded publication.
Production publication is recorded in `docs/final-integration.md` and the
`live-hashes.json`/`live-browser.json` evidence alongside this report.

- Viewport fixes the mobile page scale at 1.
- Coarse-pointer devices use `touch-action: pan-y`, including nested scrollers.
  Low-specificity defaults preserve existing custom gesture surfaces.
- Mobile form controls use at least 16px text to avoid iPhone focus zoom.
- Version and service-worker cache identity are synchronized. No new runtime
  assets were added, so the existing precache list still covers the change.

Validation:

- `npm test`: 177 tests passed, plus all reveal-flow logic assertions.
- `node --check src/version.js` and `node --check service-worker.js`: passed.
- Disposable Edge/Chromium mobile context, 390 × 844, touch enabled,
  service workers blocked, external requests blocked, loopback server only:
  native CDP touchStart/touchMove/touchEnd scrolled the page 441px and a
  temporary nested scroll container 263px; simulated pinch retained scale 1;
  all nine form controls had computed font sizes of at least 16px.
- CDP synthesizeScrollGesture did not move the page in this environment;
  explicit touch-event sequences above verified scrolling instead.
- Screenshot: `mobile.png` (temporary scroll fixtures removed).

Real iPhone Safari and installed PWA checks remain device-only, including
double-tap and keyboard focus. Browser accessibility overrides may still
permit zoom; OS-level magnification is outside the page's control.
