# 依人工框選修正：高清結果與稀有卡區塊

使用者指出結果圖模糊，並要求重新設計UR卡圖／文字區。v3取代v2視覺版本；舊圖片核准保持有效，整包發布授權仍未取得。

模糊原因為檢視頁 `#result img` 使用384px card縮圖且單張撐滿寬度。現在改用960px stage圖。正式App大型結果原本即用stage圖；960px圖片適合手機正常尺寸，但不能承諾任意放大或真機顯示皆相同。

異常小圓點來自空白 `.summon-reveal-title` 被套上背景、圓角與padding。新版將空白副標隱藏，移除卡後光環及粒子，背景地景降為淡色；採用粉紫卡框、較大完整正方形插畫與獨立稀有度徽章。名稱與稱號改為同一視覺層級的深色文字，避免多個獨立色塊。

實測新artifact：`6f189b3e4544d6ebe00f1461b89af654ea35c0e9fc3d8900e7a1ba6bb776b494`，凍結來源 `29e28aa87f418f417337c2a95eeb600f7f556e3a`，詳細preview／production pins見 `artifacts-v3.json`。相對v2，runtime sourceFiles僅 `src/aurora-fairy-feast.css` 改變，contentBundleSha256相同；抽卡交易、料理、試煉、地區及SW程式均未改。既有非視覺驗證沿用v2的實際環境與pins，不宣稱已重新跑正式HTTPS或真機。

播放頁：http://127.0.0.1:52007/review/ 。903px桌面卡框420×547.69，插畫解碼960px；393px手機卡框338.26×471.58、頂部190.21，scrollWidth378，空白副標display:none。手機結果圖原生960px／顯示312.67px；原始主題月露雪鹿、甜夢曜夜玄鴞、暮光霧靛羽鵠皆可播放並繼續。

桌面與手機證據見 `redesign-desktop-v3.jpg`、`redesign-mobile-v3.jpg`。8組新池／共用時間 targeted tests通過。新版10組動畫回歸結果見 `animations-v3.json`。時間、略過、順序、失敗回退與交易狀態仍由共用控制器維持。

此為使用者要求的局部視覺修訂，未修改原插畫bytes或抽卡機率；未發布。v2 release-review.json僅保留歷史，不能用其packageHash授權v3發布。新版人工整包核准需綁定v3 pins。
