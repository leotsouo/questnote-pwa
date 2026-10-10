# QuestNote Marketing：小事，有回音。

## Audit 與真實產品

2026-10-01 從 fetch 後的 origin/main `23d8cdc` 建立 `codex/questnote-marketing`。App V3.4.34；root 與 main-integration 的功能草稿皆保留。閱讀 README、AGENTS、project-governance、theme-design-system、art-assets、three-theme-audit、three-theme-jury-review、summon design、collectionService、rewardService、taskService、expeditionService/gameplay、onboarding 與 shareService，並實際啟動 App。此版 repository 未找到名為 PRD 或 DECISIONS 的獨立檔案；維護中的設計文件與服務實作是此次產品證據，未借用歷史根目錄作部署依據。

任務：生活內容、今日計畫、分類、優先程度、子任務。一般任務首次完成給 20 星塵、1 冒險能量、5 親密度；重要／緊急另有真實規則。重複切換不重領。親密度累積解鎖暱稱、台詞與故事，非任務一次完成立即外觀變大。星塵進入召喚，角色進入圖鑑；冒險能量派遣 1–3 位夥伴，帶回材料、星塵、親密度與旅程報告。首頁不是另一個戰鬥遊戲；任務與夥伴共同成立。

實際操作 3 themes × 4 views，截圖在 `reports/marketing/product-audit/`。全新 ephemeral localhost / disposable Playwright context，沿用專案安全 guard 建立樣本；阻擋外部請求與 SW，未更動使用者或 production 存檔。網站 screenshots 為同一份五件任務、两件完成、灰影幼狼與合成圖鑑存檔的真實 App 渲染；明確標示示範資料。

星夜：深藍、俐落、營地暖燈、探索。晨光：cream／rose／sage，照顧與溫柔。暮光：森林夜景、紙頁、章節 serif、共同記錄。共同 DNA：Adventure、Companion、Growth、Warmth、restrained Magic。Marketing 選「森林夜色 × 溫暖紙頁」單一方向，沿用原幼狼灰黑毛、尖耳、藍眼、深吻部。沒有重生成另一套角色，也沒有三套網站 skin。三套 App 氣氛只在次要短章節展示。

## 10 組 Hero Headline 比較

5 分尺度是作者內部判斷，不是用戶研究或正式評審分數。依清晰／情感／記憶／差異／台灣語感。

| Headline | 清晰 | 情感 | 記憶 | 差異 | 語感 | 判斷 |
| --- | --- | --- | --- | --- | --- | --- |
| **今天的待辦，成了你們的冒險。** | 5 | 4 | 5 | 5 | 5 | 選用；直接連接待辦、同行與世界 |
| 完成一件小事，收到牠的回應。 | 4 | 5 | 5 | 5 | 5 | Campaign 衍生句；需補冒險定義 |
| 每個打勾，都讓你們更靠近。 | 4 | 5 | 4 | 5 | 5 | 親密度強，世界較弱 |
| 讀完幾頁，和牠再走一小段。 | 3 | 5 | 5 | 4 | 5 | 很有人味，適合 Social |
| 今天做的小事，牠都收到了。 | 3 | 5 | 5 | 5 | 5 | 回音概念強，首次理解較慢 |
| 讓每天的待辦，有個一起前進的夥伴。 | 5 | 4 | 3 | 5 | 4 | 清楚但過長 |
| 把生活的小事，寫成你們的旅程。 | 4 | 5 | 4 | 4 | 5 | 品牌旁白 |
| 你完成今天，牠陪你走向明天。 | 3 | 4 | 4 | 4 | 4 | 「完成今天」稍抽象 |
| 一件事做完了，一段故事往前了。 | 4 | 4 | 5 | 4 | 5 | 缺角色，適合章節 |
| 任務是日常，同行是魔法。 | 3 | 4 | 5 | 5 | 4 | 廣告句強，Hero 定義較弱 |

## 首頁故事

1. Hook + Aha：Hero 第一屏定義生活任務／夥伴成長，夜色與今日任務連成同一場景。立即 tap 讀書 30 分鐘。刻意把 Demo 提前，比長 Features 解釋更快。
2. 完成以後：勾不只是結束；現實讀書連到親密度。沒有攻擊其他工具。
3. 夥伴：大幅暮色灰影幼狼與真實 Lore 台詞，親密度累積解鎖故事。
4. 世界：星塵→相遇→圖鑑，能量→探險→帶回旅程；兩個圖像章節，沒有 feature grid。
5. 真實產品：4 個可切換的實際畫面。只顯示一张，減少手機 mockup 疲勞。
6. 氣氛：三張短篇場景，次要呈現 App 選擇。
7. CTA：「下一件小事，有牠陪你。」真實 PWA distribution，加上裝置存檔與備份簡述。

## 三個 Campaign Concepts

| Concept | Headline | Visual direction | Social format | CTA |
| --- | --- | --- | --- | --- |
| A 今天的 Quest | 讀完這幾頁，牠也靠近了一點。 | 讀書任務完成連到親密度 10→15，星夜灰狼 | 1080×1350 靜態單張；Threads 可配短文字；未來可做 6 秒完成演出 | 完成一件小事，看看牠的回應 |
| B 小事的份量 | 今天沒有大事。有一件小事做完了。 | 出門走走，暮色幼狼與「你的腳步，我聽得見。」 | 1080×1350 IG；Stories 可另裁 9:16，未在本輪假裝已出 | 下一件小事，有牠陪你 |
| C 打勾以後 | 打勾以後，還有牠的回應。 | 整理書桌，✓ 加上真實三種收益，不用通用 XP | 1080×1350；未來 before/after carousel | 開啟 QuestNote |

Master 與三张 concept 位於 `reports/marketing/social/`。公開 OG JPEG 1200×630。皆使用既有正式角色圖，不是 Logo + gradient。QR code 應指向 canonical；不同社群使用 UTM，不放個人資料。

## Design System

Tokens 在 `marketing/styles.css`：paper #f4f1e8、ink #263d37、night #101d2b、gold #e4c38c、green #466950。中文 display 本機宋體系、body 本機黑體系，不下載字體。Mobile display 31–40px、heading 25–30px、body 14–16px、caption 10–12px、CTA 14px；desktop display最高56px。4px 基礎 spacing scale、有限的紙頁與章節、低密度 UI。動態160／550／720ms，只服務完成、進度與角色回應；reduce motion 全部關閉，沒有 scroll hijack、影片或依賴動畫才能讀的文字。
