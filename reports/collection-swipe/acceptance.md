# V3.4.33 collection series strip fix

The original series chips below collection milestones are retained. There is no extra series picker. Coarse-pointer touch-action permits both scroll axes without pinch zoom; filter rows contain horizontal overscroll. Edge-start touches within a filter row are handled by that row, preserving taps and vertical scrolling, while gestures elsewhere are left alone.

Validation: 192 integration Node tests, 11 theme tests and summon assertions pass. Isolated touch-input checks at 320x932 and 430x932 with the approved 84-pet catalog verify central and edge horizontal swipes, direct selection of the original series chips, no accidental selection during swiping, retained vertical edge scrolling, no added picker and no horizontal document overflow.

Physical iPhone Safari/standalone acceptance remains necessary for OS history gestures; desktop touch emulation cannot prove system gesture interception. References:
https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html
https://bugs.webkit.org/show_bug.cgi?id=240183

Preview only until the user says OK. Production remains unchanged. Both actual feedback reports remain investigating. GitHub Pages run 36764166556 was waiting and has not been verified as the new version; use a dedicated local artifact preview rather than the fault-injection test server.

Current reviewed layout: original series chips only. User-facing local preview: http://127.0.0.1:8777/questnote-pwa-preview/, served by a dedicated static server (not the fault-injection harness). Source 47c5d8a; artifact 2e0edb41bb6e27c56a6a485c2a958353d4467a44e064f90423f5fb65285d2e98; manifest SHA-256 59820cda5a47c2d7f950f15c28ec158e9a5c7ae829f91eda81252b1dbb0005a5. Strict verification passed for 372 files. Preview repository 774ee92 contains exact artifact bytes; hosted deployment is not yet verified. The currently open browser shows the original strip and no series picker. Production remains unchanged pending user OK.
