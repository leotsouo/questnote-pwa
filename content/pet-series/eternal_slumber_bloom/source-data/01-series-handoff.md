```

```

```
# QuestNote｜永眠花海首發 12 隻寵物交接摘要

本文件整理「永眠花海」首發 12 隻寵物已確認的系列資料、角色順序、稀有度、圖片對應與 Builder 技術欄位。

本文件不包含正式寵物 ID。正式 ID 必須由 Pet Series Builder 掃描既有資料後分配，不得手動假設或回填缺號。

---

## 1. 系列資料

```text
系列名稱：永眠花海
卡池名稱：永眠花海召喚

seriesId：eternal_slumber_bloom
poolTag：eternal_slumber_bloom

首發總數：12 隻
稀有度配置：
N ×3
R ×3
SR ×3
SSR ×2
UR ×1
```

本系列屬於獨立限定系列。

12 隻新寵物統一使用：

```

```

```
{
  "seriesId": "eternal_slumber_bloom",
  "poolTags": ["eternal_slumber_bloom"]
}
```

不得加入：

```

```

```
standard
event_dragon
dragon_event
```

未來曾規劃再追加 4 隻，使完整系列達到 16 隻，但追加角色尚未設計，不屬於本次首發範圍。

---

## 2. 系列世界觀

永眠花海是一處存在於清醒與深眠之間的古老夢境花庭。

進入沉睡的生命，其尚未完成的情緒、記憶與夢境碎片，會化為夢塵落入花海。平靜的夢會孕育夜光花朵；混亂、破碎或尚未完成的夢，則會沉入鏡池、夢土或花潭，由不同的花海生物搬運、保存、修補、淨化或引導。

整座花海具有完整的夢境生態：

- 花眠蜜鼯搬運散落夢塵。 
- 苞燈蕈靈照亮花海邊緣與根系小徑。 
- 霧絮海蛞沿低地傳遞夢霧。 
- 鏡池浮水母收集散落的記憶與碎夢。 
- 夢壤穿山甲整理夢土與地下安全通道。 
- 鈴蕊果子狸收集夢果並替迷途者留下路標。 
- 霧紗夢蛛修補破裂的夢境邊界。 
- 花庭旋角羚引導旅人穿越不斷變動的花庭。 
- 琉夢花螈保存尚未完成的夢。 
- 寂繭眠蛾編織覆蓋花海上空的夢幕。 
- 鏡夢花貘吞噬並淨化惡夢。 
- 永眠花皇兔維持整座花海沉眠與甦醒的循環。

---

## 3. 系列視覺規範

### 主色

```

```

```
深藍
霧紫
月白
```

### 輔色

```

```

```
淡粉
幽綠
琉璃藍
柔金
```

### 共通視覺元素

```

```

```
夜光花瓣
夢霧
星屑花粉
半透明植物
漂浮花苞
月光
鏡池
花庭遺跡
古老拱門
垂掛花燈
發光夢塵
```

### 整體風格

```

```

```
高細節奇幻寵物插畫
神秘
靜謐
高級
夢幻
具有卡牌遊戲限定系列收藏感
```

設計上已刻意避開既有大量龍、鳳凰、麒麟、機械龍與星龍類套路。

本系列不得被簡化為：

```

```

```
全部粉紅
全部戴花冠
全部幼齡吉祥物
同一物種換色
高稀有度只增加光效
```

每隻角色必須保留清楚的物種、剪影、體型、職能與稀有度差異。

---

## 4. 圖片規格

12 張最終圖片均已完成，並已完成 1:1 比例修正。

目前統一規格：

```

```

```
格式：PNG
尺寸：1254 × 1254
比例：1:1
背景：完整場景背景
透明背景：否
圖片文字：無
卡片 UI：無
稀有度標誌：無
額外外框：無
```

1024 × 1024 僅為原先建議尺寸，不是必要條件。

若 Pet Series Builder 接受 1254 × 1254：

```

