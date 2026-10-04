# Senior-Friendly Mode：產品與架構盤點

盤點基線：`origin/main` `89b3550`，2026-10-04。這是實作前的原始碼盤點與整合建議，不是實機驗收或已完成變更清單。正式交付應以最終測試報告為準。

## 產品邊界與實際架構

QuestNote 是靜態瀏覽器 PWA，沒有 React Native、原生帳號或獨立 Profile 畫面。入口為 `index.html → src/bootstrap.js → src/app.js`。`app.js` 讀取服務資料形成唯一 `appState`，透過 `refreshAppState` 更新呈現。IndexedDB 由 `db.js` 管理，資料庫 version 3、stores 為 tasks / meta / collection / expeditions / habits；release profile 決定 production / preview 隔離。易讀模式不得新增資料庫、改 store key 或另存任務副本。

`ui.js` 統一導覽、事件委派與多數畫面；`switchView` 管理五個主要頁籤「任務／召喚／圖鑑／探險／更多」。更多通往習慣、每日祝福、成就、工坊、冒險手冊、設定、使用教學、回報、分享。子頁已有返回更多按鈕，但只顯示箭頭。歷史不是獨立頁：任務的智慧清單有已完成範圍，探險有旅程報告，祝福服務有歷史，手冊與設定有個人統計。Profile 應沿用手冊／稱號／統計，不虛構帳號系統。

**特別注意當前生效的召喚與圖鑑：** `encounterView.js` 的 `renderEncounterView` 產生 `.identity-surface`，取代舊版 gacha / collection 主體。單改 `ui.js` 的舊 `renderCollectionCard` 或 `.gacha-actions` 不會完成目前畫面。原始碼同時有舊的 modal renderers 和新 native dialog，需覆蓋兩者。

## 共用邏輯與插入位置

| 層 | 現有權責 | 易讀模式適合位置 | 禁止的改法 |
| --- | --- | --- | --- |
| 偏好 | `preferencesService.js` 的 `meta/userPreferences`、normalize、setTheme、setFontSize | 增加 `seniorMode` 和首次易讀教學偏好；root dataset 套用 mode，獨立於 theme/fontSize | 寫 localStorage 另一份使用者設定、開新 DB、切換時重建資料 |
| 啟動 | `app.js` 初始化及 refresh 讀 preferences | 首次 render 前套用 mode，狀態 refresh 保持一致 | 只改設定畫面但重新啟動失效 |
| 呈現 | `ui.js` render/switch/openModal/showToast | 集中的 senior presentation controller、scoped stylesheet、共享 data-action；必要元件 variant | 複製 ui.js 或 task/gacha/reward 服務 |
| 任務 | `taskService.js` create/update/delete/toggle、`taskMigration.js`、`taskFilterService.js` | 改表單 composition 與按鈕文字；共用同一 create/update/toggle | 自行加獎勵、在 UI 寫 DB、取消完成後再次派發獎勵 |
| 任務時刻 | 基線只有 startDate/dueDate/plannedDate，沒有任務時刻 | 可選 `plannedTime` HH:mm，兩模式共用 metadata；在表單明講不是通知 | 假裝時間欄會排程通知、另建 senior tasks |
| 獎勵 | `rewardService.js`、`rewardClaimService.js`、quest/achievement services | 顯示服務回傳的實際收益、持續可讀的完成回饋 | 根據畫面估算／重算獎勵、用完成動畫決定交易 |
| 召喚 | `gachaService.js`、`gachaTransactionCore.js`；ui handlers 掌握鎖與 refresh | 確認消耗後呼叫原 handler；`encounterView` 呈現明確 CTA 與 calm reveal | 在 presentation 層抽亂數、重跑 pull、改機率／保底／成本 |
| 收藏／陪伴 | `collectionService.js`、companion、bond、awakening controllers | 原詳情／陪伴／故事入口用清楚文字和分段顯示 | 另一份收藏、隱藏覺醒或故事等既有功能 |
| 備份 | `backupService.js` aliases、`backupSchema.js` validation | 偏好與可選時間一併 round trip；舊備份仍可匯入 | normalizer 默默丟 mode、接受不合法時間、重設 progression |
| 更新／離線 | version.js、SW precache closure、immutable release | 新 JS/CSS 加 precache、同步版本、跑 artifact 檢查 | 直接將 source 成功宣稱正式發布 |

