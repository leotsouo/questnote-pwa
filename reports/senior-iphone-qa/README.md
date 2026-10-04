# iPhone Device QA Report — V3.6.4

2026-10-04。來源分支 `codex/senior-friendly`；開始時 HEAD `464b44c`、工作樹乾淨。已 fetch `origin/main`，主線仍為 `89b3550`，沒有遺漏的新來源提交。本輪最小修復 commit：`091a18f`。

## Device

使用者提供：iPhone 14 Pro Max、iOS 26.5.2，驗收方式為「加入主畫面」PWA。型號與版本尚未從裝置直接讀回。使用者可手動操作並回報；Agent 執行環境為 Windows，沒有 iPhone Safari、畫面擷取或遠端觸控工具。唯讀裝置盤點僅發現 iPhone Bluetooth audio/transport 項目，不構成可用的 App 操作連線。

本專案是 browser PWA，沒有 EAS、TestFlight、Xcode 或 React Native build。裝置應驗收下述固定 HTTPS preview 產物，不能以舊預覽或正式站的版本代替。

## PASS

**目前沒有 iPhone 實機 PASS 項目。** 下列為本輪完成的來源／桌面瀏覽器驗證：

- 維護測試349項、35條reveal assertions，無失敗： [完整日誌](unit-tests.log)。
- 17組隔離 Chromium 流程全通過，含原16組回歸、新增兩種模式的合成IME事件和長中文任務： [流程結果](browser-regression/browser-results.json)、[完整日誌](browser-tests.log)。
- 254個操作目標尺寸、60組三主題／四尺寸／五surface reflow、320px下200%文字＋文字間距檢查通過： [觸控資料](browser-regression/touch-targets.json)、[reflow](browser-regression/reflow-measurements.json)、[200%](browser-regression/200percent-spacing.json)。這些是CSS像素與瀏覽器模擬，沒有真人手指或iPhone鍵盤證據。
- 固定產物18組原生瀏覽器／service-worker案例通過，含更新、offline、profile isolation和資料保存： [產物測試結果](artifact-browser-results.json)、[CLI日誌](artifact-browser-tests.log)。同一份preview bytes，仍不是iOS主畫面驗收。
- preview 613檔案hash與scope/profile校驗成功： [完整性證據](preview-verification.log)。local production artifact只作profile隔離的測試fixture，沒有發布。
- 靜態來源掃描未發現主動TTS或自訂Speech Recognition API： [語音稽核](voice-source-audit.json)。保留現有labels、role與live regions，沒有加入主動語音播放或移除VoiceOver語義。

## FIXED

**P1／中文輸入風險（來源確認、合成事件重現；尚非實機發現）**：`subtask-new-input` 原keydown handler無條件將Enter變成新增子任務，可能在IME選字確認时清空輸入。

修復：當`event.isComposing`或`keyCode === 229`時讓輸入法繼續處理，不攔截Enter；普通Enter仍只新增一個子任務，不送出父任務。兩種模式使用同一handler，沒有更動任務、獎勵或召喚商業邏輯。V3.6.4與service-worker cache已同步。