```

```
保留目前尺寸
不要重新取樣
不要覆寫原始圖片
```

如果 Builder 對圖片尺寸存在硬性限制，應先停止並回報，不得擅自壓縮或裁切。

所有來源圖片應保留備份。Builder 需要正式檔名時，應複製圖片，不得直接搬移或覆寫來源檔。

寵物圖片不得加入 Service Worker App Shell precache。

---

## 5. 首發 12 隻固定順序


| 順序  | 稀有度 | 正式名稱  | 物種／原型     | 一句話定位                 | 來源圖片      |
| --- | --- | ----- | --------- | --------------------- | --------- |
| 01  | N   | 花眠蜜鼯  | 蜜袋鼯       | 在花枝間滑翔並搬運夢塵的小型夜行居民    | 花眠蜜鼯.png  |
| 02  | N   | 苞燈蕈靈  | 蕈類精靈      | 從未開花苞下誕生、照亮花海邊緣的微光菌靈  | 苞燈蕈靈.png  |
| 03  | N   | 霧絮海蛞  | 幻想海蛞蝓／裸鰓類 | 在近地花霧中緩慢滑行並傳遞夢霧的柔軟生物  | 霧絮海蛞.png  |
| 04  | R   | 鏡池浮水母 | 漂浮水母      | 漂浮於鏡池上方，收集散落的記憶與碎夢    | 鏡池浮水母.png |
| 05  | R   | 夢壤穿山甲 | 穿山甲       | 翻鬆夢土並開闢通往花庭深處的安全通道    | 夢壤穿山甲.png |
| 06  | R   | 鈴蕊果子狸 | 果子狸       | 收集夢花果實，並以花燈與果實微光引導迷途者 | 鈴蕊果子狸.png |
| 07  | SR  | 霧紗夢蛛  | 園蛛／圓網蛛    | 以月白夢絲修補破裂的夢境邊界        | 霧紗夢蛛.png  |
| 08  | SR  | 花庭旋角羚 | 旋角羚羊      | 引導迷失者穿越不斷改變路徑的花庭      | 花庭旋角羚.png |
| 09  | SR  | 琉夢花螈  | 大型夢境螈類    | 在靜眠花潭中保存尚未完成的夢境       | 琉夢花螈.png  |
| 10  | SSR | 寂繭眠蛾  | 巨型絲蛾      | 編織覆蓋永眠花海上空的夢幕         | 寂繭眠蛾.png  |
| 11  | SSR | 鏡夢花貘  | 夢貘／貘      | 吞噬鏡池中的惡夢並將其淨化為夢水      | 鏡夢花貘.png  |
| 12  | UR  | 永眠花皇兔 | 大型夢境垂耳兔   | 維持花海沉眠與甦醒循環的古老主人      | 永眠花皇兔.png |


名稱、稀有度、順序與圖片對應均已鎖定，不得交換或重新分配。

---

## 6. Builder 技術欄位固定表


| 名稱    | speciesType          | pets.json element | visualTheme                   | pets-lore.json element |
| ----- | -------------------- | ----------------- | ----------------------------- | ---------------------- |
| 花眠蜜鼯  | sugar_glider         | dream_dust        | moonlit_dreamdust_glider      | 風                      |
| 苞燈蕈靈  | mushroom_spirit      | spore_light       | bud_lantern_fungal_spirit     | 光                      |
| 霧絮海蛞  | nudibranch           | mist_aether       | mistfrill_garden_slug         | 水                      |
| 鏡池浮水母 | jellyfish            | memory_water      | mirrorpool_memory_jelly       | 水                      |
| 夢壤穿山甲 | pangolin             | dream_earth       | moonpetal_burrow_keeper       | 土                      |
| 鈴蕊果子狸 | masked_palm_civet    | dream_fruit       | bellflower_fruit_guide        | 木                      |
| 霧紗夢蛛  | orb_weaver_spider    | dream_silk        | moonveil_dream_mender         | 暗                      |
| 花庭旋角羚 | spiral_horn_antelope | path_light        | moonlit_garden_guide          | 風                      |
| 琉夢花螈  | salamander           | slumber_water     | pastel_dreampond_keeper       | 水                      |
| 寂繭眠蛾  | silk_moth            | dream_veil        | faceless_cocoon_weaver        | 暗                      |
| 鏡夢花貘  | tapir                | nightmare_water   | mirrorpool_nightmare_purifier | 暗                      |
| 永眠花皇兔 | lop_rabbit           | dream_flora       | moonlit_flower_sovereign      | 木                      |


`speciesType` 只表示物種本身。

夢境、花卉、場景與角色職能應放在：

```

```

```
element
visualTheme
lore
description
```

不得擅自將 `speciesType` 改成帶有大量世界觀形容詞的分類值。

---

## 7. pets.json 預期結構

每隻寵物最終應建立：

```

