# 黯冠王庭・混世降臨 authoring handoff

Ask the fixed product interview once, carrying forward supplied answers; each question accepts 交給你. Then AI owns brief/plan/content/prompts reviews; only artwork and final whole-package acceptance require human review. Record the real reviewer, never impersonate the user. IDs are reserved: never renumber them.
1. 主題與感覺：這次的文化、地域或故事方向是什麼？希望玩家感受到什麼情緒？
2. 角色與美術：必須出現哪些動物、代表角色、指定稀有度、畫風或禁止元素？數量是否沿用預設 12 隻？
3. 特殊體驗：是否指定新探險地區、特殊解鎖、贈寵或特別演出？沒有指定就由 AI 評估。
Default: one pool, 12 adjustable pets, exactly one new themed food; first-draw access, existing economics, no unlock/gift. Rarity allocation is AI-owned; two UR is not a global rule.
Before planning, verify latest production gh-pages/artifact and its reviewed source baseline against origin/main. Source merge alone is not deployment evidence. Record revisions and reconcile unpublished changes; never copy gh-pages into source.
For every new real pool, explicitly fill brief.animationPlan: decision dedicated/reuse/none, storyboard, rarityNotes and motionNotes. Explain reuse/none; default is not proof of completed animation. Complete runtime/contract validation before locking a new presentationTemplate.
After exact-hash plan approval, produce pets.json, pets-lore.json and plain-text pool presentation using the approved roster.
For the current pool SOP fill ecosystem.json: one food/recipe, every pet affinity + reason and dispatch specialty + reason, add/reuse region assessment, release notes and exact runtime hashes. Missing food/assessment or incomplete selected region blocks staging. New regions need actual story, discoveries and all five runtime milestones before baseline lock.
Lore requires title, 1–3 personality traits, display element, lore text, normal/urgent/important/praise ×5, idle ×3, bondUp ×2, summon and bondUnlocks 2–5.
Before image generation inspect installed applicable plugins; prefer them only when no extra charge is confirmed. Record tool/plugin and cost basis in provenance. Unknown cost means do not invoke; never enable a paid API/subscription automatically. Local CSS/SVG animation costs no generation fee.
Produce prompts.json entries for every pet ID (prompt and negativePrompt), including generation provenance when available.
Generate or provide square PNG images named <petId>.png under images/; minimum 512 px, maximum 5 MB. Human review must confirm visual quality and prompt alignment.
Use card-pool status/approve for each current exact hash. Identical image bytes may carry forward documented human artwork approval, while downstream hashes require fresh review.
Prepare isolated preview and production artifacts and acceptance evidence pinned to source commit, candidate and artifact hashes. Test animation, crafting/gifting, dispatch settings and selected region, storage/transaction safety and SW update. No merge or formal push until final whole-package human acceptance and explicit 可以發布. Preserve prior receipts/candidates/artifacts.
