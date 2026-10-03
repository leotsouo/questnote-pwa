# QuestNote Guided Onboarding · V3.6.0 驗收

2026-10-03。本次為 V3.5.24 → **V3.6.0**。實作在 `codex/guided-onboarding`，基於 `43fb14e20fc3fe682daa9988f87ebc27884bc3a6`；保留原根目錄草稿。完成來源實作與本地驗收，未合併 main、未部署 HTTPS 預覽或正式站。

## 1. 舊 onboarding 最大問題

實際打開最新來源的空白 synthetic profile：歡迎後進入「1/5」功能導覽，可直接宣稱已有任務並往下看；首次首頁還在等待夥伴。打開真正 editor 後 coach 消失、內容空白，使用者仍要自己猜如何建立並排入今日。這能介紹入口，不能證明建立／完成技能。另把召喚、圖鑑、探險放在核心操作之前，增加首輪負擔。

## 2. 新 onboarding 核心 Product Idea

「夥伴陪你親手完成一個小任務。」建立與完成採真正 UI 和 service，不以 Next 或影片替代。章節為相遇／動手／一起成長；最後接到自己的空白任務。

## 3. 完整 Guided Flow

Welcome → 首位真實夥伴 → 今日列表 → 真正新增按鈕 → 預填的真實 editor → submit → 同一筆今日練習 → 真正完成按鈕 → 小額真實 reward → 夥伴回應 → finish。主 CTA 開自己的 editor；回今日也可選。沒有自動倒數或強迫輸入。

## 4. Tutorial Quest 如何建立

`taskService.createTask` 經真實表單 submit，進入同一 native IndexedDB 交易儲存 task 與 checkpoint。首輪 ID 為 `tutorial:first`；點開表單及預填本身不寫 task。相同 ID 的重試回傳原 task。從今日開普通 editor 也預設今天，且今天開關保持可見，延續已學到的操作。

## 5. 避免污染正式資料

標記 isTutorial/runId/mode。排除正式任務／今日完成統計、任務完成與連續成就、每日每週挑戰、羈絆約定、覺醒來源及提醒。首輪練習保留明確標籤與備份；重播 task 隱藏於正式列表及備份。首位夥伴與 20 星塵、1 能量、5 親密度是明確設計的真實新手輸入，收藏本身仍可影響正常收藏里程碑；不能聲稱完全零經濟影響。

## 6. Companion 如何參與

Welcome 確認後給現有 `pet_n01` 灰影幼狼，使用真實 collection schema。首頁改為該陪伴與既有藝術資產。完成親密度從 0 到 5，收據與回應接著使用者操作；不加長篇故事、付費抽卡或額外完成大獎。

## 7. Guided Lock 如何運作

不相關 DOM 分支 inert，capture click 只允許目前實際控制與 coach。點錯以 polite 提示「先完成這一步」。Tab 保持在可用 controls，Escape 開／關退出確認。spotlight 追蹤 layout、scroll、visual viewport 與 modal 過渡；目標缺失有重新開啟控制。資料錯誤可重試，確認 skip 即可離開，沒有不可退出的 scrim。

## 8. Skip 如何防誤觸

小文字入口 → 確認說明 → 1.5 秒長按。短按、移出、放手、取消 pointer、背景切換取消長按。持久化失敗仍釋放本次 lock，暫存退出選擇並在重開重試。不是一次點擊直接略過。

## 9. Accessibility 的 Skip Alternative

確認畫面同時有普通「確認略過教學」按鈕，鍵盤／assistive 使用者不必長按。[實際 CUA 鍵盤驗證](manual-keyboard-result.json)：Enter 開真正 editor、Escape 開確認、Tab 到下一項、Enter 確認；coach 消失且 guided-active 解鎖。步驟說明以 aria-describedby 連到真正按鈕，離開時恢復原描述。全流程 controls 至少 48px；章節、標籤、focus 與動態文字不只靠顏色。VoiceOver／TalkBack／Switch Control 尚未實機驗收。

## 10. Tutorial State Machine

十個 checkpoint：WELCOME、MEET_COMPANION、HOME_INTRO、OPEN_CREATE_QUEST、CREATE_TUTORIAL_QUEST、RETURN_HOME、COMPLETE_TUTORIAL_QUEST、REWARD_REVEAL、COMPANION_REACTION、FINISH。版本 1，terminal status completed/skipped/existing。建立與完成事件必須匹配目前 run/task；資訊確認不能跳過實作。完成保存 onboardingCompletedVersion。

