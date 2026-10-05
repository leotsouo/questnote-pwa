# QuestNote 全功能 ASCII Review

盤點日期：2026-10-05。來源：維護工作區 `.worktrees/main-integration`，source commit `1de87e441b13afddf629102d19ee1e7887d93b2c`，`APP_VERSION = 3.8.0`。
這份文件描述本機原始碼；沒有查驗正式部署。盤點時 `origin/main = 27da862ab00613c6193759d49db5a80cfe7e48f9`，與本機 HEAD 的差異僅為磁碟治理文件／工具，App 與 backend 相同。

圖中的箭頭是流程摘要；括號內是真實 function 名稱。`[TX]` 表示同一筆 IndexedDB transaction；`[SEQ]` 表示分次寫入，不能推定整體失敗會回滾。回傳失敗、資料儲存成功與演出成功是不同結果。
精確函式位置見同目錄 `functional-function-index-2026-10-05.md`；包含 runtime 與後端具名函式宣告，不包含匿名事件 callback，圖中會註明此類入口。

## 01. 全站功能地圖

```text
index.html
  |
  +-- 啟動驗證 (bootApplication)
  |     `-- App 初始化 (initApp)
  |           +-- IndexedDB / 遷移 / 內容目錄
  |           +-- UI 事件綁定 (initUI)
  |           `-- 狀態讀取 / 渲染 (refreshState)
  |
  `-- 導航 (switchView)
        +-- tasks       任務、今日計畫、子任務、每日祝福、冒險任務、陪伴
        +-- gacha       卡池、單抽、十連、指定邀請、卡池擴充／演出
        +-- collection 收藏、篩選、暱稱、陪伴、親密度、故事、羈絆覺醒
        +-- expedition 派遣、領取、探索里程碑、營地、旅程報告
        `-- more
              +-- habits       每日／每週習慣、連續紀錄、封存
              +-- workshop     合成、庫存、送禮
              +-- achievements 成就、獎勵、稱號
              +-- handbook     本週紀錄、目標、夥伴、探索彙整
              +-- guide        引導與功能教育
              +-- share        分享 App／複製連結
              +-- feedback     草稿、預覽、送出、收件編號
              `-- settings     主題、字級、長輩模式、通知、備份、更新、重置

共用：信箱、教學、全領獎勵、提示 badge、對話、圖片預載、離線快取。
```

## 02. 啟動、資料載入與刷新

主檔：`bootstrap.js`、`app.js`、`releaseCatalog.js`、`db.js`、`ui.js`。

```text
bootApplication()
  +-- source 模式：沒有 profile 與 artifact marker -> import app.js
  `-- release 模式：檢查 artifactId / marker / scope
        +-- 不一致或必要瀏覽器能力不可用 -> renderBootstrapRecovery()
        +-- 控制中的 SW 已驗證 -> import app.js
        `-- 註冊／等待 SW -> reload 或提示關閉其他視窗
              [通過之前不開 release DB]

initApp()
  -> openDB() -> prepareOnboarding()
  -> initUserPreferences() -> applyThemeToDocument()
     + applyFontSizeToDocument() + applyReadingModeToDocument()
  -> initUI(appState, refreshState, runAchievementCheck)
  -> migrateTasks() / initHabits()
  -> initWallet() -> ensureEncounterMigration()
  -> initGachaStats() -> setSelectedPoolId('standard')
  -> 初始化成就／祝福／任務進度／探索／里程碑／工坊
  -> loadGameData()
       -> loadCatalogBundle()
            +-- release：讀 bundle -> SHA-256 -> validateContentBundle()
            `-- source：讀 data JSON -> validateContentBundle()
       -> mergeAllPetsWithLore() -> syncWithPetDatabase()
  -> loadBondStories() / loadCategoriesCatalog()
  -> refreshState({ renderMode: 'full' })
  -> checkAndUnlockAchievements()
  -> initGuidedOnboarding() / initOnboarding()
  -> 啟動畫面完成
  `-- 背景 syncGlobalMailbox() / registerServiceWorker()

服務寫入後 -> onRefresh(...) [綁定到 refreshState]
  -> 讀 tasks / wallet / habits / inventory / gachaStats 等
  -> syncBondJourney() / syncPetAwakening()
  -> 彙整 companion / collection / expedition / summaries
  -> renderAfterRefresh(mode)
       +-- full       -> renderAll()
       +-- [views...] -> renderViews()
       `-- current    -> renderCurrentView()
  -> renderSharedUI() [資源、badge、陪伴、教學]
  `-- warmCriticalPetImages() [背景圖片預載]

