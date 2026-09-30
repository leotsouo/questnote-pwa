# V3.4.33 collection series strip fix

The original series chips below collection milestones are retained. There is no extra series picker. Coarse-pointer touch-action permits both scroll axes without pinch zoom; filter rows contain horizontal overscroll. Edge-start touches within a filter row are handled by that row, preserving taps and vertical scrolling, while gestures elsewhere are left alone.

Validation: 192 integration Node tests, 11 theme tests and summon assertions pass. Isolated touch-input checks at 320x932 and 430x932 with the approved 84-pet catalog verify central and edge horizontal swipes, direct selection of the original series chips, no accidental selection during swiping, retained vertical edge scrolling, no added picker and no horizontal document overflow.

Physical iPhone Safari/standalone acceptance remains necessary for OS history gestures; desktop touch emulation cannot prove system gesture interception. References:
https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html
https://bugs.webkit.org/show_bug.cgi?id=240183

Preview only until the user says OK. Production remains unchanged. Both actual feedback reports remain investigating. GitHub Pages run 36764166556 was waiting and has not been verified as the new version; use a dedicated local artifact preview rather than the fault-injection test server.
