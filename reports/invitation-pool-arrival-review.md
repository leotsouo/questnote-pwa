# 指定邀請沿用卡池角色登場 — V3.6.1

2026-10-03。使用者要求：確認邀請後，直接播放該角色原本在卡池中獎時的動畫，增加獲得角色的儀式感。

確認→原子扣除相遇碎片並加入收藏→角色所屬卡池的 SSR／UR 登場演出→邀請結果／設為同行。沿用 `playCeremonyCharacter`／`playSummonReveal` 與實際角色 reveal motif；SSR 2.5 秒、UR 4.5 秒，共用召喚時間。移除原本獨立 2.3 秒邀請動畫，不插入隨機抽卡或卡池前奏。

邀請角色的 `seriesId` 決定演出，與召喚頁目前選中的卡池無關。Native dialog 暫時離開 top layer，讓原本的 body overlay 可見且可操作，演出結束後恢復結果與鍵盤焦點。演出失敗仍保留已完成的收藏與餘額，提示重看；不誤報未扣款。略過、Escape、重播皆由既有登場演出處理，不再次提交邀請。Reduced Motion 直接回結果並朗讀已加入收藏。

## 驗收

- `npm test`：310＋14＋12，共336次測試執行通過，另有 reveal-flow 邏輯斷言。
- 新增6項邀請交接測試：提交順序、忙碌時重按、native close 事件、重播不扣款、儲存與演出失敗分離、減少動態、舊演出完成不覆蓋新畫面。
- 原生 IndexedDB 隔離資料驗收7／7。只使用隨機 QuestNoteTest-Encounter 測試資料庫。
- 實際 App：召喚頁仍在「星旅之原」，邀請「天律之冕・格里芬」後確實播放 `lionheart_griffin` 演出；動畫期間 invitation dialog 沒有 open 屬性，完成後恢復結果。
- 實際餘額202→2；重播並略過後仍2；設為同行成功。星塵2450、SSR保底7／30、UR保底27／100維持原值。
- 原型：邀請「逆造獅首奇美拉」播放 `lionheart_chimera`，242→42，完整登場後返回收藏結果；原型與 App 使用相同演出 adapter。
- SSR原型：「琉糖星翼蝶」沿用 `is-sugar-reveal` 與2500ms共用時間，242→142；Reduced Motion邀請「風眼誓鴉」直接顯示結果、成功status文字，overlay數0、host未隱藏。

[UR原卡池演出](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/invitation-pool-arrival-ur.png) · [原型結果](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/invitation-pool-arrival-result.png) · [實際App演出](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/invitation-pool-arrival-native-ur.png) · [實際App結果](C:/Users/User/.codex/visualizations/2026/10/03/01a1011a-9936-78b1-a5bd-95a0cb2f9051/encounter-invitation/invitation-pool-arrival-native-result.png)。

本次完成來源與本機瀏覽器驗收，更新版本及SW cache identity；沒有合併main或部署正式站。V3.6.0不可變artifact與其17／17驗收仍只代表上一版；本次不將那些產物冒稱為V3.6.1。實機iPhone／VoiceOver仍待裝置驗收。
