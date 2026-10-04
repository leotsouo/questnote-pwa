# Guided Onboarding · V3.6.0

本次由 V3.5.24 升為 V3.6.0，將首次教學改為在真實任務介面操作一次。來源分支為 `codex/guided-onboarding`，基於 `origin/main` 的 `43fb14e20fc3fe682daa9988f87ebc27884bc3a6`。來源實作、HTTPS 預覽與正式部署是不同狀態；此文件不代表發布。

## 真實核心循環

相遇 → 看見今日 → 點真正的「新增任務」→ 在真正 editor 建立已填好的練習 → 看見同一筆任務 → 點真正完成按鈕 → 真實小獎勵 → 夥伴回應 → 自由新增自己的任務。

每一步等待使用者操作。三章「相遇／動手／一起成長」提供進度；沒有自動倒數換頁。資訊步驟可以確認，建立與完成步驟必須由服務層的實際寫入推進。首輪不要求鍵盤輸入，也不強迫召喚、圖鑑或探險。完成後保留文字「新增任務」。從今日開 editor，普通新任務也預設加入今天；今天開關保持可見，其他分類、日期、子任務可展開。

## 狀態與資料

`guidedOnboardingCore.js` 是無 DOM 的純狀態機。`guidedOnboardingService.js` 是唯一教學資料寫入層。`guidedOnboardingController.js` 負責 coach、focus、spotlight、navigation repair 與 contextual hints；它呼叫實際 UI handlers，沒有替代的假 editor。

`meta.guidedOnboarding` 保存 `schemaVersion: 1`、`onboardingVersion: 1`、status、step、mode、runId、taskId、reward、`onboardingCompletedVersion`、`firstRewardClaimedAt` 及已看過的提示。status 為 active/completed/skipped/existing。未來版本遷移應明確辨認已完成版本，不能直接強制舊使用者重做。

| checkpoint | 前進條件 |
| --- | --- |
| WELCOME | 確認後在同一交易給首位真實夥伴 |
| MEET_COMPANION | 使用者確認 |
| HOME_INTRO | 使用者確認今日列表 |
| OPEN_CREATE_QUEST | 真實 editor-opened |
| CREATE_TUTORIAL_QUEST | task 與 checkpoint 成功提交 |
| RETURN_HOME | 使用者找到剛建立的同一筆 task |
| COMPLETE_TUTORIAL_QUEST | task、receipt、wallet、collection 成功提交 |
| REWARD_REVEAL | 使用者確認獎勵 |
| COMPANION_REACTION | 使用者確認夥伴反應 |
| FINISH | 明確 finish；可開真正的空白 editor 或回今日 |

練習任務有 `isTutorial: true`、`tutorialRunId`、`tutorialMode`，首輪 ID 固定 `tutorial:first`，重播為 `tutorial:replay-<UUID>`。其他欄位沿用現有 task schema，不建立平行任務模型。任務建立仍經 `taskService.createTask`，由真實表單 submit 觸發；預填並不代表預先建立。

## 經濟與正式進度

首次相遇給現有 N 夥伴 `pet_n01`（灰影幼狼），使用標準 collection record；首輪完成給星塵 20、能量 1、目前陪伴親密度 5。這些是明確的小額 onboarding 經濟輸入，collection 本身與其正常收藏里程碑仍是真實資料。

教學 task 不計正式今日完成、任務統計、完成／連續完成成就、每日／每週任務挑戰、羈絆約定來源、覺醒進度、提醒摘要或逾期計數。首輪練習有明確標籤並保留在 task/backup 中；它不會因為完成被撤銷後再次領獎。重播 task 只在目前練習中可見，不改 wallet、collection、bond 或正式統計，也不進備份；歷史重播 record 留在本地供恢復與防重，後續可增加保留數量政策。

`claimTaskReward` 與真實完成操作都進入 `claimTutorialReward`。同一個 IndexedDB readwrite 交易提交 task 完成、教學 checkpoint、receipt、wallet、collection。固定 task ID + rewardClaimed + profile 的 firstRewardClaimedAt 保護重試。交易 abort 不留下已完成但未領獎的半成品；同時重試由 IndexedDB 交易序列化。普通 task pipeline 維持原有行為。

## 恢復、遷移與退出

首次資格在普通初始化建立 wallet/preferences 之前讀五個 stores 快照。任一既有資料或任意 legacy `onboardingV1` record（包括 active/paused/dismissed/completed）都視為 existing，不重新強制。還原資料也不強制；完整資料 reset 是新的本地 profile。

重開從 checkpoint 恢復。task/receipt 是提交證據；已建立 task 可以修復到 RETURN_HOME，已領 reward 可以修復到 REWARD_REVEAL；遺失待完成 task 回到新增步驟。跨日的未完成練習重新排入今天，不另外建立一筆。回到前景、popstate、view change 會修復首頁／editor；不存在目標時提供「重新開啟這一步」。