## 11. Resume / Recovery

Welcome、首頁、新增、editor、已建立、完成、reward、reaction、finish 均經重載驗證。已提交 task/receipt 修復 checkpoint；task 遺失回新增，跨日未完成 task 重新排今天。建立交易 abort 留在可重試 editor。完成交易 abort 同時撤回 task/checkpoint/wallet/bond；重試只發一次。重複及併行建立／領獎驗證通過。

## 12. Replay Tutorial

更多 → 使用教學可再次練習；active 狀態繼續原 checkpoint。新 replay UUID 使用相同真實操作，reward 明確標示練習展示，wallet/bond/collection/正式進度不變。開始重播會在同一交易清理歷史 replay 任務與未完成練習，保留首輪完成收據和所有正式任務；交易失敗則一起 rollback。兩個視窗同時開始會繼續同一 run；不同 run 的未領練習不能改動資源。

後續教學改為真正使用到召喚、圖鑑、探險、工坊、習慣、設定、夥伴養成時出現可關閉的小提醒，不設自動消失時間。只有明確按「我知道了」才保存已讀；離開、重開或資料刷新不會把未讀提醒當作看懂。教學中心可重讀並接到詳細章節。略過者在空白 editor 有提示；完成首輪者不再被提示新增／完成，以保留獨立操作的機會。現版沒有指定邀請／相遇碎片功能，不建立假入口。

## 13. Existing User Migration

普通資料初始化之前辨認五 stores 快照。任何已有資料或 legacy active/paused/dismissed/completed 都直接進 App；無資料且無 legacy 才強制。四種 legacy 狀態 native DB 驗證通過。restore 視為既有使用者；完整資料 reset 才是新 profile。

## 14. Before / After

| 面向 | Before（實際來源 audit） | After |
| --- | --- | --- |
| 首輪目標 | 入口與多功能導覽 | 一次真實新增／完成 |
| 初始夥伴 | 等待第一次相遇 | 下一步建立真實陪伴 |
| editor | 空白，coach 消失 | 真實預填、真正 submit spotlight |
| 是否學會 | 可說已有任務而跳過 | 必須有匹配 task 與 completion receipt |
| 離開重開 | 以舊導覽進度為主 | 交易證據與十 checkpoint |
| 下一個任務 | 使用者仍須猜排程 | 今日預設、可見今天開關、文字新增／完成 |

## 15. Screenshot Matrix

[可點開完整圖庫](screenshots.html)。14 張 393×852 + 1 張 320×852；均為瀏覽器真實 App raster，從完整 screenshot 裁出 iframe，沒有重畫 UI。checkpoint fixture 僅在 guard 過的 synthetic profile 注入，不當作真實流程行為證據。預填表單與 Create CTA 是同一真正畫面的兩次擷取。

本輪另補四張：[圖鑑漸進提示](screenshots/16-collection-education.jpg)、[教學中心重讀](screenshots/17-education-help.jpg)、[略過後真實空白 editor](screenshots/18-skipped-editor.jpg)、[320px 圖鑑提示](screenshots/19-education-320.jpg)。新增截圖座標與尺寸另存 [manifest](education-screenshot-manifest.json)。[人工 DOM 檢查](education-manual-result.json) 確認重播入口文案、8 個教學說明入口皆 48px，320px 提示無橫向溢出且兩個按鈕皆 48px。

養成視窗的主要標題保留「灰影幼狼」，小提醒位於名稱之後；從視窗開教學中心時，等關閉視窗的焦點還原完成，再將焦點放到對應說明。CUA 實際鍵盤 Enter 驗證 `petCareHelpFocused: true`；這是瀏覽器焦點證據，仍不能代替手機螢幕閱讀器驗收。