既有 normalizeUserPreferences 會明列允許欄位，所以新增值必須同時加入 defaults/normalizer；theme/font setters 都依 normalizer 合併。備份還有 settings alias，不能只改 UI。`dialogFocus.js` 已有 trap/restore/top-dialog 管理，應沿用；native identity dialogs 有獨立 focus 邏輯。

## 逐畫面 Before／Problem／Senior Proposal

以下 proposal 是待實作與驗證的設計決策，不表示每项已完成。

| 流程／畫面 | Before 與問題 | 建議呈現與原因 | 需保持的行為／回歸點 |
| --- | --- | --- | --- |
| 首次啟動／載入 | loader 文字與動畫；既有 onboarding 是真實任務→獎勵→召喚→收藏→探險 | 啟用易讀時簡短可略過的實作引導，導向真實新增與完成；載入用可朗讀狀態 | 不自動建示範任務、不偽造資源、不重置既有 onboarding |
| 首頁／今日 | 情緒場景、夥伴、章節、多種資源與功能同時存在，新增為＋ | 日期、今日待辦、明確「新增任務」先出現；任務後再夥伴／獎勵；保留插畫 | 今日分類、跨日 plannedDate、習慣、統計來源不變 |
| 新增任務 | content textarea、分類、重要程度、兩種日期、今日 toggle、安排日期、子任務全展開 | 第一層任務內容、安排日期、可選時間；「更多設定」放分類、優先級、日期範圍、子任務；CTA「新增任務」 | 收合進階值仍保存；首次新增正確出現於今日，不暗改 reward priority |
| 編輯任務 | 共用長表單、儲存文字泛稱 | 「儲存變更」、既有安排清楚可見；隱藏欄位保留 | 編輯不得清空子任務／priority／日期／completed/reward 狀態 |
| 任務列表／詳情 | 小型 check；icon-only 更多；標題／部分描述／metadata；已完成可收合 | 「完成任務」「已完成／取消完成」可讀；「更多操作」文字；內容可展開、不截斷 | data-id/data-action 委派、子任務 toggle、清單篩選與完成範圍保持 |
| 任務完成／獎勵 | 先樂觀改卡片、服務完成後 toast，toast 預設 2.8 秒 | 實際成功後持續顯示「已完成『名稱』」與實得星塵／能量／親密度；取消完成不隱含返還承諾 | failure 不留假完成畫面；多按不得重複派發；使用真實 reward payload |
| 刪除任務 | 既有確認「確定要刪除此任務嗎？刪除後無法復原」 | 明確帶任務名，CTA「刪除任務」，取消容易找到，成功狀態可讀 | 刪錯物件風險；沒有實際 undo 時不可寫可復原 |
| 任務歷史 | 智慧→已完成，範圍切換 | 可辨識「已完成紀錄」入口與範圍按鈕，大字 reflow | 不變更計算完成日期、不自動清除歷史 |
| 召喚首頁 | identity sanctuary 插畫強；「啟動相遇／十連相遇」、星塵、卡池規則入口 | 保留插畫與品牌；「召喚 1 位夥伴」、成本＋目前餘額＋自然語言說明；ten 次要但可用 | 原 transaction handler、一次消耗、busy lock、卡池選擇一致 |
| 召喚確認／不足資源 | 原按鈕直接開始；不足資源 disabled 與 walletHint | 消耗前確認「將花費 X 星塵」；取消不消耗；不足時引導完成任務 | 不在確認前 pull；確認後重讀現有鎖／成本條件 |
| reveal／十連摘要 | identity native reveal dialog，skip/phase/batch queue；仍有舊 reveal controllers | 「略過動畫」常駐；名字、稀有度自然語言、新／再次相遇、永久結果摘要；「收下」「查看寵物」 | 跳過只跳 presentation；結果已 committed，跳過/關閉不能重抽或丟失 |
| 卡池預覽／機率 | preview/probability dialog 與角色卡，含尚未相遇角色 | 字級、button target、卡池名可換行；稀有度術語補說明；機率仍可查 | 不改概率／候選／解鎖門檻；灰階預覽仍辨認名稱 |
| 圖鑑／收藏 | all/owned/unowned、密度、系列、搜尋＋圖卡，identity replacement | 「我的夥伴」清楚入口；篩選可換行，閱讀優先的卡片格；收藏進度置次層 | 全部未擁有預覽、搜尋、系列、里程碑均保留 |
| 寵物詳情／原圖 | identity details 與 ui legacy modal，圖片、身分、親密度、故事、nickname、覺醒 | 第一層圖片／名字／狀態／陪伴；進階故事與成長分段；明確返回／關閉 | 保留原圖、暱稱、陪伴、餵食、撫摸、故事和覺醒，native dialog focus |
| 再次相遇／碎片邀請 | fragment balance、候選邀請 dialog、再相遇回饋 | 說明碎片用途與邀請消耗；明確確認與持續結果 | invitation 原 controller 交易、重複獲得判定不變 |
| 習慣／今日習慣 | 每日／每週、打卡、進度、封存；首頁也有 daily habits | 大型文字「完成／取消完成」，週目標與今天狀態分開；封存有名稱與確認 | 習慣繼續是 habit，不轉成 task；每日去重和週獎勵一致 |
| 習慣新增／編輯 | 名称、description、frequency、target 等 | 必要欄位先，radio 群組有 labels，長表單有可靠取消 | 保留 weekly target、封存／恢復與歷史 logs |
| 探險地圖 | 地區圖、能量、隊伍、營地、進度、旅程報告 | 圖片與地域保留；每區先呈現消耗、時長、可否出發與明確 CTA；其餘收合 | 地區 art、first journey 優惠、可用夥伴與冷卻不變 |
| 派遣 dialog | 選 1–3 寵物、目標、收益 preview，獨立 modal | 垂直排列、選擇狀態文字、出發前摘要，取消＋出發分開 | 多選數限制、專長、能量扣款、安全 focus trap |
| 探險進行／報告／領取 | 倒數、回報、可領、archive | 「探險中／已返回／已領取」文字；收益不只動畫；歷史可展開 | timer 更新不搶焦點、claim once、歷史獎勵不再派發 |
| 工坊／材料／製作／送禮 | 三個 tab、材料數、配方、目標寵物、送禮回饋 | 材料不足明講；主要製作/送禮 CTA 大且可換行；消耗／接收者摘要 | inventory/gift affinity/claim 邏輯不 fork，tabs 與選取 state 不互相重設 |
| 祝福／轉盤／冒險任務 | home hub 與 daily panel、多種待領紅點 | 文字「領取獎勵」與可領數、結果明確；轉盤能降低動態 | 日／週邊界和冪等 grant，不把 status dot 當唯一提示 |
| 成就／稱號／里程碑 | 完成／進度／可領、管理稱號 dialog | 狀態文字與 action 同列或疊列；次要敘述收合 | 已領標記、稱號装備、collection milestone source 不變 |
| 個人成長／手冊 | handbook goals/stats/最近成就；不存在登入 Profile | 手冊作「我的成長」既有入口；重要數字有文字解釋 | 不新增帳號、虛構角色等級或不在服務內的 KPI |
| 更多／導覽 | 五底部 tab；更多內 support disclosure；子頁 back 只有箭頭 | 易讀固定清楚 tab 與首頁／設定捷徑，子頁「返回更多」，當前頁有文字與 aria-current | 所有 major + support 仍可到達；active tab 與當前 view 一致 |
| 設定／切換 | font size、daily reminder、theme、backup、stats、reset | 顯示與操作首區放易讀開關，說明即時＋共用資料；保留原 font/theme 值；結果 role=status | 切換不改 progression、off 完整恢復 normal；偏好持久化成功才宣稱儲存 |
| 備份／還原／清空 | 檔案 preview、restore danger、reset confirmation | 明確覆蓋範圍、讀得完的說明、取消先；成功持續顯示 | 原 backup validation、二次確認、無假 undo、任何模式都不能放寬 schema |
| 回報／分享 | 專門 feedback controller 與 share service | 長表單與錯誤／送出結果可讀；字體、觸控與返回 consistent | 不自動傳送、QA 隔離 API、不把私人回報寫公開 mailbox |
| Empty／Loading／Error | 各服務有空集合、載入錯誤、toast 或 disabled | 空資料與失敗分清，提供明確新增／重試／清除篩選；錯誤不中斷讀取 | 不把載入失敗當空集合覆蓋，不清掉尚未儲存輸入 |
| modal／toast／confirmation | shared overlay + focus utilities + identity native dialogs；多數 toast 自動消失 | 最小觸控 48–56px、明確關閉文字、可換行；重要結果持續到下一個操作或手動關閉；status announce | Escape、cancel、nested focus restore；原流程等待 promise 必須完成 |

