# V3.5.9 獅心城探險插畫與卡池配色已發布 — 2026-10-02

[PR #53](https://github.com/leotsouo/questnote-pwa/pull/53) 經 CI 合併於 `3a88db8f227e710c13324860197b73c1ce880573`。依使用者「生成後直接發到正式版」授權，獅心城新增正式探險插畫，卡池改用黃銅與蒸汽藍灰背景；SOP 與自動發布檢查補上所有新增地區的圖像、裁切與離線驗收。正式 artifact `fc6946ae230b2583071b1e814227d1c8e175b185750fe96e3fe7834b3e9d50e0`，gh-pages `9a01e6af5d643b4df88e3e89130595eebb6e76ef`，[Pages 36989205700](https://github.com/leotsouo/questnote-pwa/actions/runs/36989205700) 成功；598 個 Git 檔案與 598 個正式 HTTPS 檔案全部符合固定產物。12 項功能、10 項動畫、8 項升級／離線及三主題手機／桌面畫面驗證通過；保留 128 位寵物／6 池、既有 UR 動畫與最新信箱修正。[完整發布收據](../reports/lionheart/v359-publication.md)。

# V3.5.5 劍隱山河覺醒與雲棧古道已發布 — 2026-10-02

[PR45](https://github.com/leotsouo/questnote-pwa/pull/45)已合併，正式artifact 24d38b6793d3e5cec64e1aa896c7832c2c4a104a4e9851c8bb728edf052b1769，gh-pages 567266bc64e57b48824e8cf148096147272f2bf3，[Pages36972761813](https://github.com/leotsouo/questnote-pwa/actions/runs/36972761813)成功。二十隻覺醒、張口鎮嶺蛤與古道新地圖已上線；556個Git檔案／556個HTTPS檔案、正式瀏覽器與3.5.4→3.5.5存檔／快取／離線更新驗證通過。保留今日習慣、原卡池與資料。[完整發布收據](../reports/awakening-implementation/production-release.md)。

## 2026-10-01 — V3.5.1 親密度故事與精簡教學已發布

[PR #30](https://github.com/leotsouo/questnote-pwa/pull/30) 已合併，正式 Pages commit `09f1b66`、[run 36881650163](https://github.com/leotsouo/questnote-pwa/actions/runs/36881650163) 成功。417 個 Git blobs、254 項 Node 測試、12 項原生 artifact 驗收、11 項親密度瀏覽器驗收及 24 個正式 HTTPS 雜湊通過。保留 V3.4.42 的修正、96 位角色／四卡池與信箱。既有正式瀏覽器偵測 verified waiting 更新，另一個視窗阻擋套用；未清除存檔。[完整發布收據](../reports/bond-v351/production-release/README.md)。

# V3.5.4 今日任務可直接完成每日習慣 — 2026-10-02

[PR #44](https://github.com/leotsouo/questnote-pwa/pull/44) 已經 CI 合併至 main（`38288b3`）。每日習慣現在直接列在「任務 → 今日」，支援完成、取消、進度及管理入口，兩頁共用紀錄與既有獎勵規則。正式 artifact `1a1a51c938ee04c1300caedf019efdd17f8b3a706442d35936bb5b9ff493c842`，gh-pages `5d971c0bc65b99e6455b1237f483aa6c968159a9`，[Pages run 36930403527](https://github.com/leotsouo/questnote-pwa/actions/runs/36930403527) 成功。489 個 Git blob、13 項原生產物瀏覽器檢查、98 個 HTTPS 雜湊與 27 組習慣排版檢查通過；維持既有 116 位寵物／5 卡池、公開信箱及配方／探險資料。詳見 [發布收據](../reports/today-habits/production-release.md)。

## V3.4.40 探險目標與專長推薦已發布 — 2026-10-01

[PR #34](https://github.com/leotsouo/questnote-pwa/pull/34) 已合併至 main，來源提交 `e31638dab2f49313d39f9af34fab79185cfaf3e6`。正式產物 `8c0d2bdc8c2314fd2f665ea877fe337211580800d4db1f864ea5000a320c8b24` 的 410 個檔案通過逐一雜湊核對；gh-pages 提交 `964d9fa20ddc28fcb68207eee213534f0245bbd7` 的 [Pages run 36874334932](https://github.com/leotsouo/questnote-pwa/actions/runs/36874334932) 成功，13 個正式 HTTPS 檔案雜湊讀回吻合，12 項原生產物瀏覽器驗收通過。保留正式 96 隻寵物、4 個卡池與既有公開信箱。詳見[正式發布收據](../reports/expedition-recommendations/production-release.md)。

# V3.4.41 新增任務表單垂直捲動已發布 — 2026-10-01

[PR #35](https://github.com/leotsouo/questnote-pwa/pull/35) 已合併至 main（source commit `5ab101cbff464c5b0d2a255808db9e166d150834`）。新增任務表單只沿垂直方向捲動，窄螢幕與大字體欄位會自動換行。Production artifact `467338c8913e5370fb5960926837ccbcdb781ca14f3fc84a78ca45b03aa427dc` 的 410 個 Git blobs 全數符合核准產物；gh-pages commit `4e6744b352975eab2d821e7922426835596b461f`、[Pages run 36875482934](https://github.com/leotsouo/questnote-pwa/actions/runs/36875482934) 成功。12 個正式 HTTPS 檔案、12 項 assembled PWA 測試及 27 項正式表單版面測試通過。保留正式 96 隻角色、4 個卡池、信箱、`QuestNoteDB` 與 scope。其後 V3.4.42 更新亦保留相同表單 CSS；詳見[發布收據](../reports/task-form-layout/production-release.md)及[現行 HTTPS 核對](../reports/task-form-layout/current-production-validation.json)。

## 2026-10-01 — V3.4.37 字體大小與放大排版修正已發布

[PR #23](https://github.com/leotsouo/questnote-pwa/pull/23) 已合併。正式 Pages commit `a5e563b`、[run 36780180601](https://github.com/leotsouo/questnote-pwa/actions/runs/36780180601) 成功；413 個部署檔案、223 個回歸案例、12 項原生產物瀏覽器測試與 20 個正式 HTTPS 雜湊通過。保留最新工坊功能、Honeylight 動畫、96 位角色／4 卡池與信箱。既有瀏覽器偵測到 verified waiting 更新，但另一個開啟視窗阻擋套用；未清除存檔。詳見 [正式發布收據](../reports/font-size-audit/production-release.md)。

## 2026-10-01 — V3.4.35 工坊主題禮物與字體已發布

[PR #19](https://github.com/leotsouo/questnote-pwa/pull/19) 經 CI 合併於 `a66ecfe`。Pages `77d30b8`、[run 36773772651](https://github.com/leotsouo/questnote-pwa/actions/runs/36773772651) 成功；407 個 Git blob、12 項原生 artifact 瀏覽器測試與 15 個正式 HTTPS 雜湊全部通過。保留正式 84 位角色／3 卡池、信箱、DB 與 scope，本次未發布 Honeylight 卡池。既有正式瀏覽器可偵測 verified waiting 更新，但另一個開啟視窗阻擋套用；未清除存檔。詳見 [發布收據](../reports/workshop-typography/production-release.md)。

## 2026-10-01 — V3.4.32 一鍵更新與主畫面圖示引導已發布

PR #16 已合併至 main（599a926ae8d36c5082110c9c89df3d12c12cf632）。正式產物 fbb07931fc76df36bef063435230a8ecfe1dc264613af6c3d85adebb1831b017 已逐一比對 371 個 staged Git blob；gh-pages 提交 505da31a7a97084c9a2b6e2b94842e2a3f1bef97、Pages run 36760461750 成功，16 個正式 HTTPS 檔案雜湊吻合。203 個 Node cases、210 個三套手機檢查及 19 個原生 worker／assembled artifact 檢查通過；正式站按鈕也已驗證同視窗重新載入。未改 DB/schema、任務/獎勵規則、84 隻寵物/3 卡池或後端。V3.4.31 缺少新按鈕，須最後一次自然關閉重開取得 V3.4.32；之後可在 App 內更新。iOS 已安裝圖示不能由頁面強制替換，新引導先備份再從 Safari 加入同一主畫面網址並確認資料。V3.4.31 source/Pages 及先前 V3.4.29 設計的遠端退版標記均保留。詳見 [完整驗證與發布收據](../reports/theme-round-two/one-tap-update-release.md)。

# QuestNote final integration

## V3.4.31 continuous home corner — 2026-10-01

The rounded scene/task transition now has full 24px scene backing instead of a 3px overlap. PR #15 merged at 66d0500; Pages commit 52c12fd / run 36756137394 succeeded. Artifact 566f1da19e0228af993675ccebb0eb70ac14b89d38d452d08b252e30abab917f. 197 Node, 210 phone-layout and 12 assembled browser cases pass; ten live hashes match. Content, player schema and old design rollback tags are preserved. [Repair evidence](../reports/theme-round-two/home-seam-release.md).

## V3.4.30 three-world design upgrade — 2026-10-01

Production is V3.4.30 at https://leotsouo.github.io/questnote-pwa/. All three existing themes are upgraded; preference IDs and gameplay rules are unchanged. PR #14 merged at 30a842f, production Pages commit be4fd23, artifact 1f204115bb343502ceb8f978f1160130fec07f7828458116c9447f4cd27f8247. Pages deployment succeeded and 21 live hashes match. The approved 84-pet/three-pool content and mailbox bytes were preserved. Old source and complete V3.4.29 production are retained as remote codex/design-backup-v3.4.29-source and codex/design-backup-v3.4.29-pages tags. Isolated actual update/rollback testing preserved player data and restored the old design. [Release and rollback evidence](../reports/theme-round-two/production-release.md).

## V3.4.25 selectable twilight journal release — 2026-09-30

The user approved the award concept as a third optional full-App art direction,
requested review and production publication, and approved repairing the one Bugbot
finding. More → 美術風格 now offers 暮光冒險手帳 alongside the two existing themes.
The repair correctly routes users who own pets but have not chosen a companion to
the collection. Task, reward and progression rules are unchanged.

- [PR #9](https://github.com/leotsouo/questnote-pwa/pull/9) merged at
  `60dc95cbedced256a4dd612f5c638926d16e157b`. Reviewed artifact source
  `f2757f78916d7d956e5d441edda0c94cde0c0d5c` is retained in main with identical runtime Git blobs.
- Production artifact `13f4e0d49a61dba891fd68549a5fac09b8a5677e26cc48c4b3900d5855dfb8ec`;
  manifest SHA-256 `c4a98025b0daa01f2f30b3c8b1770c58cc2069b61fc1199bf0163a57c1dd1bd9`.
  All 349 staged files matched the immutable artifact before push.
- Pages commit `7a4e77be7d126109e246d8d20d27361a53358116`;
  [run 36714554744](https://github.com/leotsouo/questnote-pwa/actions/runs/36714554744) succeeded.
  Fourteen live HTTPS hashes match, including theme modules, worker, mailbox and catalog.
- Repair CI passed 183 Node cases and summon assertions; all 12 isolated assembled
  browser cases passed. Earlier source acceptance covered 40 theme and 15 summon checks.
  Existing 84-pet/three-pool content and mailbox bytes were preserved; no backend was deployed.
- [Review and deployment evidence](../reports/twilight-theme/review-and-release.md).
  Preview was used only for isolated acceptance. Close older App windows and reopen
  online for the safe update, without clearing site data. Physical iPhone acceptance remains device-specific.

This is the release history; later dated entries supersede earlier deployment states. Current branch roles and responsibilities are in [project governance](project-governance.md). Earlier `reports/release-v3.4.8/` and authoring handoffs remain historical evidence, not the current deployment status.

## Source and ownership

- Integration source: `codex/final-integration`, isolated at `.worktrees/final-integration`, fast-forwarded into `main` at `d20c7ee395b0ebae98582ee39fd9650de5fc7cb9`.
- Shared Card Pool/UI base: `95a4f5d70233195050f1f0fce2eee3d9945c2b32`.
- Starting point: `codex/release-v3.4.8` at `7e2c7c2`, which already descends from UI tip `0bee84d` and includes the reviewed Glacier runtime integration `0de878a` and contrast fixes `b588cd9`.
- Compared actual root Card Pool dirty files against this tree. No functional runtime changes were omitted. Existing UI markup, scoped polish styles, dialog focus, transaction primitives and declarative pool contract are retained.
- No new Git text conflicts were introduced: the reviewed integration history was reused rather than replayed or overwritten. The original dirty root checkout and original worktrees remain untouched.
- The real `frost_oath_fjord` authoring workspace is now preserved in this branch, including raw approval snapshots and immutable candidate `697316249910931d21b57c50744997c2a12e9fde9743bfd3e61e094b18b7a131`. Exact-byte Git attributes prevent line-ending conversion from invalidating its hashes.
- Main owns runtime integration, review, deployment and browser validation. Independent agents reviewed branch coverage and hosting; a separate worktree implements missing user-flow tests. No concurrent core-file editing.

## Preview target and safety

Existing target: **https://leotsouo.github.io/questnote-pwa-preview/**, separate repository `leotsouo/questnote-pwa-preview`, Pages `main` at `/`, HTTPS enforced. Production remains the independent `questnote-pwa` repository and `/questnote-pwa/` scope.

Only the assembled **preview** profile may be published there: `QuestNotePreviewDB`, `questnote-preview-` cache namespace, `/questnote-pwa-preview/` scope. Original preview baseline was `a1a0030974761861dc1221e52aad4d0563bfc342`. Production now uses a separate release branch as described below; no storage reset, forced currency or synthetic catalog was used.

Normal TLS checks and existing credentials confirm live preview manifest/SW/version matched `a1a0030`, and production matched `aada9a7`, before this run. This verifies those files, not every installed client.

## Regression fix and rollback

The deployed old production SW can delete sibling preview caches during activation. Previously the preview stayed on 503 even online. V3.4.9 repairs a missing required asset only after its network bytes match this artifact's SHA-256, using a canonical URL and only its own cache. Wrong hashes, 503 and offline responses remain rejected. Active clients are never reloaded or force-claimed, and IndexedDB is not touched by recovery.

Risk: deleted offline bytes cannot be recreated until online. If the server now hosts a different artifact, missing old-version bytes are rejected; close all preview windows and reopen online to allow the verified update. Do not clear site data. A content withdrawal must retain acquired Pet/Lore/IDs; reverting to the old preview runtime is not a proven save-compatible rollback. Prefer a compatible forward fix.

Final review also found that the old preview manifest enabled ?perf=1 and its test-currency button. V3.4.9 starts without that query, disables diagnostics/dev modes in assembled artifacts, and rejects test currency before writes. Old shortcuts are covered by Node and actual artifact browser tests. No schema/ID changes were required.

## Validation and current state

The initial integration passed 141 Node tests, 34 logic assertions, 98 JavaScript syntax checks, native backup/gacha/UI workflows, the synthetic pipeline, and 11 immutable artifact browser cases. The subsequent V3.4.10 iPhone fixes passed 142 Node tests, 34 logic assertions, image and content validation, the synthetic pipeline, 10 summon, 13 pool-content, and 11 release-artifact browser cases. The task/habit/collection/theme/reload/backup browser flow also passed. Detailed initial evidence is under `reports/final-integration/`; the current iPhone checklist is `docs/iphone-final-acceptance.md`. Physical iPhone Safari, keyboard, standalone and safe-area behavior require the user's device check and are never inferred from a desktop viewport.

The canonical source catalogs intentionally remain the original 72 pets/two pools. The release assembler merges the approved real candidate into the versioned 84-pet/three-pool bundle and keeps frozen legacy catalogs for old clients. Synthetic test pools stay in temporary fixtures.

## Preview history and current release

- V3.4.9 was published from source commit `5eb3d55c7e4be854a3531314ed349d55b913d8d9` as artifact `1a23fcd14d8ba55372636ad3c09a0316b504bd81f496d46fee3ceda5bcf274e8`, Preview commit `689a4a0582d8fd45e2747fb927b55cb5f63eec2c`. Its [Pages deployment](https://github.com/leotsouo/questnote-pwa-preview/actions/runs/35859738328) completed successfully, and the hosted default/sweet views were checked at 390x844.
- The V3.4.10 source commit `99510064dce30e63c8055f1022b9ad52552d05be` fixes pool hero swaps and bottom-nav motion, uses small pet images first for summon and collection, removes result-screen repeat draws, and removes the app-level reduced-animation setting while preserving the system preference.
- The V3.4.10 Preview artifact `ac75c41f18d2e46d1ed769dbba1a32319b1fae1da6178cdea199079f2a0f4a34` was assembled from that commit with preview scope `/questnote-pwa-preview/`, `QuestNotePreviewDB`, and 84 pets / three pools. Its manifest SHA-256 is `db865baa424d26cc0737fa21d4806d512218972ba76c4c63fb0b4b21a5f1edec`. The separate Preview repository commit is `d2c8d33905e4140eafd88c7380db8798aa9378c6`.
- The V3.4.10 [Pages deployment](https://github.com/leotsouo/questnote-pwa-preview/actions/runs/35868716778) completed successfully. Live HTTPS serves the pinned artifact ID and source commit; all 11 checked runtime/catalog files matched the local artifact SHA-256 values. Closing and reopening the agent-owned Preview tab completed the safe SW update without clearing storage. At 390×844, live Bloom/Frost switching updated the pool title and hero asset together, hid the previous hero during loading, kept the bottom navigation at the same position, and produced no horizontal overflow. Other iPhone-specific behavior remains for physical-device acceptance.
- The user confirmed the earlier iPhone issues were fixed, then reported the version information touching the card edge. V3.4.11 source commit `fb95dddcd900f81e8b96658609550273656f0975` restores mobile card padding and gives the long cache identifier a smaller, breakable text style. Default and sweet 390×844 regression checks passed with a full-length cache fixture; all 142 Node tests and 34 logic assertions still pass.
- Current Preview artifact: `db2b88364437440eb06ae76644942d52df651ad3881c569c2a93d44242fccf3a`, manifest SHA-256 `c4ee881d70477f32ec1f98cb6435e6e79440dcb46f7458e45551cc4755c1978f`, Preview repository commit `b89a6a665090392b161cd2caec6e00af00b2cc9b`. The [V3.4.11 Pages deployment](https://github.com/leotsouo/questnote-pwa-preview/actions/runs/35873755268) succeeded. Live HTTPS identity and six runtime/catalog hashes match; after a safe close/reopen update, the 390×844 hosted page shows 20px version-card inset, a fully contained cache identifier, and no horizontal overflow. The device-specific Safari check remains with the user.

## Production release and remaining risks

The user approved integrating the tested version into `main` and publishing it. Because GitHub Pages previously published directly from source `main`, Pages was first moved to a `gh-pages` branch at the identical old commit `aada9a73e6cf0381fc03359dafd78b70b274cce2`. Four live production file hashes remained unchanged after that configuration switch. Source `main` was then fast-forwarded to the validated integration commit; Pages continues to read only `gh-pages`.

The production profile assembled from the approved Frost candidate has artifact ID `8f856947cadaae13d87f761dadba2dfceb59d4711f8ff7fb5f2dc68404a67936` and manifest SHA-256 `98c19438c8ae6824c460d58b63aaf0fe887e4570d0d6ab37b0bc274416326cd3`. Its complete 331-file tree, including 84 pets and three pools, was committed byte-for-byte to `gh-pages` at `0c37bcebee2b15f7882897cf35d3f6692edaff29`. The immutable artifact passed strict verification and all 11 assembled-artifact browser cases, including legacy-worker transition, offline/503, profile isolation and no debug currency. The [production Pages run](https://github.com/leotsouo/questnote-pwa/actions/runs/35876850998) publishes that commit. Live HTTPS returned matching artifact identity and 12 checked runtime/catalog/image hashes; a read-only 390×844 browser visit completed the safe worker transition, showed V3.4.11 and all three pool choices, and had no horizontal overflow.

Existing installed clients may need to close all QuestNote tabs and standalone windows, then reopen online to activate the new verified worker. Do not clear site data. If a future issue requires withdrawing the new pool, retain acquired pet IDs, Lore and collection references; reverting directly to the old runtime is not a proven save-compatible rollback, so use a compatible forward fix or disable the pool while preserving catalog entries. Physical iPhone standalone, keyboard, safe-area and offline-reopen behavior remains device-specific acceptance. Broader M2B/PWA UX work remains deferred.


## V3.4.12 guided onboarding release — 2026-09-27

V3.4.12 adds first-run onboarding, resumable in-app guidance, the More → 使用教學 walkthrough and short advanced-feature notes. It uses the existing task, mailbox, summon, collection and expedition flows; it adds no task or reward. The content bundle remains the existing 84-pet catalog (SHA-256 3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32).

- Source: main commit 9f966cd098faec3107e94846c3115b48d43fb6e3 (fast-forward from 743d601).
- Preview: artifact 6b049f0f3811dc289a48f41a7419af717cf7c387737c9c81a47ef3e176fad979, manifest SHA-256 8f24bf3f7df2d7216c1eb6b12c63383c5a345b648d258548b9fea4082f408d43, Preview commit a90fb86a5db4d245fd6c39c513337f5bf0b2b57b. [Pages run 36257004200](https://github.com/leotsouo/questnote-pwa-preview/actions/runs/36257004200) succeeded.
- Production: artifact a7999d6d1e2e5d1fd5f88f8b7705874667dcb2038ff95098fe1e9e209e1bbb48, manifest SHA-256 d4c8ab1022ed5066b22dc84d3abae1e4b6b308646b6b14a4963a1505a1328c1c, gh-pages commit a8a39412aa37fdadc5b9b9cad144656a6647be0c. [Pages run 36257394379](https://github.com/leotsouo/questnote-pwa/actions/runs/36257394379) succeeded.
- Both manifests’ 332 file entries were checked against the exact Git blob bytes before push. All 11 assembled-artifact browser cases passed; all 147 Node tests and 5 onboarding-state tests passed.
- Manual preview acceptance covered welcome, a real test task in today’s plan, task reward, the existing claimable welcome gift, one summon, the user-selected 已獲得 filter, companion selection and the insufficient-energy expedition path. Pausing, continuing from the guide page, skip persistence, task/step reload persistence and the More guide were checked. The hosted Preview and Production pages both displayed V3.4.12 and the new guide entry after the safe service-worker transition.
- Device-specific physical iOS Safari and standalone/offline relaunch checks remain outside this desktop browser run.


## V3.4.13 growth lessons release — 2026-09-27

Production now runs V3.4.13 from source `2a6290086e116747d4fd73582339213dbf757900`, gh-pages `179d4ca72df46509ff853a05616d255b617aa442`. [Pages run 36260266663](https://github.com/leotsouo/questnote-pwa/actions/runs/36260266663) succeeded. Four resumable chapters teach stars/fragments, bond/unlocks, expedition rewards, and workshop crafting/gifting, with separate understood/practiced progress and no teaching rewards or automatic spending. Existing onboarding decisions are preserved.

Production artifact: `50d28286fbd64c66ed3842d058b3d428bd21afff169bd2715aed18d7aa647acb`; manifest SHA-256: `db82b85059b089a3d36b043595727a85a536b5d356c2dd3ec064b7cb0033dead`. All 334 published files match reviewed Git blob bytes. The 84-pet/three-pool content bundle and dynamic mailbox are unchanged. The separate live Preview was not updated.

154 Node tests, 34 summon assertions, 10 isolated chapter browser cases, and 12 assembled-artifact browser cases passed. Fourteen live HTTPS file hashes match the release. The hosted browser shows V3.4.13 and all four chapters after safe close/reopen activation, with existing resources retained. Physical iOS and actual screen-reader acceptance remain outside this desktop run. See [detailed acceptance](../reports/v3413-growth-lessons.md).


## V3.4.15 source consolidation — 2026-09-27

The feedback UI, private Worker/D1 source, export tooling and focused tests have been reconciled onto the V3.4.13 main baseline. Existing onboarding, UI polish, current announcements and verified service-worker recovery are preserved. Retired feature branches are historical inputs; main is the sole source integration line. See the [consolidation audit](../reports/branch-consolidation-2026-09-27.md).

This is source integration, not a website deployment. Production remains V3.4.13; the latest mailbox-only gh-pages commit at audit time is `95b28b76346ee1e8b72af171aa091f971e7115ff`. The feedback backend was already deployed by its prior task. This consolidation does not redeploy it or change Cloudflare/GitHub access grants.

## V3.4.15 feedback production release — 2026-09-27

V3.4.15 is now published at `https://leotsouo.github.io/questnote-pwa/`. The release adds the anonymous feedback form and connects it to the already deployed private Cloudflare Worker/D1 backend. Existing production mailbox bytes and the approved 84-pet/three-pool catalog were preserved; the preview artifact was built only for isolated acceptance and was not published.

- Source commit: `ec1267966d763dbc506c4f869c5a719ea92dd055`.
- Production artifact: `fb10929a204ec94c11ad380c1af9e8170ea2dc5f8ba85174221b75ef85fa4084`, manifest SHA-256 `bffd0bc0945ddd78eee0f2e92113586201352afa5af4d2ba0235a92d09acd1db`, 337 files, scope `/questnote-pwa/`.
- Pages commit: `8c5e0944819cc8a04c9ce8a84cbd9cf41f3685a1`. [Pages run 36268999571](https://github.com/leotsouo/questnote-pwa/actions/runs/36268999571) completed successfully.
- All 337 committed Git blobs match the artifact manifest. The 12 assembled-artifact browser cases passed. Ten live HTTPS files, including the manifest, app shell, service worker, feedback modules, mailbox and catalog, matched the artifact hashes.
- The Worker/D1 backend was not redeployed. Users with an older open App should close QuestNote tabs and standalone windows, then reopen while online so the verified worker can activate; do not clear site data. Physical iOS standalone, keyboard and offline-relaunch acceptance remains device-specific.

## V3.4.16 mailbox layout release — 2026-09-27

Long mailbox letters compressed the filter row below its chips' height, while the sheet repeated the top safe inset. The repair preserves toolbar heights, limits scrolling to the letter body and restores 12px top spacing. Message content, reward identities and saved data are unchanged. [PR #2](https://github.com/leotsouo/questnote-pwa/pull/2) merged as `51dd5cdfc109ad5e7548db3b184a1d83fe6b3406` after CI passed.

- Production artifact: `3dba10dfa01bf6ee47f7e01b8dc88cea48b3499ced5b0a3af7339c9adb4e474f`; manifest SHA-256: `9647a8449309a0e496f9030c2604bf2bd66a42ff44163cce412b2e83d3db3dc3`.
- Pages commit: `642e0a5f5007b4a2899746287341df09142fbcf6`; [deployment run](https://github.com/leotsouo/questnote-pwa/actions/runs/36271493656) completed successfully. Nine live HTTPS files, including the version, stylesheets, service worker, mailbox and catalog, match the pinned artifact hashes.
- 169 Node tests, 34 summon assertions, 16 mailbox browser cases and 12 assembled-artifact cases passed. All 337 committed files match the pinned artifact. The existing production mailbox bytes and 84-pet/three-pool catalog were preserved.
- [Before/after screenshots and reproduction](../reports/mailbox-layout/acceptance.md). Safe-area values were simulated in desktop Chromium; physical iPhone Safari remains device-specific acceptance. The preview artifact was used only for isolated tests and was not published.

## V3.4.17 companion feeding release — 2026-09-29

The existing pet-feeding modal had no visible entry point, so feeding appeared possible only through the workshop. V3.4.17 adds 餵食 beside 撫摸 on the active companion card and to each owned pet's collection detail. Both entries use the existing inventory, daily-limit and bond rules; feeding a pet in the collection updates that selected pet. Unowned pets have no feeding action, and an empty food inventory links to workshop crafting. [PR #3](https://github.com/leotsouo/questnote-pwa/pull/3) merged as source commit `777b17706782fe8821a6776d9f9e87c93b556fc5` after CI passed.

- Production artifact: `8d13189826fceeb28861bc21578c9ecf88dc9d6e8d4761cb1f77310106c0b506`; manifest SHA-256: `3e8c819eb22445f5e994a3bee496b042393ac528d8d8dab4560904e1a9a7074a`.
- Pages commit: `69ffdc052319b79dcd8836d015847da1a066daf5`; [deployment run](https://github.com/leotsouo/questnote-pwa/actions/runs/36457215447) succeeded. All 337 committed Git blobs match the immutable artifact, and ten live HTTPS files, including `src/ui.js`, styles, version, service worker, mailbox and catalog, match its hashes.
- 169 Node tests, 34 summon assertions, focused isolated browser feeding checks and 12 assembled-artifact browser cases passed. The approved 84-pet/three-pool content bundle and existing production mailbox bytes were preserved; the feedback backend was not redeployed. [Acceptance report and mobile screenshots](../reports/companion-feeding/acceptance.md). Physical iPhone Safari remains device-specific acceptance.

## V3.4.21 team expedition release — 2026-09-29

QuestNote now supports 1–3 pet expeditions with exploration, gathering and bond objectives, visible specialties from one star, guaranteed base rewards, journey reports, six-region progress and shared camp upgrades. A first forest journey costs one energy and lasts three minutes. The expedition map uses illustrated single-column cards, and the first-run guide plus replayable expedition lesson describe the new flow. [PR #4](https://github.com/leotsouo/questnote-pwa/pull/4) merged into source `main` at `7907c91a2439ff30e11d3a25f89ac3f8d41dd070` after CI passed.

- Production artifact: `d6ba79aa78e1599ddf4e4f814de4426b665274a205f9904d48ebedc56ea7ef33`; manifest SHA-256: `970ec0bfef444154b26379b188d6665fa97eec91acbd555e7dc2585bf42c14c0`; 345 files, scope `/questnote-pwa/`. The approved 84-pet/three-pool content bundle remains `3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32`.
- Pages commit: `c1fc4838ef5e79c22a2e450551cf0173d7531f8c`; [deployment run](https://github.com/leotsouo/questnote-pwa/actions/runs/36548421098) completed successfully. All 345 local artifact files matched the Pages checkout before push; 15 live HTTPS files matched the pinned artifact hashes afterward.
- The public mailbox message `2026-09-v3421-expedition-update-gift` announces the update and grants 10 adventure energy to each local profile that claims it, once per local profile, through 2026-11-29 23:59 Taiwan time. It requires App V3.4.21. The live mailbox JSON and source announcement use the same release artifact bytes.
- `npm test` passed 174 Node cases and the summon assertions; all 12 isolated assembled-artifact browser cases passed, including legacy-worker transition, offline launch, profile isolation and lesson resume. Mailbox schema validation reported no errors or warnings. Physical iPhone Safari and standalone behavior remain device-specific checks.

## V3.4.22 app sharing release — 2026-09-30

V3.4.22 adds More → 分享 QuestNote with the native share sheet when available and a copy-link fallback. The page explains installation, that each person's app data stays on that device, and how to recover data. The app shell also includes production social-preview metadata. [PR #5](https://github.com/leotsouo/questnote-pwa/pull/5) merged into `main` at `04b59bc78375b6f033bf3d963c8a78bbd2be8191` after CI passed.

- Production artifact: `5c631c0c80b7442d24ae1cf32a56ef4457d0ad0d1e463190a3efffeb9ec4b017`; manifest SHA-256 `9f159d72338d833982cb7106788073c1a2e95c57f39b8042ab95c31397141800`; 346 files, scope `/questnote-pwa/`. It uses the previously deployed 84-pet/three-pool catalog `3dfd5055f9c2d2d288ab7e235d4c85202899f0ecba49a1b2473d505ba3e9ff32`; the production mailbox bytes were preserved.
- Pages commit: `78ed3416e19161732dcd382ea79e26c2a9c1024c`; [deployment run 36608025431](https://github.com/leotsouo/questnote-pwa/actions/runs/36608025431) succeeded. All 346 committed Git blobs match the artifact manifest. Thirteen live HTTPS files, including the release manifest, app shell, service worker, sharing module, version, mailbox and catalog, match their pinned hashes.
- The PR CI and local suite passed 177 Node cases and the summon logic assertions. Strict artifact verification passed, and all 12 isolated assembled-artifact browser cases passed. A local preview check confirmed the share page and copy-link feedback.
- No feedback Worker or D1 deployment was needed. Close older QuestNote tabs and standalone windows, then reopen online so the verified worker can activate; do not clear site data. Physical iPhone share-sheet and standalone installation behavior remain device-specific checks.

## V3.4.23 mobile fixed scale release — 2026-09-30

V3.4.23 limits mobile page zoom while retaining vertical touch scrolling, including nested scroll containers. Mobile form controls use at least 16px text to avoid focus zoom. [PR #7](https://github.com/leotsouo/questnote-pwa/pull/7) merged after CI passed, at source commit `113a1217aed3a95a3213d1798e205cb7739062a8`.

- Production artifact: `fdfdaf3989d2d7869d857a71adb931816e7317fb39f20302ab4ff31f4d564428`; manifest SHA-256 `5a8581448f793a7801b7a90c1cc2dbecdea32212b8bf9608be2f3a0c0936e95d`; 346 files, scope `/questnote-pwa/`. The existing production candidate, 84-pet/three-pool catalog and mailbox bytes were preserved.
- Pages commit: `25b77effc178e12adb51425278caeab47be1546d`; [deployment run 36700381934](https://github.com/leotsouo/questnote-pwa/actions/runs/36700381934) succeeded. All 346 committed Git blobs match the artifact; 11 live HTTPS files match the pinned local release.
- 177 Node tests and summon assertions passed. Strict artifact verification and all 12 isolated assembled-artifact browser cases passed. Mobile touch-event checks confirmed page and nested scrolling, pinch scale 1 and nine form controls at least 16px. Evidence is in `reports/mobile-scroll/`.
- Preview was assembled only for isolated acceptance and was not published. No backend deployment was needed. Close older App windows and tabs, then reopen online to activate the verified update without clearing site data. Physical iPhone Safari, standalone, double-tap and keyboard behavior remain device-specific acceptance; browser accessibility overrides and OS magnification can still allow zoom.

## V3.4.24 achievement notification fix — 2026-09-30

The user tested the notification demonstration and explicitly approved production publication. [PR #8](https://github.com/leotsouo/questnote-pwa/pull/8) merged at source `795cd75401064cebbc56e1a9287148fd6351edda`. Rewards, achievements and titles now reserve their actual heights in a shared notification stack, preventing overlap and wrapping long text on mobile.

- Production artifact: `76444e2ff74b709c6c2017c49d12af82501ca86a367f8c8ac165a212d79ceb46`; manifest SHA-256 `07a92bed2ab6c3fd99f6136d3afc2768acbc38a272a18df9988727d2d31fb93b`; 346 files, `/questnote-pwa/` scope. Existing approved 84-pet/three-pool content and production mailbox bytes were preserved.
- Pages commit: `33c5a4a9e8ab34468e3919b31cfa3b1b7e15bed1`; [run 36703423494](https://github.com/leotsouo/questnote-pwa/actions/runs/36703423494) succeeded. All 346 staged Git blobs matched the immutable artifact; eight live HTTPS files (manifest, app shell, UI, CSS, version, worker, profile and mailbox) matched exact artifact bytes.
- PR CI passed (177 Node cases and summon assertions). Six isolated notification checks passed across default/sweet themes and 320/393/768px widths. Strict production artifact verification and 12 assembled-artifact browser cases passed. See `reports/notification-stack/acceptance.md`.
- Production feedback f965402f-3bb8-4caa-badb-d8b8b53c8dbd was marked resolved after live verification. No Worker deployment or storage migration was needed. Close older App windows and reopen online to activate V3.4.24; do not clear site data.


## V3.4.26 twilight safe-area release — 2026-09-30

Production now serves V3.4.26. Twilight's night background fills the top safe inset and stays dark while scrolling; its homepage paper corners now fully overlap the night scene without covering bond content. [PR #10](https://github.com/leotsouo/questnote-pwa/pull/10) merged after CI passed, at source commit fa70beb4c90e71a4c732cb60a9da1b7f4b6d9fe9.

- Production artifact: 9c2bd9c3ac2ebdb9202f6f2b942df8346cca9b6c2c8e4ecd64f3e3a06592ff37; manifest SHA-256: e9755c2be942bf170345e31ca6e77721b4e708edc5f55e15f45560de7c7ef453. All 349 staged Git blobs matched the pinned artifact before push.
- Pages commit: acf74ec254b761bd7eaab509256e020762702a46. [Deployment run 36734233393](https://github.com/leotsouo/questnote-pwa/actions/runs/36734233393) succeeded; 16 live HTTPS hashes match the pinned release.
- 183 Node cases plus summon assertions, 79 isolated layout cases, and 12 assembled-artifact cases passed. A fresh disposable hosted browser confirmed the version, verified worker and persisted twilight styling after reload. [Release receipt and evidence](../reports/twilight-safe-area/production-release.md).
- The approved 84-pet/three-pool content and production mailbox bytes were retained. No backend deployment or save migration occurred; hosted Preview was not updated. Physical iPhone 14 Pro Max / iOS 26 status-bar acceptance remains pending. Close older App windows and reopen online to activate the update without clearing site data.

## V3.4.27 daily reminder release — 2026-09-30

[PR #11](https://github.com/leotsouo/questnote-pwa/pull/11) passed CI and merged at `d691e47`. Production now serves configurable daily task/habit Web Push reminders and tomorrow scheduling. Pages commit `66e29ce4c153d9a8055948fa0575411f47103167`; [run 36737740780](https://github.com/leotsouo/questnote-pwa/actions/runs/36737740780) succeeded. Artifact `f8d2cd85d2cacf06cdfa1b13a27c593ac30e08b925c9753879b9000cbc27fada`, manifest `ca1f4bace8abcb021c6c770b211504eac8ed733a2102d6b38ad8078cf25a8429`: 349 committed blobs and 15 live hashes verified; 84-pet/three-pool catalog and mailbox preserved. Dedicated Cloudflare reminders Worker/D1 and minute Cron are deployed. All integration, reminder, mobile browser, workerd and 12 artifact browser checks passed. Physical iPhone/Android receipt remains device acceptance. [Release receipt](../reports/daily-reminders/production-release.md).

## V3.4.28 twilight petting prompt — 2026-09-30

Production V3.4.28 moves petting and cooldown below the portrait beside companion dialogue, preserving the current daily reminder runtime. PR #12 and Pages run 36738837787 succeeded. All 349 artifact Git blobs, 12 artifact browser cases and 16 live HTTPS hashes passed verification. Source tests passed 192 Node cases and summon assertions; four isolated viewport checks verified real petting/cooldown. See [production receipt](../reports/twilight-pet-prompt/production-release.md). Existing content and mailbox bytes were retained; no backend deployment or save migration occurred.


## V3.4.29 reminder settings polish — 2026-09-30

[PR #13](https://github.com/leotsouo/questnote-pwa/pull/13) merged after CI. Production now serves the themed time panel, accessible switches, illustrative notification preview and clearer consent/actions/delivery sections. Source `9fad7f41f3785aeffa4f4643639b654e31ad6fe4`, Pages `13d3f5db135243b6a30d85148d2fa3d9c2c7bf0f`; [run 36740510978](https://github.com/leotsouo/questnote-pwa/actions/runs/36740510978) succeeded. Artifact `49298afea132cd13c832dbd62ad13edfc7f788cc383b3906fea80c8cf7757a37`, manifest SHA-256 `6affc46b80a570af2f9d8f59f3ea27129ce4f4ea47a9c223cd5f1d86bfd59b2e`: 350 staged blobs and 16 live hashes verified. Integration tests, 8 reminder-browser scenarios and 12 artifact cases passed. Backend/subscription rules unchanged; existing production content/mailbox and V3.4.28 prompt fix retained. [Receipt and screenshots](../reports/reminder-settings/production-release.md).

## V3.4.36 蜜光糖庭 — 2026-10-01

[PR #21](https://github.com/leotsouo/questnote-pwa/pull/21) CI通過並合併；正式Pages提交 `9e815676db8ff3e203391894090a52b1d5090129`，建置成功且30個HTTPS檔案雜湊相符，包含所有14個變更檔案與12張核准卡圖。12隻雙UR卡池和專屬動畫正式開放，台詞「糖庭亮起／甜蜜相遇」。詳細pins／證據見 [發布紀錄](../reports/honeylight-animation/production-release.md)。工坊／探險需求的流程規劃留待發布後討論。


## V3.5.3 劍隱山河 — 2026-10-02

使用者整包驗收通過並明確同意發布。PR #42 合併於 `ed81995648ba9b60c27207ba1ab3148afa6b2688`；Pages `4a1808126b9f6805ddb11c7b16ce1a1d8225ebf8` 部署成功。正式 artifact `5a3ea973a884ae5dcc14c0ffd062963831724de3caa87e284ab37d9a766fd2f8`，manifest SHA-256 `07c63616a676c43edc06078e087c3cb8bcb01aa1024655f6fdf32fce22c3bfad`。488 Git 檔案、177 正式 HTTPS 檔案、正式瀏覽器／離線、V3.5.2 → V3.5.3 更新及存檔保留均驗證成功。

20 角色、三 UR、單一「俠」印專屬入場與抽卡動畫、新食物、逐隻偏好／專長、雲棧古道與80章故事已上線。現行親密度旅程、派遣推薦、公告及舊內容保留。[發布證據](../reports/swordwild-release/production-release.md)。覺醒只在發布後另寫獨立討論草案，不納入卡池 SOP。

## V3.5.22 星塵總量與十連保障 — 2026-10-03

[PR #62](https://github.com/leotsouo/questnote-pwa/pull/62) CI 通過並合併於 `d2a8ebf2042aa0b8da5c0f79fdb91bd1b9fc45ea`。正式 summon 顯示真實星塵總量；六池新增十連至少 SR，基礎機率與既有 SSR／UR 保底維持原值；正式試播入口移除，未完成覺醒的靜態預覽改黑白，真正儀式後保留全彩。既有最新兩封公告與獎勵 identity 保留。

Pages `4aa9aa10dcd79810f781f8c2f40318d5d45401b6` 的 [run 37113586595](https://github.com/leotsouo/questnote-pwa/actions/runs/37113586595) 部署成功。正式 artifact `9373470b03eff9a04955a9401377a787dcb9ff471d7c11a292418eb46dcb6818`；606 Git blob 與 605 個正式 HTTPS 檔案全部相符。309 Node 測試、召喚斷言、pipeline 演練、16 固定產物瀏覽器案例及十二組手機／字級／Theme 檢查通過。既有正式 client 仍受另一個 QuestNote 視窗未關閉的正常更新 guard 阻擋，未清資料或強制啟用 worker。[平衡計算、SOP 與發布證據](../reports/summon-production-v3522/README.md)。iPhone VoiceOver、原生字級與觸覺仍待真機驗證；後端未部署。

## V3.5.23 一鍵領取 — 2026-10-03

[PR #65](https://github.com/leotsouo/questnote-pwa/pull/65) CI 通過並合併於 `47b7c337a39612a4eb337a22c64e812dd22f7454`。每日祝福、冒險任務、成就、圖鑑里程碑、探索里程碑和信箱附件增加待領數量與「一鍵領取」，保留單項領取；沒有可領獎勵時按鈕隱藏。批次領取阻擋重複、逐筆重新核對，並以原交易規則保存資源和領取紀錄。

正式 artifact `12c4a4103be3d3a45e112eed5ac1566bc482c2ce85a470fb0e3d5672663f9cf0` 已推至 Pages `6bab17d148d770b30444ca438cce73a80e003eb4`；[run 37115062133](https://github.com/leotsouo/questnote-pwa/actions/runs/37115062133) 成功，607 Git blob 與 606 個正式 HTTPS 檔案全部相符。318 Node 測試、35 項揭示流程檢查、六處實際領取、108 組版面及 16 項固定產物／離線更新瀏覽器案例通過。原有 catalog 與公告 reward identity 保留；後端與存檔格式未更動。[發布收據](../reports/reward-claim-production-v3523/README.md)。

## V3.5.24 更多頁整理與習慣頁銜接 — 2026-10-03

[PR #64](https://github.com/leotsouo/questnote-pwa/pull/64) CI 通過並合併於 `6aa59e3246f44d27e4cdf6ecaee1ba10ef8073d4`。常用習慣、每日祝福、成就及工坊入口上移，教學、回報、分享及版本資訊收合於「教學與支援」，美術風格保留在設定；習慣頁移除統計外層方形底色並保留四張卡片，以 16px 間距連接內容。所有功能、美術素材與正式卡池資料保留，也保留最新一鍵領取與召喚更新。

Pages `d2dba3c7b8f7f0823227af19d2cbe147dd975bcd` 的 [run 37115343269](https://github.com/leotsouo/questnote-pwa/actions/runs/37115343269) 部署成功；artifact `c65c038a0a6ed9c2db0d6b043c2c2a649ec03a3a653ebe55b40fe74f775502be`，manifest SHA-256 `853de50d8210179fb753f7ab228cd506e375e1bd0df2d49d4542324c5de142f0`。607 個 Git blobs 與 606 個正式 HTTPS 檔案全數相符。完整 npm test、召喚 assertions、16 項固定產物原生瀏覽器檢查及正式網址全新 Chrome 操作通過。[來源、截圖及發布回執](../reports/more-navigation-20261003.md)。

## V3.8.0 易讀模式與最新新手教學 — 2026-10-04

已等待新版教學V3.7.0完成後整合。PR #75／#76 CI通過，來源main合併eccc9f2；固定production artifact 8502e35740918ec4897d6d3646ae3303c689e129283e542c3ed66369a3ad0a96，Pages fc8a1779df1a798bc3f143aaa8a1ea3c78a6d4a2，run37202724967成功。619 Git blobs與618個HTTPS檔案（含manifest）核對通過，18項固定產物測試及正式瀏覽器模式保存通過。Normal／Senior共用資料和progression，沒有主動語音輸出。[完整驗證與發布收據](../reports/senior-production/production-release.md)。實機iPhone／VoiceOver仍待使用者驗收。
## V3.8.1 流程安全改善 — 2026-10-05

使用者明確要求部署。PR #78 CI 通過，main 合併 `c4c3117`；production artifact `f6b0b5a7fa5731725d71094d33af3fd0a1d8b677810d672f131682d9bd3bbfa8`，Pages `6bb8931`、[run 37297068513](https://github.com/leotsouo/questnote-pwa/actions/runs/37297068513) 成功。619 Git blobs 與 618 HTTPS 檔案全數核對，18 項固定產物瀏覽器驗收通過。發布習慣提交保護、子任務名稱／狀態、初始化重載回復與備份錯誤回饋；保留 catalog、公告、存檔格式與後端。I02 工坊條件式故障一致性風險延後，正式既有 browser 仍受其他視窗開啟的正常更新 guard 阻擋；不宣稱該 client 已啟用新版。[完整部署收據](../reports/flow-deployment-2026-10-05/production-release.md)。
