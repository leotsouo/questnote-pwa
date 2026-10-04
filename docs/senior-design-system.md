# QuestNote 易讀模式設計系統

設計日期：2026-10-04。此文件描述 presentation mode；實際測試結果以本次整合驗收報告為準。沒有獲獎、符合整套 WCAG 或已完成實機 VoiceOver 驗證的聲明。

## 設計目的與範圍

以「今天要做什麼 → 記下一件事 → 完成 → 看見成果 → 自由探索陪伴」建立清楚的使用順序。易讀模式仍然使用 QuestNote 的世界、插畫、寵物、收藏、任務與進度；不以年齡判斷能力，不使用幼兒化語氣。設定稱為「易讀模式」，說明實際效益而不是稱呼使用者為老人。

原介面的主要障礙是 10–12px 的說明、勾選／新增／更多的符號入口、主要任務前的大片場景、同列密集欄位、短暫獎勵訊息與模式／大字設定缺乏整體互動策略。改善不是對整頁做比例縮放：任務順序、操作位置、閱讀區域、表單漸進展開、回饋持續時間和動畫都需要配合。

這是 browser PWA，不是 React Native。可縮放 rem、瀏覽器文字設定與 pinch zoom 是本次可實作的能力；不把它宣稱為 iOS 原生 Dynamic Type。Apple 的 Dynamic Type 設計原則用於畫面重排和內容優先順序，iPhone 文字設定如何作用在安裝後 PWA 仍須實機檢查。

## 架構與元件界線

- `body[data-reading-mode="senior"]` 是呈現契約；CSS 最後載入。一般模式不匹配此選擇器，除了新增 `.senior-only` / `.senior-label` 的預設隱藏規則，原有樣式不被覆寫。
- `src/seniorMode.css` 擁有易讀 tokens、touch target、頁面與元件 variants、reflow 與安靜動態。`src/themeTokens.css` 的三個 theme IDs 與品牌色保留。
- 呈現 controller 負責首頁 DOM 排序及恢復、導覽名稱、模式切換與單次操作的清楚說明。DOM 必須和視覺順序一致；不能只有 CSS `order`。
- 任務服務、IndexedDB、wallet、召喚交易、收藏、親密度、探險與獎勵規則共用。模式偏好只儲存呈現值，不能建立另一份任務或進度。
- Task card 使用相同 task ID/action；變更的是「完成任務」文字按鈕、直接「編輯」與「更多操作」摘要。不能再放一個獨立 completion handler 重複發獎。
- 表單保留既有欄位與 ID，低頻設定移進原生 `details`；移動既有 DOM 不會產生第二份相同 input。送出沿用同一驗證與服務。
- 當前召喚／圖鑑實作為 `encounterView.js` 的 `.identity-surface`、`.identity-dialog`。不能只改已被隱藏的舊 gacha panel 便宣稱完成。

## 視覺語言

三套世界分別保留星夜 navy／淡紫、晨光 cream／berry、暮光 paper／sage。原作插畫在 companion 與相遇頁繼續扮演情感核心；閱讀文字放在實色區域，不覆蓋角色臉部。稀有度使用原有文字，不以發光或顏色單獨代表價值。

主要按鈕使用 theme primary，secondary 用穩定邊框與淡底。danger 僅指向刪除／錯誤，不把普通完成按鈕染成警告。卡片保留各主題圓角和克制陰影，增加間距而不是增加裝飾。桌面閱讀寬度 640px；圖片不隨文字比例放大。每個資訊群有明確起點與結束，不能用滿畫面加粗代替層級。

| Token | 預設 root 16px 時 | 用途 |
| --- | --- | --- |
| `--type-display: 2rem` | 32px | 情境大標題 |
| `--type-page: 1.875rem` | 30px | 頁面名稱 |
| `--type-section: 1.5rem` | 24px | 區段名稱 |
| `--type-quest: 1.25rem` | 20px | 任務名稱／角色名稱 |
| `--type-body: 1.125rem` | 18px | 本文／輸入 |
| `--type-button: 1.125rem` | 18px | 操作文字 |
| `--type-meta: 1rem` | 16px | 日期／收益／輔助說明 |
| `--type-caption: .9375rem` | 15px | 次要非核心資訊與導覽 |
| `--senior-target` | 52 CSS px | 一般操作觸控區 |
| `--senior-primary-target` | 56 CSS px | 新增、完成、儲存等主要操作 |

基本 line-height 1.65，說明和較長文字 1.7–1.8；標題 1.4–1.6。間距使用 8／12／16／20／24px。操作间至少 12px；原生 checkbox/radio 圖形 24px，包住它的 label 至少 64px。不把裝飾 SVG 拉大到一整個觸控區。

一般／大／特大文字偏好繼續獨立存在。root 20px／24px 時各 rem 尺寸自然變化，表單垂直排列、卡片減少欄數、按鈕文字可以換行。文字不得用省略號隱藏；重要按鈕不得固定單行高度。

### 對比

下表是 sRGB 相對亮度公式的 token pair 計算，並非每個實際畫素或每個 legacy feature 都已測試。muted／border 欄取 main、card、soft 三種底色中的最低值。

