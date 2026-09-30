# V3.4.24 notification stack preview acceptance

Feedback f965402f-3bb8-4caa-badb-d8b8b53c8dbd reports overlapping achievement and reward notifications.

Reward, achievement, daily blessing and bond notices now share the existing flex notification container. Each notice reserves its actual height; long reward text wraps within the viewport. Existing timers and reward persistence remain unchanged.

Validation: 177 Node tests and summon assertions passed. Isolated Edge checks passed in default and sweet themes at 320, 393 and 768px: simultaneous reward, long achievement and title notices do not overlap, stay inside the viewport and expire normally. Screenshots are stored beside this report. Browser test exports the internal achievement presenter only through a loopback response override; it does not add testing hooks to the published app or write production data.

Release gate: publish preview only. Production publication requires the user's explicit OK after preview acceptance. Keep the feedback unresolved until production is released.

Preview deployment: source `4b995b2`, artifact `f8e7b79ffb561c9e539d8cf23a3d111cdcca337305a17bade4446ffbd28e1208`, manifest SHA-256 `ed3284ea960f38cae750643b3c0b684f714dbcd5218f76644c2abbeec1ed2312`, preview repo commit `1db74bf`. All 346 staged blobs matched the immutable artifact. Twelve assembled-artifact browser cases passed; PR #8 CI passed. Deployment run: https://github.com/leotsouo/questnote-pwa-preview/actions/runs/36702575922.

Preview URL: https://leotsouo.github.io/questnote-pwa-preview/. This uses QuestNotePreviewDB and a separate cache/scope. The previously published 84-pet/three-pool candidate was reused from the V3.4.23 release; production source/main and gh-pages are unchanged. User must confirm V3.4.24 in settings and test simultaneous task reward and achievement/title notices before approving production. Do not clear production site data.

Live verification completed: Pages run 36702575922 succeeded; HTTPS release manifest, UI, CSS, version, service worker and release profile all matched the pinned preview artifact bytes. Preview is ready for user acceptance; production remains V3.4.23.