```

```
{
  "id": "由 Pet Series Builder 分配",
  "name": "正式名稱",
  "rarity": "N / R / SR / SSR / UR",
  "image": "由 Builder 根據正式 ID 建立",
  "description": "讀取 03-field-supplement.md",
  "poolTags": ["eternal_slumber_bloom"],
  "seriesId": "eternal_slumber_bloom",
  "speciesType": "依固定表",
  "element": "依固定表的英文技術值",
  "visualTheme": "依固定表"
}
```

不得加入 `standard`。

---

## 8. pets-lore.json 預期結構

每隻寵物最終應建立：

```

```

```
{
  "id": "與 pets.json 完全相同",
  "title": "讀取 03-field-supplement.md",
  "personality": ["性格一", "性格二"],
  "element": "中文元素",
  "lore": "讀取 02-lore-dialogues.md",
  "dialogues": {
    "normal": [],
    "urgent": [],
    "important": [],
    "praise": [],
    "idle": [],
    "bondUp": [],
    "summon": ""
  },
  "bondUnlocks": {
    "2": "",
    "3": "",
    "4": "",
    "5": ""
  }
}
```

`03-field-supplement.md` 中使用 `loreElement` 是為了避免與 `pets.json.element` 混淆。

正式輸出到 `pets-lore.json` 時，必須轉成：

```

```

```
"element": "中文元素"
```

補件資料中的 `name` 只用於角色對照，不應新增到正式 Lore schema。

---

## 9. 正式 ID 與圖片檔名

正式 ID 必須由 Builder 依各稀有度目前最大編號加一後分配。

規則：

```

```

```
不得硬編號
不得使用已存在 ID
不得回填歷史缺號
不得使用 pet_sp07 等既有缺號
不得假設專案仍停留在舊編號
```

Builder 分配正式 ID 後，才可用於：

```

```

```
pets.json 的 id
pets-lore.json 的 id
正式圖片檔名
正式圖片路徑
```

---

## 10. Pool Preview 條件

永眠花海 Pool Preview 應符合：

```

```

```
filter tag：eternal_slumber_bloom

候選總數：12
N：3
R：3
SR：3
SSR：2
UR：1
```

Pool Preview 中不得出現 standard 寵物。

本次資料包不核准：

```

```

```
抽卡機率
SSR 保底
UR 保底
卡池成本
重複補償
正式 active 狀態
```

若 Builder 必須填入 rates 或 pity 才能預覽，只能使用 staging 或 draft-only 暫用值，且不得寫入正式 `data/pools.json`。

---

## 11. 已核准文字修正

以下兩項是最終版本，不得使用舊字串。

### 霧絮海蛞 title

正確：

```

```

```
夢霧播散者
```

錯誤舊版：

```

```

```
夢霧播行者
```

### 寂繭眠蛾 bondUnlocks Lv.5

正確：

```

```

```
只要你仍需要一片不受干擾的寂靜夜空，我的翅膀便不會停止編織。
```

錯誤舊版：

```

```

```
只要你仍需要一處不受干擾的夜寂靜的空，我的翅膀便不會停止編織。
```

---

## 12. 已完成與尚未執行

### 已完成

```

```

```
12 隻正式名稱
12 隻稀有度
12 張最終圖片
12 張圖片 1:1 比例
12 段 Lore
12 組 dialogues
12 個 title
12 組 personality
12 個中文 Lore element
12 個正式 description
12 組 bondUnlocks Lv.2～Lv.5
技術欄位 mapping
```

### 尚未執行

```

```

```
Pet Series Builder 正式 ID 分配
正式圖片重新命名
正式 series 草稿
正式 pets staging
正式 lore staging
Pool Preview
Dry Run
Health Check
正式 Publish
iPhone Safari PWA 實機驗收
```

---

## 13. 本次操作限制

在使用這份資料執行 Builder Dry Run 時，不得：

```

```

```
修改既有 pets.json
修改既有 pets-lore.json
修改既有 pools.json
修改既有 56 隻寵物
修改抽卡機率或保底
修改星塵、能量或重複補償
清除 IndexedDB
修改 DB_VERSION
修改 APP_VERSION
修改 CACHE_NAME
修改 Service Worker URL
將寵物圖片加入 App Shell precache
正式 Publish
```

本階段只允許建立草稿、staging output、Pool Preview 與 Dry Run 報告。