跨日回到前景 -> registerServiceWorker 的 visibilitychange callback
  -> 比較 getTodayDateString() -> refreshState({ renderMode: 'full' })
```

部分非核心載入失敗會保留功能降級提示；不能把所有 catch 都解讀成全站成功。轉盤旋轉中會暫緩渲染；部分刷新遇到 modal 只更新共用 UI，以免覆蓋編輯／演出。

## 03. 資料與責任邊界

```text
DOM 操作 / controller
  -> feature Service
       +-- Core / Schema：規則、正規化、交易計畫
       +-- catalog：data JSON 與圖片
       `-- db.js
            +-- dbGet() / dbGetAll()                 讀取
            +-- dbPut() / dbDelete()                 單次寫入
            +-- dbUpdateRecord() / dbMutateRecords() [TX]
            +-- readAllStoresSnapshot()             一致快照
            `-- replaceAllStores()                  全庫替換 [TX]

IndexedDB stores
  +-- tasks       任務與子任務
  +-- habits      習慣與打卡
  +-- collection  取得、暱稱、陪伴、親密度與相容欄位
  +-- expeditions 派遣／歷史
  `-- meta
        wallet / gachaStats / encounterEconomy / inventory
        achievements / taskStats / dailyCheckIn / questProgress
        explorationProgress / campProgress / collectionMilestones
        userPreferences / globalMailboxState / poolUnlockState
        idempotentGrants / poolDebutSeen / bondJourney / petAwakening 等

發布 profile -> 正式 QuestNoteDB / 預覽 QuestNotePreviewDB
localStorage -> 回報草稿／重試與部分 client cache
Cloudflare D1 -> 私密 feedback / reminders 各自後端
Cache Storage -> App / 圖片 / 公開信件
```

任務／習慣寫入會透過 `markReminderDirty()` 標記通知狀態需重新同步，再觸發 `reminderChanged()`。遠端通知摘要不等於完整遊戲存檔；feedback 後端也不是存檔同步服務。

## 04. 任務、習慣與獎勵

主檔：`taskService.js`、`taskFilterService.js`、`taskStatsService.js`、`habitService.js`、`rewardService.js`、`questService.js`、`achievementService.js`、`dailyCheckInService.js`、`mailboxService.js`。

```text
renderTasksView()
  +-- openTaskForm() -> createTask() / updateTask()
  |     -> validateDateRange() / 日期時間驗證 -> tasks 寫入
  |     [教學建立改走 commitTutorialTask()]
  +-- addToTodayPlan() / removeFromTodayPlan() -> updateTask()
  +-- toggleSubtaskComplete() -> 更新 subtasks / recordSubtaskCompleted()
  |     [全子任務完成只提示，不自動完成主任務]
  +-- deleteTask() -> dbDelete()
  `-- toggleTaskComplete()
        +-- 原本完成 -> updateTask(completed=false) [不退獎勵]
        `-- 原本未完成 -> updateTask(completed=true)
              -> recordCompletedBeforeDue() [符合期限条件時]
              -> claimTaskReward()
                   +-- 教學 -> claimTutorialReward() [TX]
                   +-- rewardClaimed -> 不重發
                   `-- 首次正式任務 [SEQ]
                         addStardust() -> addAdventureEnergy()
                         -> updateTask(rewardClaimed=true)
                         -> addBondExpToCompanion()
              -> UI trackQuest('complete_task')
              -> onRefresh() / handleAchievementCheckAfterAction()