| Theme | Main text / main background | Muted text 最低 | Control border 最低 | Primary / inverse text |
| --- | ---: | ---: | ---: | ---: |
| default | 15.08:1 | 8.26:1 | 4.61:1 | 8.70:1 |
| sweet | 10.79:1 | 6.06:1 | 4.00:1 | 5.94:1 |
| twilight | 11.06:1 | 5.55:1 | 3.75:1 | 5.75:1 |

易讀 muted 使用 `#c4cedb / #694e5c / #515e53`；interactive border 使用 `#879bb3 / #8b6778 / #6a796a`。裝飾卡片分隔線可保持柔和，必須辨識的 input 和 secondary button 邊界使用更強對比。相遇場景保留深色插畫框和既有金色 primary，其文字／底色須在截圖驗收個別檢查。

## Page-by-page audit 與呈現決策

| 畫面／流程 | Before / 風險 | 易讀模式與理由 |
| --- | --- | --- |
| 首次使用 | 初次探索同時接觸任務、養成、召喚名詞 | 先說「記下一件事，完成後可獲得星塵」。提供易讀偏好與明確標示會建立真實任務的練習；教學可離開、稍後重看。不能先要求理解遊戲規則。 |
| 今日首頁 | 場景先於任務；新增只有 `＋` | 任務放在最前；新增有完整文字；場景、資源和額外獎勵在任務後。保留每日陪伴的愉悅，但先讓人做事。 |
| 全部／智慧清單／歷史 | 分類多；已完成內容可能與未完成混在一起 | 原本清單功能和日期篩選保留；可換行文字 tabs；完成狀態有文字、時間和刪線。不能只用顏色。 |
| 任務卡與詳情 | 勾選與三點選單；兩行說明截短 | 任務名稱完整換行；「完成任務」、直接「編輯」、具文字「更多操作」。說明透過原生 details 閱讀完整內容，子任務仍使用原有 expand/action。 |
| 新增任務 | 一開始所有欄位與排程同時出現 | 任務名稱／內容與今天安排先出現；分類、重要程度、日期與子任務等進階設定可展開。所有驗證與提交沿用。可取消，儲存後有明確訊息。 |
| 編輯任務 | 小欄位、日期並排、手指易誤觸 | 同表單，欄位分列；既有設定在需要時展開讓人看見；取消不寫入。切模式不得悄悄送出未儲存內容。 |
| 任務完成與獎勵 | 勾號狀態加短暫 toast | 明確完成文字與可持續閱讀的 receipt；列出本次實際收益。保留取消完成；有不可逆獎勵規則時如實說明，不能宣稱一定可回收所有獎勵。 |
| 召喚／卡池 | 詩意 CTA、兩個召喚選项並排、成本小字 | 召喚單次／十次垂直排列，成本 16px 以上，餘額同屏。消耗前確認本次次數／成本；取消不扣款。卡池及機率規則照常可達。 |
| 相遇 reveal | 多段移動／等待／揭露 | 使用既有減少動態生命周期；提供跳過演出與持續結果。結果保留圖片、名稱、稀有度、初次／重複狀態和下一步，不能依靠動畫才知道是否成功。 |
| 圖鑑／收藏 | 多欄小卡、過小搜尋與篩選文字 | 依可讀卡片寬度自動減欄；名稱與已相遇文字維持可讀；搜尋、全部／已相遇／未相遇可直接點選；稀有度和持有狀態不靠色彩。 |
| 寵物詳情／養成 | 故事、數值、餵食、覺醒與暱稱集中 | 保留原圖與故事；段落文字放大；明確「設為陪伴」「養成與餵食」「修改暱稱」。關閉在文件流內，不蓋住內容。未解鎖預覽清楚標示。 |
| 相遇邀請／碎片 | 小字與多組專有名詞 | 使用既有邀請流程，成本與確認完整換行，操作有 52px 目標，收益／持有數用原始 state。狀態錯誤文字持續可讀。 |
| 探險 | 卡片資訊密集，多列併排 | 目的地插畫保留；能量、時間、素材、進度與派遣分段排列；確認頁文字不截斷；既有派遣服務和花費不改。 |
| 習慣 | 小型完成標記／連續天數 | 大尺寸既有完成按钮，狀態與日期文字清楚；不另立任務獎勵邏輯。 |
| 工坊 | 材料／數量與配方資訊密集 | 以可換行說明和大型按鈕呈現；成本仍在確認前可見；不簡化掉必要材料規則。 |
| 成就／祝福／轉盤 | 多种額外獎勵搶占首頁 | 後置在低頻探索區，但入口仍可達；領取使用既有 claim identity，不能因切模式重領。 |
| 更多／Profile | 本產品沒有独立帳戶 Profile 頁 | 以現有「更多」和成長統計呈現個人進度，不創造不存在的帳戶。設定／教學／資料備份仍可見。 |
| 設定 | 易讀、字體、動畫可能被誤認為同一設定 | 明確區分「顯示與操作模式」「文字大小」「風格」；開關可還原一般模式；三套 theme 不改。易讀模式本身採安靜動態。 |
| Empty / Loading / Error | 短句、短暫提示或只靠 icon | 空白說明下一個可做動作；載入有文字；錯誤說明保留輸入、可修正／重試；不把無任務當成失敗。 |
| Dialog / confirmation / destructive | × 關閉可能不明；操作過近 | 「關閉」有文字與 ≥52px 目標；捲動內容不蓋住焦點；取消與確認分列；刪除先說明對象和不可復原性。 |
| Toast | 自動消失、操作後找不到結果 | toast 提升可讀性；重要完成／錯誤另外保留 receipt。live region 適度播報，不把整頁更新宣告兩次。 |

