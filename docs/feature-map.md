# 功能地圖

把使用者口中的畫面對到程式模組。查表用；以 `index.html`、`src/ui.js`、`src/uiSourceParts.js` 與 `src/ui/*.js` 為準。`devtools/feature-map.test.mjs` 檢查：`UI_SOURCE_PARTS` 每個檔都要出現在這裡，這裡提到的 `src/…js` 與 `devtools/…` 檔都要存在。

導覽規則：底部選單 `.bottom-nav .nav-item[data-view="…"]` 與「更多」頁的 `[data-goto="…"]` 都呼叫 `switchView(name)`（`src/ui.js`），它把 `#view-<name>` 加上 `.active`。易讀模式下召喚／圖鑑／探險選單與 `.normal-only` 元素隱藏。

## 畫面與模組對照

| 使用者會怎麼叫 | 畫面／區塊 | 模組（相關 service） | 怎麼進去 | 對應測試 |
|---|---|---|---|---|
| 任務、首頁、今日／全部／智慧 | 任務頁的任務清單 `#task-view-content`、今日計畫 `#today-plan-summary`、習慣捷徑 `#habit-summary` | `src/ui/taskListView.js`（`src/taskFilterService.js`、`src/habitService.js`、`src/rewardService.js`） | 底部「任務」`[data-view="tasks"]`；分頁 `#task-view-tabs [data-task-view]` | `devtools/product-flow-browser-test.js`、`devtools/today-habits-browser-test.mjs` |
| 新增任務、＋、編輯任務 | 任務表單 `#task-form`（在 `#modal-overlay` 內） | `src/ui/taskFormView.js`（`src/taskService.js`） | 任務頁 `#btn-add-task`（＋） | `devtools/task-form-layout-browser-test.mjs`、`devtools/add-task-layout-browser-test.mjs` |
| 語音新增、麥克風、說一件事 | 快速語音視窗 `#quick-voice`（在 `#modal-overlay` 內；存檔後的「復原／再說一件」列 `[data-qv]`） | `src/ui/quickVoiceView.js`（`src/quickVoice.js`、`src/taskService.js`） | 任務頁 `#btn-voice-task` | `devtools/quick-voice.test.mjs` |
| 陪伴、首頁那隻寵物、餵食 | 首頁陪伴卡 `#companion-section`、餵食視窗 | `src/ui/companionView.js`（`src/companionService.js`、`src/collectionService.js`、`src/companionDialogueService.js`） | 任務頁往下；餵食 `[data-action="companion-feed"]` | `devtools/companion-feeding-browser-test.mjs` |
| 每日祝福、簽到 | 首頁 `#homeDailyBlessingContainer`；召喚頁入口 `#gacha-daily-blessing-entry` | `src/ui/dailyBlessingView.js`（`src/dailyCheckInService.js`） | 任務頁 `#home-hub [data-hub="blessing"]`；或「更多」`[data-scroll-daily-blessing]` | `devtools/reward-claim-browser-test.mjs` |
| 輪盤、幸運轉盤、每日幸運轉盤 | 轉盤視窗（`#modal-overlay` 內 `#daily-wheel-rotor`） | `src/ui/dailyWheelView.js`（畫面）＋ `src/ui/dailyBlessingView.js`（`openDailyWheelModal`，`src/dailyCheckInService.js`） | 展開每日祝福後點 `[data-action="daily-open-wheel"]`「幸運轉盤」 | `devtools/daily-wheel-view.test.mjs` |
| 冒險任務、每日／每週挑戰 | 首頁 `#quest-panel` | `src/ui/dailyBlessingView.js`（`src/questService.js`） | 任務頁 `#home-hub [data-hub="quest"]` | `devtools/reward-claim-browser-test.mjs` |
| 星辰賭場（任務頁右上骰子圖示；也可能被叫「輪盤」） | 賽跑視窗 `#daily-race-panel`（在 `#modal-overlay` 內） | 不在 `src/ui/`：`src/dailyRaceController.js` | 任務頁右上 `.page-header--tasks [data-action="daily-open-race"]` | `devtools/daily-race-browser-test.mjs`、`devtools/daily-race.test.mjs` |
| 信箱、📮、公告、補償、禮物 | 信箱視窗 `#global-mailbox-modal` | `src/ui/mailboxView.js`（`src/mailboxService.js`） | 任務頁右上 `#btn-global-mailbox`（`[data-action="open-mailbox"]`）；易讀模式 `[data-senior-action="mailbox"]` | `devtools/mailbox-layout-browser-test.mjs`、`devtools/mailbox-fragments.test.mjs` |
| 上週回顧卡（週一首頁） | 首頁 `#weekly-review-card` | `src/ui/weeklyReviewView.js`（`src/weeklyReviewService.js`） | 卡片上 `[data-action="open-weekly-review"]`「看回顧」 | `devtools/weekly-review.test.mjs` |
| 每週回顧 | 每週回顧頁 `#view-weekly-review` | `src/ui/weeklyReviewView.js`（`src/weeklyReviewService.js`） | 「更多」`[data-goto="weekly-review"]` | `devtools/weekly-review.test.mjs` |
| 召喚、抽卡、卡池、十連 | 召喚頁 `#view-gacha`（`#gacha-panel`、`#btn-pull`、`#btn-pull-ten`、`#gacha-pool-select`） | `src/ui/gachaView.js`（`src/gachaService.js`、`src/summonRevealService.js`、`src/poolDebutService.js`） | 底部「召喚」`[data-view="gacha"]` | `devtools/default-summon-browser-test.mjs`、`devtools/gacha-transaction.test.mjs` |
| 羈絆覺醒（召喚頁按鈕） | `#gacha-pet-awakening-guide` | `src/ui/gachaView.js`（`toggleAwakeningGuide`） | 召喚頁 `#gacha-pet-awakening-toggle` | `devtools/awakening-guide-browser-test.mjs` |
| 圖鑑、收藏、寵物列表 | 圖鑑頁 `#view-collection`（`#collection-grid`、篩選 `#collection-filters`、`#collection-series-filters`） | `src/ui/collectionView.js`（`src/collectionService.js`、`src/collectionMilestoneService.js`） | 底部「圖鑑」`[data-view="collection"]` | `devtools/collection-filter-browser-test.mjs`、`devtools/collection-swipe-browser-test.mjs` |
| 寵物詳情、暱稱、設為陪伴 | 寵物詳情視窗（`#modal-overlay`） | `src/ui/collectionView.js`（`openPetDetailModal`，`src/loreService.js`） | 圖鑑卡片 `[data-action="view-detail"]`（點名稱） | 未確認 |
| 看原圖 | 原圖檢視 `#pet-image-viewer` | `src/ui/modalHost.js`（`openPetImageViewer`） | 圖鑑卡片 `[data-action="view-pet-image"]`（點圖片） | 未確認 |
| 探險、派遣、遠征 | 探險頁 `#view-expedition`（`#expedition-areas`、`#expedition-active`、`#expedition-camp`、`#exploration-panel`） | `src/ui/expeditionView.js`（`src/expeditionService.js`、`src/explorationService.js`、`src/campService.js`） | 底部「探險」`[data-view="expedition"]` | `devtools/expedition-recommendations-browser-test.mjs`、`devtools/expedition-art.test.mjs` |
| 派遣視窗 | `#expedition-dispatch-modal` | `src/ui/expeditionView.js`（`openExpeditionDispatchModal`） | 探險地區卡 `[data-action="open-dispatch"]` | `devtools/expedition-recommendations-browser-test.mjs` |
| 更多（底部選單最右） | 更多頁 `#view-more`（`.more-menu`） | `src/ui.js`（無獨立模組） | 底部「更多」`[data-view="more"]` | 未確認 |
| 習慣 | 習慣頁 `#view-habits`（`#habit-view-content`）；新增習慣 `#habit-form` | `src/ui/habitsView.js`（`src/habitService.js`） | 「更多」`[data-goto="habits"]`；首頁 `#habit-summary`；新增 `#btn-add-habit` | `devtools/today-habits-browser-test.mjs`、`devtools/today-habits.test.mjs` |
| 成就、稱號、可領成就 | 成就頁 `#view-achievements`（`#achievement-list`、`#achievement-filters`）；稱號管理視窗 | `src/ui/achievementsView.js`（`src/achievementService.js`） | 「更多」`[data-goto="achievements"]`；首頁 `[data-hub="titles"]` → `#achievement-strip`；稱號管理 `[data-action="open-titles"]` | `devtools/reward-claim-browser-test.mjs` |
| 工坊、材料工坊、送禮 | 工坊頁 `#view-workshop`（`#workshop-content`，分頁 `[data-workshop-tab]`：材料／製作／贈送） | `src/ui/workshopView.js`（`src/workshopService.js`） | 「更多」`[data-goto="workshop"]` | `devtools/workshop-gifts-browser-test.js`、`devtools/workshop-gifts.test.mjs` |
| 冒險手冊 | 手冊頁 `#view-handbook`（`#handbook-content`） | `src/ui/handbookView.js`（`src/adventureHandbookService.js`） | 「更多」`[data-goto="handbook"]` | `devtools/senior-mode-browser-test.mjs`（僅涵蓋部分） |
| 設定、備份、匯入、重置、版本 | 設定頁 `#view-settings`（備份 `.settings-backup`、`#import-file-input`、`#btn-reset`、`[data-version-info]`） | `src/ui/settingsView.js`（`src/backupService.js`、`src/healthCheckService.js`） | 「更多」`[data-goto="settings"]`；易讀模式 `[data-senior-action="settings"]` | `devtools/backup-safety.test.mjs` |
| 搬到 iPhone App | 設定頁卡片 `#web-migration-card`（非 iOS 版）；iOS 首次開啟的選擇畫面 | `src/ui/webMigrationView.js`（`src/backupService.js`） | 設定頁內（由 `initWebMigrationCard` 插入） | `devtools/web-to-app-migration.test.mjs` |
| 提醒 | 設定頁 `.settings-reminders` | 不在 `src/ui/`：`src/reminderController.js` | 設定頁內 | `devtools/reminders-browser-test.mjs` |
| 易讀模式 | 設定頁 `#reading-mode-toggle`；易讀首頁 `#senior-home-intro` | 不在 `src/ui/`：`src/seniorModeController.js` | 設定頁開關 | `devtools/senior-mode-browser-test.mjs` |
| 意見回報、問題回報 | 回報頁 `#view-feedback`（`#feedback-form`） | 不在 `src/ui/`：`src/feedbackController.js`（`src/feedbackService.js`） | 「更多」→「教學與支援」`.more-support` →`[data-feedback-open]` | `devtools/feedback.test.mjs` |
| 使用教學 | 教學頁 `#view-guide` | `src/ui.js`（`switchView('guide')`） | 「更多」→「教學與支援」→`[data-goto="guide"]` | `devtools/guided-onboarding-browser-test.js` |
| 分享 QuestNote | 分享頁 `#view-share` | `src/ui.js`（`src/shareService.js`） | 「更多」→「教學與支援」→`[data-goto="share"]` | 未確認 |
| 跳出來的視窗、確認框 | 共用視窗 `#modal-overlay`（`#modal-body`）、確認框 `#confirm-ok`／`#confirm-cancel` | `src/ui/modalHost.js` | 由各畫面呼叫 `openModal`／`openConfirmModal` | `devtools/confirm-modal-once.test.mjs` |
| （整體導覽、事件綁定） | 所有 `.view` | `src/ui.js`（`initUI`、`switchView`） | — | `devtools/ui-split-references.test.mjs` |