顯示 -> getAllTasks() -> sortTasks()
  +-- renderTodayView() -> getTodayViewSections() [計畫／到期／逾期／完成；ID 去重]
  +-- renderAllTasksView()
  `-- renderSmartListDetail() -> filterBySmartList()
        -> filterCompletedTasksByRange() / filterByCategory()

分類 -> loadCategoriesCatalog() -> JSON / getDefaultCategories() fallback
統計 -> recordPlanToday() / recordSubtaskCreated() / recordSubtaskCompleted()
        / recordCompletedBeforeDue() -> saveTaskStats()

renderHabitsView() -> openHabitForm() -> createHabit() / updateHabit()
  [weekly target 整數 1~7]
  +-- archiveHabit() [保留 logs；停止操作]
  `-- handleHabitCompletion()
        +-- completeHabitToday()
        |     [存在、未封存、今日未完成]
        |     -> daily 星塵 +5（全習慣每日最多 30）
        |     -> 親密度 +1（全習慣每日最多 10）
        |     -> weekly 目標達標且未領本週獎 -> 能量 +3
        |     -> saveHabit() / trackQuest('complete_habit') [SEQ]
        `-- uncompleteHabitToday() [不退獎]
              -> 有星塵／rewardClaimed 時保留取消記錄
              -> 只有 bondGiven 的 log 不一定保留，須個別 Review
  -> getHabitPageStats() -> getHabitStreak()
       -> calculateDailyStreak() / calculateWeeklyStreak()
```

正式任務一般／重要／緊急獎勵：星塵 20/45/80、能量 1/2/3、親密度 5/12/20。任務、習慣的完成與全套發獎不是同一筆交易；`putWithAwakeningProgress()` 保護完成紀錄與覺醒進度，並不涵蓋其後所有獎勵。

```text
每日祝福 -> renderDailyBlessingSection()
  +-- handleDailyCheckIn() -> performDailyCheckIn()
  |     -> hasCheckedInToday() / isYesterday() / calculateCheckInRewards()
  |     -> applyRewardBundleAndUpdateMeta() [日期／紀錄 + wallet + inventory TX]
  |     -> trackQuest('daily_checkin') / refresh
  `-- openDailyWheelModal() -> prepareDailyWheelSpin()
        -> hasSpunWheelToday() / loadWheelRewards() / pickWeightedWheelReward()
        [先決定結果，尚未寫入獎勵]
        -> animateDailyWheel() -> finalizeDailyWheelSpin()
        -> 重查日期 -> applyRewardBundleAndUpdateMeta() [TX]

行為 trackQuest(event) -> updateQuestProgress()
  -> normalizeQuestProgress() / rolloverQuestProgress()
       [每日／每週新週期，舊未領獎不保留]
  -> 對應事件 -> current <= target -> completed -> 寫 questProgress
  -> getQuestSummary() -> renderQuestPanel()
  -> claimQuestReward() [完成且未領？]
       -> applyRewardBundleAndUpdateMeta() [claimed + 資源 TX]

handleAchievementCheckAfterAction() -> runAchievementCheck()
  -> checkAndUnlockAchievements()
       -> buildAchievementContext() -> getAchievementProgress() / isAchievementMet()
       -> saveAchievementsState() [解鎖成就／稱號／未看稱號]
  -> renderAchievementsView()
       +-- claimAchievementReward() / claimAllAchievementRewards()
       |     [已解鎖、未領取、頁內處理鎖]
       |     -> 資源逐項發放 -> 保存 claimedAchievementIds [SEQ]
       `-- equipTitle() / markTitlesSeen()
```

簽到與轉盤各每日一次；簽到基礎 20 星塵與 1 能量，連續第 3/7/14/30 天有里程碑獎勵。成就解鎖與成就領獎是兩個步驟。

```text
信箱 -> syncGlobalMailbox() -> fetchGlobalMailbox()
  -> 公開 data/global-mailbox.json
       +-- 線上成功 -> normalizeMailboxPayload() -> cache／memory
       `-- 失敗 -> runtime cache -> memory -> 空資料／錯誤
  -> buildMailboxViewModel() -> resolveMailboxMessageStatus()
       [enabled、公開／到期時間、版本、read、claimed]
  -> renderGlobalMailboxModal()
       +-- openMailboxMessageDetail() -> markMailboxMessageRead()
       `-- handleMailboxClaim() -> claimMailboxReward()
             -> 重查補償類型／時間／版本／catalog／persisted claimed
             -> applyMailboxRewardInTransaction()
                  [read/claimed + wallet + inventory + encounterEconomy TX]

各獎勵區塊的一鍵領取 -> claimAllAvailableRewards(kind)
  +-- achievements -> claimAllAchievementRewards()
  +-- quests       -> claimQuestReward()
  +-- collection   -> claimCollectionMilestone()
  +-- exploration  -> claimExplorationMilestone()
  +-- mailbox      -> claimMailboxReward(markRead=false)
  `-- blessing     -> performDailyCheckIn() / finalizeDailyWheelSpin()
       -> claimRewardBatch() [逐項、合計成功與失敗]
       [後項失敗不撤銷前項成功；不是全站六區一起領]
