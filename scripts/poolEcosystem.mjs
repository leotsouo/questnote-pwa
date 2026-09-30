/** SOP 2 companion content. Pure validation; no catalog writes or generation services. */
import { runInNewContext } from 'node:vm';

export const ECOSYSTEM_CATALOGS = Object.freeze([
  'data/craftables.json', 'data/gift-affinities.json', 'data/materials.json', 'data/expeditions.json',
]);
export const ECOSYSTEM_RUNTIME = Object.freeze([
  'src/workshopService.js', 'src/expeditionService.js', 'src/explorationService.js', 'src/expeditionGameplay.js',
]);
export const POOL_INTERVIEW = Object.freeze([
  '主題與感覺：這次的文化、地域或故事方向是什麼？希望玩家感受到什麼情緒？',
  '角色與美術：必須出現哪些動物、代表角色、指定稀有度、畫風或禁止元素？數量是否沿用預設 12 隻？',
  '特殊體驗：是否指定新探險地區、特殊解鎖、贈寵或特別演出？沒有指定就由 AI 評估。',
]);
const plain = (value) => typeof value === 'string' && value.trim().length > 0;
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const id = (value) => typeof value === 'string' && /^[a-z][a-z0-9_]*$/.test(value)
  && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9]|constructor|prototype)$/i.test(value);
const hash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function checkSopBrief(brief) {
  const p = brief.productionBaseline;
  if (brief.sopVersion !== 2 || brief.noExtraCost !== true || !object(p)
    || ![p.deployedCommit, p.sourceCommit, p.mainCommit].every((v) => /^[a-f0-9]{40}$/.test(v || ''))
    || !hash(p.artifactId) || !plain(p.version) || !plain(p.unpublishedChanges)
    || !Number.isFinite(Date.parse(p.verifiedAt)) || !/^https:\/\//.test(p.httpsUrl || '')
    || !brief.animationPlan || !plain(brief.animationPlan.reason)) {
    throw Object.assign(new Error('SOP 2 requires verified production/source pins, noExtraCost and an explicit animation reason'), { code: 'SOP_BRIEF_INVALID' });
  }
}

export function ecosystemScaffold(allocation, runtimeHashes) {
  return { schemaVersion: 1, food: null, materials: [],
    affinities: Object.fromEntries(allocation.map((p) => [p.petId, []])),
    affinityNotes: Object.fromEntries(allocation.map((p) => [p.petId, ''])),
    specialties: Object.fromEntries(allocation.map((p) => [p.petId, { role: '', reason: '' }])),
    expedition: { decision: '', reason: '', reusedAreaIds: [], areas: [] },
    releaseNotes: '', runtimeHashes };
}

// Read only the controlled literal registry, in an isolated context without host APIs.
// A changed declaration shape fails closed and requires adapting this validator.
function registry(source, name) {
  const match = source.match(new RegExp(`(?:export\\s+)?const ${name} = (?:Object\\.freeze\\()?([\\s\\S]*?\\n\\})(?:\\))?;`));
  if (!match) throw new Error(`Missing controlled registry: ${name}`);
  return JSON.parse(JSON.stringify(runInNewContext(`(${match[1]})`, Object.create(null), { timeout: 1000 })));
}

