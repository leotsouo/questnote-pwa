# V3.4.24 notification stack preview acceptance

Feedback f965402f-3bb8-4caa-badb-d8b8b53c8dbd reports overlapping achievement and reward notifications.

Reward, achievement, daily blessing and bond notices now share the existing flex notification container. Each notice reserves its actual height; long reward text wraps within the viewport. Existing timers and reward persistence remain unchanged.

Validation: 177 Node tests and summon assertions passed. Isolated Edge checks passed in default and sweet themes at 320, 393 and 768px: simultaneous reward, long achievement and title notices do not overlap, stay inside the viewport and expire normally. Screenshots are stored beside this report. Browser test exports the internal achievement presenter only through a loopback response override; it does not add testing hooks to the published app or write production data.

Release gate: publish preview only. Production publication requires the user's explicit OK after preview acceptance. Keep the feedback unresolved until production is released.
