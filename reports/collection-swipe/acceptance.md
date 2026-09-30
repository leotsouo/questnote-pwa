# V3.4.33 collection swipe preview

New iPhone standalone feedback: series filters cannot scroll; edge gestures while selecting a series trigger history navigation. Both reports observed production V3.4.32 at 430x932.

Root cause: the coarse-pointer touch-action rule restricted html/body/all ancestors to pan-y, so horizontal overflow rows could not receive native horizontal scrolling. Restore pan-x pan-y without pinch-zoom. Filter rows contain horizontal overscroll; edge-start touches within their vertical bounds are cancelled early and manually scrolled, with taps retained and vertical scrolling preserved. This guard does not intercept gestures elsewhere. Add a native series picker synchronized with filter chips, so every series can be selected without swiping.

Validation: 192 integration Node cases, 11 theme cases and summon assertions passed. Isolated Chromium checks at 320x932 and 430x932 use the existing approved 84-pet catalog and actual dispatched touch input: central and screen-edge swipes scroll the row, swiping does not change the selected chip, picker and chips stay synchronized, real series cards render, vertical edge gestures preserve page scrolling, no horizontal document overflow. Synthetic cancellation checks cover edge, center and unrelated touch starts. Screenshots and Node output are alongside this file.

Safari system navigation must still be accepted on physical iPhone Safari and standalone; desktop touch emulation cannot prove OS-level gesture interception. Apple's touch event handling documentation supports early preventDefault; WebKit has documented limitations for CSS-only history containment:
https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html
https://bugs.webkit.org/show_bug.cgi?id=240183

Release gate: preview only until the user says OK. Both actual feedback reports are investigating, not resolved. Production remains V3.4.32. Reuse the existing production 84-pet/three-pool candidate, preserving content and mailbox.