處理依據：MDN說明IME邊界事件的`isComposing`可能為false，建議同時檢查229：[keydown events with IME](https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event#keydown_events_with_ime)。這是跨瀏覽器輸入保護的依據，不是已測iOS的聲明。

新增測試前幾輪有測試本身的失敗，日誌完整保留：第一輪誤以`description`讀備註（產品保存於`content`），第二輪沒有考慮Normal新增任務未安排今日，第三輪selector同時匹配tab與content。均修正測試假設／selector，沒有為測試改變原產品行為。見 [第一輪](initial-browser-tests.log)、[第二輪](second-browser-tests.log)、[第三輪](third-browser-tests.log)。最終17组通過。

## OPEN — NOT TESTED

| 實機項目 | 狀態／原因 |
| --- | --- |
| Normal↔Senior、navigation／modal／scroll、kill後重開 | NOT TESTED，待使用者實機回報 |
| 跨模式任務／完成／錢包／收藏／progression／設定 | NOT TESTED on iPhone；桌面原生IDB回歸另已通過 |
| Dynamic Island、notch、safe area、Home Indicator、status／tab bar | NOT TESTED，不能由viewport大小推論 |
| 手指hit area、日期／時間原生picker、dropdown | NOT TESTED，Agent沒有實機觸控渠道 |
| 軟鍵盤遮擋、focus、Done／Return、捲動恢復 | NOT TESTED；本輪沒有在缺乏證據下重寫viewport管理 |
| 繁中注音、選字、cursor、刪字、標點與原生dictation | NOT TESTED on iPhone；合成IME事件只驗handler，不代替真正輸入法 |
| 系統文字四級及接近最大、200%實際閱讀層級 | NOT TESTED；PWA rem／zoom不等同原生Dynamic Type |
| 長列表／長任務／長備註、modal及橫向旋轉 | NOT TESTED on iPhone；新增長中文桌面案例已通過 |
| 任務CRUD→獎勵→召喚確認→reveal→收下→寵物 | NOT TESTED on iPhone，不能以桌面流程推論 |
| 系統Reduce Motion、不同主題的實機對比與動畫效能 | NOT TESTED；沒有iPhone性能錄製 |
| background/resume、kill/restart、弱網／offline／恢復 | NOT TESTED on iPhone；產物service-worker桌面案例另已通過 |
| VoiceOver語音與操作順序、實機截圖 | NOT TESTED；尚未取得任何實機證據 |

目前沒有經實機確認的未修P0／P1，但也沒有證據可宣稱不存在。未把Bluetooth連線、瀏覽器PASS或截圖模擬當成實機PASS。

## Voice strategy

主要資訊輸出仍為清楚文字、視覺介面與克制動畫。不加入自動朗讀任務／頁面／獎勵／抽卡、TTS主要操作或進頁語音提示。iOS VoiceOver由使用者自行開啟，既有可及性語義保留。

本輪沒有擴張成自訂語音辨識專案。原生鍵盤dictation是可選輸入；實機驗收時說「明天下午三點吃藥」後應先停留在文字欄位，只有按「新增任務」才建立。現有App不會把這句話自動解析成日期／時間。若未來加入自訂辨識，必须有可編輯預覽、使用者確認、再試一次／改用鍵盤，以及「剛剛沒有聽清楚，可以再說一次，或直接輸入文字。」等可理解錯誤文案。

## Frozen preview

- App：V3.6.4；來源commit `091a18f`。
- Artifact：`b040f52d85f544dfbaf1bc7cb10c2a4dcbeb7097bf1b6ab06a9fc06af1af2fbe`。
- Manifest SHA-256：`acb697f622425d2870e8153dc467bd06e8b872da993595d3cb60edeff6f3df2f`。
- Profile `preview`，scope `/questnote-pwa-preview/`，DB `QuestNotePreviewDB`，preview cache namespace。
- 預定HTTPS網址：https://leotsouo.github.io/questnote-pwa-preview/ 。已唯讀確認preview repository的Pages由`main`根目錄發布。
- 狀態：**使用者已明確核准並已發布隔離預覽站**。部署commit `aca1d982e9e3c734b0a06a4a0f5ec5fbe6baffbc`，613個Git blobs與固定產物一致；[Pages run 37198474045](https://github.com/leotsouo/questnote-pwa-preview/actions/runs/37198474045)成功；18個核心HTTPS檔案雜湊全數一致，讀回V3.6.4。見 [Git bytes](deployment-git-verification.json)、[建置日誌](pages-build.log)、[HTTPS證據](https-verification.json)。正式站與來源main沒有推送或合併。

既有preview資料可能保留，不匯入唯一正式備份、不清除網站資料。QA僅用測試任務；不自動傳送feedback或對外訊息。

## 第一組實機回報

preview已發布且HTTPShash讀回完成。請先確認設定版本為V3.6.4，再從Safari加入主畫面，優先跑以下短流程。這是待執行項，不是既成測試結果。

1. Normal建立「實機QA－晚上吃藥」，開Senior確認仍在；切換兩次，觀察位置、閃動與modal殘留。
2. Senior開新增，使用注音選字、長中文、日期與時間；鍵盤開啟時試捲動到儲存。用系統dictation輸入「明天下午三點吃藥」，確認文字可修改且不自動建立。
3. 修改→儲存→完成，記錄前後錢包與回饋；關閉主畫面App再重開，確認模式、任務及獎勵保留且沒有重複增加。
4. 提高系統文字／App字級，检查首頁、表單和刪除確認；檢查Home Indicator附近CTA，最後切回Normal再關閉重開。

先回報每步PASS／FAIL、卡住的位置與當時模式；取得結果後由Lead更新本報告、按P0/P1/P2處理，再進行召喚、VoiceOver、Reduce Motion及離線等後續實機組。

## Release recommendation

**NOT READY FOR SENIOR USER TEST**。原因是iPhone核心流程與實機Normal regression尚未完成，不能在只取得桌面證據時提升狀態。沒有發布正式站、合併來源或宣称完整iPhone驗收。