```

信箱補償每份本機 profile 一次，不是伺服器帳號全域一次。相遇碎片補償要求其遷移版本已完成。

## 05. 召喚、邀請與卡池

主檔：`ui.js`、`encounterView.js`、`gachaService.js`、`gachaTransactionCore.js`、`poolUnlockCore.js`。

```text
renderGachaView()
  +-- local art preview 啟用 -> renderLocalIdentityView()
  +-- 正常新介面 -> renderEncounterView('gacha') -> renderPool()
  `-- 新介面無法建立 -> ui.js 後備畫面

切池 -> encounterActions().selectPool()
  -> setSelectedPoolId() -> renderGachaView() -> maybePlayPoolDebut()
       -> hasSeenPoolDebut() / markPoolDebutSeen()
       [busy / 正在登場時禁止切換；手動切池可以完整登場]

單抽／十連 -> runDraw(count) -> encounterActions().draw()
  -> handlePull() / handleTenPull()
  -> pullOnce() / performTenPull() -> executeDraw()
  -> dbMutateRecords() [TX]
       -> planGachaTransaction()
            +-- 驗證卡池／catalog／成本／RNG
            +-- resolveEffectivePool() / getEligiblePetsForPool()
            |    [整批固定候選，當批解鎖不改第 10 抽名單]
            +-- 扣星塵 -> determineRarity()
            |    [UR 保底優先、SSR+ 保底、通常機率、設定適用時十連 SR 保障]
            +-- resolvePetFromRarity()
            |    +-- 新角色 -> createCollectionEntry()
            |    `-- 重複   -> earnEncounterFragments()
            +-- updatePityCounters()
            `-- applyPoolDrawProgress() -> applyUnlockGift()
                 [達到該池擴充門檻；grant ID 防重領]
       -> 一起提交 wallet / stats / collection / unlock / grants / fragments
  -> playPostPullPresentation() -> presentCommittedEncounters()
       [提交後才演出；演出失敗有後備結果畫面]
  -> maybePlayMorningGardenAfterPull()
       -> ensureUnlockRewardClaimed() -> playPoolUnlock()
       -> markUnlockAnimationSeen()
  `-- 刷新／成就／教學事件

指定邀請 -> openInvitation() -> invitationCandidates()
  -> encounterActions().invite() -> inviteCompanion()
  -> planCompanionInvitation()
       +-- 已擁有／鎖定／不合候選／碎片不足 -> 拒絕
       `-- SSR 100 / UR 200 相遇碎片 -> 取得指定角色
  -> encounterEconomy + collection [TX]
  `-- 角色到來演出 -> 可設陪伴
```

重複角色按 N/R/SR/SSR/UR 給 1/2/5/10/20 相遇碎片。`ensureEncounterMigration()` / `planEncounterMigration()` 遷移舊角色碎片与歷史升星成本；舊星級仍有相容用途，不能畫成目前還有一般升星入口。演出重播與跳過不會再次抽卡或扣款。

## 06. 收藏、陪伴、親密度

主檔：`collectionService.js`、`collectionMilestoneService.js`、`companionService.js`、`companionDialogueService.js`、`encounterView.js`。

```text
renderCollectionView() -> renderEncounterView('collection')
  -> renderCollection() / renderCollectionCards()
       +-- 世界／名稱／稀有度篩選
       +-- petDetail() -> openPetDetailModal()
       |     +-- setPetNickname() / clearPetNickname()
       |     +-- 圖片檢視／餵食／故事／覺醒
       |     `-- setCompanion() [同時一位陪伴，收藏更新 TX]
       `-- getCollectionMilestoneSummary()
             -> claimCollectionMilestone()
             -> applyStardustRewardAndUpdateMeta() [wallet + 領取紀錄 TX]

首頁摸摸 -> handleCompanionPet() -> petCompanion()
  -> 冷卻 4 小時檢查 -> 親密度 +5 -> 儲存／刷新／對話

親密度來源：任務／習慣獎勵、摸摸、餵食、探險
  -> getBondLevelFromExp() [Lv.1~5：0 / 50 / 150 / 300 / 500]
  -> 升級提示／故事可用性
  `-- getWelcomeCompanionLine() / getRandomDialogue()
```

