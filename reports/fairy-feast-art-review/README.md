# 霓霞仙膳：全池中途審圖

本批圖組 `e10eee23efcd018c589073d229c25fcc01f7b5a46dc217c5180afa251b248620` 包含 12 張初遇靈獸、4 張 SSR／UR 覺醒仙女、1 張地區 WebP。深淺各 6 隻；月露雪鹿兩張沿用先前人工核准原檔，其餘 14 張新卡圖與地區轉換版本待本次人工審閱。原地區概念圖已核准；新 WebP 只轉換格式與比例。

審圖頁：<http://127.0.0.1:4190/content/pet-series/aurora_fairy_feast/review.html>。每隻列出辨識特徵、故事動作、可見結果、原創來源、完整對話與羈絆故事；提供 320px 縮圖、原圖與前版比較。圖片與生成紀錄保存在 authoring workspace，四個未選用的初版保持原檔。

## 已完成驗證

- `node scripts/card-pool.mjs validate aurora_fairy_feast`：通過，沒有 errors；初始 10 隻、擴充後 12 隻，舊資料沒有修改／移除。警告為新寵物未加入標準池及較大原圖，保留高品質母圖，正式尺寸處理在後續 images／staging 階段完成。
- `node scripts/build-fairy-feast-review.mjs`：17 張完整像素解碼通過，卡圖 1254×1254 PNG、地區 1600×900 WebP；記錄 SHA-256。
- `node scripts/verify-fairy-feast-art.mjs`：18 份生成紀錄的原始輸出與保存副本 bytes 完全一致，圖組 hash 全部吻合；有效 10 個地區圖片完整解碼且都在 source precache。結果見 `source-verification.json`。
- `npm run images:check`：既有 160 隻 × 2 尺寸與現有 9 地區通過。新增第 10 地區由上項有效目錄檢查覆蓋；尚未把新池合入正式目錄。
- `node --test devtools/expedition-art.test.mjs devtools/aurora-fairy-feast.test.mjs`：7／7 通過。前一 runtime checkpoint 的 130 項相關測試亦已通過，見 `../fairy-feast-runtime-checkpoint.md`。
- In-app Browser 實測：1280×1000、393×852、320×852 的主圖 17／17 載入成功，document 水平溢出皆為 false。實際切換 320px 縮圖、SSR 定位、Lore 展開、N 定位、地區定位與玄鴞前版比較；故事文字、地區地標和操作可讀。截圖保存在本目錄。

## 下一個關卡

本次沒有把 AI 判讀寫成人工通過。Brief／plan／content／prompts 的四份 AI receipts 保持不變，images 階段待使用者對這個確切圖組確認後才核准並 staging。

後續仍須產生正式圖片尺寸與四個覺醒資源、接入實際 companion catalogs、隔離 artifact／動畫檢視頁，以及 App 內抽卡、料理、專長、派遣雙畫面裁切、Service Worker 更新和離線驗收。本頁是圖片審閱，不能代替這些整包證據。沒有合併、push、部署或發布授權。

交接提到的 Library 尚無可呼叫的上傳工具，本次在 repository 留存可讀本機原檔，沒有建立或聲稱任何 `library_file_id`。
