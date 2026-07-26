# QuestNote 全域信箱發布指南

本文件說明如何透過 `data/global-mailbox.json` 向所有 QuestNote 裝置發布公告與補償。

## 現實限制（請務必理解）

- 本系統是 **每份本機資料領取一次**（once per local profile）
- **不是**每個帳號一次、每個真人一次
- 清除本機資料／IndexedDB 後，補償可能再次可領
- 無法做到跨裝置防重複
- 無法做到真正推播；使用者需開啟 App、回到前景或手動刷新才會取得
- 所有裝置拉取同一份公開 JSON；無法精準指定某一使用者

請勿在公開文件或 App 文案宣稱「每個帳號只能領一次」或「絕對防重複」。

---

## 發布流程總覽

1. 編輯 `data/global-mailbox.json`
2. 新增一封具有**全新唯一 ID** 的信件
3. Commit 並部署 GitHub Pages
4. 使用者下次開啟 App、回到前景（超過節流時間）或手動刷新信箱時取得

原則上：

- **不需要**更新 `APP_VERSION`
- **不需要**修改 Service Worker URL
- **不需要**發布新的 JavaScript

只更新 `data/global-mailbox.json` 即可。

除非信件格式本身升級（schemaVersion 變更），否則不要因每封新信都更新 App 版本。

---

## Message 範本

### 公告／更新／維護

```json
{
  "id": "2026-07-example-announcement",
  "type": "announcement",
  "title": "標題",
  "body": "純文字正文。\n可用換行。",
  "publishedAt": "2026-07-26T12:00:00+08:00",
  "expiresAt": null,
  "priority": "normal",
  "enabled": true,
  "minAppVersion": "3.0.0",
  "maxAppVersion": null,
  "icon": "📮",
  "reward": null,
  "action": {
    "type": "view",
    "view": "handbook",
    "label": "查看冒險手冊"
  }
}
```

### 補償

```json
{
  "id": "2026-07-example-compensation-01",
  "type": "compensation",
  "title": "補償標題",
  "body": "感謝你的等候，請收下補償。",
  "publishedAt": "2026-07-26T12:00:00+08:00",
  "expiresAt": "2026-08-31T23:59:59+08:00",
  "priority": "high",
  "enabled": true,
  "minAppVersion": "3.0.0",
  "maxAppVersion": null,
  "icon": "🎁",
  "reward": {
    "stardust": 100,
    "adventureEnergy": 3,
    "materials": {
      "forest_leaf": 2
    },
    "items": {
      "item_small_spirit_food": 1
    }
  },
  "action": null
}
```

---

## 如何產生唯一 message id

建議格式：

```text
YYYY-MM-用途-簡稱
```

例如：

- `2026-07-v300-launch`
- `2026-07-maintenance-compensation-01`

規則：

- 必須全域唯一
- 發布後不可重複使用
- 發布後不可把同一個 ID 換成另一封不同信件
- 同一個 ID 若已被裝置標記為領取，即使後續修改 reward，也**不得再次領取**
- **需要重新發送補償時，必須使用全新的 ID**

---

## 發布公告

1. 複製 message 範本
2. 產生新 ID
3. 設定 `type` 為 `announcement` / `update` / `maintenance`
4. 設定 `publishedAt`
5. 設定 `expiresAt`（或 `null` 表示不過期）
6. 不填 `reward`（或設為 `null`）
7. Commit 與部署 GitHub Pages

## 發布補償

1. 使用全新 ID
2. `type` 設為 `compensation`
3. 設定合法 `reward`
4. 檢查安全上限（見下方）
5. 設定到期時間（強烈建議）
6. Commit 與部署

---

## 允許的 type

- `announcement`
- `update`
- `maintenance`
- `compensation`

未知 type 不會讓整個信箱失敗；會被正規化或忽略。

---

## 發布與到期時間

只顯示：

- `enabled === true`
- 目前時間 `>= publishedAt`
- 目前時間 `<= expiresAt`，或 `expiresAt` 為 `null`

無效日期的信件會被忽略，不會讓整份 JSON 失效。

到期信件：

- 不列入未讀數
- 不顯示於一般清單
- 已領取紀錄可保留在本機

---

## App 版本條件

- `minAppVersion` / `maxAppVersion` 使用語意化版本比較
- 不符合條件的信件預設不顯示

---

## 允許的 reward 類型

只允許：

- `stardust`
- `adventureEnergy`
- `materials`（現有材料 catalog id）
- `items`（現有工坊道具／inventory item id）

禁止透過信箱直接發送：

- 寵物、寵物碎片
- 指定 UR、抽卡保底次數
- 稱號、成就、收藏徽章
- 羈絆等級、探索度
- 付費貨幣、未知自訂欄位

### 安全上限（誤填防護，非平衡建議）

| 欄位 | 每封上限 |
|------|----------|
| stardust | 5000 |
| adventureEnergy | 100 |
| 單一材料 | 999 |
| 單一道具 | 99 |

超過上限或格式錯誤：整封補償不可領取，不會部分發放。

---

## 內部 Action

第一版只允許：

```json
{ "type": "view", "view": "handbook", "label": "查看冒險手冊" }
```

合法 View：

- `tasks`
- `gacha`
- `collection`
- `expedition`
- `workshop`
- `achievements`
- `settings`
- `handbook`

禁止：

- 執行 JavaScript
- 任意函式名稱
- 任意 CSS selector
- 任意 HTML
- 外部 URL

---

## 更正錯誤

若尚未被大量裝置取得：

- 可將 `enabled` 改為 `false` 撤下

若需要重新發送：

- 建立新 ID
- **不得重用舊 ID**

若 reward 寫錯：

- 不要直接修改已發布信件並期待已領者重領
- 建立新的更正補償信（全新 ID）

---

## body 規則

第一版只允許純文字與換行。

禁止遠端 HTML、`<script>`、iframe、Markdown HTML、onclick、style attribute。

---

## 部署到 GitHub Pages

1. 修改並 commit `data/global-mailbox.json`
2. Push 到 GitHub Pages 對應分支
3. 等待 Pages 部署完成
4. 在 App 內開啟信箱並點「刷新」，或稍後重新開啟 App

不要把動態信箱 JSON 放進 App Shell precache；它由 Network First 動態取得。

---

## 哪些欄位發布後不要隨意改

- `id`：絕對不要改成另一封信的意義
- 已大量領取後的 `reward`：不要期待已領者重領
- `schemaVersion`：除非格式升級，否則維持 `1`

可安全調整（影響未過期且尚未不符合條件的裝置）：

- `enabled`
- `expiresAt`（提早結束）
- `title` / `body`（僅影響之後重新取得的顯示；已讀狀態仍依 id）

---

## 不要放入本文件或前端的內容

- 管理員密碼
- API 金鑰
- 任何後端憑證
- App 內發信後台