## 高風險整合與驗收順序

1. **真實主畫面差異：** identity renderer 和 legacy renderer 共存。先確認實際 active DOM，避免修改被隱藏節點後誤判完成。
2. **模式樣式隔離：** scoped `data-reading-mode="senior"`，避免把全域 `.btn` / `h1` 或任意祖先 `font-size` 改成 normal 回歸。Normal 的原 theme/font preference 不應被 mode overwrite。
3. **動態更新：** task refresh、switchView、encounter innerHTML 都會替換節點。避免只在初次 init 改 DOM 文字；集中 render hook 或能冪等套用的 presentation layer。
4. **事件與資料：** 先盤點 data-action owner 再加 listener，避免 click 同時觸發 senior 與 normal handler。模式切換須保留任務、wallet、gachaStats、collection、habit、expedition 同一快照。
5. **時間與提醒：** 個別 task time 新 metadata 只是安排時刻；現有 `reminderService` 是每日一則摘要，不是每項任務的 alarm。兩者文案不可混淆。
6. **Reduced Motion：** CSS 關動畫不等於 JS queue 變短；`encounterView.reduced()`、themed controller、ceremony/reveal queue、pet awakening 都要檢查。正常模式保持 OS Reduce Motion 支援。
7. **大字／safe area：** 基線 viewport 禁止 zoom，應允許 pinch zoom；HTML web text zoom 是此 PWA 的 scalable typography 方式，不能聲稱已用 RN Dynamic Type。320/375/393/430、橫向與 200% 字級測 reflow、keyboard viewport、modal footer。
8. **閱讀次序：** CSS `order` 只改視覺不改 DOM/VoiceOver。首頁若重新排序，要確保 semantic heading／focus 次序也符合任務优先。
9. **持久回饋：** 普通 toast 2.8 秒不足；persistent status 不能覆蓋 CTA 或把 screen reader 的所有通知變 assertive。確認成功與儲存失败要區分。
10. **測試隔離：** 所有瀏覽器操作只用 loopback 測試資料、不可污染正式 user DB 或回報 API。截圖要用實際 runtime；模擬 iPhone viewport 不等於 iPhone VoiceOver／原生鍵盤實機。