/** Returns merged companion catalogs, with existing rows preserved exactly. */
export function validateEcosystem({ ecosystem: e, pets, baseline, runtime, runtimeHashes }) {
  const errors = [];
  const require = (condition, code, message) => { if (!condition) errors.push({ level: 'error', code, message, path: 'ecosystem.json' }); };
  const fail = (code, message) => ({ ok: false, errors: [{ level: 'error', code, message, path: 'ecosystem.json' }] });
  if (!object(e) || e.schemaVersion !== 1) return fail('ECOSYSTEM_REQUIRED', 'SOP 2 requires ecosystem.json');
  let tags, labels, stories, defs, discoveries;
  try {
    tags = registry(runtime['src/workshopService.js'], 'GIFT_TAG_LABELS');
    labels = registry(runtime['src/expeditionService.js'], 'MATERIAL_LABELS');
    stories = registry(runtime['src/explorationService.js'], 'AREA_STORIES');
    defs = registry(runtime['src/explorationService.js'], 'AREA_EXPLORATION_DEFS');
    discoveries = registry(runtime['src/expeditionGameplay.js'], 'AREA_DISCOVERIES');
  } catch (error) { return fail('ECOSYSTEM_RUNTIME_INVALID', error.message); }
  require(object(e.runtimeHashes) && Object.keys(e.runtimeHashes).length === ECOSYSTEM_RUNTIME.length
    && ECOSYSTEM_RUNTIME.every((file) => e.runtimeHashes[file] === runtimeHashes[file]),
  'ECOSYSTEM_RUNTIME_DRIFT', 'Companion runtime hashes must match reviewed source');
  const existingFoods = baseline['data/craftables.json'];
  const existingMaterials = baseline['data/materials.json'];
  const existingAreas = baseline['data/expeditions.json']?.areas;
  const existingAffinities = baseline['data/gift-affinities.json'];
  if (!Array.isArray(existingFoods) || !Array.isArray(existingMaterials) || !Array.isArray(existingAreas)
    || existingAffinities?.schemaVersion !== 1 || !object(existingAffinities.giftAffinityTags)) return fail('ECOSYSTEM_BASELINE_INVALID', 'Incomplete companion baseline');
  const f = e.food;
  require(object(f) && id(f.id) && !existingFoods.some((p) => p.id === f.id), 'NEW_FOOD_REQUIRED', 'Exactly one new food with an unused ID is required');
  require(f?.enabled === true && plain(f.name) && plain(f.description) && ['N', 'R', 'SR', 'SSR', 'UR'].includes(f.rarity)
    && f.type === 'favorite_bond_item' && f.effect?.bondExp === 75 && f.effect?.favoriteBonusBondExp === 150,
  'FOOD_INVALID', 'New themed food needs display content, enabled status and existing 75/150 gift economics');
  require(Array.isArray(f?.favoriteTags) && f.favoriteTags.length > 0
    && f.favoriteTags.every((t) => Object.hasOwn(tags, t)) && new Set(f.favoriteTags).size === f.favoriteTags.length,
  'FOOD_TAG_INVALID', 'Food must use supported explicit affinity tags');
  const materials = Array.isArray(e.materials) ? e.materials : [];
  require(Array.isArray(e.materials) && new Set(materials.map((m) => m.id)).size === materials.length
    && materials.every((m) => id(m.id) && plain(m.name) && !existingMaterials.some((p) => p.id === m.id)),
  'MATERIAL_INVALID', 'New materials need unique unused IDs and labels');
  const knownMaterials = new Set([...existingMaterials, ...materials].map((m) => m.id));
  require(object(f?.recipe) && Object.keys(f.recipe).length > 0
    && Object.entries(f.recipe).every(([m, quantity]) => knownMaterials.has(m) && Number.isSafeInteger(quantity) && quantity > 0),
  'RECIPE_INVALID', 'Food recipe must reference obtainable materials with positive integer quantities');
  const petIds = pets.map((p) => p.id).sort();
  for (const [name, value] of [['affinities', e.affinities], ['affinityNotes', e.affinityNotes], ['specialties', e.specialties]]) {
    require(object(value) && equal(Object.keys(value).sort(), petIds), 'PET_SETTINGS_REQUIRED', `${name} must cover exactly the new roster`);
  }
  for (const pet of pets) {
    const affinity = e.affinities?.[pet.id];
    require(Array.isArray(affinity) && affinity.every((t) => Object.hasOwn(tags, t)) && new Set(affinity).size === affinity.length
      && plain(e.affinityNotes?.[pet.id]), 'AFFINITY_INVALID', `${pet.id} requires explicit reviewed affinity and reason (including empty affinity)`);
    const specialty = e.specialties?.[pet.id];
    let actualRole;
    try {
      actualRole = runInNewContext(runtime['src/expeditionGameplay.js'].replace(/^export /gm, '')
        + `\ngetPetSpecialty(${JSON.stringify(pet)}).role;`, Object.create(null), { timeout: 1000 });
    } catch (error) { require(false, 'SPECIALTY_RUNTIME_INVALID', error.message); }
    require(['scout', 'gatherer', 'companion', 'scholar', 'guardian'].includes(specialty?.role) && plain(specialty?.reason)
      && specialty.role === actualRole, 'SPECIALTY_INVALID', `${pet.id} specialty must agree with the actual dispatch runtime`);
  }
  require(pets.some((p) => e.affinities?.[p.id]?.some((t) => f?.favoriteTags?.includes(t))),
    'FOOD_RECIPIENT_REQUIRED', 'New food must have a matching new partner');
  const expedition = e.expedition;
  const areas = Array.isArray(expedition?.areas) ? expedition.areas : [];
  require(object(expedition) && ['add', 'reuse'].includes(expedition.decision) && plain(expedition.reason)
    && Array.isArray(expedition.areas) && Array.isArray(expedition.reusedAreaIds),
  'REGION_ASSESSMENT_REQUIRED', 'Explicit add/reuse region assessment and reason are required');
  if (expedition?.decision === 'reuse') {
    require(areas.length === 0 && materials.length === 0 && expedition.reusedAreaIds.length > 0
      && expedition.reusedAreaIds.every((areaId) => existingAreas.some((a) => a.id === areaId)),
    'REGION_REUSE_INVALID', 'Reuse must identify existing material sources and cannot hide new regions/materials');
    require(Object.keys(f?.recipe || {}).every((m) => existingAreas.some((a) => expedition.reusedAreaIds.includes(a.id) && a.rewards?.material?.id === m)),
      'MATERIAL_SOURCE_MISSING', 'Reused regions must supply every recipe material');
  } else if (expedition?.decision === 'add') {
    require(areas.length === 1 && expedition.reusedAreaIds.every((areaId) => existingAreas.some((a) => a.id === areaId)),
      'REGION_COUNT_INVALID', 'Standard releases support one complete new region');
  }
  const range = (v) => object(v) && Number.isSafeInteger(v.min) && Number.isSafeInteger(v.max) && v.min >= 0 && v.max >= v.min;
  for (const area of areas) {
    require(id(area.id) && !existingAreas.some((a) => a.id === area.id) && plain(area.name) && plain(area.description)
      && Number.isSafeInteger(area.energyCost) && area.energyCost > 0 && Number.isSafeInteger(area.durationMinutes) && area.durationMinutes > 0,
    'REGION_INVALID', 'Region needs unique identity, description and positive dispatch terms');
    require(['default', 'fire_pet', 'mechanical_pet', 'frost_pet', 'rustic_pet', 'ur_pet'].includes(area.unlock?.type)
      && (['default', 'ur_pet'].includes(area.unlock?.type) || ['elements', 'poolTags', 'keywords'].some((key) => Array.isArray(area.unlock?.[key]) && area.unlock[key].some(plain))),
    'REGION_UNLOCK_INVALID', 'Region must use a supported, actionable unlock');
    require(range(area.rewards?.stardust) && range(area.rewards?.material) && area.rewards.material.min > 0
      && knownMaterials.has(area.rewards.material.id) && plain(labels[area.rewards.material.id])
      && Number.isSafeInteger(area.rewards?.bondExp) && area.rewards.bondExp >= 0,
    'REGION_REWARDS_INVALID', 'Region rewards and material labels must be complete');
    const d = defs[area.id];
    require(d?.areaId === area.id && d.name === area.name && Number.isFinite(d.increment) && d.increment > 0
      && equal(d.milestones?.map((m) => m.percent), [10, 25, 50, 75, 100]) && plain(discoveries[area.id])
      && d.milestones?.some((m) => plain(stories[m.storyId]))
      && d.milestones?.every((m) => plain(m.title) && plain(m.description) && object(m.reward)
        && Object.keys(m.reward).length > 0 && (m.reward.stardust === undefined || (Number.isSafeInteger(m.reward.stardust) && m.reward.stardust >= 0))
        && (!m.storyId || plain(stories[m.storyId]))
        && Object.entries(m.reward.materials || {}).every(([key, qty]) => knownMaterials.has(key) && Number.isSafeInteger(qty) && qty > 0)
        && Object.entries(m.reward.items || {}).every(([key, qty]) => [...existingFoods, f].some((food) => food?.id === key) && Number.isSafeInteger(qty) && qty > 0)),
    'REGION_RUNTIME_INCOMPLETE', 'New region needs actual discovery, story and all five valid runtime milestones');
  }
  for (const m of materials) require(areas.some((a) => a.id === m.sourceArea && a.rewards?.material?.id === m.id)
    && Object.hasOwn(f?.recipe || {}, m.id) && plain(labels[m.id]), 'MATERIAL_SOURCE_MISSING', 'New material must have an implemented source and recipe use');
  require(plain(e.releaseNotes), 'RELEASE_NOTES_REQUIRED', 'Whole-package release notes are required');
  if (errors.length) return { ok: false, errors };
  return { ok: true, errors, catalogs: {
    'data/craftables.json': [...existingFoods, f],
    'data/materials.json': [...existingMaterials, ...materials],
    'data/gift-affinities.json': { ...existingAffinities, giftAffinityTags: { ...existingAffinities.giftAffinityTags, ...e.affinities } },
    'data/expeditions.json': { ...baseline['data/expeditions.json'], areas: [...existingAreas, ...areas] },
  } };
}