## 07. 同行約定與羈絆故事

主檔：`bondJourneyController.js`、`bondJourneyService.js`、`bondJourneyCore.js`、`bondStoryCatalog.js`。

```text
createBondJourneyController() -> loadBondStories()
  -> chapterIsAvailable() [Lv.2~5；前章已領獎]
  -> chooseBondResponse() [gentle / steady，回應不重複記]
  -> startBondAgreement()
       [全域同時一約定；未完成任務／有效習慣；不追溯歷史完成]
       +-- controlBondAgreement() [pause / resume / 暫停後 end 或換目標]
       `-- 目標完成 -> syncBondJourney() -> advanceBondJourney()
             [事件 key 去重；開始／恢復後才算；習慣門檻依章節]
             -> ready -> claimBondAgreement()
                  -> 領取 receipt + wallet [TX]
                  -> 第 2/3/4/5 章：30/50/70/100 星塵
                  `-- 第 5 章：紀念物／日常同行開放
                        -> displayBondKeepsake()
                        `-- 日常同行獎勵 20 星塵，每日全域一次
```

## 08. 角色羈絆覺醒

主檔：`petAwakeningController.js`、`petAwakeningService.js`、`petAwakeningCore.js`、`petAwakeningScene.js`。

```text
createAwakeningController() -> startPetAwakening() -> beginPetAwakening()
  [catalog 支援、已擁有、Lv.5、第 5 章已領獎、全域同時一位]
  +-- pausePetAwakening() / 恢復
  `-- 任務／習慣新完成
        -> putWithAwakeningProgress() [完成紀錄 + 覺醒進度 TX]
        -> syncPetAwakening() -> awakeningEvents() -> advancePetAwakening()
             [新增 3 次完成 + 此角色開始覺醒後出發並領取 cloudrest_trail]
             -> ready / 信物
             -> awakenPet()
                  [再次檢查條件與 item_pine_trail_riceball]
                  -> 扣食物 + 消耗信物 + awakened 狀態 [TX]
                  -> playAwakeningScene()
                  `-- setAwakeningForm() / 雙形態／專屬稱號／重播
```

角色羈絆覺醒和「抽卡累積次數解鎖卡池擴充」是兩條不同流程。

## 09. 探險、探索、營地與工坊

主檔：`expeditionService.js`、`expeditionGameplay.js`、`explorationService.js`、`campService.js`、`workshopService.js`。

```text
renderExpeditionView() -> checkAreaUnlock()
  -> openExpeditionDispatchModal()
       -> getExpeditionRecommendations() / getDispatchTerms()
       [首次 mist_forest：1 能量／3 分鐘]
  -> confirmExpeditionDispatch() -> startExpedition()
       [1~3 位不重複且擁有、地區解鎖、無未領旅程、合法目標、能量足夠]
       -> planExpeditionResult() [explore/gather/bond、專長、羈絆、營地等]
       -> 扣能量 + expedition plannedResult/endsAt [TX]
  -> startExpeditionTimer() -> isExpeditionTimeComplete()
       [倒數不發獎，也不增加探索度]
  -> handleExpeditionClick() -> claimExpeditionRewards()
       [存在、未領、時間到、catalog 完整]
       -> 使用 plannedResult [舊記錄 fallback calculateExpeditionRewards()]
       -> advanceExplorationRecord()
       -> wallet / 同行寵物羈絆 / exploration / expedition claimed
          / 覺醒進度（原紀錄存在時）[TX]
       -> trackQuest('complete_expedition') / 刷新／成就
  `-- renderJourneyArchive() / showJourneyReport()

advanceExplorationRecord() -> 0~100% / 次數／時間
  -> computeUnlockedStories() [依門檻解鎖]
  -> getExplorationSummary() -> renderExplorationPanel()
  -> claimExplorationMilestone()
       [達標、尚未領取]
       -> 領取紀錄／徽章／稱號 + wallet + 有獎勵時 inventory [TX]

renderCampPanel() -> upgradeCamp()
  [未滿 Lv.4、材料足夠]
  -> wallet 扣材料 + campProgress [TX]
  -> 後續派遣套加成
       Lv.1 專長說明 / Lv.2 地區素材+1 / Lv.3 探索+1% / Lv.4 觀測文字

renderWorkshopView() -> handleWorkshopClick()
  +-- getCraftingPreview() -> canCraft() / getMaxCraftQuantity()
  |     -> craftItem() [craftingLock、enabled、材料足夠]
  |     -> spendMaterials() -> saveInventory() -> saveWorkshopStats() [SEQ]
  `-- getGiftRecommendations() / getGiftPreview()
        -> canUseBondItem() [類型、庫存、已擁有、每寵每日 <5 件]
        -> getFavoriteBonus() -> useBondItem() [usingLock、重查條件]
        -> saveInventory() -> addBondExpToPet() -> saveWorkshopStats() [SEQ]
        -> 刷新／教學／成就／親密度提示

