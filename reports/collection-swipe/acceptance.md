# V3.4.33 collection series strip fix

The original series chips below collection milestones are retained. There is no extra series picker. Coarse-pointer touch-action permits both scroll axes without pinch zoom; filter rows contain horizontal overscroll. Edge-start touches within a filter row are handled by that row, preserving taps and vertical scrolling, while gestures elsewhere are left alone.

Validation: 192 integration Node tests, 11 theme tests and summon assertions pass. Isolated touch-input checks at 320x932 and 430x932 with the approved 84-pet catalog verify central and edge horizontal swipes, direct selection of the original series chips, no accidental selection during swiping, retained vertical edge scrolling, no added picker and no horizontal document overflow.

Physical iPhone Safari/standalone acceptance remains necessary for OS history gestures; desktop touch emulation cannot prove system gesture interception. References:
https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html
https://bugs.webkit.org/show_bug.cgi?id=240183

Preview only until the user says OK. Production remains unchanged. Both actual feedback reports remain investigating. GitHub Pages run 36764166556 was waiting and has not been verified as the new version; use a dedicated local artifact preview rather than the fault-injection test server.

Current reviewed layout: original series chips only. User-facing local preview: http://127.0.0.1:8777/questnote-pwa-preview/, served by a dedicated static server (not the fault-injection harness). Source 47c5d8a; artifact 2e0edb41bb6e27c56a6a485c2a958353d4467a44e064f90423f5fb65285d2e98; manifest SHA-256 59820cda5a47c2d7f950f15c28ec158e9a5c7ae829f91eda81252b1dbb0005a5. Strict verification passed for 372 files. Preview repository 774ee92 contains exact artifact bytes; hosted deployment is not yet verified. The currently open browser shows the original strip and no series picker. Production remains unchanged pending user OK.

Mouse follow-up: both original filter rows now support primary-button pointer dragging. Trusted Playwright mouse input at 320/430px revealed 未獲得, preserved the selected filter during drag, and allowed the next click. Touch regressions and npm test passed. Local preview: http://127.0.0.1:8778/questnote-pwa-preview/. Production remains unchanged.

Production approved by user and published 2026-10-01 (Asia/Taipei). PR #17 merged at bc3fb784d99ec9cd85d92333c8707c10bf8a8cbe. Production artifact 4e04d3a13c9a5c3759130efcfc7bea52885f21338dc3b3bff12c0eedf00d492a; manifest SHA-256 0a4e48564f17a5aa76f37fda43a3737e49b67952ab095788d5ec3d14379478eb; deployment commit 3942a7f35287a0aa2c3ac343b45115ec4948a380. Pages run 36766712381 succeeded. All 372 live HTTPS files match the immutable artifact exactly. Native assembled-artifact suite passed 12/12. Verified live APP_VERSION 3.4.33 and production cache profile; existing approved 84-pet catalog preserved. Earlier pending-production statements above are historical. Physical iPhone system gestures remain device-only acceptance.