| # | 畫面 | 檔案 |
| --- | --- | --- |
| 1 | Welcome | [畫面](screenshots/01-welcome.jpg) |
| 2 | Meet Companion | [畫面](screenshots/02-meet-companion.jpg) |
| 3 | Home Spotlight | [畫面](screenshots/03-home-spotlight.jpg) |
| 4 | Add Quest Spotlight | [畫面](screenshots/04-add-spotlight.jpg) |
| 5 | Prefilled Tutorial Quest | [畫面](screenshots/05-prefilled-editor.jpg) |
| 6 | Create CTA | [畫面](screenshots/06-create-cta.jpg) |
| 7 | Home with Tutorial Quest | [畫面](screenshots/07-home-with-tutorial.jpg) |
| 8 | Complete Spotlight | [畫面](screenshots/08-complete-spotlight.jpg) |
| 9 | Reward | [畫面](screenshots/09-reward.jpg) |
| 10 | Companion Reaction | [畫面](screenshots/10-companion-reaction.jpg) |
| 11 | Finish | [畫面](screenshots/11-finish.jpg) |
| 12 | Skip Confirmation | [畫面](screenshots/12-skip-confirmation.jpg) |
| 13 | Large Text | [畫面](screenshots/13-large-text.jpg) |
| 14 | Reduce Motion | [畫面](screenshots/14-reduce-motion.jpg) |
| 15 | 320px 真實 editor | [畫面](screenshots/15-narrow-320.jpg) |

## 16. Usability Test Plan

尚未招募或執行真人測試。建議 6 位未用過 QuestNote 的成年人，至少 3 位較少使用複雜 App，包含至少 2 位年長使用者；用本人熟悉的手機與字體設定。主持人不指出按鈕、不示範、不協助填寫。開始只說：「請照你平常的方式試用，不用急。」

教學結束後只說：「現在請新增一個你自己的任務，做完後也在 App 裡記錄完成。」靜觀直到完成、放棄或需協助；協助必須記錄且該項不算獨立成功。觀察是否獨立找到新增、輸入、建立、回今日、完成、理解 reward；記錄協助數、誤觸／恢復、卡住步驟與時間。不要以喜好分數或 onboarding completion rate 代替。

預定通過門檻：6/6 無提示完成第二任務，沒有 trapped lock；任何求助都先修設計，再以新的未接觸者重測。這是預定驗收標準，不是已取得的結果。原型速度不能代替真人閱讀時間。

已提供 [可執行的真人觀察工具](../../devtools/guided-usability.html)（必須經專用 server 開啟）：首輪完成後從今日列表開始，不自動建立第二任務，只提供任務句。工具記錄找到新增、提交、回今日、完成與協助次數；結果留在本頁記憶體，主持人自行複製匿名 JSON，不保存或上傳 Quest 內容／task ID。重載前須先整理結果到本機私人紀錄。

[工具演練結果](usability-tool-fixture.json) 證明事件與里程碑能記錄，明確為 `automation-fixture`、`humanEvidence: false`。它不是受測者，也不能填補真人樣本數。

## 17. Apple Design Awards Review

依需求列出的評審面向自我審查，不打分、不聲稱得獎資格。

| 面向 | Strength | Weakness | Remaining Risk |
| --- | --- | --- | --- |
| Interaction | 真正新增／完成，交易成功才前進 | 仍是 PWA，平台返回語意較薄 | iOS gesture／Android back 實機 |
| Visuals & Graphics | 既有場景、夥伴與 theme token，溫和 scrim | 小螢幕長卡會遮較多背景 | 高對比、戶外亮度、各裝置字體 |
| Delight & Fun | 首次完成與真實親密度連接 | 回應文案簡短、表情種類有限 | 真人是否形成記憶仍未知 |
| Inclusivity | 48px、鍵盤替代、200% 捲動、減少動態 | 200% 長說明需要捲動，缺 native 字體測試 | VoiceOver／TalkBack／Switch Control |

## 18. iF Review

| 面向 | Strength | Weakness | Remaining Risk |
| --- | --- | --- | --- |
| Idea | 直接練習解決只看介紹的落差 | 強制可能令已有經驗者想退出 | 首輪真人退出與卡點 |
| Form | 純熟的既有陪伴視覺、短句 | overlay 仍佔據有限可用高度 | 320px＋系統最大字體 |
| Function | 真實 task/reward、可恢復、防重 | 遠端錯誤資訊沒有新增 analytics | 實機離線、磁碟滿、多視窗 |
| Differentiation | 生活任務與真實陪伴成長相接 | 練習任務是固定範例 | 是否理解任務如何對應生活 |
| Sustainability | 純 core/service/controller、重用 editor、交易清理重播練習 | 真正 selector 仍依賴產品 DOM | 改 UI 時需保持 acceptance harness |