首頁餵食 -> bindPetFeedInteractions() -> useBondItem() [共用送禮規則]
```

工坊 lock 是頁內鎖，未提供多頁共用的一次跨 store 提交。

## 10. 教學、手冊、提醒與分享

```text
手冊 renderHandbookView() -> refreshHandbookModel()
  -> getAdventureHandbookSummary() -> getAdventureHandbookContext()
  -> buildAdventureHandbookModel()
       buildNextGoals() / buildWeeklySummary() / buildLongTermRecords()
       / buildCollectionSummary() / buildExpeditionSummary()
  -> buildHandbookHtml() -> handleHandbookClick() -> 展開／跳到功能
  [彙整資料，不另發手冊獎勵；依賴服務讀取可能執行跨日 rollover]

Lore mergeAllPetsWithLore() -> mergePetWithLore()
  -> getDialogueContext() [urgent > important > praise > normal]
  -> getPetDialoguePool() -> getRandomPetDialogue() / getDefaultPetLine()
  -> getUnlockedBondEntries() [按親密度展示文字]

prepareOnboarding() -> prepareGuidedOnboarding()
  [真正空的新存檔 active；既有存檔 existing]
  -> initGuidedOnboarding() -> transitionGuidedState()
       WELCOME -> MEET_COMPANION -> HOME_INTRO -> OPEN_CREATE_QUEST
       -> CREATE_TUTORIAL_QUEST -> RETURN_HOME -> COMPLETE_TUTORIAL_QUEST
       -> REWARD_REVEAL -> COMPANION_REACTION -> FINISH
       +-- advanceGuidedOnboarding() [起始寵物／教學 TX]
       +-- commitTutorialTask() [task + 教學 TX]
       `-- claimTutorialReward() [task + receipt + wallet + companion + 教學 TX]
             [首次 20 星塵／1 能量／5 羈絆；重播不重發]
  +-- 中斷 -> recoverGuidedOnboarding() -> recoverGuidedState()
  +-- 重播 -> replayGuidedOnboarding() -> startGuidedReplay()
  +-- 略過 -> controller 的 confirm-skip action
  +-- 各頁巡覽 -> movePageTour() -> savePageTour() -> transitionPageTour()
  `-- 章節教育 -> openOnboardingEducation() -> startLesson()/pauseLesson()/advanceLesson()
行為成功 -> recordOnboardingEvent() -> advanceOnboardingForEvent()

分享 -> shareQuestNote()
  +-- navigator.share 成功／使用者取消 -> 對應結果
  `-- 不支援／失敗 -> copyQuestNoteInvitation()
        -> clipboard.writeText / textarea copy fallback
```

```text
通知 initReminders()
  -> 使用者同意同步摘要並點啟用 -> enableReminders()
       -> capability / requestPermission / SW / pushManager.subscribe
       -> POST /v1/reminder-installations -> 本機 dailyReminder
       -> syncReminders() -> performSync()
  +-- saveReminderSettings() -> revision/dirty -> syncReminders()
  +-- online / foreground / reminder-change -> 延遲同步
  +-- testReminder() -> 同步 -> POST /test
  `-- disableReminders()
       -> enabled=false/pendingDisable -> unsubscribe -> revokeInstallation()
       [離線失敗保留待停用，連線重試]