lock 只允許目前真正控制項與教學 controls，其他 DOM 分支 inert，capture click 阻止不符步驟操作並以 polite live region 提示。Tab 留在可用 controls、Escape 開／關 skip confirmation；不阻止 OS 離開 App。spotlight 跟隨 scroll、resize、visual viewport 與產品 modal 的過渡，不靠固定螢幕座標。

Skip 是小文字入口 → 說明確認 → 長按 1.5 秒或普通「確認略過」按鈕。pointerup/cancel/失去 capture/移出/切背景會取消長按。鍵盤、螢幕閱讀器與動作不便使用者使用相同確認畫面的普通按鈕。Skip 儲存失敗仍釋放本次 lock，以可用的 sessionStorage 留待重開重試；若該儲存也不可用，下一次可能回到已保存 checkpoint，但仍可退出。

完成／略過後，在「更多 → 使用教學」重播；取消完整強制教學不等於取消輕量提示。第一次真正遇到召喚、圖鑑、探險、工坊、習慣、設定與已擁有夥伴的養成頁時，顯示可自行關閉的小提醒。`guidedEducation.js` 管理簡短內容；`hintsAcknowledged` 只在明確按「我知道了」後保存，沒有閱讀倒數。離開再回來會保留未讀提醒，資料刷新也不會丟失；不搶焦點、不鎖操作、不消耗資源。教學中心可再次讀同一內容，並連到既有詳細章節。

完成首輪後不再顯示新增任務提示，讓下一個自己的任務可以無提示操作；略過者首次打開真實空白 editor 仍有可關閉的操作提醒。V3.7.0 已接上正式相遇碎片／指定邀請與親密度養成，教學不要求額外召喚或花費。提示不收集 Quest 內容，也沒有新增遠端 analytics 或 AI API。

每次確認會攜帶當時的 step/runId，服務層拒絕舊畫面的連點／跨視窗請求。foreground 重新讀 checkpoint 與實際資料；若略過持續保存失敗，仍維持本次已解鎖的退出選擇，不能被磁碟上的舊進度重鎖。重播開始在同一交易清理歷史 replay 任務與未完成的練習任務，保留已完成首輪收據及所有正式任務；兩個視窗同時重播會繼續同一 run。不同 run 的未領練習不能更動資源。

## 可及性與驗收邊界

coach 使用 theme token、文字標籤、語意章節、可捲動內容、48px 操作與 visible focus。editor 保留可讀的真實表單，初次不叫出鍵盤。減少動態與 forced-colors 有對應樣式；viewport 開放 pinch zoom。200% 字體時長卡可捲動，Tab focus 會帶出按鈕。

瀏覽器寬度、native IndexedDB 交易及 DOM/focus 機制測試不能等同於 iOS Dynamic Type、VoiceOver、TalkBack、Switch Control 或實機 haptics 驗收。此 repo 只有 PWA，沒有 Xcode／Gradle／Capacitor native 專案。沒有憑空加震動；native adapter 若另建，需另測。

## 重跑

Node 24：`npm ci`、`npm test`、`npm run test:guided`。語法檢查所有修改的 JS。

本地專用 server：`node devtools/onboarding-browser-server.mjs 4186`，開 `/devtools/guided-onboarding-browser-test.html`。它在 index 載入前隔離到隨機 synthetic DB，拒絕未知 DB；測試不進正式 backend。完整驗收操作真正 App 和 native IndexedDB。checkpoint 選單是人工檢視 fixture，不當成行為證據。

離線專用 server：`node devtools/onboarding-browser-server.mjs 4187 --workshop-offline`，同一頁按離線流程。只在使用者的 synthetic loopback scope 安裝真正 SW，緩存後讓 server 的 App 路徑回 503，再逐 checkpoint 重開；每次重跑要重新啟動 server。必須在可用 Service Worker 的瀏覽器完成，不能把註冊逾時稱為成功。

結果、14 張指定尺寸畫面、320px 額外畫面與真人測試腳本見 [驗收報告](../reports/guided-onboarding/acceptance.md)。

真人工具：專用 server 下開 `/devtools/guided-usability.html`。先完成真正引導，再由主持人開始獨立操作。它回到今日列表、關閉已開 editor，只給任務句；觀察找到新增、提交自己的任務、回今日、完成的時間，以及主持人記錄的協助次數。無協助與四項里程碑都成立才記為獨立完成。結果只在記憶體，可自行複製匿名 JSON；沒有保存／上傳任務文字或 task ID。測試頁重載會丟失本頁觀察結果，請先整理到本機私人紀錄。自動演練必須選 `automation-fixture`，輸出 `humanEvidence: false`，不算真人學習證據。
