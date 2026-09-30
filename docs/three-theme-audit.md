# Three-theme design audit · 2026-09-30

Baseline: source V3.4.25 at `e346722`. The production release is preserved.
Audit ran the actual app on a new loopback origin with the same two labelled UI
test quests, nine owned catalog pets, 灰影幼狼 companion, Lv.1 / 0 EXP, zero dust
and energy, and 0/2 today completion in every theme. No live user save was changed.
Captured evidence: `reports/theme-round-two/before-{theme}-{screen}.jpg`,
393 × 852, home / collection / gacha / expedition. These are test-state screenshots,
not invented product metrics or claims about a user's collection.

## Evidence steps

1. Home: task planning and exact rewards are clear; default/sweet bury the companion
   below tall task cards. Twilight's first screen connects companion and work.
2. Collection: real catalog art and owned/unknown distinction are strong; progress,
   milestone panel and several filter rows consume almost the whole first viewport.
3. Summon: actual costs, insufficient balance and pity are explicit; default/sweet
   standard pool lacks a meaningful encounter scene. Twilight already supplies one.
4. Expedition: existing landscape illustrations, region identity and costs are
   worth keeping. Emoji, bright purple CTAs and varying surfaces compete with art.

## A · 深色幻想風 (`default`)

- Identity observed: ink/navy cards, violet gradient actions, cyan energy, gold
  dust, heavy system sans, colored priority borders, mixed emoji navigation.
- Strengths: readable contrast, recognizable rarity language, exact costs and
  explicit completion affordance, rich existing dark-fantasy character art.
- Weaknesses: three resource boxes dominate the entrance; repeated badges and CRUD
  controls make tasks tall; companion is outside the first screen; purple glow
  reads as general game styling rather than QuestNote's own world.
- Biggest visual issue: equal emphasis on resources, badges and task actions.
- Biggest UX issue: home does not reveal the relationship between today's work
  and the selected companion until scrolling.
- Preserve: night palette, crisp task text, violet identity and genuine catalog art.

## B · 甜美可愛風 (`sweet`)

- Identity observed: pink/cream page, white rounded cards, raspberry buttons,
  lavender controls, the same heavy sans and task layout, emoji navigation.
- Strengths: inviting brightness, clear selected chips, warm reward badges,
  reassuring copy and familiar controls.
- Weaknesses: sweetness comes mostly from colors and generous radii; dark-fantasy
  art feels pasted into a pink utility UI; low-emphasis labels vary by component;
  multi-line task cards consume the viewport before the companion appears.
- Biggest visual issue: atmosphere and character illustration do not connect.
- Biggest UX issue: dense task chrome and bottom floating add compete with work.
- Preserve: approachable warmth, raspberry/mauve personality and softness.

## C · 暮光冒險手帳 (`twilight`)

- Identity observed: forest-indigo entrance, existing full-scene pet image, paper
  body, sage controls, serif headings, thin rule task rows, common outline icons.
- Strengths: product story is legible at first glance; today's work and bond are
  close to the character; restrained completion reaction and source dialogue.
- Weaknesses: hero text and square art overlap; the character's square background
  controls the scene; dense collection tooling delays the catalog; handwritten
  mood is inconsistent across secondary controls and rare reveal surfaces.
- Biggest visual issue: scene lacks purposeful composition and clear depth planes.
- Biggest UX issue: collection control density and hero height at 320px.
- Preserve: quiet forest / warm diary concept, paper task rows, real relationship feedback.

## Skin or directions?

Default and sweet are currently two skins of one layout. Twilight is a partially
distinct art direction. The upgrade will give all three the same companion-first
hierarchy, task structure and interactions, with distinct scene, light, surface,
type treatment and motion. Theme keys and all save/rule contracts stay unchanged.

## Jury lenses (our qualitative assessment, not an award submission)

Apple's [2025 official awards](https://developer.apple.com/design/awards/2025/)
describe cohesive visuals, intuitive controls and memorable feedback. Vocabulary's
consistent illustrations and varied themes, Neva's visual/emotional connection and
the inclusivity examples inform our critique; their layouts are not copied.
The 2026 awards page was not accessible to the web reader, so no 2026 winner claims are used.

iF's [official criteria](https://ifdesign.com/en/if-design-award-and-jury) inform
Idea / Form / Function / Differentiation: daily usefulness comes before decoration.
Their published fifth criterion is Sustainability; this bounded visual study does
not claim to evaluate the product's overall sustainability.

Red Dot's [official jury criteria](https://www.red-dot.org/bcd/red-dot-jury) inform
Idea / Form / Impact: could the first screen communicate a shared life adventure
even without the product name? Current default/sweet communicate tasks first;
twilight communicates relationship first, but brand mark and composition need refinement.

| Theme | Apple lens | iF lens | Red Dot lens | Upgrade priority |
|---|---|---|---|---|
| A | Contrast is strong; companion and feedback are visually distant | Task utility strong; fantasy feels attached to a utility page | Generic violet game chrome obscures identity | Moonlit encounter scene, shared task hierarchy, quieter chrome |
| B | Warm but same hierarchy; emoji and mixed art weaken cohesion | Comfortable form, little differentiation beyond palette | Friendly mood without a recognizable place | Dawn garden scene, tactile rounded surfaces, consistent icon family |
| C | Strong relationship; refine typography and art composition | Clear daily benefit; secondary surface quality varies | Strong story; old letter Q icon does not carry it | Wider composed forest hero, consistent diary surfaces, shared brand symbol |

## Accessibility limits and findings

Source already supports system reduced motion, labelled controls, real progressbar,
and explicit priority/status text. Screenshots show readable primary text but do not
prove WCAG, focus order or device safe-area behavior. The implementation must verify
each theme's text/surface pairs numerically, 44px controls, long titles, 320px reflow,
keyboard details disclosure, reduced motion, and genuine task/reward updates.

## Art directions selected before UI changes

- A · 星夜遠行: 在深藍星夜的營地，與幻獸校準今天的目標，把每一次完成化為前行的星光。
- B · 晨光花園: 在柔和晨光的花園，和熟悉的夥伴把日常小事照顧成值得期待的成長。
- C · 暮光冒險手帳: 在安靜的森林暮色裡，與夥伴把日常小事寫成共同成長的旅程。

Night keeps violet/celestial contrast and clear sans; garden keeps warm rose and
softness with an airy illustrated habitat; twilight refines paper/serif/forest.
Navigation locations, quest rows, relationship controls and feedback remain shared.