performSync()
  +-- pendingDisable -> revokeInstallation()
  +-- 未啟用／無 token -> 結束
  +-- 訂閱失效 -> 停用
  `-- readAllStoresSnapshot() -> projectReminderData()
       [未完成非教學任務、有效習慣最近 28 日紀錄；標題預設不送]
       -> PUT /v1/reminder-installation/state
       -> 保存同步時間／nextAt／dirty／error

雲端 backend/reminders
  fetch() -> route() -> authenticate() / sanitizeState() -> D1 installations
  排程 scheduled() / Durable Object alarm
       -> runScheduled() -> runSchedule()
       -> 日期 delivery 去重／lease／重查 installation
       -> buildDailyDigest() [有當日未完成、未過期才送]
       -> sendPush()
            +-- accepted / skipped -> 排下一次
            +-- 404/410 -> subscription-expired / 停用
            `-- 429/5xx/網路錯誤 -> retry（最多 3 次）
  通知到裝置 -> SW push callback -> showNotification()
  點通知 -> notificationclick callback -> 開啟／聚焦 App
       -> SW message 或 ?reminder=today -> openToday callback
```

提醒是雲端推播流程；支援性與啟用狀態不等於後端已正式部署或裝置已成功收件，本次未測試實際推播。

## 11. 偏好與長輩模式

```text
設定主題 -> applyTheme() -> setTheme() -> applyThemeToDocument()
設定字級 -> 字級 change callback -> setFontSize() -> applyFontSizeToDocument()
設定長輩模式 -> initSeniorModeController() 的 change callback
  -> setReadingMode() -> applyReadingModeToDocument()
  -> syncSeniorPresentation() / decorateSeniorControls()
  -> 可選練習 -> setSeniorOnboardingCompleted()

偏好儲存：dbUpdateRecord(userPreferences) [TX]
  -> normalizeUserPreferences()
  -> 保留同筆資料的其他偏好
  `-- 字級儲存失敗 -> 回復上一個字級與控制項

長輩模式 -> seniorFeedback() / composeSeniorTaskForm()
  -> 較直接的任務操作、焦點、提示與召喚成本確認
減少動畫 -> applyReduceMotionClass() / 演出內 reduceMotion 判斷
```

## 12. 私密意見回報

主檔：`feedbackController.js`、`feedbackService.js`、`backend/feedback/worker.js`。

```text
initFeedback()
  -> loadFeedbackDraft() [本機草稿]
  +-- input -> saveFeedbackDraft() -> 舊預覽失效
  +-- 表單 submit -> validateFeedback()
  |     -> loadPendingFeedback() 或 buildFeedbackReport()
  |     -> savePendingFeedback() -> 預覽 [尚未送出]
  |     +-- 複製／下載回報
  |     `-- 點送出 -> sendFeedback()
  |           [離線或正在送出時停用按鈕]
  |           -> POST /v1/feedback
  |           -> Worker fetch()：origin / method / rate limit
  |           -> readBoundedJson() -> validatePayload()
  |           -> payload SHA-256 -> D1 insert-on-conflict + hash 比對
  |                +-- 同 ID 同內容 -> 同一收件編號
  |                +-- 同 ID 不同內容 -> 409
  |                `-- 限流／容量／伺服器錯誤 -> 顯示錯誤，保留可重試資訊
  |           -> finishFeedback() -> 收件編號／清除草稿
  `-- 清除草稿 -> clearFeedbackDraft() [不刪除已送出 D1 記錄]
```

## 13. 備份、匯入與重置

主檔：`ui.js`、`backupService.js`、`backupSchema.js`、`db.js`、`app.js`。

```text
匯出 -> downloadBackup() -> exportBackup()
  -> readAllStoresSnapshot() -> validateStoredSnapshot()
  -> normalizePayloadData() -> migrateImportedData()
  -> buildDataPayload() -> validateBackup() -> downloadBackupFile()

選檔 -> handleImportFileSelect()
  -> readBackupFile() -> validateBackup()
  -> normalizeBackupPayload() -> previewBackup()
  -> 顯示版本／各項資料數／警告 [此時未替換 DB]
  -> handleRestoreBackup() -> 第一次確認
  -> proceedRestoreAfterFirstConfirm()
       -> createAutoBackupBeforeImport()
       +-- 自動備份失敗 -> 取消本次匯入
       `-- 自動備份成功 -> 第二次確認 [較新版備份加警告]
             -> executeRestoreBackup()
             -> restoreBackup() -> validateSnapshotData()
             -> migrateImportedData({ forRestore: true })
             -> safeReplaceAllData() -> replaceAllStores() [TX]
             -> dismissOnboardingAfterRestore()
             -> 全畫面刷新／偏好套用／成就檢查

重置 -> handleReset() -> 兩次確認 -> resetAllData()
  -> 有通知 token 時先 disableReminders()
  -> clearAllData() -> 重新初始化 meta／教學
  -> refreshState(full) -> showOnboardingAfterReset()
```

