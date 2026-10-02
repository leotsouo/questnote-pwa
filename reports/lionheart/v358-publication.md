# 獅心城・逆造之誓 — V3.5.8 正式發布

發布已完成。使用者驗收實際 V3.5.8 整包後明確回覆「可以發布」；人工驗收及授權綁定同一 packageHash，releaseReady 為 true。

正式站：[QuestNote](https://leotsouo.github.io/questnote-pwa/)。12隻新角色、雙 UR「天律之冕・格里芬／逆造獅首奇美拉」、爐香齒輪酥、獅心城、五里程碑、偏好、明確專長與四章羈絆均隨同一整包上線。格里芬純生物，奇美拉半生物半機械，持續敵對；沒有光／暗系角色。風流、上升蒸氣與先完整展翼後顯卡演出保留。

## 核准與提交

- PackageHash：94e77b9be64b777d9c11bca74acc915759f7f9cf8eb246ad1a5b7116e9acf94e
- Candidate：5fffbec403504c76f2e3729d8b0d9eb2bdf8ba20f7e68d60781b121bacaed539
- Reviewed runtime source：d42b8fc44dc3c55f39ca0dee138fb30d114e85c6
- Source promotion：e136575bf047097c6727a1748d1105f3e98b5eef
- [來源 PR #51](https://github.com/leotsouo/questnote-pwa/pull/51)；merge：6dd2551c1ca4ee41309c042bc1c67b80012fc6e3；PR及 main Validate均成功。
- Production artifact：0f04afb6f8d0b4e447b20320524b63c39203469035478aea97a9929c5da897ba
- Manifest SHA-256：7e711b7f8c989544aadbc106f46d33d426fc0e0f6f488d3b4fd5207cf826b617
- Pages commit：6cdfdcdd1bd7201081e0af95dec9c9c58818cbae
- [Pages deployment](https://github.com/leotsouo/questnote-pwa/actions/runs/36984636232)：成功。

來源提升與部署分別記錄。四份catalog、四份companion catalogs及36份卡圖／衍生圖使用同一candidate，既有116隻資料及legacy相容快照未改。Git blobs核對44個來源提升檔案與605個部署檔案通過。正式發布直接推送已驗收的不可變產物，沒有重組核准bytes；gh-pages既有 .gitattributes（* -text）只作Git metadata保留。

## 驗證

正式 HTTPS 檢查完成時間：2026-10-02T08:36:29.771Z。完整605個artifact檔案（含manifest）以原始正式URL讀回，比對SHA-256及bytes，0不符。正式版本V3.5.8，128隻寵物／6池，本池12隻。卡圖、專屬動畫、伴隨資料、release descriptor、SW及precache資源均匹配。詳細讀回及Git blob證據見 v358-production-https.json／v358-git-pins.json。

- 來源提升後 npm test：277整合、11主題、5動畫及揭示流程斷言通過。3項未發布資料假設的測試已使用凍結舊名單或runtime相同故事合併；初次失敗原始log以gzip保留，runtime未因此改动。
- pools:validate、128隻×2尺寸images:check、完整卡池發布排演通過。
- 實際immutable artifact：玩法12項、動畫10項、桌面／手機各4項展翼、SW13項通過。
- 正式V3.5.7原始產物→此次實際上線V3.5.8的7項更新檢查通過，包括離線啟動、原五store／主題保留、未完成UI及多視窗阻擋。
- 正式SW cache：questnote-production-app-0f04afb6f8d0b4e447b20320524b63c39203469035478aea97a9929c5da897ba；正式HTTPS bytes與上述測試產物完全相同。

更新測試只使用新建loopback origin測試存檔，没有操作正式玩家DB。覺醒、今日習慣與標準池UR輪播保留；最新提醒修復來源已整合，這次未重新部署提醒後端。原authoring workspace、歷次圖稿、receipts、candidates、產物與審核記錄均保留。