## Personas 與 walkthrough

以下是設計檢查情境，不是招募使用者的實測證據。

**林女士，67 歲，熟悉通訊軟體，讀小字較吃力。** 開啟易讀，首頁看見今日任務；點「新增任務」，寫「下午散步 20 分鐘」，儲存後回到同一清單；完成時看見收益和已完成狀態。應能在不閱讀遊戲規則的情況下完成這一輪。檢查：200% 文字、320px reflow、儲存結果與新增入口是否可見。

**陳先生，76 歲，手部輕微顫抖，有智慧手機經驗。** 編輯任務→展開排程→改日期→取消→重開核對沒有寫入，再儲存。檢查：直接編輯入口、52px 控制、12px 間距，刪除與完成不相鄰混淆；誤觸頁外不应消失未儲存內容。

**王先生，72 歲，使用 VoiceOver 並喜歡收集角色。** 導覽至召喚→選卡池→聽見成本與餘額→取消一次，再確認一次→查看結果→圖鑑→角色→設為陪伴。檢查：完整名稱、aria-current、確認焦點、modal trap／返回原入口、結果 live announcement，絕不因動畫或顏色失去資訊。此情境需要 iPhone VoiceOver 人工驗收。

**許女士，80 歲，對移動畫面敏感，但樂於探索新功能。** 今日任務完成後探索夥伴→餵食→召喚→返回今日；偏好大字和減少動態。檢查：沒有等待動畫才能操作、無自動輪播、沒有手勢唯一入口、所有返回鍵有文字、暫離再開偏好持續存在。

## Accessibility requirements 與來源

- 文字一般至少 4.5:1、大字至少 3:1；重要控制邊界／焦點至少 3:1。來源：[WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)、[Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)。tokens 計算不能取代疊圖、opacity、disabled 與 focus 實際檢查。
- WCAG 2.2 AA target-size minimum 是 24 CSS px（有例外），本產品自主採 52–56 CSS px。Apple 一般 target 建議 44×44 pt；CSS px 不宣稱與所有裝置 pt 一致。來源：[W3C Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)、[Apple UI Design Tips](https://developer.apple.com/design/tips/)。
- 必須支援文字至少 200%，320 CSS px 寬的內容 reflow；使用者指定 text spacing 不得喪失內容。來源：[Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)、[Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)、[Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)。移除 viewport 禁止縮放；不用 `overflow-x:hidden` 掩蓋超出問題。
- 符號強化文字，不取代重要名稱。keyboard / VoiceOver 能完成同一操作；focus 可見、進出 modal 有合理順序，背景 inert/焦點 trap 由既有 dialog 系統管理。動作完成透過 status 播報；錯誤需要文字指示。來源：[Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)、[Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)。
- 大字應讓 layout 改變，不放大無助於閱讀的裝飾；可讓低頻細節逐步展開；文字與圖片分開處理。來源：[Apple WWDC24 Get Started with Dynamic Type](https://developer.apple.com/videos/play/wwdc2024/10074/)。
- 易讀預設安靜；僅操作結果允許 160ms 的透明度進場，無位移。系統或 App 的 Reduce Motion 開啟時完全停用。取消裝飾 motion 不可把 modal 永久留在隱藏 keyframe 狀態，JS 必須走同一 reveal 結果 lifecycle。這是實作驗證點，不能只看 CSS 通過。

## 驗收邊界

必須跨 default／sweet／twilight、一般與易讀、16／20／24px root、320／390px／桌面寬度檢查主要畫面。一般模式截圖與原行為比較；資料快照核對模式切換不改任務、wallet、收藏、親密度；實際 task CRUD／完成／取消完成／召喚確認／取消／成功／收藏／寵物／探險／設定／modal／錯誤／備份流程由整合測試確認。

自動化可驗證 DOM 名稱、target bounding boxes、focus 移動、橫向 overflow、偏好 persistence、縮放 reflow、減少動態、部分 contrast 與業務 state。iPhone PWA safe-area、Safari text autosizing、實體觸控、VoiceOver 播報順序與 60–80 歲使用者的理解度屬人工／實機驗收；未執行前標為未測，不以桌面模擬取代。

獎項品牌作為內部設計批判角度：易學性、清楚操作、包容性、視覺一致、情感與真實效益。不能憑內部自評宣稱達到官方評審標準；最終品質仍需畫面審查與使用者驗證。