自動備份是觸發瀏覽器下載，不能推定使用者已把檔案保存。`replaceAllStores()` 的替換有交易保護；重置的清除與各項重新初始化則是多步驟流程。

## 14. 離線、圖片快取與安全更新

```text
registerServiceWorker() -> initAppUpdates()
  -> runUpdate() -> registration.update() / waitForInstall()
  -> reloadSafely()
       -> hasOpenWork() / beginUpdate() [阻擋未結束操作]
       -> drainSavedWrites() [等待所有 store 既有寫入]
       -> askWorker(QUESTNOTE_UPDATE_INFO)
       -> askWorker(QUESTNOTE_APPLY_UPDATE)
            -> SW message callback：artifact / 完整快取 / 單一視窗檢查
            +-- 不符合 -> 拒絕並保留目前版本
            `-- accepted -> skipWaiting() -> controllerchange -> reload

SW install callback -> 取全體必要檔 -> hash 驗證 -> 寫入該版 cache
SW activate callback -> 清理同 namespace 舊 cache
SW fetch callback
  +-- 公開信箱          -> networkFirstMailbox()
  +-- 導航／precache    -> verifiedPrecacheResponse()
  |     [缺 cache 時僅接受相同 hash 的線上 bytes，否則 503]
  +-- release 外 JS/JSON 等可變資產 -> 503
  +-- 寵物圖片          -> cachePetImage()
  +-- 其他圖片          -> cacheFirst()
  `-- 其他同 scope GET  -> networkFirstWithCache()

preloadCompanionImage() / preloadOwnedPetImages() / preloadAwakeningForms()
  -> 背景預載；不阻擋主 UI
```

## 15. 開發與內容發布工具（輔助功能）

```text
本機開發資格 -> isDevMode() / isAuthorLocalDevMode() / isDebugMode()
  +-- unlockDevTestPets() / unlockAllDevPets()
  +-- grantDevStardust() / raiseDevCompanionBond()
  +-- devForceCompleteExpedition() / resetDevDailyBlessing()
  `-- 本機信箱注入／清除、召喚演出測試

診斷 -> runAppHealthCheck() [包括短暫 IndexedDB probe，非纯讀取]
預覽效能條件符合 -> startPerfDiagnostics()

卡池 authoring CLI scripts/card-pool.mjs
  -> createPipelineWorkspace()
  -> loadPipelineStatus() / validatePipelineWorkspace()
  -> approvePipelineStage() [綁定 stage hash／審查身份]
  -> stagePoolCandidate() [stage，不直接 publish]

App artifact CLI scripts/prepare-release.mjs
  -> prepareReleaseArtifact() [profile／scope／内容／hash／產物組裝]
  -> verifyReleaseArtifact() [独立驗證]
  `-- 正式發布另走核准／部署／HTTPS 讀回流程
```

`src/_archive/` 不是目前正式功能入口。authoring/devtools 的每個歷史驗收頁不列為產品頁；其功能是支援製作、測試與驗證。

## 16. Review 優先點與驗證界線

1. 看 TX/SEQ 邊界：逐步寫入流程中斷後的恢復機制要逐案 Review，這份盤點不宣稱已發現可重現 bug。
2. 看獎勵身份：claimed、grant、receipt 與每日 key 如何防重领；演出重播不得重新給資源。
3. 看完成事件：取消／重做／跨日／歷史匯入對任務獎勵、同行與覺醒的影響。
4. 看新版入口：召喚與圖鑑先走 encounterView，不能只 Review 舊 ui.js markup。
5. 看破壞性操作：匯入與重置的確認、自動備份、通知停用、TX 邊界。
6. 看離線版本：profile、scope、artifact、DB、cache 保持一致，避免混版。

本次為文件與原始碼追蹤；沒有操作使用者 IndexedDB、實際抽卡、發通知、送回報或部署。驗證結果與完整輸出存於 `functional-logic-review-validation-2026-10-05.log`。runtime 沒有修改，沒有重跑全站 runtime/browser 測試；函式索引與圖中引用另做靜態驗證。
