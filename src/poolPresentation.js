/**
 * 主題卡池 presentation 正規化 — V3.3.0
 * presentation 為可選欄位；缺省時走預設樣式，不得拋錯。
 * themeKey / animationKey 僅允許白名單，禁止直接插入 innerHTML。
 */

const ALLOWED_THEME_KEYS = new Set(['eternal_slumber_bloom']);
const ALLOWED_ANIMATION_KEYS = new Set(['dream_bloom']);

/**
 * @param {unknown} value
 * @returns {string}
 */
function asSafeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function asIdList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((id) => typeof id === 'string' && /^pet_[a-z0-9]+$/i.test(id.trim()))
    .map((id) => id.trim());
}

/**
 * 正規化 pool.presentation；無效或缺省回傳 null。
 * @param {object|null|undefined} pool
 * @returns {null|{
 *   themeKey: string,
 *   badge: string,
 *   eyebrow: string,
 *   tagline: string,
 *   heroPetId: string|null,
 *   featuredPetIds: string[],
 *   animationKey: string,
 * }}
 */
export function normalizePoolPresentation(pool) {
  const raw = pool?.presentation;
  if (!raw || typeof raw !== 'object') return null;

  const themeKey = asSafeText(raw.themeKey);
  const animationKey = asSafeText(raw.animationKey);
  if (!ALLOWED_THEME_KEYS.has(themeKey)) return null;
  if (!ALLOWED_ANIMATION_KEYS.has(animationKey)) return null;

  const heroPetId = asSafeText(raw.heroPetId);
  const featuredPetIds = asIdList(raw.featuredPetIds).slice(0, 4);

  return {
    themeKey,
    badge: asSafeText(raw.badge) || '限定系列',
    eyebrow: asSafeText(raw.eyebrow),
    tagline: asSafeText(raw.tagline),
    heroPetId: /^pet_[a-z0-9]+$/i.test(heroPetId) ? heroPetId : null,
    featuredPetIds,
    animationKey,
  };
}

/** 是否有可用主題 presentation */
export function hasPoolPresentation(pool) {
  return normalizePoolPresentation(pool) != null;
}

/** 是否應播放主題召喚動畫（非 standard 且有 animationKey） */
export function shouldUseThemedSummon(pool) {
  const presentation = normalizePoolPresentation(pool);
  return !!presentation && presentation.animationKey === 'dream_bloom';
}

/**
 * themeKey → CSS data 屬性值（已白名單過濾）
 * @param {object|null|undefined} pool
 * @returns {string|null}
 */
export function getPoolThemeAttr(pool) {
  return normalizePoolPresentation(pool)?.themeKey ?? null;
}

/**
 * 從寵物清單解析 presentation 用的 hero／featured
 * @param {object|null|undefined} presentation
 * @param {Array} allPets
 */
export function resolvePresentationPets(presentation, allPets) {
  const list = Array.isArray(allPets) ? allPets : [];
  const byId = new Map(list.map((p) => [p.id, p]));
  const hero = presentation?.heroPetId ? byId.get(presentation.heroPetId) || null : null;
  const featured = (presentation?.featuredPetIds || [])
    .map((id) => byId.get(id))
    .filter(Boolean);
  return { hero, featured };
}