## Persona walkthrough 的評估方式

- A（68 歲，老花、不熟悉遊戲）：從「今日任務→新增晚上吃藥→安排時刻→完成→實際收益→一次召喚→認出新夥伴」驗證不用猜術語；成本與獎勵必須有中文文字。
- B（74 歲，擔心按錯、點擊精度較低）：驗證每一步有可見返回、取消、清楚選取狀態；刪除帶名稱且取消不改資料；模式關閉容易找；不用 swipe / long press。
- C（62 歲，手機熟練）：驗證能直接快速完成，不被反覆強制教學拖慢；所有進階功能可再找到；大字不導致無限捲動與資訊完全隱藏。

這些是設計 walkthrough personas，不是假稱已找三位真人受測。實際可用性研究仍需使用者參與。

## 此盤點後的最小共用 metadata 實作

Lead 決策採用 `plannedTime`（`HH:mm` 或 null）。`taskService` 與 `taskMigration` 共用格式正規化，create/update 拒絕不合法時間，update 省略欄位會保留原值；備份 schema 將其設為可選欄位以相容舊備份。它不影響任務排序、獎勵、提醒或任何 progression。`devtools/task-time.test.mjs` 驗證正常／無效時刻、舊資料預設、備份 round trip 和資料未改；實際 create/edit IndexedDB 持久化應另外列入瀏覽器驗收。