## 19. Red Dot Review

| 面向 | Strength | Weakness | Remaining Risk |
| --- | --- | --- | --- |
| Idea | 陪使用者完成第一個 Quest | 必須確認多個閱讀 checkpoint | 幾分鐘目標需真人計時 |
| Form | companion、spotlight、語意 progress 一致 | 缺裝置原生 haptic adapter | 裝置安全區與輔助技術 |
| Impact | 教學後可用同一路徑建第二任務 | 自動化不能證明學習 | 必須完成無提示真人第二任務測試 |

## 20. Automated Test Result

- [最終瀏覽器結果](browser-result.json)：**21/21 passed**。真正 App、表單、native IndexedDB；覆蓋 abort/重試、防重、replay、四種 migration、skip、320px 三主題、大字／減少動態、200% 完整流程與單獨第二正式任務；新增舊畫面連點、跨日、重播清理／交易 rollback／不同 run 領獎拒絕、慢閱讀提示與重看、略過後空白 editor。持續儲存失敗與 foreground 也維持解鎖。
- [本輪完整 Node 結果](npm-test-completion.log)：**300 + 14 + 12 = 326/326 passed**，reveal-flow assertions 通過。執行 package.json 的相同所有測試命令，對 Node test 加 `--test-concurrency=1`，處理本機低磁碟空間。包含 8 個 guided core／漸進教育檢查。
- [本輪語法檢查](syntax-completion-check.txt)：**24/24 passed**。
- 本輪補強後的 [focused tests](focused-completion-test.log)：**34/34 passed**，包含舊教學章節、舊畫面操作防重、讀取確認與無提示第二任務、首頁旅程排除練習及三主題回歸。
- [原始並行結果](npm-test.log)：292/298；6 個失敗來自 ENOSPC（release fixture 複製滿磁碟，包括父測試失敗），保留原始記錄；序列重跑全部通過。
- [本輪 release dry-run](artifact-completion-dry-run.log)：612 個來源檔通過組裝規劃；新 modules/style 在 precache closure。dryRun=true、releaseReady=false、liveBaseline=UNKNOWN；沒有生成可發布產物、沒有部署。

## 21. Simulator / Native Test Result

此 repo 沒有 Xcode、Gradle 或 Capacitor native project；沒有 simulator 或 native binary build，不能把 PWA 語法／瀏覽器測試稱為 native build。實際鍵盤 Escape/Tab/Enter 已驗證。離線專用 harness 已實作，但此回合唯一可用的 IAB 在 secure loopback 的 Service Worker 註冊逾時，Chrome surface 不可用，因此 **native Service Worker 離線全流程未驗證**；[原始限制記錄](offline-browser-result.json)。既有 SW/release 回歸與 closure 檢查通過，不能代替 native browser 離線驗收。

## 22. Physical Device 還需要驗證什麼

iPhone Safari／主畫面 PWA 與 Android Chrome：真正安裝、首次慢網路、已緩存後飛航模式逐步重開、force-kill／跨日／多視窗、storage quota、瀏覽器 back／iOS 返回手勢、安全區、軟鍵盤開自己的任務時視窗變化、pinch zoom／系統最大文字、VoiceOver／TalkBack／Switch Control、觸控長按取消。先用隔離 preview DB/worker scope，並依第 16 點執行無提示真人第二任務測試，才可宣稱學習轉移成立。

## 使用者真的會下一個 Quest 的證據

目前有 **Guided Practice**（建立／完成步驟必須實際提交）、**Real Interaction**（真正產品表單與完成按鈕、真正任務與獎勵交易），以及 **Learning Transfer 的機制證據**（教學結束後，自動化成功走同一路徑建立並完成另一筆無 tutorial 標記的正式任務）。這證明產品允許延續所學、沒有 coach 才能操作的隱藏限制。

**目前沒有真人 Learning Transfer 證據**。自動化知道按鈕在哪裡，不能代表一位不熟悉手機操作的人已學會。真正的結論必須來自第 16 點：教學後只給一句任務，受測者無提示完成新增→建立→回今日→完成。這項結果尚未取得，不能用「介紹過」或 21 個自動測試來代替。
