# Standard pool UR preview — 2026-10-02

Source baseline: origin/main e17be761f61b7480ae663e1be5cef3f9baa2efec. Feature branch: codex/standard-ur-carousel. Merged through PR #48 at source commit 9c0d3e37d0fdd3e97e30b0f84fecb52b4b98ffb1; GitHub Actions Validate passed.

Standard summon now shows all eligible UR characters in a black-and-white preview using the existing themed-pool silhouette filter. Clicking the image (or activating the button with keyboard) advances and wraps. Only the character title and position are shown. Characters without titles have no identifying text; neither captions nor image alt text fall back to character names. There is no timer or additional control, following the user's preference. Selection survives rerenders; switching pools hides this preview. Draw logic and catalogs are unchanged.

Validation:
- npm test passed before the title-only follow-up; PR #48 CI passed with the final source.
- Focused standard-ur-carousel suite: 2 passed (real catalog eligibility, cycling, rerender selection, stale image loads and original-image fallback).
- Changed JavaScript syntax checks and git diff --check passed.
- Browser on isolated localhost: 9 eligible URs shown; click advances 1/9 to 2/9 and 3/9; continued clicks wrap to 1/9; switching to Eternal Slumber hides the standard preview and retains the existing themed stage.
- Screenshot: standard-ur-carousel.jpg.

Release: V3.5.7. The assembler generated profile-specific production and preview artifacts from merged source 9c0d3e37d0fdd3e97e30b0f84fecb52b4b98ffb1. Production uses the immutable artifact identifier and cache `questnote-production-app-0235b47e9f0e8aed5a4e707cce8e6c79a40a25543bd9841c23cee21f5c78ef33`; the runtime module is included in its verified precache.

## Production publication

- Previous production was V3.5.5, artifact `24d38b6793d3e5cec64e1aa896c7832c2c4a104a4e9851c8bb728edf052b1769`. The current production mailbox matched the release source byte for byte.
- Production artifact: `0235b47e9f0e8aed5a4e707cce8e6c79a40a25543bd9841c23cee21f5c78ef33`; manifest SHA-256 `9859b4fdc3379162abec5a60c7e6901955d29bb9b69cc8d80b1300ff12d2e10b`; 556 manifest files plus the manifest. Artifact verifier passed.
- Isolated production/preview artifact browser acceptance: 12 passed, 0 failed, including legacy service worker transition, offline launch, profile and database separation, and save preservation.
- Published Pages commit `03d1de744769f99f608ef777514b216705489dff`; [Pages run 36977202497](https://github.com/leotsouo/questnote-pwa/actions/runs/36977202497) succeeded.
- Formal HTTPS readback reports V3.5.7 and the new carousel module. All 557 artifact files, including the release manifest, matched their SHA-256 hashes and byte lengths; 0 mismatches.
- The user explicitly requested publication in this conversation.

The preview artifact was assembled and tested locally, but not separately deployed. Existing installs use the normal verified update flow; no database migration or save reset was needed.
