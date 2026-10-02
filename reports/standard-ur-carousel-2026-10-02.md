# Standard pool UR preview — 2026-10-02

Source baseline: origin/main e17be76. Feature branch: codex/standard-ur-carousel.

Standard summon now shows all eligible UR characters in a black-and-white preview using the existing themed-pool silhouette filter. Clicking the image (or activating the button with keyboard) advances and wraps. Character title and position update together. There is no timer or additional control, following the user's preference. Selection survives rerenders; switching pools hides this preview. Draw logic and catalogs are unchanged.

Validation:
- npm test: passed, 258 main tests + 11 theme tests + 5 Honeylight tests, plus reveal-flow assertions.
- Focused standard-ur-carousel suite: 2 passed (real catalog eligibility, cycling, rerender selection, stale image loads and original-image fallback).
- Changed JavaScript syntax checks and git diff --check passed.
- Browser on isolated localhost: 9 eligible URs shown; click advances 1/9 to 2/9 and 3/9; continued clicks wrap to 1/9; switching to Eternal Slumber hides the standard preview and retains the existing themed stage.
- Screenshot: standard-ur-carousel.jpg.

Runtime version/cache: 3.5.6 / questnote-preview-cache-v356-standard-ur. New module is precached.

Status: local source implementation and verification complete. No source merge or preview/production deployment performed.
