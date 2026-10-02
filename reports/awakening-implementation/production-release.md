# V3.5.5 覺醒與雲棧古道 — 正式發布收據（2026-10-02）

[正式App](https://leotsouo.github.io/questnote-pwa/) 已發布二十隻覺醒、雙形態、專屬故事／稱號／陪伴回應／演出、張口朱息的丹砂鎮嶺蛤，以及960×540雲棧古道插畫。親密Lv.5並领取Lv.5故事後可接下試煉；三筆日常完成與一次接下後出發的本人古道派遣領獎，保證取得信物。儀式消耗信物及松香行旅糰。原卡池、稀有度、經濟、四章故事、古道五里程碑與今日習慣保留。

## 來源、核准與產物

- [PR45](https://github.com/leotsouo/questnote-pwa/pull/45) 合併：5ae4f83d4119012f933309cdefc8e1c536b9ae0b。核准記錄提交42f6865的[CI](https://github.com/leotsouo/questnote-pwa/actions/runs/36972391331)成功。
- 固定runtime/art來源：38242746077131d08d7d4c38b8e0af3470e50e81。後續驗收與發布文件沒有更動runtime/資料/圖片的位元組。
- 整包：930a18cec4a3d7f6ac3a79532b760b0522c21d00130d67d01e7ce73e5e2393fb。使用者回覆「審核通過」，其後明確「可以發布」；記錄於human-acceptance.json、publication-authorization.json與evidence.json。
- 正式artifact：24d38b6793d3e5cec64e1aa896c7832c2c4a104a4e9851c8bb728edf052b1769；manifest SHA256：113b2182285c641a9930c76879f0fe1f612a1a38a5df5723318c7e18520cf0c3。
- gh-pages：567266bc64e57b48824e8cf148096147272f2bf3；[Pages36972761813](https://github.com/leotsouo/questnote-pwa/actions/runs/36972761813)成功。
- 原正式V3.5.4產物1a1a51c938ee04c1300caedf019efdd17f8b3a706442d35936bb5b9ff493c842、所有前版圖片與舊SVG保留；新的形態用途認可另記於content/awakening/swordwild-shanhe/usage-approval.json。覺醒文件獨立，未加入卡池SOP。

## 驗證

274項Node檢查與召喚斷言、11組覺醒App、20組雙形態／40場演出、原卡池回歸及12組profile/worker驗收已通過。556個正式Git blob及556個正式HTTPS檔案逐一符合核准產物；正式瀏覽器确认V3.5.5、QuestNoteDB、二十隻／80張形態縮圖與舞台圖、張口蛤、新地圖、今日習慣、演出與離線重載。

原生HTTPS更新以固定V3.5.4路由fixture啟動隔離瀏覽器，再從正式HTTPS取得V3.5.5，使用App更新按鈕套用；合成存檔保留、舊app快取清除、離線重載成功。沒有修改使用者的正式瀏覽器存檔；實體手機／已安裝PWA仍依裝置檢查。相關記錄：production-https.json、production-https-browser.json、production-update.json與deployment-status.json。

舊版App可用既有更新按鈕套用；若其他視窗阻擋套用，關閉其他QuestNote視窗再更新。
