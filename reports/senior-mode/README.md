# QuestNote V3.6.3 易讀模式整合驗收

2026-10-04。來源分支 `codex/senior-friendly`，基於 `origin/main` 的 `89b3550`。本次交付是本機來源實作與隔離瀏覽器證據，未 push、合併或發布。所有畫面中的任務、錢包與收藏均為合成測試資料。

已驗證來源 commits：`7a0ede1`（共用偏好／時間 metadata）、`00f5177`（易讀呈現／瀏覽器測試）。[來源檔案 SHA-256](tested-source.json) 對應最後測試工作樹；最終瀏覽器結果時間為 `2026-10-04T05:11:01.704Z`，晚於最後樣式修正。證據共91張PNG。

## A. 設計理由

原本首頁先呈現世界與成長資訊，任務操作較分散；新增、完成、更多操作常依賴符號，完整表單一次呈現太多選項；獎勵與錯誤短暫消失，召喚動畫也容易掩蓋「是否已扣款、是否已存入收藏」。這些問題無法只靠加大字體解決。

易讀模式改成「今天要做的事 → 記下一件事 → 完成並看見結果 → 自由探索夥伴」。首頁把真實任務節點移到前面，主要動作都有文字，低頻欄位漸進展開；結果保留在頁面，召喚先確認實際消耗再使用原交易。品牌插畫、三個主題、寵物與世界觀保留。對熟練者提供略過／重看教學，沒有依年齡強制限制功能。

這個 repository 是原生 JavaScript browser PWA，不是 React Native；因此採用 rem、瀏覽器 zoom、語義 HTML 與 responsive reflow，而沒有加入不相容的 RN 元件或聲稱支援原生 Dynamic Type。設計目標不等於獲獎或全面 WCAG 認證。

## B. 逐頁完成項目

| 畫面 | Before／問題 | 本次易讀呈現 | 原因 |
| --- | --- | --- | --- |
| 首頁 | 任務前有大量場景與成長區；新增偏符號 | 日期、今日待辦與完成數、文字新增；實際 DOM 任務優先；分類移進 disclosure | 第一眼先知道今天做什麼，視覺與閱讀順序一致 |
| 新增任務 | 分類、重要程度、日期、子任務同時出現 | 「要做什麼」、計畫日期、選填時間先出現；其餘保留於更多設定；新任務預設今日 | 降低第一次輸入負担，進階能力仍可使用 |
| 編輯任務 | 選單內找編輯；關閉可能失去輸入 | 任務卡直接「編輯任務」、儲存修改；未儲存修改離開前可繼續或放棄 | 減少隱藏入口和誤觸損失 |
| 完成任務 | 小型勾選與短暫回饋 | 明確完成／取消完成；儲存中鎖定按鈕；成功後顯示任務名稱與實際收益 | 不需猜符號，不在 commit 前宣告成功 |
| 獎勵 | toast 自動消失 | 當頁可收起的操作結果；重繪仍在，切至其他頁不混入 | 足夠時間閱讀，且不另建獎勵紀錄或重複發獎 |
| 刪除與取消 | 泛稱「此任務」 | 列出任務名稱、不可復原與獎勵保留說明；取消不改資料 | 在不可逆動作前辨認對象 |
| 召喚 | 風格術語、大片插畫、長動畫 | 「召喚1位／10次」、星塵用途與成本在前；確認實際消耗；直接展示已儲存結果 | 先理解再消費，保留精緻角色展示與完整收藏 |
| 召喚結果 | 動畫階段及略過控制 | 持續顯示名稱、稀有度、新／再次相遇；「收下，返回召喚」及查看夥伴 | 結果可讀，離開不丟失交易 |
| 寵物 | 故事、數值與養成資訊密集 | 保留名字、插畫與陪伴／養成入口；無動作的敘事區可展開；原圖有可讀關閉 | 不隱藏照顧功能，以漸進閱讀降低負擔 |
| 收藏 | 多種篩選及密集角色格 | 明確「寵物與收藏」、大型可換行篩選與卡片；原搜尋、系列、里程碑保留 | 同一批收藏與進度，方便辨識與回找 |
| 探險 | 一些按鈕只有40px，modal密集 | 共用 tokens、按鈕至少56px、彈窗可換行；既有隊伍與消耗流程保留 | 避免觸控失誤，不修改能量與派遣規則 |
| 習慣／成就／工坊／成長手冊 | 局部小字、密集 controls | 共用文字、間距、觸控、返回與 modal 樣式；完整功能仍循原入口 | 不另造簡化遊戲；本次未重寫其商業邏輯 |
| 導覽／更多 | 子頁返回符號、位置不易辨認 | 顯示目前頁名稱、回任務首頁／設定；保留原五分頁与更多功能；符號控制補文字 | 不形成第二套路由與導航陷阱 |
| 設定 | 字級、主題分散，沒有整體模式 | 「顯示與操作」易讀開關與儲存結果、重看練習；原主題／字級／提醒值保留 | 隨時可逆，切換不搬移資料 |
| Onboarding | 原一般教學 | 額外可略過的真實喝水任務練習：建立→完成→獎勵→召喚入口 | 學的是實際操作；不自動扣款，不用假成功 |
| Empty／Error | 空狀態或短暫 toast | 原空狀態採共用字級與操作；錯誤持續顯示；日期錯誤展開欄位並聚焦 | 分清楚無資料、輸入無效與操作失敗 |
| Modal／信箱／原圖 | 多套 lazy modal 與 native dialog | 明確關閉、summary可鍵盤到達、背景 inert；回饋呈現在頂層視窗；恢復焦點 | 不讓錯誤藏到視窗後方，不留下無法操作的背景 |
| 備份／還原／回報／分享 | 原服務與驗證流程 | 保留完整入口與驗證，套用易讀樣式；模式偏好與選填時間可備份 | 不放寬資料驗證或自動對外傳送 |

