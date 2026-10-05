# QuestNote function 索引 — 2026-10-05

本文件保留原盤點 baseline；實作後的來源位置請使用 [Final function index](flow-implementation-2026-10-05/function-index.md)。

來源 commit：`1de87e441b13afddf629102d19ee1e7887d93b2c`。以下由來源宣告生成，包含具名 function（含私有／巢狀）與 export 箭頭函式；匿名事件、object/class methods 與 re-export 請從流程圖的 controller/module 入口追蹤。此索引表示宣告位置，不表示每個 helper 都有獨立產品入口。

共 1411 個具名宣告；115 個來源檔納入掃描。
## backend/feedback/worker.js

| Function | 宣告位置 |
| --- | --- |
| `readBoundedJson()` | [backend/feedback/worker.js:12](../backend/feedback/worker.js#L12) |
| `validatePayload()` | [backend/feedback/worker.js:33](../backend/feedback/worker.js#L33) |

## backend/reminders/push.js

| Function | 宣告位置 |
| --- | --- |
| `sendPush()` | [backend/reminders/push.js:3](../backend/reminders/push.js#L3) |

## backend/reminders/scheduler.js

| Function | 宣告位置 |
| --- | --- |
| `nextSchedulerTick()` | [backend/reminders/scheduler.js:3](../backend/reminders/scheduler.js#L3) |
| `ensureSchedulerAlarm()` | [backend/reminders/scheduler.js:5](../backend/reminders/scheduler.js#L5) |
| `dispatchSchedulerAlarm()` | [backend/reminders/scheduler.js:14](../backend/reminders/scheduler.js#L14) |

## backend/reminders/worker.js

| Function | 宣告位置 |
| --- | --- |
| `date()` | [backend/reminders/worker.js:10](../backend/reminders/worker.js#L10) |
| `identifier()` | [backend/reminders/worker.js:15](../backend/reminders/worker.js#L15) |
| `validateSubscription()` | [backend/reminders/worker.js:19](../backend/reminders/worker.js#L19) |
| `sanitizeState()` | [backend/reminders/worker.js:29](../backend/reminders/worker.js#L29) |
| `readBody()` | [backend/reminders/worker.js:49](../backend/reminders/worker.js#L49) |
| `authenticate()` | [backend/reminders/worker.js:65](../backend/reminders/worker.js#L65) |
| `schedulerHealth()` | [backend/reminders/worker.js:73](../backend/reminders/worker.js#L73) |
| `route()` | [backend/reminders/worker.js:82](../backend/reminders/worker.js#L82) |
| `nextAfterDelivery()` | [backend/reminders/worker.js:135](../backend/reminders/worker.js#L135) |
| `runSchedule()` | [backend/reminders/worker.js:140](../backend/reminders/worker.js#L140) |
| `runScheduled()` | [backend/reminders/worker.js:181](../backend/reminders/worker.js#L181) |

## scripts/cardPoolPipeline.mjs

| Function | 宣告位置 |
| --- | --- |
| `assert()` | [scripts/cardPoolPipeline.mjs:32](../scripts/cardPoolPipeline.mjs#L32) |
| `safeId()` | [scripts/cardPoolPipeline.mjs:33](../scripts/cardPoolPipeline.mjs#L33) |
| `relativeFile()` | [scripts/cardPoolPipeline.mjs:39](../scripts/cardPoolPipeline.mjs#L39) |
| `contained()` | [scripts/cardPoolPipeline.mjs:47](../scripts/cardPoolPipeline.mjs#L47) |
| `readJson()` | [scripts/cardPoolPipeline.mjs:71](../scripts/cardPoolPipeline.mjs#L71) |
| `writeJson()` | [scripts/cardPoolPipeline.mjs:72](../scripts/cardPoolPipeline.mjs#L72) |
| `workspaceRelative()` | [scripts/cardPoolPipeline.mjs:79](../scripts/cardPoolPipeline.mjs#L79) |
| `workspacePath()` | [scripts/cardPoolPipeline.mjs:80](../scripts/cardPoolPipeline.mjs#L80) |
| `toolFingerprint()` | [scripts/cardPoolPipeline.mjs:81](../scripts/cardPoolPipeline.mjs#L81) |
| `readOfficial()` | [scripts/cardPoolPipeline.mjs:90](../scripts/cardPoolPipeline.mjs#L90) |
| `hashFiles()` | [scripts/cardPoolPipeline.mjs:97](../scripts/cardPoolPipeline.mjs#L97) |
| `readApprovalSnapshot()` | [scripts/cardPoolPipeline.mjs:102](../scripts/cardPoolPipeline.mjs#L102) |
| `archiveStage()` | [scripts/cardPoolPipeline.mjs:115](../scripts/cardPoolPipeline.mjs#L115) |
| `captureBaseline()` | [scripts/cardPoolPipeline.mjs:142](../scripts/cardPoolPipeline.mjs#L142) |
| `verifyBaseline()` | [scripts/cardPoolPipeline.mjs:154](../scripts/cardPoolPipeline.mjs#L154) |
| `locked()` | [scripts/cardPoolPipeline.mjs:159](../scripts/cardPoolPipeline.mjs#L159) |
| `checkBrief()` | [scripts/cardPoolPipeline.mjs:175](../scripts/cardPoolPipeline.mjs#L175) |
| `reservedPets()` | [scripts/cardPoolPipeline.mjs:206](../scripts/cardPoolPipeline.mjs#L206) |
| `createPipelineWorkspace()` | [scripts/cardPoolPipeline.mjs:225](../scripts/cardPoolPipeline.mjs#L225) |
| `loadWorkspace()` | [scripts/cardPoolPipeline.mjs:301](../scripts/cardPoolPipeline.mjs#L301) |
| `loadPipelineStatus()` | [scripts/cardPoolPipeline.mjs:314](../scripts/cardPoolPipeline.mjs#L314) |
| `checkPlan()` | [scripts/cardPoolPipeline.mjs:348](../scripts/cardPoolPipeline.mjs#L348) |
| `validateThrough()` | [scripts/cardPoolPipeline.mjs:367](../scripts/cardPoolPipeline.mjs#L367) |
| `validatePipelineWorkspace()` | [scripts/cardPoolPipeline.mjs:475](../scripts/cardPoolPipeline.mjs#L475) |
| `approvePipelineStage()` | [scripts/cardPoolPipeline.mjs:482](../scripts/cardPoolPipeline.mjs#L482) |
| `listFiles()` | [scripts/cardPoolPipeline.mjs:512](../scripts/cardPoolPipeline.mjs#L512) |
| `verifyCandidate()` | [scripts/cardPoolPipeline.mjs:523](../scripts/cardPoolPipeline.mjs#L523) |
| `stagePoolCandidate()` | [scripts/cardPoolPipeline.mjs:534](../scripts/cardPoolPipeline.mjs#L534) |

## scripts/releaseArtifact.mjs

| Function | 宣告位置 |
| --- | --- |
| `relativeFile()` | [scripts/releaseArtifact.mjs:30](../scripts/releaseArtifact.mjs#L30) |
| `noLinks()` | [scripts/releaseArtifact.mjs:39](../scripts/releaseArtifact.mjs#L39) |
| `readFile()` | [scripts/releaseArtifact.mjs:53](../scripts/releaseArtifact.mjs#L53) |
| `listFiles()` | [scripts/releaseArtifact.mjs:60](../scripts/releaseArtifact.mjs#L60) |
| `replaceOne()` | [scripts/releaseArtifact.mjs:75](../scripts/releaseArtifact.mjs#L75) |
| `moduleImports()` | [scripts/releaseArtifact.mjs:81](../scripts/releaseArtifact.mjs#L81) |
| `localReference()` | [scripts/releaseArtifact.mjs:93](../scripts/releaseArtifact.mjs#L93) |
| `collectSource()` | [scripts/releaseArtifact.mjs:100](../scripts/releaseArtifact.mjs#L100) |
| `add()` | [scripts/releaseArtifact.mjs:103](../scripts/releaseArtifact.mjs#L103) |
| `assertValidatorProvenance()` | [scripts/releaseArtifact.mjs:155](../scripts/releaseArtifact.mjs#L155) |
| `bundleFrom()` | [scripts/releaseArtifact.mjs:176](../scripts/releaseArtifact.mjs#L176) |
| `legacyCatalogs()` | [scripts/releaseArtifact.mjs:181](../scripts/releaseArtifact.mjs#L181) |
| `candidateInputs()` | [scripts/releaseArtifact.mjs:199](../scripts/releaseArtifact.mjs#L199) |
| `assertCatalogAssets()` | [scripts/releaseArtifact.mjs:248](../scripts/releaseArtifact.mjs#L248) |
| `verifyExisting()` | [scripts/releaseArtifact.mjs:265](../scripts/releaseArtifact.mjs#L265) |
| `prepareReleaseArtifact()` | [scripts/releaseArtifact.mjs:279](../scripts/releaseArtifact.mjs#L279) |

## scripts/verify-release-artifact.mjs

| Function | 宣告位置 |
| --- | --- |
| `requireValue()` | [scripts/verify-release-artifact.mjs:13](../scripts/verify-release-artifact.mjs#L13) |
| `object()` | [scripts/verify-release-artifact.mjs:14](../scripts/verify-release-artifact.mjs#L14) |
| `safeRelative()` | [scripts/verify-release-artifact.mjs:16](../scripts/verify-release-artifact.mjs#L16) |
| `noLinks()` | [scripts/verify-release-artifact.mjs:24](../scripts/verify-release-artifact.mjs#L24) |
| `inventory()` | [scripts/verify-release-artifact.mjs:34](../scripts/verify-release-artifact.mjs#L34) |
| `constant()` | [scripts/verify-release-artifact.mjs:52](../scripts/verify-release-artifact.mjs#L52) |
| `verifyReleaseArtifact()` | [scripts/verify-release-artifact.mjs:61](../scripts/verify-release-artifact.mjs#L61) |

## service-worker.js

| Function | 宣告位置 |
| --- | --- |
| `resolveUrl()` | [service-worker.js:205](../service-worker.js#L205) |
| `isGlobalMailboxRequest()` | [service-worker.js:209](../service-worker.js#L209) |
| `getMailboxCacheRequest()` | [service-worker.js:214](../service-worker.js#L214) |
| `matchCached()` | [service-worker.js:219](../service-worker.js#L219) |
| `isMutableAppAsset()` | [service-worker.js:237](../service-worker.js#L237) |
| `isPetImagePath()` | [service-worker.js:242](../service-worker.js#L242) |
| `isImageAsset()` | [service-worker.js:246](../service-worker.js#L246) |
| `fetchWithTimeout()` | [service-worker.js:251](../service-worker.js#L251) |
| `networkFirstMailbox()` | [service-worker.js:265](../service-worker.js#L265) |
| `networkFirstWithCache()` | [service-worker.js:294](../service-worker.js#L294) |
| `cachePetImage()` | [service-worker.js:315](../service-worker.js#L315) |
| `cacheFirst()` | [service-worker.js:334](../service-worker.js#L334) |
| `verifiedPrecacheResponse()` | [service-worker.js:350](../service-worker.js#L350) |

## src/achievementService.js

| Function | 宣告位置 |
| --- | --- |
| `normalizeAchievementsState()` | [src/achievementService.js:86](../src/achievementService.js#L86) |
| `getAchievementsState()` | [src/achievementService.js:108](../src/achievementService.js#L108) |
| `saveAchievementsState()` | [src/achievementService.js:117](../src/achievementService.js#L117) |
| `initAchievements()` | [src/achievementService.js:123](../src/achievementService.js#L123) |
| `loadAchievementsCatalog()` | [src/achievementService.js:130](../src/achievementService.js#L130) |
| `loadTitlesCatalog()` | [src/achievementService.js:145](../src/achievementService.js#L145) |
| `getTitleById()` | [src/achievementService.js:166](../src/achievementService.js#L166) |
| `getTitleForAchievement()` | [src/achievementService.js:172](../src/achievementService.js#L172) |
| `isTaskCompleted()` | [src/achievementService.js:178](../src/achievementService.js#L178) |
| `buildAchievementContext()` | [src/achievementService.js:185](../src/achievementService.js#L185) |
| `getAchievementProgress()` | [src/achievementService.js:296](../src/achievementService.js#L296) |
| `isAchievementMet()` | [src/achievementService.js:378](../src/achievementService.js#L378) |
| `checkAndUnlockAchievements()` | [src/achievementService.js:387](../src/achievementService.js#L387) |
| `markTitlesSeen()` | [src/achievementService.js:430](../src/achievementService.js#L430) |
| `markExportedBackup()` | [src/achievementService.js:439](../src/achievementService.js#L439) |
| `formatAchievementReward()` | [src/achievementService.js:453](../src/achievementService.js#L453) |
| `claimAchievementReward()` | [src/achievementService.js:479](../src/achievementService.js#L479) |
| `claimAllAchievementRewards()` | [src/achievementService.js:538](../src/achievementService.js#L538) |
| `equipTitle()` | [src/achievementService.js:630](../src/achievementService.js#L630) |
| `getClaimableCount()` | [src/achievementService.js:655](../src/achievementService.js#L655) |
| `getAchievementSummary()` | [src/achievementService.js:665](../src/achievementService.js#L665) |
| `exportAchievementsState()` | [src/achievementService.js:723](../src/achievementService.js#L723) |
| `importAchievementsState()` | [src/achievementService.js:728](../src/achievementService.js#L728) |

## src/adventureHandbookService.js

| Function | 宣告位置 |
| --- | --- |
| `stat()` | [src/adventureHandbookService.js:44](../src/adventureHandbookService.js#L44) |
| `toInt()` | [src/adventureHandbookService.js:49](../src/adventureHandbookService.js#L49) |
| `safeNumber()` | [src/adventureHandbookService.js:53](../src/adventureHandbookService.js#L53) |
| `getHighestBondLevel()` | [src/adventureHandbookService.js:62](../src/adventureHandbookService.js#L62) |
| `getHighestBondPet()` | [src/adventureHandbookService.js:74](../src/adventureHandbookService.js#L74) |
| `getAverageExploration()` | [src/adventureHandbookService.js:89](../src/adventureHandbookService.js#L89) |
| `buildQuickStats()` | [src/adventureHandbookService.js:96](../src/adventureHandbookService.js#L96) |
| `scoreGoal()` | [src/adventureHandbookService.js:159](../src/adventureHandbookService.js#L159) |
| `collectGoalCandidates()` | [src/adventureHandbookService.js:171](../src/adventureHandbookService.js#L171) |
| `buildNextGoals()` | [src/adventureHandbookService.js:348](../src/adventureHandbookService.js#L348) |
| `buildWeeklySummary()` | [src/adventureHandbookService.js:377](../src/adventureHandbookService.js#L377) |
| `buildLongTermRecords()` | [src/adventureHandbookService.js:411](../src/adventureHandbookService.js#L411) |
| `buildCollectionSummary()` | [src/adventureHandbookService.js:473](../src/adventureHandbookService.js#L473) |
| `buildExpeditionSummary()` | [src/adventureHandbookService.js:521](../src/adventureHandbookService.js#L521) |
| `buildAdventureHandbookModel()` | [src/adventureHandbookService.js:584](../src/adventureHandbookService.js#L584) |
| `getAdventureHandbookContext()` | [src/adventureHandbookService.js:605](../src/adventureHandbookService.js#L605) |
| `getAdventureHandbookSummary()` | [src/adventureHandbookService.js:640](../src/adventureHandbookService.js#L640) |

## src/app.js

| Function | 宣告位置 |
| --- | --- |
| `loadGameData()` | [src/app.js:214](../src/app.js#L214) |
| `warmCriticalPetImages()` | [src/app.js:227](../src/app.js#L227) |
| `refreshState()` | [src/app.js:242](../src/app.js#L242) |
| `resetAllData()` | [src/app.js:432](../src/app.js#L432) |
| `runAchievementCheck()` | [src/app.js:465](../src/app.js#L465) |
| `registerServiceWorker()` | [src/app.js:481](../src/app.js#L481) |
| `initApp()` | [src/app.js:512](../src/app.js#L512) |

## src/backupSchema.js

| Function | 宣告位置 |
| --- | --- |
| `isRecord()` | [src/backupSchema.js:45](../src/backupSchema.js#L45) |
| `equalBackupValues()` | [src/backupSchema.js:49](../src/backupSchema.js#L49) |
| `validateSnapshotData()` | [src/backupSchema.js:62](../src/backupSchema.js#L62) |
| `validateStoredSnapshot()` | [src/backupSchema.js:327](../src/backupSchema.js#L327) |
| `validateBackupEnvelope()` | [src/backupSchema.js:353](../src/backupSchema.js#L353) |

## src/backupService.js

| Function | 宣告位置 |
| --- | --- |
| `buildDataPayload()` | [src/backupService.js:71](../src/backupService.js#L71) |
| `exportBackup()` | [src/backupService.js:158](../src/backupService.js#L158) |
| `downloadBackupFile()` | [src/backupService.js:190](../src/backupService.js#L190) |
| `downloadBackup()` | [src/backupService.js:207](../src/backupService.js#L207) |
| `readBackupFile()` | [src/backupService.js:219](../src/backupService.js#L219) |
| `extractRawData()` | [src/backupService.js:257](../src/backupService.js#L257) |
| `validateBackup()` | [src/backupService.js:288](../src/backupService.js#L288) |
| `mergeAchievementsData()` | [src/backupService.js:295](../src/backupService.js#L295) |
| `resolveWallet()` | [src/backupService.js:329](../src/backupService.js#L329) |
| `normalizeBackupPayload()` | [src/backupService.js:343](../src/backupService.js#L343) |
| `normalizePayloadData()` | [src/backupService.js:349](../src/backupService.js#L349) |
| `migrateImportedData()` | [src/backupService.js:405](../src/backupService.js#L405) |
| `previewBackup()` | [src/backupService.js:516](../src/backupService.js#L516) |
| `buildAutoBackupFilename()` | [src/backupService.js:556](../src/backupService.js#L556) |
| `createAutoBackupBeforeImport()` | [src/backupService.js:566](../src/backupService.js#L566) |
| `safeReplaceAllData()` | [src/backupService.js:581](../src/backupService.js#L581) |
| `restoreBackup()` | [src/backupService.js:615](../src/backupService.js#L615) |
| `importBackup()` | [src/backupService.js:628](../src/backupService.js#L628) |

## src/bondJourneyController.js

| Function | 宣告位置 |
| --- | --- |
| `createBondJourneyController()` | [src/bondJourneyController.js:6](../src/bondJourneyController.js#L6) |
| `render()` | [src/bondJourneyController.js:16](../src/bondJourneyController.js#L16) |
| `open()` | [src/bondJourneyController.js:26](../src/bondJourneyController.js#L26) |
| `handle()` | [src/bondJourneyController.js:36](../src/bondJourneyController.js#L36) |
| `mount()` | [src/bondJourneyController.js:102](../src/bondJourneyController.js#L102) |

## src/bondJourneyCore.js

| Function | 宣告位置 |
| --- | --- |
| `createBondJourney()` | [src/bondJourneyCore.js:14](../src/bondJourneyCore.js#L14) |
| `validateBondJourney()` | [src/bondJourneyCore.js:20](../src/bondJourneyCore.js#L20) |
| `normalizeBondJourney()` | [src/bondJourneyCore.js:66](../src/bondJourneyCore.js#L66) |
| `chapterIsAvailable()` | [src/bondJourneyCore.js:73](../src/bondJourneyCore.js#L73) |
| `advanceBondJourney()` | [src/bondJourneyCore.js:79](../src/bondJourneyCore.js#L79) |
| `getBondSummary()` | [src/bondJourneyCore.js:108](../src/bondJourneyCore.js#L108) |

## src/bondJourneyService.js

| Function | 宣告位置 |
| --- | --- |
| `loadBondStories()` | [src/bondJourneyService.js:14](../src/bondJourneyService.js#L14) |
| `findBondStory()` | [src/bondJourneyService.js:26](../src/bondJourneyService.js#L26) |
| `getBondJourney()` | [src/bondJourneyService.js:30](../src/bondJourneyService.js#L30) |
| `chooseBondResponse()` | [src/bondJourneyService.js:41](../src/bondJourneyService.js#L41) |
| `startBondAgreement()` | [src/bondJourneyService.js:55](../src/bondJourneyService.js#L55) |
| `syncBondJourney()` | [src/bondJourneyService.js:81](../src/bondJourneyService.js#L81) |
| `controlBondAgreement()` | [src/bondJourneyService.js:89](../src/bondJourneyService.js#L89) |
| `claimBondAgreement()` | [src/bondJourneyService.js:107](../src/bondJourneyService.js#L107) |
| `displayBondKeepsake()` | [src/bondJourneyService.js:129](../src/bondJourneyService.js#L129) |

## src/bondJourneyView.js

| Function | 宣告位置 |
| --- | --- |
| `renderBondKeepsake()` | [src/bondJourneyView.js:13](../src/bondJourneyView.js#L13) |
| `renderBondHome()` | [src/bondJourneyView.js:21](../src/bondJourneyView.js#L21) |
| `renderBondDetail()` | [src/bondJourneyView.js:32](../src/bondJourneyView.js#L32) |
| `renderBondOverview()` | [src/bondJourneyView.js:38](../src/bondJourneyView.js#L38) |
| `renderAgreement()` | [src/bondJourneyView.js:67](../src/bondJourneyView.js#L67) |
| `renderBondChapter()` | [src/bondJourneyView.js:80](../src/bondJourneyView.js#L80) |
| `renderBondSelector()` | [src/bondJourneyView.js:96](../src/bondJourneyView.js#L96) |

## src/bondStoryCatalog.js

| Function | 宣告位置 |
| --- | --- |
| `validateBondStories()` | [src/bondStoryCatalog.js:4](../src/bondStoryCatalog.js#L4) |
| `mergeBondStorySupplements()` | [src/bondStoryCatalog.js:28](../src/bondStoryCatalog.js#L28) |

## src/bootstrap.js

| Function | 宣告位置 |
| --- | --- |
| `bootApplication()` | [src/bootstrap.js:6](../src/bootstrap.js#L6) |

## src/bootstrapRecovery.js

| Function | 宣告位置 |
| --- | --- |
| `readServiceWorker()` | [src/bootstrapRecovery.js:3](../src/bootstrapRecovery.js#L3) |
| `readSessionStorage()` | [src/bootstrapRecovery.js:7](../src/bootstrapRecovery.js#L7) |
| `unavailableBrowserError()` | [src/bootstrapRecovery.js:11](../src/bootstrapRecovery.js#L11) |
| `isBlockedRegistration()` | [src/bootstrapRecovery.js:17](../src/bootstrapRecovery.js#L17) |
| `renderBootstrapRecovery()` | [src/bootstrapRecovery.js:23](../src/bootstrapRecovery.js#L23) |

## src/campService.js

| Function | 宣告位置 |
| --- | --- |
| `normalizeCampProgress()` | [src/campService.js:12](../src/campService.js#L12) |
| `getCampProgress()` | [src/campService.js:17](../src/campService.js#L17) |
| `upgradeCamp()` | [src/campService.js:21](../src/campService.js#L21) |

## src/categoryService.js

| Function | 宣告位置 |
| --- | --- |
| `loadCategoriesCatalog()` | [src/categoryService.js:9](../src/categoryService.js#L9) |
| `getDefaultCategories()` | [src/categoryService.js:25](../src/categoryService.js#L25) |
| `getAllCategories()` | [src/categoryService.js:38](../src/categoryService.js#L38) |
| `getCategoryById()` | [src/categoryService.js:43](../src/categoryService.js#L43) |
| `isValidCategoryId()` | [src/categoryService.js:49](../src/categoryService.js#L49) |

## src/collectionMilestoneService.js

| Function | 宣告位置 |
| --- | --- |
| `normalizeCollectionMilestoneState()` | [src/collectionMilestoneService.js:60](../src/collectionMilestoneService.js#L60) |
| `getCollectionMilestoneState()` | [src/collectionMilestoneService.js:72](../src/collectionMilestoneService.js#L72) |
| `initCollectionMilestones()` | [src/collectionMilestoneService.js:77](../src/collectionMilestoneService.js#L77) |
| `buildCollectionMilestoneContext()` | [src/collectionMilestoneService.js:83](../src/collectionMilestoneService.js#L83) |
| `resolveCollectionMilestoneDefinitions()` | [src/collectionMilestoneService.js:121](../src/collectionMilestoneService.js#L121) |
| `getCollectionMilestoneProgress()` | [src/collectionMilestoneService.js:137](../src/collectionMilestoneService.js#L137) |
| `buildCollectionMilestoneSummary()` | [src/collectionMilestoneService.js:156](../src/collectionMilestoneService.js#L156) |
| `getCollectionMilestoneSummary()` | [src/collectionMilestoneService.js:201](../src/collectionMilestoneService.js#L201) |
| `claimCollectionMilestone()` | [src/collectionMilestoneService.js:209](../src/collectionMilestoneService.js#L209) |
| `exportCollectionMilestoneState()` | [src/collectionMilestoneService.js:263](../src/collectionMilestoneService.js#L263) |

## src/collectionService.js

| Function | 宣告位置 |
| --- | --- |
| `isCjkChar()` | [src/collectionService.js:18](../src/collectionService.js#L18) |
| `getNicknameCharUnits()` | [src/collectionService.js:23](../src/collectionService.js#L23) |
| `normalizePetNickname()` | [src/collectionService.js:36](../src/collectionService.js#L36) |
| `validatePetNickname()` | [src/collectionService.js:47](../src/collectionService.js#L47) |
| `sanitizeStoredNickname()` | [src/collectionService.js:63](../src/collectionService.js#L63) |
| `getPetDisplayName()` | [src/collectionService.js:88](../src/collectionService.js#L88) |
| `getPetOriginalName()` | [src/collectionService.js:98](../src/collectionService.js#L98) |
| `setPetNickname()` | [src/collectionService.js:106](../src/collectionService.js#L106) |
| `clearPetNickname()` | [src/collectionService.js:124](../src/collectionService.js#L124) |
| `migrateCollectionNicknames()` | [src/collectionService.js:138](../src/collectionService.js#L138) |
| `defaultBondUnlocks()` | [src/collectionService.js:167](../src/collectionService.js#L167) |
| `computeBondUnlockFlags()` | [src/collectionService.js:180](../src/collectionService.js#L180) |
| `normalizeBondUnlocks()` | [src/collectionService.js:199](../src/collectionService.js#L199) |
| `getBondUnlocksByLevel()` | [src/collectionService.js:218](../src/collectionService.js#L218) |
| `getBondLevelFromExp()` | [src/collectionService.js:233](../src/collectionService.js#L233) |
| `getBondProgress()` | [src/collectionService.js:245](../src/collectionService.js#L245) |
| `normalizeCollectionItem()` | [src/collectionService.js:261](../src/collectionService.js#L261) |
| `normalizeLastPettedAt()` | [src/collectionService.js:265](../src/collectionService.js#L265) |
| `normalizeEntry()` | [src/collectionService.js:273](../src/collectionService.js#L273) |
| `noCollectionChange()` | [src/collectionService.js:290](../src/collectionService.js#L290) |
| `saveCollectionChange()` | [src/collectionService.js:291](../src/collectionService.js#L291) |
| `mutatePet()` | [src/collectionService.js:294](../src/collectionService.js#L294) |
| `mutateCompanion()` | [src/collectionService.js:297](../src/collectionService.js#L297) |
| `createCollectionEntry()` | [src/collectionService.js:304](../src/collectionService.js#L304) |
| `getCollection()` | [src/collectionService.js:310](../src/collectionService.js#L310) |
| `getPetCollection()` | [src/collectionService.js:316](../src/collectionService.js#L316) |
| `addPetToCollection()` | [src/collectionService.js:324](../src/collectionService.js#L324) |
| `setCompanion()` | [src/collectionService.js:332](../src/collectionService.js#L332) |
| `getCompanionPet()` | [src/collectionService.js:350](../src/collectionService.js#L350) |
| `canPetCompanion()` | [src/collectionService.js:356](../src/collectionService.js#L356) |
| `getPetCooldownRemaining()` | [src/collectionService.js:361](../src/collectionService.js#L361) |
| `formatCooldown()` | [src/collectionService.js:370](../src/collectionService.js#L370) |
| `petCompanion()` | [src/collectionService.js:384](../src/collectionService.js#L384) |
| `getCompanion()` | [src/collectionService.js:404](../src/collectionService.js#L404) |
| `addBondExpToPet()` | [src/collectionService.js:430](../src/collectionService.js#L430) |
| `addBondExpToCompanion()` | [src/collectionService.js:439](../src/collectionService.js#L439) |
| `updatePetBondUnlocks()` | [src/collectionService.js:451](../src/collectionService.js#L451) |
| `getPetBondUnlockStatus()` | [src/collectionService.js:467](../src/collectionService.js#L467) |
| `hasBondLiberated()` | [src/collectionService.js:478](../src/collectionService.js#L478) |
| `syncWithPetDatabase()` | [src/collectionService.js:484](../src/collectionService.js#L484) |
| `getCollectionProgress()` | [src/collectionService.js:489](../src/collectionService.js#L489) |
| `getEnrichedCollection()` | [src/collectionService.js:498](../src/collectionService.js#L498) |
| `exportCollection()` | [src/collectionService.js:522](../src/collectionService.js#L522) |
| `importCollection()` | [src/collectionService.js:526](../src/collectionService.js#L526) |
| `addBondChange()` | [src/collectionService.js:532](../src/collectionService.js#L532) |

## src/companionDialogueService.js

| Function | 宣告位置 |
| --- | --- |
| `getRarityGroup()` | [src/companionDialogueService.js:24](../src/companionDialogueService.js#L24) |
| `getBondDialogueLine()` | [src/companionDialogueService.js:217](../src/companionDialogueService.js#L217) |
| `detectScenarios()` | [src/companionDialogueService.js:264](../src/companionDialogueService.js#L264) |
| `resolveScenario()` | [src/companionDialogueService.js:364](../src/companionDialogueService.js#L364) |
| `getDialogueForScenario()` | [src/companionDialogueService.js:376](../src/companionDialogueService.js#L376) |
| `getCompanionDialogue()` | [src/companionDialogueService.js:396](../src/companionDialogueService.js#L396) |
| `getWelcomeCompanionLine()` | [src/companionDialogueService.js:428](../src/companionDialogueService.js#L428) |
| `randomBubbleInterval()` | [src/companionDialogueService.js:448](../src/companionDialogueService.js#L448) |

## src/companionService.js

| Function | 宣告位置 |
| --- | --- |
| `getRandomDialogue()` | [src/companionService.js:51](../src/companionService.js#L51) |
| `getDefaultCompanionLine()` | [src/companionService.js:63](../src/companionService.js#L63) |
| `getBondUpLine()` | [src/companionService.js:75](../src/companionService.js#L75) |

## src/dailyCheckInService.js

| Function | 宣告位置 |
| --- | --- |
| `getLocalDateKey()` | [src/dailyCheckInService.js:46](../src/dailyCheckInService.js#L46) |
| `isValidDateKey()` | [src/dailyCheckInService.js:51](../src/dailyCheckInService.js#L51) |
| `isYesterday()` | [src/dailyCheckInService.js:62](../src/dailyCheckInService.js#L62) |
| `normalizeDailyCheckIn()` | [src/dailyCheckInService.js:72](../src/dailyCheckInService.js#L72) |
| `getDailyCheckIn()` | [src/dailyCheckInService.js:91](../src/dailyCheckInService.js#L91) |
| `saveDailyCheckIn()` | [src/dailyCheckInService.js:96](../src/dailyCheckInService.js#L96) |
| `initDailyCheckIn()` | [src/dailyCheckInService.js:102](../src/dailyCheckInService.js#L102) |
| `exportDailyCheckIn()` | [src/dailyCheckInService.js:107](../src/dailyCheckInService.js#L107) |
| `hasCheckedInToday()` | [src/dailyCheckInService.js:112](../src/dailyCheckInService.js#L112) |
| `hasSpunWheelToday()` | [src/dailyCheckInService.js:117](../src/dailyCheckInService.js#L117) |
| `mergeRewardBundles()` | [src/dailyCheckInService.js:122](../src/dailyCheckInService.js#L122) |
| `calculateCheckInRewards()` | [src/dailyCheckInService.js:143](../src/dailyCheckInService.js#L143) |
| `upsertHistoryEntry()` | [src/dailyCheckInService.js:151](../src/dailyCheckInService.js#L151) |
| `loadWheelRewards()` | [src/dailyCheckInService.js:162](../src/dailyCheckInService.js#L162) |
| `pickWeightedWheelReward()` | [src/dailyCheckInService.js:188](../src/dailyCheckInService.js#L188) |
| `wheelRewardToBundle()` | [src/dailyCheckInService.js:201](../src/dailyCheckInService.js#L201) |
| `performDailyCheckIn()` | [src/dailyCheckInService.js:231](../src/dailyCheckInService.js#L231) |
| `prepareDailyWheelSpin()` | [src/dailyCheckInService.js:286](../src/dailyCheckInService.js#L286) |
| `finalizeDailyWheelSpin()` | [src/dailyCheckInService.js:318](../src/dailyCheckInService.js#L318) |
| `releaseWheelSpinLock()` | [src/dailyCheckInService.js:356](../src/dailyCheckInService.js#L356) |
| `isWheelSpinning()` | [src/dailyCheckInService.js:360](../src/dailyCheckInService.js#L360) |
| `isCheckInProcessing()` | [src/dailyCheckInService.js:364](../src/dailyCheckInService.js#L364) |

## src/db.js

| Function | 宣告位置 |
| --- | --- |
| `reminderChanged()` | [src/db.js:31](../src/db.js#L31) |
| `markReminderDirty()` | [src/db.js:34](../src/db.js#L34) |
| `openDB()` | [src/db.js:50](../src/db.js#L50) |
| `dbGet()` | [src/db.js:91](../src/db.js#L91) |
| `dbPut()` | [src/db.js:105](../src/db.js#L105) |
| `dbDelete()` | [src/db.js:122](../src/db.js#L122) |
| `dbGetAll()` | [src/db.js:139](../src/db.js#L139) |
| `dbClear()` | [src/db.js:153](../src/db.js#L153) |
| `dbMutateRecords()` | [src/db.js:172](../src/db.js#L172) |
| `dbUpdateRecord()` | [src/db.js:228](../src/db.js#L228) |
| `clearAllData()` | [src/db.js:242](../src/db.js#L242) |
| `readAllStoresSnapshot()` | [src/db.js:259](../src/db.js#L259) |
| `replaceAllStores()` | [src/db.js:279](../src/db.js#L279) |

## src/deferredRenderGate.js

| Function | 宣告位置 |
| --- | --- |
| `createDeferredRenderGate()` | [src/deferredRenderGate.js:2](../src/deferredRenderGate.js#L2) |

## src/devService.js

| Function | 宣告位置 |
| --- | --- |
| `isDevMode()` | [src/devService.js:38](../src/devService.js#L38) |
| `isAuthorLocalDevMode()` | [src/devService.js:47](../src/devService.js#L47) |
| `isDebugMode()` | [src/devService.js:67](../src/devService.js#L67) |
| `unlockDevTestPets()` | [src/devService.js:82](../src/devService.js#L82) |
| `unlockAllDevPets()` | [src/devService.js:97](../src/devService.js#L97) |
| `grantDevStardust()` | [src/devService.js:111](../src/devService.js#L111) |
| `devForceCompleteExpedition()` | [src/devService.js:121](../src/devService.js#L121) |
| `raiseDevCompanionBond()` | [src/devService.js:133](../src/devService.js#L133) |
| `resetDevDailyBlessing()` | [src/devService.js:172](../src/devService.js#L172) |

## src/dialogFocus.js

| Function | 宣告位置 |
| --- | --- |
| `visible()` | [src/dialogFocus.js:5](../src/dialogFocus.js#L5) |
| `controls()` | [src/dialogFocus.js:11](../src/dialogFocus.js#L11) |
| `stackingLevel()` | [src/dialogFocus.js:16](../src/dialogFocus.js#L16) |
| `topDialog()` | [src/dialogFocus.js:24](../src/dialogFocus.js#L24) |
| `isTopDialog()` | [src/dialogFocus.js:29](../src/dialogFocus.js#L29) |
| `rememberDialogFocus()` | [src/dialogFocus.js:34](../src/dialogFocus.js#L34) |
| `focusDialog()` | [src/dialogFocus.js:38](../src/dialogFocus.js#L38) |
| `restoreDialogFocus()` | [src/dialogFocus.js:64](../src/dialogFocus.js#L64) |
| `bindDialogFocus()` | [src/dialogFocus.js:82](../src/dialogFocus.js#L82) |

## src/encounterCeremony.js

| Function | 宣告位置 |
| --- | --- |
| `ceremonyPresentation()` | [src/encounterCeremony.js:11](../src/encounterCeremony.js#L11) |
| `createPoolScenery()` | [src/encounterCeremony.js:20](../src/encounterCeremony.js#L20) |
| `playCeremonyEntry()` | [src/encounterCeremony.js:33](../src/encounterCeremony.js#L33) |
| `withLegacyScene()` | [src/encounterCeremony.js:38](../src/encounterCeremony.js#L38) |
| `playCeremonyRitual()` | [src/encounterCeremony.js:71](../src/encounterCeremony.js#L71) |
| `playCeremonyCharacter()` | [src/encounterCeremony.js:81](../src/encounterCeremony.js#L81) |
| `playInvitationCharacter()` | [src/encounterCeremony.js:95](../src/encounterCeremony.js#L95) |

## src/encounterEconomyCore.js

| Function | 宣告位置 |
| --- | --- |
| `amount()` | [src/encounterEconomyCore.js:11](../src/encounterEconomyCore.js#L11) |
| `validateEncounterEconomy()` | [src/encounterEconomyCore.js:15](../src/encounterEconomyCore.js#L15) |
| `normalizeEncounterEconomy()` | [src/encounterEconomyCore.js:42](../src/encounterEconomyCore.js#L42) |
| `earnEncounterFragments()` | [src/encounterEconomyCore.js:51](../src/encounterEconomyCore.js#L51) |
| `planEncounterMigration()` | [src/encounterEconomyCore.js:55](../src/encounterEconomyCore.js#L55) |
| `invitationCandidates()` | [src/encounterEconomyCore.js:88](../src/encounterEconomyCore.js#L88) |
| `planCompanionInvitation()` | [src/encounterEconomyCore.js:104](../src/encounterEconomyCore.js#L104) |

## src/encounterEconomyService.js

| Function | 宣告位置 |
| --- | --- |
| `puts()` | [src/encounterEconomyService.js:5](../src/encounterEconomyService.js#L5) |
| `getEncounterEconomy()` | [src/encounterEconomyService.js:8](../src/encounterEconomyService.js#L8) |
| `ensureEncounterMigration()` | [src/encounterEconomyService.js:11](../src/encounterEconomyService.js#L11) |
| `inviteCompanion()` | [src/encounterEconomyService.js:17](../src/encounterEconomyService.js#L17) |
| `acknowledgeEncounterMigration()` | [src/encounterEconomyService.js:23](../src/encounterEconomyService.js#L23) |

## src/encounterScenery.js

| Function | 宣告位置 |
| --- | --- |
| `createEncounterScenery()` | [src/encounterScenery.js:2](../src/encounterScenery.js#L2) |

## src/encounterView.js

| Function | 宣告位置 |
| --- | --- |
| `imageHtml()` | [src/encounterView.js:66](../src/encounterView.js#L66) |
| `cues()` | [src/encounterView.js:70](../src/encounterView.js#L70) |
| `miniCard()` | [src/encounterView.js:74](../src/encounterView.js#L74) |
| `poolSelector()` | [src/encounterView.js:82](../src/encounterView.js#L82) |
| `renderPool()` | [src/encounterView.js:89](../src/encounterView.js#L89) |
| `renderCollection()` | [src/encounterView.js:121](../src/encounterView.js#L121) |
| `renderCollectionCards()` | [src/encounterView.js:137](../src/encounterView.js#L137) |
| `render()` | [src/encounterView.js:142](../src/encounterView.js#L142) |
| `showDialog()` | [src/encounterView.js:150](../src/encounterView.js#L150) |
| `keepDialogFocus()` | [src/encounterView.js:157](../src/encounterView.js#L157) |
| `petDetail()` | [src/encounterView.js:173](../src/encounterView.js#L173) |
| `poolPreview()` | [src/encounterView.js:209](../src/encounterView.js#L209) |
| `probability()` | [src/encounterView.js:213](../src/encounterView.js#L213) |
| `clearTimers()` | [src/encounterView.js:225](../src/encounterView.js#L225) |
| `phase()` | [src/encounterView.js:227](../src/encounterView.js#L227) |
| `rememberRevealOpener()` | [src/encounterView.js:255](../src/encounterView.js#L255) |
| `presentResult()` | [src/encounterView.js:261](../src/encounterView.js#L261) |
| `presentCommittedEncounters()` | [src/encounterView.js:286](../src/encounterView.js#L286) |
| `showBatchSummary()` | [src/encounterView.js:320](../src/encounterView.js#L320) |
| `finishPresentation()` | [src/encounterView.js:334](../src/encounterView.js#L334) |
| `closeReveal()` | [src/encounterView.js:339](../src/encounterView.js#L339) |
| `activationHaptic()` | [src/encounterView.js:341](../src/encounterView.js#L341) |
| `presentBatchCharacter()` | [src/encounterView.js:345](../src/encounterView.js#L345) |
| `renderEncounterView()` | [src/encounterView.js:456](../src/encounterView.js#L456) |
| `runDraw()` | [src/encounterView.js:494](../src/encounterView.js#L494) |
| `walletHint()` | [src/encounterView.js:502](../src/encounterView.js#L502) |
| `openInvitation()` | [src/encounterView.js:508](../src/encounterView.js#L508) |

## src/encounterViewModel.js

| Function | 宣告位置 |
| --- | --- |
| `publicIntro()` | [src/encounterViewModel.js:12](../src/encounterViewModel.js#L12) |
| `normalGreeting()` | [src/encounterViewModel.js:16](../src/encounterViewModel.js#L16) |
| `poolCandidates()` | [src/encounterViewModel.js:20](../src/encounterViewModel.js#L20) |
| `identityLabel()` | [src/encounterViewModel.js:24](../src/encounterViewModel.js#L24) |
| `basePetRate()` | [src/encounterViewModel.js:28](../src/encounterViewModel.js#L28) |
| `duplicateNote()` | [src/encounterViewModel.js:33](../src/encounterViewModel.js#L33) |
| `encounterResults()` | [src/encounterViewModel.js:40](../src/encounterViewModel.js#L40) |

## src/expeditionGameplay.js

| Function | 宣告位置 |
| --- | --- |
| `getPetSpecialty()` | [src/expeditionGameplay.js:31](../src/expeditionGameplay.js#L31) |
| `hashText()` | [src/expeditionGameplay.js:43](../src/expeditionGameplay.js#L43) |
| `getExpeditionRecommendations()` | [src/expeditionGameplay.js:50](../src/expeditionGameplay.js#L50) |
| `getDispatchTerms()` | [src/expeditionGameplay.js:72](../src/expeditionGameplay.js#L72) |
| `planExpeditionResult()` | [src/expeditionGameplay.js:78](../src/expeditionGameplay.js#L78) |

## src/expeditionService.js

| Function | 宣告位置 |
| --- | --- |
| `loadExpeditionAreas()` | [src/expeditionService.js:37](../src/expeditionService.js#L37) |
| `normalizeExpedition()` | [src/expeditionService.js:45](../src/expeditionService.js#L45) |
| `getAllExpeditions()` | [src/expeditionService.js:60](../src/expeditionService.js#L60) |
| `getRecentExpeditions()` | [src/expeditionService.js:65](../src/expeditionService.js#L65) |
| `isFirstJourneyAvailable()` | [src/expeditionService.js:70](../src/expeditionService.js#L70) |
| `getActiveExpedition()` | [src/expeditionService.js:75](../src/expeditionService.js#L75) |
| `isExpeditionTimeComplete()` | [src/expeditionService.js:81](../src/expeditionService.js#L81) |
| `getRemainingMs()` | [src/expeditionService.js:87](../src/expeditionService.js#L87) |
| `formatRemainingTime()` | [src/expeditionService.js:93](../src/expeditionService.js#L93) |
| `randomInt()` | [src/expeditionService.js:102](../src/expeditionService.js#L102) |
| `textContainsKeyword()` | [src/expeditionService.js:106](../src/expeditionService.js#L106) |
| `petMatchesElements()` | [src/expeditionService.js:111](../src/expeditionService.js#L111) |
| `petMatchesTraitUnlock()` | [src/expeditionService.js:119](../src/expeditionService.js#L119) |
| `checkAreaUnlock()` | [src/expeditionService.js:137](../src/expeditionService.js#L137) |
| `getStardustBonuses()` | [src/expeditionService.js:173](../src/expeditionService.js#L173) |
| `calculateExpeditionRewards()` | [src/expeditionService.js:184](../src/expeditionService.js#L184) |
| `startExpedition()` | [src/expeditionService.js:212](../src/expeditionService.js#L212) |
| `getOwnedPetsForUnlock()` | [src/expeditionService.js:264](../src/expeditionService.js#L264) |
| `markExpeditionComplete()` | [src/expeditionService.js:271](../src/expeditionService.js#L271) |
| `forceCompleteActiveExpedition()` | [src/expeditionService.js:280](../src/expeditionService.js#L280) |
| `claimExpeditionRewards()` | [src/expeditionService.js:294](../src/expeditionService.js#L294) |
| `isPetOnExpedition()` | [src/expeditionService.js:349](../src/expeditionService.js#L349) |
| `exportExpeditions()` | [src/expeditionService.js:353](../src/expeditionService.js#L353) |
| `importExpeditions()` | [src/expeditionService.js:357](../src/expeditionService.js#L357) |

## src/expeditionStatusService.js

| Function | 宣告位置 |
| --- | --- |
| `getStatusLines()` | [src/expeditionStatusService.js:57](../src/expeditionStatusService.js#L57) |
| `pickStatusLine()` | [src/expeditionStatusService.js:66](../src/expeditionStatusService.js#L66) |
| `randomStatusInterval()` | [src/expeditionStatusService.js:81](../src/expeditionStatusService.js#L81) |

## src/explorationService.js

| Function | 宣告位置 |
| --- | --- |
| `clampProgress()` | [src/explorationService.js:326](../src/explorationService.js#L326) |
| `toSafeInt()` | [src/explorationService.js:331](../src/explorationService.js#L331) |
| `toStringArray()` | [src/explorationService.js:337](../src/explorationService.js#L337) |
| `computeUnlockedStories()` | [src/explorationService.js:343](../src/explorationService.js#L343) |
| `normalizeArea()` | [src/explorationService.js:356](../src/explorationService.js#L356) |
| `normalizeExplorationProgress()` | [src/explorationService.js:382](../src/explorationService.js#L382) |
| `createDefaultExplorationProgress()` | [src/explorationService.js:410](../src/explorationService.js#L410) |
| `getExplorationProgress()` | [src/explorationService.js:415](../src/explorationService.js#L415) |
| `initExplorationProgress()` | [src/explorationService.js:425](../src/explorationService.js#L425) |
| `getAreaExploration()` | [src/explorationService.js:433](../src/explorationService.js#L433) |
| `getAreaExplorationIncrement()` | [src/explorationService.js:439](../src/explorationService.js#L439) |
| `getExplorationMilestones()` | [src/explorationService.js:444](../src/explorationService.js#L444) |
| `getUnlockedAreaStories()` | [src/explorationService.js:449](../src/explorationService.js#L449) |
| `isAreaFullyExplored()` | [src/explorationService.js:458](../src/explorationService.js#L458) |
| `updateAreaExplorationProgress()` | [src/explorationService.js:469](../src/explorationService.js#L469) |
| `advanceExplorationRecord()` | [src/explorationService.js:477](../src/explorationService.js#L477) |
| `claimExplorationMilestone()` | [src/explorationService.js:532](../src/explorationService.js#L532) |
| `formatMilestoneReward()` | [src/explorationService.js:574](../src/explorationService.js#L574) |
| `getRewardChips()` | [src/explorationService.js:594](../src/explorationService.js#L594) |
| `getExplorationSummary()` | [src/explorationService.js:622](../src/explorationService.js#L622) |
| `exportExplorationProgress()` | [src/explorationService.js:682](../src/explorationService.js#L682) |

## src/feedbackController.js

| Function | 宣告位置 |
| --- | --- |
| `initFeedback()` | [src/feedbackController.js:8](../src/feedbackController.js#L8) |

## src/feedbackService.js

| Function | 宣告位置 |
| --- | --- |
| `normalizeFeedback()` | [src/feedbackService.js:13](../src/feedbackService.js#L13) |
| `validateFeedback()` | [src/feedbackService.js:22](../src/feedbackService.js#L22) |
| `loadFeedbackDraft()` | [src/feedbackService.js:30](../src/feedbackService.js#L30) |
| `saveFeedbackDraft()` | [src/feedbackService.js:35](../src/feedbackService.js#L35) |
| `clearFeedbackDraft()` | [src/feedbackService.js:42](../src/feedbackService.js#L42) |
| `collectFeedbackDiagnostics()` | [src/feedbackService.js:47](../src/feedbackService.js#L47) |
| `buildFeedbackReport()` | [src/feedbackService.js:64](../src/feedbackService.js#L64) |
| `savePendingFeedback()` | [src/feedbackService.js:82](../src/feedbackService.js#L82) |
| `loadPendingFeedback()` | [src/feedbackService.js:87](../src/feedbackService.js#L87) |
| `finishFeedback()` | [src/feedbackService.js:96](../src/feedbackService.js#L96) |
| `getFeedbackReceipt()` | [src/feedbackService.js:106](../src/feedbackService.js#L106) |
| `sendFeedback()` | [src/feedbackService.js:111](../src/feedbackService.js#L111) |

## src/filterGestureController.js

| Function | 宣告位置 |
| --- | --- |
| `initFilterGestures()` | [src/filterGestureController.js:2](../src/filterGestureController.js#L2) |

## src/gachaService.js

| Function | 宣告位置 |
| --- | --- |
| `getGachaStats()` | [src/gachaService.js:11](../src/gachaService.js#L11) |
| `initGachaStats()` | [src/gachaService.js:14](../src/gachaService.js#L14) |
| `getActivePools()` | [src/gachaService.js:17](../src/gachaService.js#L17) |
| `getActivePool()` | [src/gachaService.js:18](../src/gachaService.js#L18) |
| `resolveSelectedPoolId()` | [src/gachaService.js:19](../src/gachaService.js#L19) |
| `setSelectedPoolId()` | [src/gachaService.js:20](../src/gachaService.js#L20) |
| `getPoolPets()` | [src/gachaService.js:23](../src/gachaService.js#L23) |
| `getPoolPetsAsync()` | [src/gachaService.js:26](../src/gachaService.js#L26) |
| `executeDraw()` | [src/gachaService.js:30](../src/gachaService.js#L30) |
| `pullOnce()` | [src/gachaService.js:46](../src/gachaService.js#L46) |
| `performTenPull()` | [src/gachaService.js:49](../src/gachaService.js#L49) |
| `exportGachaStats()` | [src/gachaService.js:56](../src/gachaService.js#L56) |
| `importGachaStats()` | [src/gachaService.js:58](../src/gachaService.js#L58) |

## src/gachaTransactionCore.js

| Function | 宣告位置 |
| --- | --- |
| `emptyPoolPity()` | [src/gachaTransactionCore.js:16](../src/gachaTransactionCore.js#L16) |
| `normalizeGachaStats()` | [src/gachaTransactionCore.js:20](../src/gachaTransactionCore.js#L20) |
| `ensurePoolPity()` | [src/gachaTransactionCore.js:60](../src/gachaTransactionCore.js#L60) |
| `getPoolPityCounters()` | [src/gachaTransactionCore.js:76](../src/gachaTransactionCore.js#L76) |
| `pickPetByRarity()` | [src/gachaTransactionCore.js:81](../src/gachaTransactionCore.js#L81) |
| `rollRarity()` | [src/gachaTransactionCore.js:87](../src/gachaTransactionCore.js#L87) |
| `rollSSRPlus()` | [src/gachaTransactionCore.js:99](../src/gachaTransactionCore.js#L99) |
| `determineRarity()` | [src/gachaTransactionCore.js:113](../src/gachaTransactionCore.js#L113) |
| `updatePityCounters()` | [src/gachaTransactionCore.js:128](../src/gachaTransactionCore.js#L128) |
| `resolvePetFromRarity()` | [src/gachaTransactionCore.js:153](../src/gachaTransactionCore.js#L153) |
| `planGachaTransaction()` | [src/gachaTransactionCore.js:167](../src/gachaTransactionCore.js#L167) |

## src/glacierArrivalScene.js

| Function | 宣告位置 |
| --- | --- |
| `createGlacierArrivalScene()` | [src/glacierArrivalScene.js:4](../src/glacierArrivalScene.js#L4) |

## src/guidedEducation.js

| Function | 宣告位置 |
| --- | --- |
| `contextualEducation()` | [src/guidedEducation.js:13](../src/guidedEducation.js#L13) |

## src/guidedOnboardingController.js

| Function | 宣告位置 |
| --- | --- |
| `isGuidedOnboardingActive()` | [src/guidedOnboardingController.js:46](../src/guidedOnboardingController.js#L46) |
| `getGuidedTutorialDraft()` | [src/guidedOnboardingController.js:47](../src/guidedOnboardingController.js#L47) |
| `run()` | [src/guidedOnboardingController.js:49](../src/guidedOnboardingController.js#L49) |
| `feedback()` | [src/guidedOnboardingController.js:59](../src/guidedOnboardingController.js#L59) |
| `releaseLock()` | [src/guidedOnboardingController.js:64](../src/guidedOnboardingController.js#L64) |
| `lockAround()` | [src/guidedOnboardingController.js:76](../src/guidedOnboardingController.js#L76) |
| `findTarget()` | [src/guidedOnboardingController.js:88](../src/guidedOnboardingController.js#L88) |
| `positionSpotlight()` | [src/guidedOnboardingController.js:101](../src/guidedOnboardingController.js#L101) |
| `settleSpotlight()` | [src/guidedOnboardingController.js:145](../src/guidedOnboardingController.js#L145) |
| `companionMarkup()` | [src/guidedOnboardingController.js:156](../src/guidedOnboardingController.js#L156) |
| `updateHelp()` | [src/guidedOnboardingController.js:162](../src/guidedOnboardingController.js#L162) |
| `refreshGuidedOnboarding()` | [src/guidedOnboardingController.js:170](../src/guidedOnboardingController.js#L170) |
| `repairPresentation()` | [src/guidedOnboardingController.js:238](../src/guidedOnboardingController.js#L238) |
| `action()` | [src/guidedOnboardingController.js:251](../src/guidedOnboardingController.js#L251) |
| `stopHold()` | [src/guidedOnboardingController.js:280](../src/guidedOnboardingController.js#L280) |
| `recordGuidedOnboardingEvent()` | [src/guidedOnboardingController.js:285](../src/guidedOnboardingController.js#L285) |
| `contextualHint()` | [src/guidedOnboardingController.js:301](../src/guidedOnboardingController.js#L301) |
| `renderContextualHint()` | [src/guidedOnboardingController.js:312](../src/guidedOnboardingController.js#L312) |
| `showSkippedEditorHint()` | [src/guidedOnboardingController.js:332](../src/guidedOnboardingController.js#L332) |
| `replayGuidedOnboarding()` | [src/guidedOnboardingController.js:336](../src/guidedOnboardingController.js#L336) |
| `pauseGuidedPageTour()` | [src/guidedOnboardingController.js:344](../src/guidedOnboardingController.js#L344) |
| `initGuidedOnboarding()` | [src/guidedOnboardingController.js:349](../src/guidedOnboardingController.js#L349) |
| `renderPageTour()` | [src/guidedOnboardingController.js:446](../src/guidedOnboardingController.js#L446) |
| `movePageTour()` | [src/guidedOnboardingController.js:472](../src/guidedOnboardingController.js#L472) |
| `guidedAfterReset()` | [src/guidedOnboardingController.js:488](../src/guidedOnboardingController.js#L488) |

## src/guidedOnboardingCore.js

| Function | 宣告位置 |
| --- | --- |
| `normalizeGuidedState()` | [src/guidedOnboardingCore.js:10](../src/guidedOnboardingCore.js#L10) |
| `initialGuidedState()` | [src/guidedOnboardingCore.js:23](../src/guidedOnboardingCore.js#L23) |
| `transitionGuidedState()` | [src/guidedOnboardingCore.js:36](../src/guidedOnboardingCore.js#L36) |
| `recoverGuidedState()` | [src/guidedOnboardingCore.js:54](../src/guidedOnboardingCore.js#L54) |
| `tutorialDraft()` | [src/guidedOnboardingCore.js:70](../src/guidedOnboardingCore.js#L70) |
| `tutorialReward()` | [src/guidedOnboardingCore.js:78](../src/guidedOnboardingCore.js#L78) |

## src/guidedOnboardingService.js

| Function | 宣告位置 |
| --- | --- |
| `prepareGuidedOnboarding()` | [src/guidedOnboardingService.js:7](../src/guidedOnboardingService.js#L7) |
| `recoverGuidedOnboarding()` | [src/guidedOnboardingService.js:21](../src/guidedOnboardingService.js#L21) |
| `advanceGuidedOnboarding()` | [src/guidedOnboardingService.js:34](../src/guidedOnboardingService.js#L34) |
| `startGuidedReplay()` | [src/guidedOnboardingService.js:47](../src/guidedOnboardingService.js#L47) |
| `commitTutorialTask()` | [src/guidedOnboardingService.js:59](../src/guidedOnboardingService.js#L59) |
| `claimTutorialReward()` | [src/guidedOnboardingService.js:73](../src/guidedOnboardingService.js#L73) |
| `resetGuidedAfterDataReset()` | [src/guidedOnboardingService.js:112](../src/guidedOnboardingService.js#L112) |
| `dismissGuidedAfterRestore()` | [src/guidedOnboardingService.js:118](../src/guidedOnboardingService.js#L118) |
| `acknowledgeGuidedHint()` | [src/guidedOnboardingService.js:124](../src/guidedOnboardingService.js#L124) |

## src/guidedPageTour.js

| Function | 宣告位置 |
| --- | --- |
| `transitionPageTour()` | [src/guidedPageTour.js:28](../src/guidedPageTour.js#L28) |
| `readPageTour()` | [src/guidedPageTour.js:40](../src/guidedPageTour.js#L40) |
| `savePageTour()` | [src/guidedPageTour.js:41](../src/guidedPageTour.js#L41) |

## src/habitService.js

| Function | 宣告位置 |
| --- | --- |
| `getWeekMonday()` | [src/habitService.js:19](../src/habitService.js#L19) |
| `weekRewardKey()` | [src/habitService.js:28](../src/habitService.js#L28) |
| `normalizeHabit()` | [src/habitService.js:33](../src/habitService.js#L33) |
| `getAllHabits()` | [src/habitService.js:54](../src/habitService.js#L54) |
| `getHabitById()` | [src/habitService.js:60](../src/habitService.js#L60) |
| `saveHabit()` | [src/habitService.js:66](../src/habitService.js#L66) |
| `initHabits()` | [src/habitService.js:77](../src/habitService.js#L77) |
| `createHabit()` | [src/habitService.js:88](../src/habitService.js#L88) |
| `updateHabit()` | [src/habitService.js:124](../src/habitService.js#L124) |
| `archiveHabit()` | [src/habitService.js:157](../src/habitService.js#L157) |
| `isDateLogKey()` | [src/habitService.js:168](../src/habitService.js#L168) |
| `getWeeklyCompletionCount()` | [src/habitService.js:173](../src/habitService.js#L173) |
| `isWeeklyGoalMet()` | [src/habitService.js:187](../src/habitService.js#L187) |
| `isWeeklyRewardClaimed()` | [src/habitService.js:194](../src/habitService.js#L194) |
| `isCompletedToday()` | [src/habitService.js:200](../src/habitService.js#L200) |
| `countTodayStardustClaimed()` | [src/habitService.js:205](../src/habitService.js#L205) |
| `countTodayBondGiven()` | [src/habitService.js:217](../src/habitService.js#L217) |
| `countTotalHabitLogs()` | [src/habitService.js:227](../src/habitService.js#L227) |
| `calculateDailyStreak()` | [src/habitService.js:242](../src/habitService.js#L242) |
| `calculateWeeklyStreak()` | [src/habitService.js:268](../src/habitService.js#L268) |
| `getHabitStreak()` | [src/habitService.js:295](../src/habitService.js#L295) |
| `formatStreakLabel()` | [src/habitService.js:301](../src/habitService.js#L301) |
| `getActiveHabits()` | [src/habitService.js:308](../src/habitService.js#L308) |
| `getArchivedHabits()` | [src/habitService.js:313](../src/habitService.js#L313) |
| `getTodayHabits()` | [src/habitService.js:318](../src/habitService.js#L318) |
| `getWeeklyHabits()` | [src/habitService.js:331](../src/habitService.js#L331) |
| `hasWeeklyNearGoal()` | [src/habitService.js:336](../src/habitService.js#L336) |
| `hasAnyDailyStreak()` | [src/habitService.js:346](../src/habitService.js#L346) |
| `getHabitPageStats()` | [src/habitService.js:355](../src/habitService.js#L355) |
| `completeHabitToday()` | [src/habitService.js:416](../src/habitService.js#L416) |
| `uncompleteHabitToday()` | [src/habitService.js:511](../src/habitService.js#L511) |
| `exportHabits()` | [src/habitService.js:546](../src/habitService.js#L546) |
| `importHabits()` | [src/habitService.js:551](../src/habitService.js#L551) |
| `deleteHabit()` | [src/habitService.js:560](../src/habitService.js#L560) |

## src/healthCheckService.js

| Function | 宣告位置 |
| --- | --- |
| `checkDataFiles()` | [src/healthCheckService.js:101](../src/healthCheckService.js#L101) |
| `checkIndexedDB()` | [src/healthCheckService.js:116](../src/healthCheckService.js#L116) |
| `checkTasks()` | [src/healthCheckService.js:127](../src/healthCheckService.js#L127) |
| `checkWallet()` | [src/healthCheckService.js:136](../src/healthCheckService.js#L136) |
| `checkCollection()` | [src/healthCheckService.js:152](../src/healthCheckService.js#L152) |
| `checkHabits()` | [src/healthCheckService.js:167](../src/healthCheckService.js#L167) |
| `checkAchievements()` | [src/healthCheckService.js:176](../src/healthCheckService.js#L176) |
| `checkGachaStats()` | [src/healthCheckService.js:186](../src/healthCheckService.js#L186) |
| `checkUserPreferences()` | [src/healthCheckService.js:192](../src/healthCheckService.js#L192) |
| `checkInventory()` | [src/healthCheckService.js:203](../src/healthCheckService.js#L203) |
| `checkWorkshopStats()` | [src/healthCheckService.js:216](../src/healthCheckService.js#L216) |
| `checkDailyCheckIn()` | [src/healthCheckService.js:222](../src/healthCheckService.js#L222) |
| `checkExpeditions()` | [src/healthCheckService.js:239](../src/healthCheckService.js#L239) |
| `checkServiceWorker()` | [src/healthCheckService.js:251](../src/healthCheckService.js#L251) |
| `checkArchivedModules()` | [src/healthCheckService.js:268](../src/healthCheckService.js#L268) |
| `checkRenderSystem()` | [src/healthCheckService.js:330](../src/healthCheckService.js#L330) |
| `checkPetImageSystem()` | [src/healthCheckService.js:430](../src/healthCheckService.js#L430) |
| `checkVersionInfo()` | [src/healthCheckService.js:579](../src/healthCheckService.js#L579) |
| `checkSweetToastContrast()` | [src/healthCheckService.js:655](../src/healthCheckService.js#L655) |
| `checkGachaSync()` | [src/healthCheckService.js:737](../src/healthCheckService.js#L737) |
| `checkSweetContrast()` | [src/healthCheckService.js:798](../src/healthCheckService.js#L798) |
| `checkSummonReveal()` | [src/healthCheckService.js:851](../src/healthCheckService.js#L851) |
| `checkQuestSystem()` | [src/healthCheckService.js:994](../src/healthCheckService.js#L994) |
| `checkQuestContrast()` | [src/healthCheckService.js:1097](../src/healthCheckService.js#L1097) |
| `checkQuestPanelVisual()` | [src/healthCheckService.js:1150](../src/healthCheckService.js#L1150) |
| `checkBondSystem()` | [src/healthCheckService.js:1242](../src/healthCheckService.js#L1242) |
| `checkBondContrast()` | [src/healthCheckService.js:1350](../src/healthCheckService.js#L1350) |
| `checkPetImageViewer()` | [src/healthCheckService.js:1400](../src/healthCheckService.js#L1400) |
| `checkPetImageViewerContrast()` | [src/healthCheckService.js:1462](../src/healthCheckService.js#L1462) |
| `checkExpeditionDispatchUX()` | [src/healthCheckService.js:1514](../src/healthCheckService.js#L1514) |
| `checkExplorationSystem()` | [src/healthCheckService.js:1627](../src/healthCheckService.js#L1627) |
| `checkExplorationContrast()` | [src/healthCheckService.js:1745](../src/healthCheckService.js#L1745) |
| `checkTypographyScale()` | [src/healthCheckService.js:1806](../src/healthCheckService.js#L1806) |
| `checkStabilityReadabilityPolish()` | [src/healthCheckService.js:1952](../src/healthCheckService.js#L1952) |
| `checkCompanionWheelHotfix()` | [src/healthCheckService.js:2081](../src/healthCheckService.js#L2081) |
| `checkCollectionMilestones()` | [src/healthCheckService.js:2234](../src/healthCheckService.js#L2234) |
| `checkAdventureHandbook()` | [src/healthCheckService.js:2408](../src/healthCheckService.js#L2408) |
| `checkGlobalMailbox()` | [src/healthCheckService.js:2669](../src/healthCheckService.js#L2669) |
| `checkMailboxDevTools()` | [src/healthCheckService.js:3020](../src/healthCheckService.js#L3020) |
| `checkPetSeriesBuilder()` | [src/healthCheckService.js:3200](../src/healthCheckService.js#L3200) |
| `checkMorningGardenAwakening()` | [src/healthCheckService.js:3453](../src/healthCheckService.js#L3453) |
| `checkRevealFlowV343()` | [src/healthCheckService.js:3581](../src/healthCheckService.js#L3581) |
| `checkPoolIntroPolishV344()` | [src/healthCheckService.js:3695](../src/healthCheckService.js#L3695) |
| `runAppHealthCheck()` | [src/healthCheckService.js:3806](../src/healthCheckService.js#L3806) |
| `runCheck()` | [src/healthCheckService.js:3810](../src/healthCheckService.js#L3810) |

## src/honeylightSugarScene.js

| Function | 宣告位置 |
| --- | --- |
| `createHoneylightSugarScene()` | [src/honeylightSugarScene.js:4](../src/honeylightSugarScene.js#L4) |
| `sugarPreludeDurations()` | [src/honeylightSugarScene.js:27](../src/honeylightSugarScene.js#L27) |

## src/iconPresentation.js

| Function | 宣告位置 |
| --- | --- |
| `initQuestIconLanguage()` | [src/iconPresentation.js:16](../src/iconPresentation.js#L16) |

## src/imagePreloadService.js

| Function | 宣告位置 |
| --- | --- |
| `getPetImageSrc()` | [src/imagePreloadService.js:15](../src/imagePreloadService.js#L15) |
| `preloadImage()` | [src/imagePreloadService.js:33](../src/imagePreloadService.js#L33) |
| `preloadPetImage()` | [src/imagePreloadService.js:62](../src/imagePreloadService.js#L62) |
| `preloadImages()` | [src/imagePreloadService.js:75](../src/imagePreloadService.js#L75) |
| `worker()` | [src/imagePreloadService.js:82](../src/imagePreloadService.js#L82) |
| `warmPetImageCache()` | [src/imagePreloadService.js:96](../src/imagePreloadService.js#L96) |
| `preloadCompanionImage()` | [src/imagePreloadService.js:103](../src/imagePreloadService.js#L103) |
| `preloadGachaResultImages()` | [src/imagePreloadService.js:112](../src/imagePreloadService.js#L112) |
| `preloadOwnedPetImages()` | [src/imagePreloadService.js:142](../src/imagePreloadService.js#L142) |
| `delay()` | [src/imagePreloadService.js:149](../src/imagePreloadService.js#L149) |
| `waitForPreloadWithTimeout()` | [src/imagePreloadService.js:160](../src/imagePreloadService.js#L160) |
| `isImagePreloaded()` | [src/imagePreloadService.js:169](../src/imagePreloadService.js#L169) |
| `getPreloadStats()` | [src/imagePreloadService.js:174](../src/imagePreloadService.js#L174) |

## src/invitationPresentation.js

| Function | 宣告位置 |
| --- | --- |
| `invitationEscape()` | [src/invitationPresentation.js:2](../src/invitationPresentation.js#L2) |
| `fragmentMark()` | [src/invitationPresentation.js:4](../src/invitationPresentation.js#L4) |
| `invitationCost()` | [src/invitationPresentation.js:12](../src/invitationPresentation.js#L12) |
| `encounterProgress()` | [src/invitationPresentation.js:14](../src/invitationPresentation.js#L14) |
| `fragmentBalance()` | [src/invitationPresentation.js:17](../src/invitationPresentation.js#L17) |
| `invitationEntry()` | [src/invitationPresentation.js:20](../src/invitationPresentation.js#L20) |
| `reencounterMoment()` | [src/invitationPresentation.js:23](../src/invitationPresentation.js#L23) |
| `migrationSummary()` | [src/invitationPresentation.js:27](../src/invitationPresentation.js#L27) |
| `intimacySummary()` | [src/invitationPresentation.js:30](../src/invitationPresentation.js#L30) |
| `renderInvitationScreen()` | [src/invitationPresentation.js:34](../src/invitationPresentation.js#L34) |
| `createInvitationController()` | [src/invitationPresentation.js:54](../src/invitationPresentation.js#L54) |

## src/lionheartScene.js

| Function | 宣告位置 |
| --- | --- |
| `lionheartPreludeDurations()` | [src/lionheartScene.js:4](../src/lionheartScene.js#L4) |
| `createLionheartScene()` | [src/lionheartScene.js:8](../src/lionheartScene.js#L8) |

## src/localArtPreview.js

| Function | 宣告位置 |
| --- | --- |
| `isLocalArtPreview()` | [src/localArtPreview.js:4](../src/localArtPreview.js#L4) |
| `installLocalIdentityRenderer()` | [src/localArtPreview.js:15](../src/localArtPreview.js#L15) |
| `renderLocalIdentityView()` | [src/localArtPreview.js:20](../src/localArtPreview.js#L20) |

## src/loreService.js

| Function | 宣告位置 |
| --- | --- |
| `getDialogueContext()` | [src/loreService.js:7](../src/loreService.js#L7) |
| `mergePetWithLore()` | [src/loreService.js:27](../src/loreService.js#L27) |
| `mergeAllPetsWithLore()` | [src/loreService.js:42](../src/loreService.js#L42) |
| `getPetDialoguePool()` | [src/loreService.js:48](../src/loreService.js#L48) |
| `getRandomPetDialogue()` | [src/loreService.js:62](../src/loreService.js#L62) |
| `getDefaultPetLine()` | [src/loreService.js:70](../src/loreService.js#L70) |
| `getBondUnlockText()` | [src/loreService.js:78](../src/loreService.js#L78) |
| `getUnlockedBondEntries()` | [src/loreService.js:83](../src/loreService.js#L83) |
| `findLoreById()` | [src/loreService.js:92](../src/loreService.js#L92) |

## src/mailboxSchema.js

| Function | 宣告位置 |
| --- | --- |
| `compareSemanticVersions()` | [src/mailboxSchema.js:71](../src/mailboxSchema.js#L71) |
| `parseMailboxDate()` | [src/mailboxSchema.js:94](../src/mailboxSchema.js#L94) |
| `isFiniteNonNegInt()` | [src/mailboxSchema.js:102](../src/mailboxSchema.js#L102) |
| `resolveCatalogSets()` | [src/mailboxSchema.js:106](../src/mailboxSchema.js#L106) |
| `validateMailboxReward()` | [src/mailboxSchema.js:130](../src/mailboxSchema.js#L130) |
| `normalizeMailboxAction()` | [src/mailboxSchema.js:200](../src/mailboxSchema.js#L200) |
| `isValidMailboxMessageId()` | [src/mailboxSchema.js:210](../src/mailboxSchema.js#L210) |
| `normalizeMailboxMessage()` | [src/mailboxSchema.js:221](../src/mailboxSchema.js#L221) |
| `normalizeMailboxPayload()` | [src/mailboxSchema.js:307](../src/mailboxSchema.js#L307) |
| `validateMailboxDocument()` | [src/mailboxSchema.js:343](../src/mailboxSchema.js#L343) |
| `mergeRemoteAndLocalDevMessages()` | [src/mailboxSchema.js:433](../src/mailboxSchema.js#L433) |
| `__mailboxSchemaTestHelpers()` | [src/mailboxSchema.js:447](../src/mailboxSchema.js#L447) |

## src/mailboxService.js

| Function | 宣告位置 |
| --- | --- |
| `debugWarn()` | [src/mailboxService.js:72](../src/mailboxService.js#L72) |
| `normalizeGlobalMailboxState()` | [src/mailboxService.js:82](../src/mailboxService.js#L82) |
| `getGlobalMailboxState()` | [src/mailboxService.js:117](../src/mailboxService.js#L117) |
| `saveGlobalMailboxState()` | [src/mailboxService.js:127](../src/mailboxService.js#L127) |
| `getMailboxTypeLabel()` | [src/mailboxService.js:133](../src/mailboxService.js#L133) |
| `normalizeMailboxMessage()` | [src/mailboxService.js:145](../src/mailboxService.js#L145) |
| `normalizeMailboxPayload()` | [src/mailboxService.js:155](../src/mailboxService.js#L155) |
| `isVersionCompatible()` | [src/mailboxService.js:162](../src/mailboxService.js#L162) |
| `isWithinPublishWindow()` | [src/mailboxService.js:172](../src/mailboxService.js#L172) |
| `resolveMailboxMessageStatus()` | [src/mailboxService.js:183](../src/mailboxService.js#L183) |
| `getClaimStatusLabel()` | [src/mailboxService.js:219](../src/mailboxService.js#L219) |
| `formatMailboxRewardPreview()` | [src/mailboxService.js:233](../src/mailboxService.js#L233) |
| `buildCatalogSets()` | [src/mailboxService.js:252](../src/mailboxService.js#L252) |
| `getMailboxCacheRequest()` | [src/mailboxService.js:268](../src/mailboxService.js#L268) |
| `putMailboxRuntimeCache()` | [src/mailboxService.js:273](../src/mailboxService.js#L273) |
| `matchMailboxRuntimeCache()` | [src/mailboxService.js:283](../src/mailboxService.js#L283) |
| `fetchWithTimeout()` | [src/mailboxService.js:304](../src/mailboxService.js#L304) |
| `fetchGlobalMailbox()` | [src/mailboxService.js:318](../src/mailboxService.js#L318) |
| `refreshGlobalMailbox()` | [src/mailboxService.js:407](../src/mailboxService.js#L407) |
| `shouldCheckMailboxOnForeground()` | [src/mailboxService.js:411](../src/mailboxService.js#L411) |
| `getLastMailboxCheckAt()` | [src/mailboxService.js:416](../src/mailboxService.js#L416) |
| `resetMailboxCheckThrottleForTests()` | [src/mailboxService.js:421](../src/mailboxService.js#L421) |
| `buildMailboxViewModel()` | [src/mailboxService.js:429](../src/mailboxService.js#L429) |
| `getMailboxBadgeSummary()` | [src/mailboxService.js:484](../src/mailboxService.js#L484) |
| `markMailboxMessageRead()` | [src/mailboxService.js:503](../src/mailboxService.js#L503) |
| `applyMailboxRewardInTransaction()` | [src/mailboxService.js:519](../src/mailboxService.js#L519) |
| `claimMailboxReward()` | [src/mailboxService.js:610](../src/mailboxService.js#L610) |
| `isMailboxClaimInProgress()` | [src/mailboxService.js:681](../src/mailboxService.js#L681) |
| `exportGlobalMailboxState()` | [src/mailboxService.js:686](../src/mailboxService.js#L686) |
| `readDevMailboxSessionRaw()` | [src/mailboxService.js:698](../src/mailboxService.js#L698) |
| `writeDevMailboxSessionRaw()` | [src/mailboxService.js:710](../src/mailboxService.js#L710) |
| `getLocalDevMailboxMessages()` | [src/mailboxService.js:722](../src/mailboxService.js#L722) |
| `upsertLocalDevMessage()` | [src/mailboxService.js:738](../src/mailboxService.js#L738) |
| `injectLocalDevAnnouncement()` | [src/mailboxService.js:749](../src/mailboxService.js#L749) |
| `injectLocalDevCompensation()` | [src/mailboxService.js:770](../src/mailboxService.js#L770) |
| `clearLocalDevMailboxMessages()` | [src/mailboxService.js:799](../src/mailboxService.js#L799) |
| `__mailboxTestHelpers()` | [src/mailboxService.js:813](../src/mailboxService.js#L813) |

## src/onboardingController.js

| Function | 宣告位置 |
| --- | --- |
| `enqueue()` | [src/onboardingController.js:33](../src/onboardingController.js#L33) |
| `escapeText()` | [src/onboardingController.js:42](../src/onboardingController.js#L42) |
| `lessonContent()` | [src/onboardingController.js:47](../src/onboardingController.js#L47) |
| `ownedPets()` | [src/onboardingController.js:52](../src/onboardingController.js#L52) |
| `singleCost()` | [src/onboardingController.js:56](../src/onboardingController.js#L56) |
| `expeditionTerms()` | [src/onboardingController.js:61](../src/onboardingController.js#L61) |
| `currentView()` | [src/onboardingController.js:66](../src/onboardingController.js#L66) |
| `welcomeGiftStatus()` | [src/onboardingController.js:70](../src/onboardingController.js#L70) |
| `stepContent()` | [src/onboardingController.js:74](../src/onboardingController.js#L74) |
| `clearHighlight()` | [src/onboardingController.js:149](../src/onboardingController.js#L149) |
| `hasActivePresentation()` | [src/onboardingController.js:154](../src/onboardingController.js#L154) |
| `syncPresentationVisibility()` | [src/onboardingController.js:160](../src/onboardingController.js#L160) |
| `targetForStep()` | [src/onboardingController.js:179](../src/onboardingController.js#L179) |
| `updateHighlight()` | [src/onboardingController.js:214](../src/onboardingController.js#L214) |
| `renderGuideStatus()` | [src/onboardingController.js:223](../src/onboardingController.js#L223) |
| `render()` | [src/onboardingController.js:251](../src/onboardingController.js#L251) |
| `centerGrowthStep()` | [src/onboardingController.js:374](../src/onboardingController.js#L374) |
| `growthCompanionMarkup()` | [src/onboardingController.js:380](../src/onboardingController.js#L380) |
| `growthHost()` | [src/onboardingController.js:385](../src/onboardingController.js#L385) |
| `mountGrowthCoach()` | [src/onboardingController.js:395](../src/onboardingController.js#L395) |
| `locateLesson()` | [src/onboardingController.js:405](../src/onboardingController.js#L405) |
| `save()` | [src/onboardingController.js:417](../src/onboardingController.js#L417) |
| `setStep()` | [src/onboardingController.js:426](../src/onboardingController.js#L426) |
| `revealTarget()` | [src/onboardingController.js:430](../src/onboardingController.js#L430) |
| `handleAction()` | [src/onboardingController.js:444](../src/onboardingController.js#L444) |
| `initOnboarding()` | [src/onboardingController.js:558](../src/onboardingController.js#L558) |
| `refreshOnboarding()` | [src/onboardingController.js:617](../src/onboardingController.js#L617) |
| `openOnboardingEducation()` | [src/onboardingController.js:622](../src/onboardingController.js#L622) |
| `recordOnboardingEvent()` | [src/onboardingController.js:635](../src/onboardingController.js#L635) |
| `showOnboardingAfterReset()` | [src/onboardingController.js:654](../src/onboardingController.js#L654) |
| `dismissOnboardingAfterRestore()` | [src/onboardingController.js:661](../src/onboardingController.js#L661) |

## src/onboardingLessons.js

| Function | 宣告位置 |
| --- | --- |
| `getLesson()` | [src/onboardingLessons.js:28](../src/onboardingLessons.js#L28) |
| `normalizeLessonProgress()` | [src/onboardingLessons.js:32](../src/onboardingLessons.js#L32) |
| `nextLessonProgress()` | [src/onboardingLessons.js:40](../src/onboardingLessons.js#L40) |
| `getLessonContext()` | [src/onboardingLessons.js:57](../src/onboardingLessons.js#L57) |
| `getLessonAvailability()` | [src/onboardingLessons.js:73](../src/onboardingLessons.js#L73) |
| `getLessonStepContent()` | [src/onboardingLessons.js:96](../src/onboardingLessons.js#L96) |

## src/onboardingService.js

| Function | 宣告位置 |
| --- | --- |
| `isPristineOnboardingSnapshot()` | [src/onboardingService.js:19](../src/onboardingService.js#L19) |
| `initialOnboardingStateForSnapshot()` | [src/onboardingService.js:23](../src/onboardingService.js#L23) |
| `normalizeOnboardingState()` | [src/onboardingService.js:30](../src/onboardingService.js#L30) |
| `prepareOnboarding()` | [src/onboardingService.js:51](../src/onboardingService.js#L51) |
| `saveOnboardingState()` | [src/onboardingService.js:65](../src/onboardingService.js#L65) |
| `resetOnboardingState()` | [src/onboardingService.js:71](../src/onboardingService.js#L71) |
| `advanceOnboardingForEvent()` | [src/onboardingService.js:76](../src/onboardingService.js#L76) |
| `startLesson()` | [src/onboardingService.js:109](../src/onboardingService.js#L109) |
| `pauseLesson()` | [src/onboardingService.js:119](../src/onboardingService.js#L119) |
| `advanceLesson()` | [src/onboardingService.js:127](../src/onboardingService.js#L127) |
| `previousLessonStep()` | [src/onboardingService.js:136](../src/onboardingService.js#L136) |

## src/perfDiagnostics.js

| Function | 宣告位置 |
| --- | --- |
| `startPerfDiagnostics()` | [src/perfDiagnostics.js:8](../src/perfDiagnostics.js#L8) |

## src/petAwakeningCatalog.js

| Function | 宣告位置 |
| --- | --- |
| `validateAwakeningCatalog()` | [src/petAwakeningCatalog.js:4](../src/petAwakeningCatalog.js#L4) |
| `loadAwakeningCatalog()` | [src/petAwakeningCatalog.js:24](../src/petAwakeningCatalog.js#L24) |

## src/petAwakeningController.js

| Function | 宣告位置 |
| --- | --- |
| `createAwakeningController()` | [src/petAwakeningController.js:5](../src/petAwakeningController.js#L5) |
| `open()` | [src/petAwakeningController.js:10](../src/petAwakeningController.js#L10) |
| `action()` | [src/petAwakeningController.js:16](../src/petAwakeningController.js#L16) |

## src/petAwakeningCore.js

| Function | 宣告位置 |
| --- | --- |
| `awakeningTitleId()` | [src/petAwakeningCore.js:12](../src/petAwakeningCore.js#L12) |
| `createPetAwakening()` | [src/petAwakeningCore.js:14](../src/petAwakeningCore.js#L14) |
| `validatePetAwakening()` | [src/petAwakeningCore.js:18](../src/petAwakeningCore.js#L18) |
| `normalizePetAwakening()` | [src/petAwakeningCore.js:57](../src/petAwakeningCore.js#L57) |
| `awakeningEvents()` | [src/petAwakeningCore.js:64](../src/petAwakeningCore.js#L64) |
| `advancePetAwakening()` | [src/petAwakeningCore.js:75](../src/petAwakeningCore.js#L75) |
| `beginPetAwakening()` | [src/petAwakeningCore.js:95](../src/petAwakeningCore.js#L95) |
| `awakenedTitles()` | [src/petAwakeningCore.js:110](../src/petAwakeningCore.js#L110) |

## src/petAwakeningScene.js

| Function | 宣告位置 |
| --- | --- |
| `awakeningDuration()` | [src/petAwakeningScene.js:3](../src/petAwakeningScene.js#L3) |
| `preloadAwakeningForms()` | [src/petAwakeningScene.js:4](../src/petAwakeningScene.js#L4) |
| `awakeningSceneHtml()` | [src/petAwakeningScene.js:24](../src/petAwakeningScene.js#L24) |
| `playAwakeningScene()` | [src/petAwakeningScene.js:34](../src/petAwakeningScene.js#L34) |

## src/petAwakeningService.js

| Function | 宣告位置 |
| --- | --- |
| `getPetAwakening()` | [src/petAwakeningService.js:8](../src/petAwakeningService.js#L8) |
| `syncPetAwakening()` | [src/petAwakeningService.js:9](../src/petAwakeningService.js#L9) |
| `putWithAwakeningProgress()` | [src/petAwakeningService.js:16](../src/petAwakeningService.js#L16) |
| `startPetAwakening()` | [src/petAwakeningService.js:22](../src/petAwakeningService.js#L22) |
| `pausePetAwakening()` | [src/petAwakeningService.js:34](../src/petAwakeningService.js#L34) |
| `awakenPet()` | [src/petAwakeningService.js:43](../src/petAwakeningService.js#L43) |
| `setAwakeningForm()` | [src/petAwakeningService.js:60](../src/petAwakeningService.js#L60) |

## src/petAwakeningView.js

| Function | 宣告位置 |
| --- | --- |
| `initialAwakeningPortrait()` | [src/petAwakeningView.js:3](../src/petAwakeningView.js#L3) |
| `awakeningPortrait()` | [src/petAwakeningView.js:10](../src/petAwakeningView.js#L10) |
| `renderAwakeningGuide()` | [src/petAwakeningView.js:21](../src/petAwakeningView.js#L21) |
| `renderAwakeningDetail()` | [src/petAwakeningView.js:31](../src/petAwakeningView.js#L31) |
| `renderAwakeningHome()` | [src/petAwakeningView.js:41](../src/petAwakeningView.js#L41) |
| `renderAwakeningReader()` | [src/petAwakeningView.js:51](../src/petAwakeningView.js#L51) |

## src/petDataSchema.js

| Function | 宣告位置 |
| --- | --- |
| `createIssue()` | [src/petDataSchema.js:56](../src/petDataSchema.js#L56) |
| `emptyResult()` | [src/petDataSchema.js:62](../src/petDataSchema.js#L62) |
| `mergeResults()` | [src/petDataSchema.js:66](../src/petDataSchema.js#L66) |
| `isNonEmptyString()` | [src/petDataSchema.js:77](../src/petDataSchema.js#L77) |
| `validString()` | [src/petDataSchema.js:81](../src/petDataSchema.js#L81) |
| `getPetSeriesId()` | [src/petDataSchema.js:86](../src/petDataSchema.js#L86) |
| `isValidSeriesId()` | [src/petDataSchema.js:90](../src/petDataSchema.js#L90) |
| `isValidPetId()` | [src/petDataSchema.js:94](../src/petDataSchema.js#L94) |
| `parsePetId()` | [src/petDataSchema.js:99](../src/petDataSchema.js#L99) |
| `comparePetIds()` | [src/petDataSchema.js:119](../src/petDataSchema.js#L119) |
| `normalizePetForValidation()` | [src/petDataSchema.js:130](../src/petDataSchema.js#L130) |
| `normalizeLoreForValidation()` | [src/petDataSchema.js:149](../src/petDataSchema.js#L149) |
| `getNextPetId()` | [src/petDataSchema.js:181](../src/petDataSchema.js#L181) |
| `arePetNamesSimilar()` | [src/petDataSchema.js:204](../src/petDataSchema.js#L204) |
| `normalizeNameForCompare()` | [src/petDataSchema.js:223](../src/petDataSchema.js#L223) |
| `countSharedChars()` | [src/petDataSchema.js:231](../src/petDataSchema.js#L231) |
| `validatePet()` | [src/petDataSchema.js:250](../src/petDataSchema.js#L250) |
| `validatePoolTagsField()` | [src/petDataSchema.js:403](../src/petDataSchema.js#L403) |
| `validateLoreEntry()` | [src/petDataSchema.js:436](../src/petDataSchema.js#L436) |
| `validateDialogues()` | [src/petDataSchema.js:491](../src/petDataSchema.js#L491) |
| `validateBondUnlocks()` | [src/petDataSchema.js:549](../src/petDataSchema.js#L549) |
| `validatePetSeries()` | [src/petDataSchema.js:580](../src/petDataSchema.js#L580) |
| `validateSeriesCatalog()` | [src/petDataSchema.js:604](../src/petDataSchema.js#L604) |
| `validatePetCatalog()` | [src/petDataSchema.js:646](../src/petDataSchema.js#L646) |
| `validateLoreCatalog()` | [src/petDataSchema.js:701](../src/petDataSchema.js#L701) |
| `validatePetAndLoreConsistency()` | [src/petDataSchema.js:727](../src/petDataSchema.js#L727) |
| `validatePoolCatalog()` | [src/petDataSchema.js:751](../src/petDataSchema.js#L751) |
| `validatePetPackage()` | [src/petDataSchema.js:758](../src/petDataSchema.js#L758) |
| `collectPoolTagsFromPools()` | [src/petDataSchema.js:923](../src/petDataSchema.js#L923) |
| `countByRarity()` | [src/petDataSchema.js:937](../src/petDataSchema.js#L937) |
| `buildPoolPreview()` | [src/petDataSchema.js:945](../src/petDataSchema.js#L945) |
| `toSet()` | [src/petDataSchema.js:974](../src/petDataSchema.js#L974) |

## src/petPoolFilter.js

| Function | 宣告位置 |
| --- | --- |
| `matchesPetPoolFilter()` | [src/petPoolFilter.js:11](../src/petPoolFilter.js#L11) |
| `getEligiblePetsForPool()` | [src/petPoolFilter.js:21](../src/petPoolFilter.js#L21) |

## src/poolAwakeningController.js

| Function | 宣告位置 |
| --- | --- |
| `isPoolAwakeningPlaying()` | [src/poolAwakeningController.js:38](../src/poolAwakeningController.js#L38) |
| `prefersReducedMotion()` | [src/poolAwakeningController.js:42](../src/poolAwakeningController.js#L42) |
| `isReduceMotion()` | [src/poolAwakeningController.js:50](../src/poolAwakeningController.js#L50) |
| `wait()` | [src/poolAwakeningController.js:54](../src/poolAwakeningController.js#L54) |
| `lockScroll()` | [src/poolAwakeningController.js:69](../src/poolAwakeningController.js#L69) |
| `resolvePetMap()` | [src/poolAwakeningController.js:84](../src/poolAwakeningController.js#L84) |
| `buildOverlay()` | [src/poolAwakeningController.js:92](../src/poolAwakeningController.js#L92) |
| `cleanup()` | [src/poolAwakeningController.js:189](../src/poolAwakeningController.js#L189) |
| `playPoolUnlock()` | [src/poolAwakeningController.js:206](../src/poolAwakeningController.js#L206) |
| `skipPoolAwakening()` | [src/poolAwakeningController.js:378](../src/poolAwakeningController.js#L378) |

## src/poolContentContract.js

| Function | 宣告位置 |
| --- | --- |
| `checkText()` | [src/poolContentContract.js:58](../src/poolContentContract.js#L58) |
| `checkList()` | [src/poolContentContract.js:65](../src/poolContentContract.js#L65) |
| `normalizePresentation()` | [src/poolContentContract.js:81](../src/poolContentContract.js#L81) |
| `normalizeExpansion()` | [src/poolContentContract.js:110](../src/poolContentContract.js#L110) |
| `parsePool()` | [src/poolContentContract.js:147](../src/poolContentContract.js#L147) |
| `normalizePoolDefinition()` | [src/poolContentContract.js:186](../src/poolContentContract.js#L186) |
| `normalizeUnlockExpansion()` | [src/poolContentContract.js:193](../src/poolContentContract.js#L193) |
| `effectivePool()` | [src/poolContentContract.js:198](../src/poolContentContract.js#L198) |
| `resolveEffectivePool()` | [src/poolContentContract.js:203](../src/poolContentContract.js#L203) |
| `resolveDrawCost()` | [src/poolContentContract.js:208](../src/poolContentContract.js#L208) |
| `requireIdentity()` | [src/poolContentContract.js:216](../src/poolContentContract.js#L216) |
| `resolveUnlockGrantId()` | [src/poolContentContract.js:222](../src/poolContentContract.js#L222) |
| `resolveUnlockRewardSource()` | [src/poolContentContract.js:227](../src/poolContentContract.js#L227) |
| `parseCatalog()` | [src/poolContentContract.js:232](../src/poolContentContract.js#L232) |
| `resolveActivePool()` | [src/poolContentContract.js:251](../src/poolContentContract.js#L251) |
| `checkReferences()` | [src/poolContentContract.js:259](../src/poolContentContract.js#L259) |
| `validatePoolContent()` | [src/poolContentContract.js:300](../src/poolContentContract.js#L300) |
| `resolvePetRevealKey()` | [src/poolContentContract.js:340](../src/poolContentContract.js#L340) |
| `resolvePetRevealPresentation()` | [src/poolContentContract.js:354](../src/poolContentContract.js#L354) |
| `resolvePoolPresentationModel()` | [src/poolContentContract.js:367](../src/poolContentContract.js#L367) |

## src/poolDebutService.js

| Function | 宣告位置 |
| --- | --- |
| `normalizePoolDebutSeen()` | [src/poolDebutService.js:12](../src/poolDebutService.js#L12) |
| `getPoolDebutSeen()` | [src/poolDebutService.js:22](../src/poolDebutService.js#L22) |
| `hasSeenPoolDebut()` | [src/poolDebutService.js:27](../src/poolDebutService.js#L27) |
| `markPoolDebutSeen()` | [src/poolDebutService.js:33](../src/poolDebutService.js#L33) |
| `exportPoolDebutSeen()` | [src/poolDebutService.js:43](../src/poolDebutService.js#L43) |

## src/poolPresentation.js

| Function | 宣告位置 |
| --- | --- |
| `normalizePoolPresentation()` | [src/poolPresentation.js:5](../src/poolPresentation.js#L5) |
| `hasPoolPresentation()` | [src/poolPresentation.js:14](../src/poolPresentation.js#L14) |
| `shouldUseThemedSummon()` | [src/poolPresentation.js:18](../src/poolPresentation.js#L18) |
| `getPoolThemeAttr()` | [src/poolPresentation.js:23](../src/poolPresentation.js#L23) |
| `resolvePresentationPets()` | [src/poolPresentation.js:28](../src/poolPresentation.js#L28) |

## src/poolUnlockCore.js

| Function | 宣告位置 |
| --- | --- |
| `normalizePoolUnlockState()` | [src/poolUnlockCore.js:12](../src/poolUnlockCore.js#L12) |
| `normalizePoolUnlockEntry()` | [src/poolUnlockCore.js:36](../src/poolUnlockCore.js#L36) |
| `emptyPoolUnlockEntry()` | [src/poolUnlockCore.js:49](../src/poolUnlockCore.js#L49) |
| `normalizeIdempotentGrants()` | [src/poolUnlockCore.js:53](../src/poolUnlockCore.js#L53) |
| `mergeLifetimeDraws()` | [src/poolUnlockCore.js:63](../src/poolUnlockCore.js#L63) |
| `applyUnlockGift()` | [src/poolUnlockCore.js:70](../src/poolUnlockCore.js#L70) |
| `applyPoolDrawProgress()` | [src/poolUnlockCore.js:103](../src/poolUnlockCore.js#L103) |

## src/poolUnlockService.js

| Function | 宣告位置 |
| --- | --- |
| `getPoolUnlockState()` | [src/poolUnlockService.js:16](../src/poolUnlockService.js#L16) |
| `savePoolUnlockState()` | [src/poolUnlockService.js:21](../src/poolUnlockService.js#L21) |
| `updateUnlockState()` | [src/poolUnlockService.js:27](../src/poolUnlockService.js#L27) |
| `getPoolUnlockEntry()` | [src/poolUnlockService.js:35](../src/poolUnlockService.js#L35) |
| `ensurePoolUnlockLegacyBackfillMarked()` | [src/poolUnlockService.js:40](../src/poolUnlockService.js#L40) |
| `addLifetimeDraws()` | [src/poolUnlockService.js:48](../src/poolUnlockService.js#L48) |
| `evaluateUnlockThreshold()` | [src/poolUnlockService.js:60](../src/poolUnlockService.js#L60) |
| `getIdempotentGrants()` | [src/poolUnlockService.js:74](../src/poolUnlockService.js#L74) |
| `hasClaimedGrant()` | [src/poolUnlockService.js:77](../src/poolUnlockService.js#L77) |
| `markGrantClaimed()` | [src/poolUnlockService.js:80](../src/poolUnlockService.js#L80) |
| `mutateUnlockAndCollection()` | [src/poolUnlockService.js:88](../src/poolUnlockService.js#L88) |
| `grantUnlockReward()` | [src/poolUnlockService.js:108](../src/poolUnlockService.js#L108) |
| `ensureUnlockRewardClaimed()` | [src/poolUnlockService.js:113](../src/poolUnlockService.js#L113) |
| `markUnlockAnimationSeen()` | [src/poolUnlockService.js:122](../src/poolUnlockService.js#L122) |
| `processPoolDrawProgress()` | [src/poolUnlockService.js:133](../src/poolUnlockService.js#L133) |
| `exportPoolUnlockState()` | [src/poolUnlockService.js:136](../src/poolUnlockService.js#L136) |
| `exportIdempotentGrants()` | [src/poolUnlockService.js:137](../src/poolUnlockService.js#L137) |

## src/preferencesService.js

| Function | 宣告位置 |
| --- | --- |
| `normalizeTheme()` | [src/preferencesService.js:24](../src/preferencesService.js#L24) |
| `normalizeFontSize()` | [src/preferencesService.js:28](../src/preferencesService.js#L28) |
| `normalizeReadingMode()` | [src/preferencesService.js:32](../src/preferencesService.js#L32) |
| `applyReadingModeToDocument()` | [src/preferencesService.js:37](../src/preferencesService.js#L37) |
| `applyFontSizeToDocument()` | [src/preferencesService.js:44](../src/preferencesService.js#L44) |
| `normalizeUserPreferences()` | [src/preferencesService.js:54](../src/preferencesService.js#L54) |
| `applyThemeToDocument()` | [src/preferencesService.js:71](../src/preferencesService.js#L71) |
| `getUserPreferences()` | [src/preferencesService.js:84](../src/preferencesService.js#L84) |
| `initUserPreferences()` | [src/preferencesService.js:90](../src/preferencesService.js#L90) |
| `setTheme()` | [src/preferencesService.js:95](../src/preferencesService.js#L95) |
| `setFontSize()` | [src/preferencesService.js:102](../src/preferencesService.js#L102) |
| `setReadingMode()` | [src/preferencesService.js:109](../src/preferencesService.js#L109) |
| `setSeniorOnboardingCompleted()` | [src/preferencesService.js:116](../src/preferencesService.js#L116) |

## src/questIcons.js

| Function | 宣告位置 |
| --- | --- |
| `questIcon()` | [src/questIcons.js:52](../src/questIcons.js#L52) |

## src/questService.js

| Function | 宣告位置 |
| --- | --- |
| `getTodayKey()` | [src/questService.js:19](../src/questService.js#L19) |
| `getWeekKey()` | [src/questService.js:27](../src/questService.js#L27) |
| `getDefById()` | [src/questService.js:151](../src/questService.js#L151) |
| `toSafeInt()` | [src/questService.js:156](../src/questService.js#L156) |
| `mergeQuests()` | [src/questService.js:166](../src/questService.js#L166) |
| `normalizeQuestProgress()` | [src/questService.js:193](../src/questService.js#L193) |
| `rolloverQuestProgress()` | [src/questService.js:219](../src/questService.js#L219) |
| `createDefaultQuestProgress()` | [src/questService.js:235](../src/questService.js#L235) |
| `getQuestProgress()` | [src/questService.js:253](../src/questService.js#L253) |
| `initQuestProgress()` | [src/questService.js:264](../src/questService.js#L264) |
| `updateQuestProgress()` | [src/questService.js:278](../src/questService.js#L278) |
| `claimQuestReward()` | [src/questService.js:311](../src/questService.js#L311) |
| `toQuestView()` | [src/questService.js:333](../src/questService.js#L333) |
| `getQuestSummary()` | [src/questService.js:356](../src/questService.js#L356) |
| `exportQuestProgress()` | [src/questService.js:384](../src/questService.js#L384) |

## src/releaseCatalog.js

| Function | 宣告位置 |
| --- | --- |
| `validateReleaseProfile()` | [src/releaseCatalog.js:14](../src/releaseCatalog.js#L14) |
| `validateContentBundle()` | [src/releaseCatalog.js:28](../src/releaseCatalog.js#L28) |
| `sha256Bytes()` | [src/releaseCatalog.js:51](../src/releaseCatalog.js#L51) |
| `loadCatalogBundle()` | [src/releaseCatalog.js:56](../src/releaseCatalog.js#L56) |

## src/reminderController.js

| Function | 宣告位置 |
| --- | --- |
| `renderPreview()` | [src/reminderController.js:8](../src/reminderController.js#L8) |
| `nextReminderLabel()` | [src/reminderController.js:18](../src/reminderController.js#L18) |
| `settings()` | [src/reminderController.js:24](../src/reminderController.js#L24) |
| `renderReminderSettings()` | [src/reminderController.js:28](../src/reminderController.js#L28) |
| `initReminders()` | [src/reminderController.js:57](../src/reminderController.js#L57) |

## src/reminderRules.js

| Function | 宣告位置 |
| --- | --- |
| `zonedParts()` | [src/reminderRules.js:6](../src/reminderRules.js#L6) |
| `shiftDate()` | [src/reminderRules.js:14](../src/reminderRules.js#L14) |
| `nextReminderAt()` | [src/reminderRules.js:21](../src/reminderRules.js#L21) |
| `projectReminderData()` | [src/reminderRules.js:51](../src/reminderRules.js#L51) |
| `buildDailyDigest()` | [src/reminderRules.js:68](../src/reminderRules.js#L68) |

## src/reminderService.js

| Function | 宣告位置 |
| --- | --- |
| `deviceTimeZone()` | [src/reminderService.js:10](../src/reminderService.js#L10) |
| `getReminderState()` | [src/reminderService.js:11](../src/reminderService.js#L11) |
| `updateState()` | [src/reminderService.js:14](../src/reminderService.js#L14) |
| `announce()` | [src/reminderService.js:20](../src/reminderService.js#L20) |
| `reminderCapability()` | [src/reminderService.js:21](../src/reminderService.js#L21) |
| `base64Bytes()` | [src/reminderService.js:28](../src/reminderService.js#L28) |
| `api()` | [src/reminderService.js:31](../src/reminderService.js#L31) |
| `locked()` | [src/reminderService.js:41](../src/reminderService.js#L41) |
| `enableReminders()` | [src/reminderService.js:44](../src/reminderService.js#L44) |
| `saveReminderSettings()` | [src/reminderService.js:72](../src/reminderService.js#L72) |
| `revokeInstallation()` | [src/reminderService.js:76](../src/reminderService.js#L76) |
| `disableReminders()` | [src/reminderService.js:83](../src/reminderService.js#L83) |
| `performSync()` | [src/reminderService.js:95](../src/reminderService.js#L95) |
| `syncReminders()` | [src/reminderService.js:121](../src/reminderService.js#L121) |
| `testReminder()` | [src/reminderService.js:128](../src/reminderService.js#L128) |
| `getReminderServerStatus()` | [src/reminderService.js:132](../src/reminderService.js#L132) |

## src/rewardClaimService.js

| Function | 宣告位置 |
| --- | --- |
| `isBulkClaimInProgress()` | [src/rewardClaimService.js:12](../src/rewardClaimService.js#L12) |
| `claimRewardBatch()` | [src/rewardClaimService.js:17](../src/rewardClaimService.js#L17) |
| `claimAllAvailableRewards()` | [src/rewardClaimService.js:43](../src/rewardClaimService.js#L43) |

## src/rewardService.js

| Function | 宣告位置 |
| --- | --- |
| `calculateBondAmount()` | [src/rewardService.js:52](../src/rewardService.js#L52) |
| `calculateRewardAmount()` | [src/rewardService.js:59](../src/rewardService.js#L59) |
| `canClaimReward()` | [src/rewardService.js:66](../src/rewardService.js#L66) |
| `calculateAdventureEnergyAmount()` | [src/rewardService.js:73](../src/rewardService.js#L73) |
| `normalizeWallet()` | [src/rewardService.js:80](../src/rewardService.js#L80) |
| `getWallet()` | [src/rewardService.js:98](../src/rewardService.js#L98) |
| `updateWallet()` | [src/rewardService.js:103](../src/rewardService.js#L103) |
| `addAdventureEnergy()` | [src/rewardService.js:112](../src/rewardService.js#L112) |
| `spendAdventureEnergy()` | [src/rewardService.js:120](../src/rewardService.js#L120) |
| `addMaterial()` | [src/rewardService.js:128](../src/rewardService.js#L128) |
| `spendMaterial()` | [src/rewardService.js:136](../src/rewardService.js#L136) |
| `spendMaterials()` | [src/rewardService.js:146](../src/rewardService.js#L146) |
| `setStardust()` | [src/rewardService.js:158](../src/rewardService.js#L158) |
| `addStardust()` | [src/rewardService.js:163](../src/rewardService.js#L163) |
| `spendStardust()` | [src/rewardService.js:168](../src/rewardService.js#L168) |
| `claimTaskReward()` | [src/rewardService.js:179](../src/rewardService.js#L179) |
| `getAvailablePulls()` | [src/rewardService.js:209](../src/rewardService.js#L209) |
| `initWallet()` | [src/rewardService.js:215](../src/rewardService.js#L215) |
| `addInventoryItem()` | [src/rewardService.js:222](../src/rewardService.js#L222) |
| `applyRewardBundle()` | [src/rewardService.js:244](../src/rewardService.js#L244) |
| `applyRewardBundleAndUpdateMeta()` | [src/rewardService.js:264](../src/rewardService.js#L264) |
| `applyStardustRewardAndUpdateMeta()` | [src/rewardService.js:296](../src/rewardService.js#L296) |

## src/seniorModeController.js

| Function | 宣告位置 |
| --- | --- |
| `isSeniorMode()` | [src/seniorModeController.js:17](../src/seniorModeController.js#L17) |
| `initSeniorModeController()` | [src/seniorModeController.js:19](../src/seniorModeController.js#L19) |
| `syncSeniorPresentation()` | [src/seniorModeController.js:90](../src/seniorModeController.js#L90) |
| `seniorTaskCreated()` | [src/seniorModeController.js:164](../src/seniorModeController.js#L164) |
| `seniorTaskFormClosed()` | [src/seniorModeController.js:169](../src/seniorModeController.js#L169) |
| `syncSeniorModalBackground()` | [src/seniorModeController.js:171](../src/seniorModeController.js#L171) |
| `decorateSeniorControls()` | [src/seniorModeController.js:184](../src/seniorModeController.js#L184) |
| `seniorFeedback()` | [src/seniorModeController.js:198](../src/seniorModeController.js#L198) |
| `renderFeedback()` | [src/seniorModeController.js:207](../src/seniorModeController.js#L207) |
| `composeSeniorTaskForm()` | [src/seniorModeController.js:231](../src/seniorModeController.js#L231) |

## src/shareService.js

| Function | 宣告位置 |
| --- | --- |
| `shareQuestNote()` | [src/shareService.js:13](../src/shareService.js#L13) |
| `copyQuestNoteInvitation()` | [src/shareService.js:23](../src/shareService.js#L23) |

## src/standardUrCarousel.js

| Function | 宣告位置 |
| --- | --- |
| `getStandardUrPreviews()` | [src/standardUrCarousel.js:3](../src/standardUrCarousel.js#L3) |
| `createStandardUrCarousel()` | [src/standardUrCarousel.js:8](../src/standardUrCarousel.js#L8) |

## src/summonRevealService.js

| Function | 宣告位置 |
| --- | --- |
| `setSummonRevealReduceMotion()` | [src/summonRevealService.js:46](../src/summonRevealService.js#L46) |
| `isSummonRevealPlaying()` | [src/summonRevealService.js:51](../src/summonRevealService.js#L51) |
| `shouldPlayReveal()` | [src/summonRevealService.js:56](../src/summonRevealService.js#L56) |
| `isRevealQueueSkipped()` | [src/summonRevealService.js:61](../src/summonRevealService.js#L61) |
| `prefersReducedMotion()` | [src/summonRevealService.js:65](../src/summonRevealService.js#L65) |
| `isReduceMotion()` | [src/summonRevealService.js:73](../src/summonRevealService.js#L73) |
| `getItemRarity()` | [src/summonRevealService.js:78](../src/summonRevealService.js#L78) |
| `getItemPet()` | [src/summonRevealService.js:82](../src/summonRevealService.js#L82) |
| `getPetId()` | [src/summonRevealService.js:86](../src/summonRevealService.js#L86) |
| `getDuplicateCompensation()` | [src/summonRevealService.js:90](../src/summonRevealService.js#L90) |
| `resolveRevealTheme()` | [src/summonRevealService.js:99](../src/summonRevealService.js#L99) |
| `getHighestRarity()` | [src/summonRevealService.js:109](../src/summonRevealService.js#L109) |
| `collectSsrPlusRevealQueue()` | [src/summonRevealService.js:135](../src/summonRevealService.js#L135) |
| `getRevealPetFromResults()` | [src/summonRevealService.js:162](../src/summonRevealService.js#L162) |
| `pickDebugPetByRarity()` | [src/summonRevealService.js:177](../src/summonRevealService.js#L177) |
| `trackTimer()` | [src/summonRevealService.js:182](../src/summonRevealService.js#L182) |
| `trackRaf()` | [src/summonRevealService.js:187](../src/summonRevealService.js#L187) |
| `clearTrackedTimers()` | [src/summonRevealService.js:192](../src/summonRevealService.js#L192) |
| `buildParticlesHtml()` | [src/summonRevealService.js:199](../src/summonRevealService.js#L199) |
| `buildFallingPetalsHtml()` | [src/summonRevealService.js:217](../src/summonRevealService.js#L217) |
| `themeClassName()` | [src/summonRevealService.js:234](../src/summonRevealService.js#L234) |
| `themeCaption()` | [src/summonRevealService.js:245](../src/summonRevealService.js#L245) |
| `identityRevealDuration()` | [src/summonRevealService.js:253](../src/summonRevealService.js#L253) |
| `createSummonRevealOverlay()` | [src/summonRevealService.js:262](../src/summonRevealService.js#L262) |
| `removeSummonRevealOverlay()` | [src/summonRevealService.js:378](../src/summonRevealService.js#L378) |
| `skipSummonReveal()` | [src/summonRevealService.js:402](../src/summonRevealService.js#L402) |
| `playSummonReveal()` | [src/summonRevealService.js:424](../src/summonRevealService.js#L424) |
| `playSsrPlusRevealQueue()` | [src/summonRevealService.js:666](../src/summonRevealService.js#L666) |
| `playSSRReveal()` | [src/summonRevealService.js:732](../src/summonRevealService.js#L732) |
| `playURReveal()` | [src/summonRevealService.js:737](../src/summonRevealService.js#L737) |

## src/summonTiming.js

| Function | 宣告位置 |
| --- | --- |
| `summonPreludeDurations()` | [src/summonTiming.js:16](../src/summonTiming.js#L16) |
| `poolDebutDuration()` | [src/summonTiming.js:20](../src/summonTiming.js#L20) |
| `poolDebutDissolveDuration()` | [src/summonTiming.js:24](../src/summonTiming.js#L24) |
| `summonRevealDuration()` | [src/summonTiming.js:28](../src/summonTiming.js#L28) |

## src/swordwildShanheScene.js

| Function | 宣告位置 |
| --- | --- |
| `swordwildPreludeDurations()` | [src/swordwildShanheScene.js:4](../src/swordwildShanheScene.js#L4) |
| `createSwordwildShanheScene()` | [src/swordwildShanheScene.js:10](../src/swordwildShanheScene.js#L10) |

## src/taskFilterService.js

| Function | 宣告位置 |
| --- | --- |
| `getTodayDateString()` | [src/taskFilterService.js:6](../src/taskFilterService.js#L6) |
| `parseDateString()` | [src/taskFilterService.js:14](../src/taskFilterService.js#L14) |
| `daysBetween()` | [src/taskFilterService.js:21](../src/taskFilterService.js#L21) |
| `isInTodayPlan()` | [src/taskFilterService.js:29](../src/taskFilterService.js#L29) |
| `getLocalDateStringFromIso()` | [src/taskFilterService.js:34](../src/taskFilterService.js#L34) |
| `isCompletedToday()` | [src/taskFilterService.js:45](../src/taskFilterService.js#L45) |
| `getDateStatus()` | [src/taskFilterService.js:54](../src/taskFilterService.js#L54) |
| `isDueSoon()` | [src/taskFilterService.js:66](../src/taskFilterService.js#L66) |
| `formatDateBadgeText()` | [src/taskFilterService.js:73](../src/taskFilterService.js#L73) |
| `getDateBadgeClass()` | [src/taskFilterService.js:101](../src/taskFilterService.js#L101) |
| `getSubtaskProgress()` | [src/taskFilterService.js:107](../src/taskFilterService.js#L107) |
| `allSubtasksCompleted()` | [src/taskFilterService.js:115](../src/taskFilterService.js#L115) |
| `filterBySmartList()` | [src/taskFilterService.js:173](../src/taskFilterService.js#L173) |
| `filterCompletedTasksByRange()` | [src/taskFilterService.js:217](../src/taskFilterService.js#L217) |
| `getCompletedRangeEmptyMessage()` | [src/taskFilterService.js:238](../src/taskFilterService.js#L238) |
| `filterByCategory()` | [src/taskFilterService.js:251](../src/taskFilterService.js#L251) |
| `getSortWeight()` | [src/taskFilterService.js:257](../src/taskFilterService.js#L257) |
| `sortTasks()` | [src/taskFilterService.js:272](../src/taskFilterService.js#L272) |
| `getTodayViewSections()` | [src/taskFilterService.js:291](../src/taskFilterService.js#L291) |
| `validateDateRange()` | [src/taskFilterService.js:329](../src/taskFilterService.js#L329) |
| `isCompletedBeforeDue()` | [src/taskFilterService.js:338](../src/taskFilterService.js#L338) |

## src/taskMigration.js

| Function | 宣告位置 |
| --- | --- |
| `normalizePlannedTime()` | [src/taskMigration.js:16](../src/taskMigration.js#L16) |
| `normalizeSubtask()` | [src/taskMigration.js:24](../src/taskMigration.js#L24) |
| `extractTitleFromContent()` | [src/taskMigration.js:62](../src/taskMigration.js#L62) |
| `resolveTaskType()` | [src/taskMigration.js:72](../src/taskMigration.js#L72) |
| `normalizeTask()` | [src/taskMigration.js:86](../src/taskMigration.js#L86) |
| `taskNeedsMigration()` | [src/taskMigration.js:184](../src/taskMigration.js#L184) |
| `migrateTasks()` | [src/taskMigration.js:226](../src/taskMigration.js#L226) |

## src/taskService.js

| Function | 宣告位置 |
| --- | --- |
| `extractTitle()` | [src/taskService.js:24](../src/taskService.js#L24) |
| `generateId()` | [src/taskService.js:30](../src/taskService.js#L30) |
| `validatePlannedTime()` | [src/taskService.js:34](../src/taskService.js#L34) |
| `generateSubtaskId()` | [src/taskService.js:42](../src/taskService.js#L42) |
| `normalizeFromDb()` | [src/taskService.js:47](../src/taskService.js#L47) |
| `buildTaskDefaults()` | [src/taskService.js:52](../src/taskService.js#L52) |
| `getAllTasks()` | [src/taskService.js:73](../src/taskService.js#L73) |
| `getTaskById()` | [src/taskService.js:80](../src/taskService.js#L80) |
| `createTask()` | [src/taskService.js:88](../src/taskService.js#L88) |
| `updateTask()` | [src/taskService.js:123](../src/taskService.js#L123) |
| `deleteTask()` | [src/taskService.js:170](../src/taskService.js#L170) |
| `addToTodayPlan()` | [src/taskService.js:175](../src/taskService.js#L175) |
| `removeFromTodayPlan()` | [src/taskService.js:186](../src/taskService.js#L186) |
| `toggleSubtaskComplete()` | [src/taskService.js:194](../src/taskService.js#L194) |
| `toggleTaskComplete()` | [src/taskService.js:225](../src/taskService.js#L225) |
| `getTodayCompletedCount()` | [src/taskService.js:260](../src/taskService.js#L260) |
| `getTodayPlanCount()` | [src/taskService.js:267](../src/taskService.js#L267) |
| `exportTasks()` | [src/taskService.js:274](../src/taskService.js#L274) |
| `importTasks()` | [src/taskService.js:279](../src/taskService.js#L279) |

## src/taskStatsService.js

| Function | 宣告位置 |
| --- | --- |
| `normalizeTaskStats()` | [src/taskStatsService.js:16](../src/taskStatsService.js#L16) |
| `getTaskStats()` | [src/taskStatsService.js:27](../src/taskStatsService.js#L27) |
| `saveTaskStats()` | [src/taskStatsService.js:32](../src/taskStatsService.js#L32) |
| `recordPlanToday()` | [src/taskStatsService.js:37](../src/taskStatsService.js#L37) |
| `recordSubtaskCreated()` | [src/taskStatsService.js:44](../src/taskStatsService.js#L44) |
| `recordSubtaskCompleted()` | [src/taskStatsService.js:51](../src/taskStatsService.js#L51) |
| `recordCompletedBeforeDue()` | [src/taskStatsService.js:57](../src/taskStatsService.js#L57) |
| `exportTaskStats()` | [src/taskStatsService.js:64](../src/taskStatsService.js#L64) |
| `importTaskStats()` | [src/taskStatsService.js:69](../src/taskStatsService.js#L69) |

## src/themedSummonController.js

| Function | 宣告位置 |
| --- | --- |
| `isThemedSummonPlaying()` | [src/themedSummonController.js:51](../src/themedSummonController.js#L51) |
| `getThemedSummonState()` | [src/themedSummonController.js:55](../src/themedSummonController.js#L55) |
| `prefersReducedMotion()` | [src/themedSummonController.js:59](../src/themedSummonController.js#L59) |
| `isReduceMotion()` | [src/themedSummonController.js:67](../src/themedSummonController.js#L67) |
| `setState()` | [src/themedSummonController.js:71](../src/themedSummonController.js#L71) |
| `wait()` | [src/themedSummonController.js:91](../src/themedSummonController.js#L91) |
| `assignPetImage()` | [src/themedSummonController.js:113](../src/themedSummonController.js#L113) |
| `lockScroll()` | [src/themedSummonController.js:130](../src/themedSummonController.js#L130) |
| `unlockScroll()` | [src/themedSummonController.js:139](../src/themedSummonController.js#L139) |
| `lockDebutScroll()` | [src/themedSummonController.js:151](../src/themedSummonController.js#L151) |
| `unlockDebutScroll()` | [src/themedSummonController.js:158](../src/themedSummonController.js#L158) |
| `createParticles()` | [src/themedSummonController.js:165](../src/themedSummonController.js#L165) |
| `createOverlay()` | [src/themedSummonController.js:185](../src/themedSummonController.js#L185) |
| `fillSeal()` | [src/themedSummonController.js:249](../src/themedSummonController.js#L249) |
| `buildSummaryCards()` | [src/themedSummonController.js:293](../src/themedSummonController.js#L293) |
| `setupBuds()` | [src/themedSummonController.js:328](../src/themedSummonController.js#L328) |
| `playThemedSummon()` | [src/themedSummonController.js:357](../src/themedSummonController.js#L357) |
| `playDreamBloomSummon()` | [src/themedSummonController.js:591](../src/themedSummonController.js#L591) |
| `skipThemedSummon()` | [src/themedSummonController.js:601](../src/themedSummonController.js#L601) |
| `playPoolDebutPresentation()` | [src/themedSummonController.js:624](../src/themedSummonController.js#L624) |

## src/todayHabitsView.js

| Function | 宣告位置 |
| --- | --- |
| `getTodayDailyHabits()` | [src/todayHabitsView.js:4](../src/todayHabitsView.js#L4) |
| `renderTodayHabits()` | [src/todayHabitsView.js:11](../src/todayHabitsView.js#L11) |

## src/twilightPresentation.js

| Function | 宣告位置 |
| --- | --- |
| `twilightIcon()` | [src/twilightPresentation.js:17](../src/twilightPresentation.js#L17) |
| `getCompanionScene()` | [src/twilightPresentation.js:22](../src/twilightPresentation.js#L22) |
| `getTwilightJourney()` | [src/twilightPresentation.js:28](../src/twilightPresentation.js#L28) |
| `initTwilightChrome()` | [src/twilightPresentation.js:36](../src/twilightPresentation.js#L36) |
| `buildTwilightHome()` | [src/twilightPresentation.js:53](../src/twilightPresentation.js#L53) |
| `syncTwilightHome()` | [src/twilightPresentation.js:82](../src/twilightPresentation.js#L82) |
| `setTwilightCompanionLine()` | [src/twilightPresentation.js:130](../src/twilightPresentation.js#L130) |
| `reactTwilightCompanion()` | [src/twilightPresentation.js:136](../src/twilightPresentation.js#L136) |
| `syncTwilightGacha()` | [src/twilightPresentation.js:146](../src/twilightPresentation.js#L146) |

## src/ui.js

| Function | 宣告位置 |
| --- | --- |
| `resolveGachaResultWait()` | [src/ui.js:313](../src/ui.js#L313) |
| `waitNextFrame()` | [src/ui.js:321](../src/ui.js#L321) |
| `shouldShowAwakenedPresentation()` | [src/ui.js:331](../src/ui.js#L331) |
| `beginPullVisualLock()` | [src/ui.js:339](../src/ui.js#L339) |
| `markPendingAwakening()` | [src/ui.js:347](../src/ui.js#L347) |
| `clearPendingAwakening()` | [src/ui.js:357](../src/ui.js#L357) |
| `isUiDebugEnabled()` | [src/ui.js:410](../src/ui.js#L410) |
| `uiDebugLog()` | [src/ui.js:425](../src/ui.js#L425) |
| `petDisplayName()` | [src/ui.js:443](../src/ui.js#L443) |
| `petOriginalName()` | [src/ui.js:448](../src/ui.js#L448) |
| `petOriginalNameHtml()` | [src/ui.js:453](../src/ui.js#L453) |
| `petNameBlockHtml()` | [src/ui.js:459](../src/ui.js#L459) |
| `openNicknameModal()` | [src/ui.js:471](../src/ui.js#L471) |
| `showToast()` | [src/ui.js:563](../src/ui.js#L563) |
| `bindSweetToastDevTest()` | [src/ui.js:584](../src/ui.js#L584) |
| `initUI()` | [src/ui.js:595](../src/ui.js#L595) |
| `claimAllButtonHtml()` | [src/ui.js:732](../src/ui.js#L732) |
| `bindRewardClaimAll()` | [src/ui.js:739](../src/ui.js#L739) |
| `handleRewardClaimAll()` | [src/ui.js:755](../src/ui.js#L755) |
| `bindDelegatedEvents()` | [src/ui.js:802](../src/ui.js#L802) |
| `bindNavigation()` | [src/ui.js:1405](../src/ui.js#L1405) |
| `switchView()` | [src/ui.js:1414](../src/ui.js#L1414) |
| `openTeachingTarget()` | [src/ui.js:1515](../src/ui.js#L1515) |
| `bindModals()` | [src/ui.js:1542](../src/ui.js#L1542) |
| `dismissModal()` | [src/ui.js:1557](../src/ui.js#L1557) |
| `openModal()` | [src/ui.js:1580](../src/ui.js#L1580) |
| `closeModal()` | [src/ui.js:1592](../src/ui.js#L1592) |
| `openPetImageViewer()` | [src/ui.js:1617](../src/ui.js#L1617) |
| `openPetImageViewerBySrc()` | [src/ui.js:1645](../src/ui.js#L1645) |
| `handlePetImageViewerKeydown()` | [src/ui.js:1746](../src/ui.js#L1746) |
| `closePetImageViewer()` | [src/ui.js:1755](../src/ui.js#L1755) |
| `openConfirmModal()` | [src/ui.js:1773](../src/ui.js#L1773) |
| `petImageHtml()` | [src/ui.js:1799](../src/ui.js#L1799) |
| `getCurrentViewName()` | [src/ui.js:1840](../src/ui.js#L1840) |
| `renderSharedUI()` | [src/ui.js:1849](../src/ui.js#L1849) |
| `renderBondHomeSection()` | [src/ui.js:1880](../src/ui.js#L1880) |
| `renderView()` | [src/ui.js:1897](../src/ui.js#L1897) |
| `renderCurrentView()` | [src/ui.js:1945](../src/ui.js#L1945) |
| `renderViews()` | [src/ui.js:1962](../src/ui.js#L1962) |
| `renderAfterRefresh()` | [src/ui.js:1982](../src/ui.js#L1982) |
| `renderAll()` | [src/ui.js:1995](../src/ui.js#L1995) |
| `maybeRefreshExpeditionBubble()` | [src/ui.js:2022](../src/ui.js#L2022) |
| `handleHabitCompletion()` | [src/ui.js:2032](../src/ui.js#L2032) |
| `renderTasksView()` | [src/ui.js:2076](../src/ui.js#L2076) |
| `renderHabitSummary()` | [src/ui.js:2124](../src/ui.js#L2124) |
| `formatDailyRewardBundle()` | [src/ui.js:2155](../src/ui.js#L2155) |
| `getProjectedCheckInStreak()` | [src/ui.js:2177](../src/ui.js#L2177) |
| `buildDailyRewardPreviewChips()` | [src/ui.js:2185](../src/ui.js#L2185) |
| `getSevenDayMilestoneProgress()` | [src/ui.js:2227](../src/ui.js#L2227) |
| `showDailyBlessingRewardToast()` | [src/ui.js:2243](../src/ui.js#L2243) |
| `resolveDailyBlessingCollapsed()` | [src/ui.js:2255](../src/ui.js#L2255) |
| `buildDailyBlessingCardData()` | [src/ui.js:2264](../src/ui.js#L2264) |
| `buildQuestRewardChips()` | [src/ui.js:2382](../src/ui.js#L2382) |
| `buildQuestCardHtml()` | [src/ui.js:2409](../src/ui.js#L2409) |
| `renderQuestPanel()` | [src/ui.js:2460](../src/ui.js#L2460) |
| `trackQuest()` | [src/ui.js:2549](../src/ui.js#L2549) |
| `renderDailyBlessingSection()` | [src/ui.js:2562](../src/ui.js#L2562) |
| `renderGachaDailyBlessingEntry()` | [src/ui.js:2578](../src/ui.js#L2578) |
| `handleDailyCheckIn()` | [src/ui.js:2605](../src/ui.js#L2605) |
| `polarToCartesian()` | [src/ui.js:2650](../src/ui.js#L2650) |
| `describeArcSector()` | [src/ui.js:2658](../src/ui.js#L2658) |
| `truncateWheelLabel()` | [src/ui.js:2670](../src/ui.js#L2670) |
| `getWheelShortLabel()` | [src/ui.js:2675](../src/ui.js#L2675) |
| `getWheelSectorColors()` | [src/ui.js:2710](../src/ui.js#L2710) |
| `getWheelSectorStroke()` | [src/ui.js:2714](../src/ui.js#L2714) |
| `getWheelLabelFill()` | [src/ui.js:2718](../src/ui.js#L2718) |
| `buildWheelSvgHtml()` | [src/ui.js:2723](../src/ui.js#L2723) |
| `buildWheelDiscHtml()` | [src/ui.js:2760](../src/ui.js#L2760) |
| `waitForWheelRotorTransition()` | [src/ui.js:2780](../src/ui.js#L2780) |
| `animateDailyWheel()` | [src/ui.js:2799](../src/ui.js#L2799) |
| `computeWheelRotationDeg()` | [src/ui.js:2828](../src/ui.js#L2828) |
| `openDailyWheelModal()` | [src/ui.js:2835](../src/ui.js#L2835) |
| `renderTodayPlanSummary()` | [src/ui.js:2904](../src/ui.js#L2904) |
| `renderCategoryFilters()` | [src/ui.js:2932](../src/ui.js#L2932) |
| `formatCategoryLabel()` | [src/ui.js:2946](../src/ui.js#L2946) |
| `applyCategoryFilter()` | [src/ui.js:2950](../src/ui.js#L2950) |
| `renderCollapsibleTaskSection()` | [src/ui.js:2954](../src/ui.js#L2954) |
| `renderTaskListSection()` | [src/ui.js:2966](../src/ui.js#L2966) |
| `renderTodayView()` | [src/ui.js:2975](../src/ui.js#L2975) |
| `renderAllTasksView()` | [src/ui.js:3012](../src/ui.js#L3012) |
| `renderSmartListHub()` | [src/ui.js:3035](../src/ui.js#L3035) |
| `renderCompletedRangeFilter()` | [src/ui.js:3053](../src/ui.js#L3053) |
| `renderSmartListDetail()` | [src/ui.js:3068](../src/ui.js#L3068) |
| `renderTaskCard()` | [src/ui.js:3106](../src/ui.js#L3106) |
| `openTaskForm()` | [src/ui.js:3184](../src/ui.js#L3184) |
| `renderSubtaskFormList()` | [src/ui.js:3310](../src/ui.js#L3310) |
| `showGuidedHome()` | [src/ui.js:3463](../src/ui.js#L3463) |
| `setHomeHubDot()` | [src/ui.js:3472](../src/ui.js#L3472) |
| `renderHomeHub()` | [src/ui.js:3483](../src/ui.js#L3483) |
| `renderAchievementStrip()` | [src/ui.js:3517](../src/ui.js#L3517) |
| `renderCompanionPetButton()` | [src/ui.js:3563](../src/ui.js#L3563) |
| `getPetComfortLine()` | [src/ui.js:3589](../src/ui.js#L3589) |
| `playHomeCompanionPetEffect()` | [src/ui.js:3594](../src/ui.js#L3594) |
| `handleCompanionPet()` | [src/ui.js:3609](../src/ui.js#L3609) |
| `renderCompanionSection()` | [src/ui.js:3646](../src/ui.js#L3646) |
| `triggerComfortVibration()` | [src/ui.js:3741](../src/ui.js#L3741) |
| `spawnCompanionHearts()` | [src/ui.js:3753](../src/ui.js#L3753) |
| `playCompanionComfortEffect()` | [src/ui.js:3769](../src/ui.js#L3769) |
| `buildPetFeedSection()` | [src/ui.js:3780](../src/ui.js#L3780) |
| `bindPetFeedInteractions()` | [src/ui.js:3826](../src/ui.js#L3826) |
| `openPetFeedModal()` | [src/ui.js:3890](../src/ui.js#L3890) |
| `updateCompanionImageIfNeeded()` | [src/ui.js:3937](../src/ui.js#L3937) |
| `updateCompanionBondDisplay()` | [src/ui.js:3954](../src/ui.js#L3954) |
| `buildDialogueContext()` | [src/ui.js:3992](../src/ui.js#L3992) |
| `getMailboxCatalogs()` | [src/ui.js:4022](../src/ui.js#L4022) |
| `getMailboxViewModel()` | [src/ui.js:4029](../src/ui.js#L4029) |
| `getMailboxGiftStatus()` | [src/ui.js:4037](../src/ui.js#L4037) |
| `updateMailboxEntryBadge()` | [src/ui.js:4044](../src/ui.js#L4044) |
| `syncGlobalMailbox()` | [src/ui.js:4087](../src/ui.js#L4087) |
| `bindGlobalMailboxEntry()` | [src/ui.js:4120](../src/ui.js#L4120) |
| `ensureGlobalMailboxModal()` | [src/ui.js:4132](../src/ui.js#L4132) |
| `handleMailboxModalClick()` | [src/ui.js:4206](../src/ui.js#L4206) |
| `handleMailboxRefresh()` | [src/ui.js:4250](../src/ui.js#L4250) |
| `openGlobalMailbox()` | [src/ui.js:4275](../src/ui.js#L4275) |
| `closeGlobalMailbox()` | [src/ui.js:4329](../src/ui.js#L4329) |
| `formatMailboxDate()` | [src/ui.js:4349](../src/ui.js#L4349) |
| `renderGlobalMailboxModal()` | [src/ui.js:4364](../src/ui.js#L4364) |
| `buildMailboxListItem()` | [src/ui.js:4470](../src/ui.js#L4470) |
| `buildMailboxDetailElement()` | [src/ui.js:4544](../src/ui.js#L4544) |
| `findMailboxMessageById()` | [src/ui.js:4664](../src/ui.js#L4664) |
| `openMailboxMessageDetail()` | [src/ui.js:4676](../src/ui.js#L4676) |
| `handleMailboxClaim()` | [src/ui.js:4687](../src/ui.js#L4687) |
| `isAnyOverlayOpen()` | [src/ui.js:4729](../src/ui.js#L4729) |
| `isModalOpen()` | [src/ui.js:4742](../src/ui.js#L4742) |
| `setCompanionBubbleText()` | [src/ui.js:4746](../src/ui.js#L4746) |
| `refreshCompanionBubble()` | [src/ui.js:4765](../src/ui.js#L4765) |
| `showCompanionDialogue()` | [src/ui.js:4771](../src/ui.js#L4771) |
| `scheduleCompanionDialogueTimer()` | [src/ui.js:4787](../src/ui.js#L4787) |
| `startCompanionDialogueTimer()` | [src/ui.js:4799](../src/ui.js#L4799) |
| `stopCompanionDialogueTimer()` | [src/ui.js:4805](../src/ui.js#L4805) |
| `bindActivityTracking()` | [src/ui.js:4812](../src/ui.js#L4812) |
| `trackUserActivity()` | [src/ui.js:4819](../src/ui.js#L4819) |
| `applyReduceMotionClass()` | [src/ui.js:4823](../src/ui.js#L4823) |
| `preferredScrollBehavior()` | [src/ui.js:4827](../src/ui.js#L4827) |
| `applyTheme()` | [src/ui.js:4837](../src/ui.js#L4837) |
| `renderFontSizePickerState()` | [src/ui.js:4866](../src/ui.js#L4866) |
| `renderThemePickerState()` | [src/ui.js:4873](../src/ui.js#L4873) |
| `renderNavBadges()` | [src/ui.js:4887](../src/ui.js#L4887) |
| `setNavBadge()` | [src/ui.js:4915](../src/ui.js#L4915) |
| `showBondLevelUpToast()` | [src/ui.js:4934](../src/ui.js#L4934) |
| `bondBadgeHtml()` | [src/ui.js:4978](../src/ui.js#L4978) |
| `showBondUnlockToast()` | [src/ui.js:4988](../src/ui.js#L4988) |
| `notifyBondUnlocks()` | [src/ui.js:5010](../src/ui.js#L5010) |
| `showRewardToast()` | [src/ui.js:5023](../src/ui.js#L5023) |
| `getSelectedGachaPool()` | [src/ui.js:5043](../src/ui.js#L5043) |
| `getAvailablePullsForSelectedPool()` | [src/ui.js:5053](../src/ui.js#L5053) |
| `renderGachaUnavailable()` | [src/ui.js:5058](../src/ui.js#L5058) |
| `renderGachaPoolSwitcher()` | [src/ui.js:5086](../src/ui.js#L5086) |
| `renderGachaView()` | [src/ui.js:5104](../src/ui.js#L5104) |
| `testSummonReveal()` | [src/ui.js:5167](../src/ui.js#L5167) |
| `testSummonRevealByPetId()` | [src/ui.js:5186](../src/ui.js#L5186) |
| `isGachaPullInProgress()` | [src/ui.js:5206](../src/ui.js#L5206) |
| `getUnlockEntryForPool()` | [src/ui.js:5210](../src/ui.js#L5210) |
| `maybePlayMorningGardenAfterPull()` | [src/ui.js:5218](../src/ui.js#L5218) |
| `maybeResumeMorningGarden()` | [src/ui.js:5245](../src/ui.js#L5245) |
| `maybePlayPoolDebut()` | [src/ui.js:5267](../src/ui.js#L5267) |
| `renderGachaThemeStage()` | [src/ui.js:5296](../src/ui.js#L5296) |
| `playPostPullPresentation()` | [src/ui.js:5566](../src/ui.js#L5566) |
| `resetStaleGachaPullState()` | [src/ui.js:5627](../src/ui.js#L5627) |
| `updateGachaAffordability()` | [src/ui.js:5643](../src/ui.js#L5643) |
| `handlePull()` | [src/ui.js:5704](../src/ui.js#L5704) |
| `handleTenPull()` | [src/ui.js:5783](../src/ui.js#L5783) |
| `isSweetTheme()` | [src/ui.js:5866](../src/ui.js#L5866) |
| `getGachaAffordability()` | [src/ui.js:5870](../src/ui.js#L5870) |
| `sweetSummonRarityBadge()` | [src/ui.js:5878](../src/ui.js#L5878) |
| `sweetSummonStatusBadge()` | [src/ui.js:5882](../src/ui.js#L5882) |
| `sweetSummonRarityDesc()` | [src/ui.js:5889](../src/ui.js#L5889) |
| `upgradeSingleResultImage()` | [src/ui.js:5894](../src/ui.js#L5894) |
| `renderSweetSinglePullResult()` | [src/ui.js:5906](../src/ui.js#L5906) |
| `renderSweetTenPullResult()` | [src/ui.js:5951](../src/ui.js#L5951) |
| `defaultSummonRarityBadge()` | [src/ui.js:6013](../src/ui.js#L6013) |
| `defaultSummonStatusBadge()` | [src/ui.js:6017](../src/ui.js#L6017) |
| `defaultSummonRarityDesc()` | [src/ui.js:6024](../src/ui.js#L6024) |
| `defaultSummonRarityHint()` | [src/ui.js:6029](../src/ui.js#L6029) |
| `renderDefaultSinglePullResult()` | [src/ui.js:6035](../src/ui.js#L6035) |
| `renderDefaultTenPullResult()` | [src/ui.js:6082](../src/ui.js#L6082) |
| `bindGachaResultButtons()` | [src/ui.js:6144](../src/ui.js#L6144) |
| `showPullResult()` | [src/ui.js:6161](../src/ui.js#L6161) |
| `showTenPullResult()` | [src/ui.js:6169](../src/ui.js#L6169) |
| `showPullResultAndWait()` | [src/ui.js:6195](../src/ui.js#L6195) |
| `showTenPullResultAndWait()` | [src/ui.js:6203](../src/ui.js#L6203) |
| `renderCollectionProgressSummary()` | [src/ui.js:6212](../src/ui.js#L6212) |
| `sortCollectionMilestones()` | [src/ui.js:6251](../src/ui.js#L6251) |
| `collectionMilestoneCardHtml()` | [src/ui.js:6263](../src/ui.js#L6263) |
| `renderCollectionMilestones()` | [src/ui.js:6284](../src/ui.js#L6284) |
| `getPetSeriesKey()` | [src/ui.js:6336](../src/ui.js#L6336) |
| `renderCollectionSeriesFilters()` | [src/ui.js:6340](../src/ui.js#L6340) |
| `renderCollectionView()` | [src/ui.js:6366](../src/ui.js#L6366) |
| `renderCollectionCard()` | [src/ui.js:6451](../src/ui.js#L6451) |
| `openPetDetailModal()` | [src/ui.js:6499](../src/ui.js#L6499) |
| `getOwnedPets()` | [src/ui.js:6659](../src/ui.js#L6659) |
| `formatDateTime()` | [src/ui.js:6663](../src/ui.js#L6663) |
| `formatDuration()` | [src/ui.js:6669](../src/ui.js#L6669) |
| `renderExpeditionView()` | [src/ui.js:6678](../src/ui.js#L6678) |
| `expeditionAreaImageUrl()` | [src/ui.js:6795](../src/ui.js#L6795) |
| `renderExpeditionAreaCard()` | [src/ui.js:6800](../src/ui.js#L6800) |
| `renderCampPanel()` | [src/ui.js:6850](../src/ui.js#L6850) |
| `renderJourneyArchive()` | [src/ui.js:6875](../src/ui.js#L6875) |
| `showJourneyReport()` | [src/ui.js:6894](../src/ui.js#L6894) |
| `startExpeditionTimer()` | [src/ui.js:6913](../src/ui.js#L6913) |
| `stopExpeditionTimer()` | [src/ui.js:6946](../src/ui.js#L6946) |
| `startExpeditionStatusRotation()` | [src/ui.js:6953](../src/ui.js#L6953) |
| `stopExpeditionStatusRotation()` | [src/ui.js:6993](../src/ui.js#L6993) |
| `handleExpeditionClick()` | [src/ui.js:7001](../src/ui.js#L7001) |
| `showExpeditionRewardModal()` | [src/ui.js:7117](../src/ui.js#L7117) |
| `renderExplorationPanel()` | [src/ui.js:7164](../src/ui.js#L7164) |
| `renderExplorationAreaCard()` | [src/ui.js:7205](../src/ui.js#L7205) |
| `renderExplorationMilestoneCard()` | [src/ui.js:7273](../src/ui.js#L7273) |
| `getDispatchRecommendations()` | [src/ui.js:7306](../src/ui.js#L7306) |
| `getDispatchablePetsSorted()` | [src/ui.js:7315](../src/ui.js#L7315) |
| `openExpeditionDispatchModal()` | [src/ui.js:7322](../src/ui.js#L7322) |
| `closeExpeditionDispatchModal()` | [src/ui.js:7358](../src/ui.js#L7358) |
| `handleDispatchModalClick()` | [src/ui.js:7372](../src/ui.js#L7372) |
| `renderExpeditionDispatchModal()` | [src/ui.js:7425](../src/ui.js#L7425) |
| `buildDispatchPetOptionHtml()` | [src/ui.js:7529](../src/ui.js#L7529) |
| `confirmExpeditionDispatch()` | [src/ui.js:7564](../src/ui.js#L7564) |
| `renderHabitsView()` | [src/ui.js:7619](../src/ui.js#L7619) |
| `renderHabitSection()` | [src/ui.js:7712](../src/ui.js#L7712) |
| `renderHabitCard()` | [src/ui.js:7731](../src/ui.js#L7731) |
| `openHabitForm()` | [src/ui.js:7798](../src/ui.js#L7798) |
| `renderWorkshopView()` | [src/ui.js:7890](../src/ui.js#L7890) |
| `handleWorkshopClick()` | [src/ui.js:8031](../src/ui.js#L8031) |
| `renderMoreView()` | [src/ui.js:8130](../src/ui.js#L8130) |
| `isHandbookActive()` | [src/ui.js:8175](../src/ui.js#L8175) |
| `renderHandbookView()` | [src/ui.js:8180](../src/ui.js#L8180) |
| `rerenderHandbookContent()` | [src/ui.js:8195](../src/ui.js#L8195) |
| `refreshHandbookModel()` | [src/ui.js:8201](../src/ui.js#L8201) |
| `handleHandbookClick()` | [src/ui.js:8218](../src/ui.js#L8218) |
| `handbookProgressBar()` | [src/ui.js:8241](../src/ui.js#L8241) |
| `buildHandbookQuickStats()` | [src/ui.js:8246](../src/ui.js#L8246) |
| `buildHandbookGoals()` | [src/ui.js:8263](../src/ui.js#L8263) |
| `handbookSection()` | [src/ui.js:8304](../src/ui.js#L8304) |
| `handbookRow()` | [src/ui.js:8323](../src/ui.js#L8323) |
| `buildHandbookWeekly()` | [src/ui.js:8330](../src/ui.js#L8330) |
| `buildHandbookRecords()` | [src/ui.js:8350](../src/ui.js#L8350) |
| `buildHandbookCompanions()` | [src/ui.js:8359](../src/ui.js#L8359) |
| `buildHandbookExpedition()` | [src/ui.js:8406](../src/ui.js#L8406) |
| `buildHandbookHtml()` | [src/ui.js:8439](../src/ui.js#L8439) |
| `refreshAchievementsView()` | [src/ui.js:8451](../src/ui.js#L8451) |
| `renderAchievementsView()` | [src/ui.js:8461](../src/ui.js#L8461) |
| `renderAchievementCard()` | [src/ui.js:8552](../src/ui.js#L8552) |
| `openTitleManagementModal()` | [src/ui.js:8598](../src/ui.js#L8598) |
| `handleAchievementCheckAfterAction()` | [src/ui.js:8658](../src/ui.js#L8658) |
| `showAchievementUnlockNotifications()` | [src/ui.js:8673](../src/ui.js#L8673) |
| `formatBackupDateTime()` | [src/ui.js:8708](../src/ui.js#L8708) |
| `resetImportUI()` | [src/ui.js:8721](../src/ui.js#L8721) |
| `setImportElementHidden()` | [src/ui.js:8747](../src/ui.js#L8747) |
| `renderImportPreview()` | [src/ui.js:8752](../src/ui.js#L8752) |
| `showImportError()` | [src/ui.js:8790](../src/ui.js#L8790) |
| `handleImportFileSelect()` | [src/ui.js:8803](../src/ui.js#L8803) |
| `initImportBackupHandlers()` | [src/ui.js:8840](../src/ui.js#L8840) |
| `handleRestoreBackup()` | [src/ui.js:8872](../src/ui.js#L8872) |
| `proceedRestoreAfterFirstConfirm()` | [src/ui.js:8887](../src/ui.js#L8887) |
| `executeRestoreBackup()` | [src/ui.js:8929](../src/ui.js#L8929) |
| `buildVersionInfoHtml()` | [src/ui.js:8962](../src/ui.js#L8962) |
| `updateVersionInfoServiceWorkerStatus()` | [src/ui.js:9001](../src/ui.js#L9001) |
| `renderVersionInfo()` | [src/ui.js:9008](../src/ui.js#L9008) |
| `renderSettingsView()` | [src/ui.js:9036](../src/ui.js#L9036) |
| `updateServiceWorkerStatusDisplay()` | [src/ui.js:9078](../src/ui.js#L9078) |
| `handleDevUnlock()` | [src/ui.js:9106](../src/ui.js#L9106) |
| `handleDevUnlockAll()` | [src/ui.js:9116](../src/ui.js#L9116) |
| `handleDevStardust()` | [src/ui.js:9137](../src/ui.js#L9137) |
| `handleDevCompanionBond()` | [src/ui.js:9145](../src/ui.js#L9145) |
| `handleDevExpedition()` | [src/ui.js:9165](../src/ui.js#L9165) |
| `handleDevResetDailyBlessing()` | [src/ui.js:9178](../src/ui.js#L9178) |
| `refreshMailboxAfterDevInject()` | [src/ui.js:9189](../src/ui.js#L9189) |
| `handleDevMailboxAnnouncement()` | [src/ui.js:9197](../src/ui.js#L9197) |
| `handleDevMailboxCompensation()` | [src/ui.js:9208](../src/ui.js#L9208) |
| `handleDevMailboxClear()` | [src/ui.js:9219](../src/ui.js#L9219) |
| `handleReset()` | [src/ui.js:9233](../src/ui.js#L9233) |
| `setText()` | [src/ui.js:9258](../src/ui.js#L9258) |
| `encounterActions()` | [src/ui.js:9265](../src/ui.js#L9265) |

## src/uiHelpers.js

| Function | 宣告位置 |
| --- | --- |
| `escapeHtml()` | [src/uiHelpers.js:6](../src/uiHelpers.js#L6) |
| `emptyStateHtml()` | [src/uiHelpers.js:16](../src/uiHelpers.js#L16) |
| `errorStateHtml()` | [src/uiHelpers.js:27](../src/uiHelpers.js#L27) |
| `loadingStateHtml()` | [src/uiHelpers.js:38](../src/uiHelpers.js#L38) |
| `skeletonLines()` | [src/uiHelpers.js:47](../src/uiHelpers.js#L47) |
| `sectionHeaderHtml()` | [src/uiHelpers.js:52](../src/uiHelpers.js#L52) |
| `notificationDotHtml()` | [src/uiHelpers.js:61](../src/uiHelpers.js#L61) |

## src/updateActivity.js

| Function | 宣告位置 |
| --- | --- |
| `trackUpdateActivity()` | [src/updateActivity.js:5](../src/updateActivity.js#L5) |
| `beginUpdate()` | [src/updateActivity.js:22](../src/updateActivity.js#L22) |
| `endUpdate()` | [src/updateActivity.js:28](../src/updateActivity.js#L28) |
| `hasUpdateActivity()` | [src/updateActivity.js:29](../src/updateActivity.js#L29) |

## src/updateController.js

| Function | 宣告位置 |
| --- | --- |
| `updateControlsHtml()` | [src/updateController.js:11](../src/updateController.js#L11) |
| `iconGuideHtml()` | [src/updateController.js:26](../src/updateController.js#L26) |
| `refreshUpdateControls()` | [src/updateController.js:47](../src/updateController.js#L47) |
| `setMessage()` | [src/updateController.js:57](../src/updateController.js#L57) |
| `showUpdateBanner()` | [src/updateController.js:59](../src/updateController.js#L59) |
| `waitForInstall()` | [src/updateController.js:71](../src/updateController.js#L71) |
| `hasOpenWork()` | [src/updateController.js:87](../src/updateController.js#L87) |
| `drainSavedWrites()` | [src/updateController.js:93](../src/updateController.js#L93) |
| `reloadSafely()` | [src/updateController.js:103](../src/updateController.js#L103) |
| `runUpdate()` | [src/updateController.js:145](../src/updateController.js#L145) |
| `initAppUpdates()` | [src/updateController.js:161](../src/updateController.js#L161) |

## src/updateProtocol.js

| Function | 宣告位置 |
| --- | --- |
| `askWorker()` | [src/updateProtocol.js:2](../src/updateProtocol.js#L2) |

## src/version.js

| Function | 宣告位置 |
| --- | --- |
| `formatDisplayVersion()` | [src/version.js:14](../src/version.js#L14) |
| `formatBuildTimeLocal()` | [src/version.js:18](../src/version.js#L18) |
| `getServiceWorkerRegisterUrl()` | [src/version.js:33](../src/version.js#L33) |

## src/workshopGiftView.js

| Function | 宣告位置 |
| --- | --- |
| `buildWorkshopGiftView()` | [src/workshopGiftView.js:6](../src/workshopGiftView.js#L6) |

## src/workshopService.js

| Function | 宣告位置 |
| --- | --- |
| `loadGiftAffinities()` | [src/workshopService.js:62](../src/workshopService.js#L62) |
| `getGiftAffinityTags()` | [src/workshopService.js:83](../src/workshopService.js#L83) |
| `getGiftThemeLabel()` | [src/workshopService.js:87](../src/workshopService.js#L87) |
| `normalizeInventory()` | [src/workshopService.js:105](../src/workshopService.js#L105) |
| `normalizeWorkshopStats()` | [src/workshopService.js:123](../src/workshopService.js#L123) |
| `loadMaterials()` | [src/workshopService.js:139](../src/workshopService.js#L139) |
| `loadCraftables()` | [src/workshopService.js:156](../src/workshopService.js#L156) |
| `getMaterialInfo()` | [src/workshopService.js:173](../src/workshopService.js#L173) |
| `getMaterialSourceLabel()` | [src/workshopService.js:188](../src/workshopService.js#L188) |
| `getCraftableInfo()` | [src/workshopService.js:195](../src/workshopService.js#L195) |
| `getMaterialName()` | [src/workshopService.js:212](../src/workshopService.js#L212) |
| `getItemName()` | [src/workshopService.js:217](../src/workshopService.js#L217) |
| `getInventory()` | [src/workshopService.js:222](../src/workshopService.js#L222) |
| `saveInventory()` | [src/workshopService.js:228](../src/workshopService.js#L228) |
| `getWorkshopStats()` | [src/workshopService.js:235](../src/workshopService.js#L235) |
| `saveWorkshopStats()` | [src/workshopService.js:241](../src/workshopService.js#L241) |
| `initWorkshop()` | [src/workshopService.js:248](../src/workshopService.js#L248) |
| `getMaterialInventory()` | [src/workshopService.js:269](../src/workshopService.js#L269) |
| `getItemInventory()` | [src/workshopService.js:274](../src/workshopService.js#L274) |
| `canCraft()` | [src/workshopService.js:279](../src/workshopService.js#L279) |
| `getMaxCraftQuantity()` | [src/workshopService.js:291](../src/workshopService.js#L291) |
| `getCraftingPreview()` | [src/workshopService.js:308](../src/workshopService.js#L308) |
| `getMissingMaterialsText()` | [src/workshopService.js:336](../src/workshopService.js#L336) |
| `craftItem()` | [src/workshopService.js:347](../src/workshopService.js#L347) |
| `getFavoriteBonus()` | [src/workshopService.js:394](../src/workshopService.js#L394) |
| `getGiftRecommendations()` | [src/workshopService.js:411](../src/workshopService.js#L411) |
| `getDailyBondItemUsage()` | [src/workshopService.js:431](../src/workshopService.js#L431) |
| `canUseBondItem()` | [src/workshopService.js:439](../src/workshopService.js#L439) |
| `getGiftPreview()` | [src/workshopService.js:478](../src/workshopService.js#L478) |
| `useBondItem()` | [src/workshopService.js:507](../src/workshopService.js#L507) |
| `hasCraftableMaterials()` | [src/workshopService.js:559](../src/workshopService.js#L559) |
| `hasBondItemsInInventory()` | [src/workshopService.js:566](../src/workshopService.js#L566) |
| `companionLikesAnyGift()` | [src/workshopService.js:575](../src/workshopService.js#L575) |
| `hasLowMaterials()` | [src/workshopService.js:586](../src/workshopService.js#L586) |
| `getEnabledCraftables()` | [src/workshopService.js:593](../src/workshopService.js#L593) |
| `exportInventory()` | [src/workshopService.js:598](../src/workshopService.js#L598) |
| `exportWorkshopStats()` | [src/workshopService.js:603](../src/workshopService.js#L603) |
| `importInventory()` | [src/workshopService.js:608](../src/workshopService.js#L608) |
| `importWorkshopStats()` | [src/workshopService.js:619](../src/workshopService.js#L619) |
| `formatItemEffect()` | [src/workshopService.js:626](../src/workshopService.js#L626) |
| `getFutureTagLabels()` | [src/workshopService.js:637](../src/workshopService.js#L637) |
