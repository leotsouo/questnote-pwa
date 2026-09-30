# V3.4.29 reminder settings polish — production receipt

The user requested visual refinement of the working reminder card. Existing production authorization was retained for this follow-up. [PR #13](https://github.com/leotsouo/questnote-pwa/pull/13) passed CI and merged at `9fad7f41f3785aeffa4f4643639b654e31ad6fe4`.

Production artifact: `49298afea132cd13c832dbd62ad13edfc7f788cc383b3906fea80c8cf7757a37`; manifest SHA-256 `6affc46b80a570af2f9d8f59f3ea27129ce4f4ea47a9c223cd5f1d86bfd59b2e`; 350 files, `/questnote-pwa/` scope. Strict artifact verification passed, all 350 staged blobs matched exact bytes before push, and 16 live HTTPS hashes matched after Pages success. Pages commit `13d3f5db135243b6a30d85148d2fa3d9c2c7bf0f`; [run 36740510978](https://github.com/leotsouo/questnote-pwa/actions/runs/36740510978) succeeded.

The time panel, theme switches, illustrative notification preview, disclosure, primary action and delivery area are frontend changes. Notification subscription, schedule and backend rules were not changed or redeployed. Latest V3.4.28 pet prompt position fix was retained. The existing 84-pet/three-pool catalog (`3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32`), pet image bytes and mailbox were preserved.

Validation: npm test passed (integration, reveal and themes); 8 isolated reminder-browser scenarios passed, including 12 combinations of themes and widths (320/393/430/768px), keyboard switch operation, preview privacy and original enable/save/test/sync/restore/disable flow. All 12 assembled artifact browser cases passed. Preview artifact `293ae3fa722a9df3abc3fb07a6a639de76adac024c29d33c9d410152ea740cd3` was only used for isolated acceptance, not published. Screenshots contain only synthetic test data.

Close older QuestNote windows and reopen online to activate the verified update without clearing data. Native iPhone time-picker presentation remains device-dependent. The user reported the reminder feature is usable; this change does not alter push transport or claim additional physical lock-screen receipt testing.

Fresh disposable hosted browser confirmed V3.4.29, its artifact-pinned active worker and the redesigned settings card. No production subscription was enabled or push sent.