完整架構盤點與原始建議見 [product audit](../../docs/senior-product-audit.md)，設計 tokens、對比公式與 Apple／W3C 依據見 [design system](../../docs/senior-design-system.md)。盤點內的「建議」不等同全部新寫成獨立功能；上表是本次實際落地範圍。

## C. 架構與資料

- `seniorModeController.js` 管理模式切換、可逆 DOM 順序、文字控制、引導練習、當頁回饋與 modal 背景。`seniorMode.css` 只匹配 `body[data-reading-mode="senior"]`，放在既有樣式最後載入。
- 主文字18px、任務20px、頁面30px（root16px時），一般 controls 52px、主要 controls 56px，rem 可隨字級偏好放大。三主題保留，各自加強 muted 文字與控制邊界對比。
- 一般和易讀模式都使用原 `ui.js`／`encounterView.js` 與同一組 task、wallet、gacha、collection、habit、expedition services；不複製 database、store、progression 或交易 handler。
- 模式與教學完成記錄放在既有 META preferences，沿用原子更新與備份驗證；模式開關成功寫入後才顯示已儲存。原字級、主題、Reduce Motion 偏好保持獨立。
- `plannedTime` 是所有模式共用的可選 `HH:mm` metadata；舊資料預設 null，舊備份仍有效。它不改排序、獎勵或每日摘要提醒，不是個別鬧鐘。
- 回饋僅存在目前 session 的記憶體中，每頁最多顯示最近三則，重新整理後不保留；任務、收益與收藏本身已由共用服務持久化。引導途中重新整理會回到教學起點，已建立的真實任務仍在，不自動重建。
- V3.6.3 與 service-worker cache 同步；兩個新 runtime 檔加入 precache。artifact dry-run 成功只代表來源與資產閉包檢查，不能當成已發布或已完成離線實機驗收。

## D. Accessibility 與功能 QA

| 狀態 | 驗證 | 證據與界線 |
| --- | --- | --- |
| 通過 | 完整維護測試349項，另35條 reveal-flow assertions | [完整日誌](unit-tests.log)，無失敗、無省略；初輪日誌另存 |
| 通過 | 15個修改／新增 JavaScript 語法檢查 | [語法日誌](syntax-checks.log) |
| 通過 | 隔離 Chromium 瀏覽器16組流程 | [結果](browser-results.json)、[CLI日誌](browser-tests.log)；全新原生IndexedDB，非正式資料，阻擋非loopback請求 |
| 通過 | 254個可見操作目標 | [尺寸資料](touch-targets.json)，測量六個主要 view 與任務modal；均達44×44 CSS px，checkbox／radio以label觸控區計 |
| 通過 | 60組 reflow | [詳細資料](reflow-measurements.json)，三主題×320/393/430/852px×五個surface，extra-large字級；沒有文件橫向捲動 |
| 通過 | 200%文字＋WCAG文字間距 | [資料](200percent-spacing.json)，320px的首頁、設定、召喚、收藏、表單；可換行無文件overflow |
| 通過 | 系統 Reduce Motion | 動畫檢測無running animation；易讀召喚直接呈現結果；一般模式動畫分支保留 |
| 通過 | modal名稱、鍵盤循環與lazy視窗背景／焦點 | 含新增表單、信箱及原圖；Lead另以可及性樹核對背景隔離與實際主流程 |
| 通過 | 寵物故事漸進展開 | [獨立檢查](pet-disclosure.json)，兩個區段預設收合、可展開讀取再收合 |
| 通過 | 儲存、CRUD、練習、獎勵、召喚 | reload持久化；真實新增／改時間／完成／刪除；完成實際增加20星塵與1能量；取消召喚不扣款，一次召喚扣100且只計1次 |
| 部分通過 | 色彩對比 | 已計算三主題主要token pairs：muted最低5.55:1、控制邊界最低3.75:1；未逐像素驗證全部legacy組件與插畫疊色 |
| 部分通過 | 全功能可達與progression回歸 | 核心瀏覽器流程＋既有services套件；並非每個習慣、工坊、探險、十連、覺醒組合都做過本次端到端操作 |
| 部分通過 | Error／Loading | 輸入無效、未儲存放棄與信箱錯誤已測；未窮舉磁碟滿、IDB中斷與所有網路失敗排列 |
| 未測 | iPhone Safari／安裝PWA／VoiceOver語音／原生Dynamic Type | viewport與語義測試不能代替實機。含安全區、螢幕鍵盤、旋轉與實際語音順序需裝置驗收 |
| 未測 | 真人高齡可用性 | A68歲、B74歲、C62歲是專家walkthrough personas，沒有虛構參與者或量化成效 |