## 主要畫面與進入方式

給自動巡覽用，`devtools/layout-tour-browser-test.mjs` 每次執行都會實際走過這張表。起點都是任務頁；「更多」底下的畫面先點 `.nav-item[data-view="more"]`。進入後根容器會有 `.active`。

| 畫面 | 導覽步驟 | 根容器 |
|---|---|---|
| 任務 | `.nav-item[data-view="tasks"]` | `#view-tasks` |
| 召喚 | `.nav-item[data-view="gacha"]` | `#view-gacha` |
| 圖鑑 | `.nav-item[data-view="collection"]` | `#view-collection` |
| 探險 | `.nav-item[data-view="expedition"]` | `#view-expedition` |
| 更多 | `.nav-item[data-view="more"]` | `#view-more` |
| 習慣 | 更多 → `.more-menu-item[data-goto="habits"]` | `#view-habits` |
| 成就 | 更多 → `.more-menu-item[data-goto="achievements"]` | `#view-achievements` |
| 材料工坊 | 更多 → `.more-menu-item[data-goto="workshop"]` | `#view-workshop` |
| 冒險手冊 | 更多 → `.more-menu-item[data-goto="handbook"]` | `#view-handbook` |
| 每週回顧 | 更多 → `.more-menu-item[data-goto="weekly-review"]` | `#view-weekly-review` |
| 設定 | 更多 → `.more-menu-item[data-goto="settings"]` | `#view-settings` |
| 使用教學 | 更多 → 展開 `.more-support summary` → `.more-menu-item[data-goto="guide"]` | `#view-guide` |
| 意見與問題回報 | 更多 → 展開 `.more-support summary` → `[data-feedback-open]` | `#view-feedback` |
| 分享 QuestNote | 更多 → 展開 `.more-support summary` → `.more-menu-item[data-goto="share"]` | `#view-share` |
| 信箱（視窗） | 任務頁 `#btn-global-mailbox` | `#global-mailbox-modal` |
| 新增任務（視窗） | 任務頁 `#view-tasks .twilight-add-task`（`#btn-add-task` 浮動鈕在所有主題都被 `theme-system.css` 隱藏） | `#modal-overlay #task-form` |
| 星辰賭場（視窗） | 任務頁 `.page-header--tasks [data-action="daily-open-race"]` | `#daily-race-panel` |

返回：子頁的 `.page-back-btn[data-goto="more"]`。
