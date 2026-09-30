# V3.4.25 review and production release

The user requested review and production publication, delegated review selection,
and explicitly approved repairing the Bugbot finding before continuing publication.
Review used the Review / Review Bugbot skills once.

## Review

Bugbot found one P2 in `src/twilightPresentation.js`: no selected companion was
treated as no owned pets. The repair distinguishes the empty collection from an
owned collection without a companion, routes the latter to the existing collection
handler, and includes ownership state in the home presentation cache key.
Two focused regressions verify the correct CTA and refresh after first ownership.
The reviewer did not edit source. No second review was run.

## Source and release

- [PR #9](https://github.com/leotsouo/questnote-pwa/pull/9) merged at
  `60dc95cbedced256a4dd612f5c638926d16e157b`.
- Reviewed release source: `f2757f78916d7d956e5d441edda0c94cde0c0d5c`,
  retained as an ancestor of main; all runtime Git blobs equal the integrated tree.
- [Repair CI](https://github.com/leotsouo/questnote-pwa/actions/runs/36713794248)
  passed the maintained suite, summon assertions and six theme tests (183 Node cases).
- Production artifact: `13f4e0d49a61dba891fd68549a5fac09b8a5677e26cc48c4b3900d5855dfb8ec`.
- Manifest SHA-256: `c4a98025b0daa01f2f30b3c8b1770c58cc2069b61fc1199bf0163a57c1dd1bd9`.
- All 349 staged Git blobs matched the immutable artifact before push.
- Pages commit: `7a4e77be7d126109e246d8d20d27361a53358116`.
- [Pages deployment](https://github.com/leotsouo/questnote-pwa/actions/runs/36714554744)
  succeeded. [14 live HTTPS hashes](live-hashes.json) match the pinned artifact.
- [12 isolated assembled browser cases](release-browser.json) passed, including
  legacy update, offline startup, profile isolation and resumable growth lessons.
- The approved 84-pet / three-pool bundle and existing production mailbox bytes
  are unchanged. No feedback backend deployment or storage migration occurred.
- Preview was assembled only for isolated acceptance, not published.

Production: <https://leotsouo.github.io/questnote-pwa/>.
Select **更多 → 美術風格 → 暮光冒險手帳**. The two earlier themes remain available.
The hosted page displayed V3.4.25 with an active service worker after natural
close/reopen activation. The 393 × 852 picker had no horizontal overflow and
showed all three choices with twilight selected; [live screenshot](live-theme-picker.jpg).
Older open clients may need to close their App windows and reopen online for the
verified worker update. Do not clear site data. Physical iPhone standalone, keyboard
and safe-area behavior remain device-specific acceptance.