Reflow JSON 中 `overflow` 列出超出幾何邊界的裝飾圖層；它們由既有場景容器裁切，並未造成文件橫向捲動。不可將這些清單誤讀為可操作文字被裁切的通過證明；Lead另外檢查代表截圖的文字與動作可讀性。

## E. 一般模式回歸與整合決策

可驗證的結果：切換模式前後所有共用store資料不變（僅排除原有信箱讀取時間），reload保持模式；關閉易讀後首頁節點順序回復；一般模式實際新增、編輯、完成、刪除仍成功；完整測試保持既有概率、成本、稀有度、舊角色內容、備份與獎勵邏輯。

一般模式並非零變更：允許zoom、新增共用選填時間、summary納入focus trap、儲存中避免重複提交、錯誤焦點改善，是有意保留的共用改善。原動畫、主題、任務進度、交易與資料結構主體均沿用。未宣稱所有裝置與所有功能組合完全無回歸。

| Agent | 範圍／發現 | Lead採納、否決與交叉驗證 |
| --- | --- | --- |
| Product Auditor | 全站架構／screen清單、實際identity renderer、plannedTime共用metadata；指出更新後回饋消失、modal錯誤位置、儲存重入與焦點風險 | 採納共用metadata及最小侵入接點；Lead逐一審查服務差異，修正controller/modal/submit後跑原生IDB流程。否決另建Profile或新資料層，現有產品以手冊代表成長 |
| Senior UX／Design System | 合併UX與視覺角色；三主題tokens、觸控、reflow、敘事層級；找出40px探險按钮、320px溢出、關閉文字裁切、隱藏教學誤顯示 | 採納具體修正並重拍。Lead要求DOM閱讀順序、日期快捷列、先解釋召喚成本；不採只靠CSS order或全面加粗放大的方案 |
| Service／Regression QA | preferences／備份單元測試，瀏覽器harness，254目標／60reflow／正常模式回歸 | Lead核對斷言、原始JSON、完整日誌與實際截圖，另做UI/AX手動主流程。最後CSS晚於證據時要求重跑，不直接沿用舊報告 |
| Lead／最終整合 | ui.js、encounterView.js、controller、index、版本／SW；審查所有agent工作 | 決定同服務＋不同呈現；真實任務教學、可略過；先確認再消耗；直接展示已提交召喚結果；當頁persistent status；只解鎖自己持有的inert。拒絕RN重寫、第二份user data、虛構undo、未實測的VoiceOver／獲獎聲明 |

Agents按檔案責任分工，同一個隔離worktree內沒有多人同時修改共用runtime檔。Lead負責最終讀差異、解決具體衝突、必要驗證及提交。

## F. 畫面與下一步

開啟 [截圖比較畫廊](index.html) 可比較Normal／Senior首頁、表單與設定，並查看完成、獎勵、召喚、寵物、收藏、重要modal、empty、error及大字範例。PNG包含全頁與viewport版本，均來自實際runtime。

本機使用：從本worktree透過HTTP開啟App，前往「更多 → 設定 → 顯示與操作 → 易讀模式」。自動化重跑：`npm test`、`npm run test:senior:browser`（需要可用Playwright；可用`QUESTNOTE_PLAYWRIGHT_PACKAGE`指定本機安裝）與Node24。

下一步為iPhone實機／VoiceOver與真人persona驗收；通過後再由使用者決定是否整合及發布。發布需另走既有immutable artifact流程，本次沒有部署。
