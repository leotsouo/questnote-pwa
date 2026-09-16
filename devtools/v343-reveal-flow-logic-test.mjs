/**
 * 召喚流程邏輯單元測試（Node，支援目前版本）
 * 不寫入 IndexedDB、不呼叫正式 draw。
 */
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';

const root = process.cwd();
const pets = JSON.parse(readFileSync(`${root}/data/pets.json`, 'utf8')).pets;
const lore = JSON.parse(readFileSync(`${root}/data/pets-lore.json`, 'utf8')).lore;
const pools = JSON.parse(readFileSync(`${root}/data/pools.json`, 'utf8')).pools;
const versionText = readFileSync(`${root}/src/version.js`, 'utf8');
const swText = readFileSync(`${root}/service-worker.js`, 'utf8');
const themedText = readFileSync(`${root}/src/themedSummonController.js`, 'utf8');
const svcText = readFileSync(`${root}/src/summonRevealService.js`, 'utf8');
const uiText = readFileSync(`${root}/src/ui.js`, 'utf8');
const dbText = readFileSync(`${root}/src/db.js`, 'utf8');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('PASS:', msg);
  }
}

// --- Version ---
const declaredVersion = versionText.match(/APP_VERSION = '([^']+)'/)?.[1];
const declaredCache = versionText.match(/CACHE_NAME = '([^']+)'/)?.[1];
assert(/^\d+\.\d+\.\d+$/.test(declaredVersion || ''), 'semantic APP_VERSION');
assert(Boolean(declaredCache), 'CACHE_NAME declared');
assert(swText.includes(`const CACHE_NAME = '${declaredCache}'`), 'SW CACHE_NAME matches app');
assert(swText.includes('src/summonRevealService.js'), 'SW precache summonRevealService');
const precacheBlock = (swText.match(/PRECACHE_URLS\s*=\s*\[([\s\S]*?)\];/) || [])[1] || '';
assert(!/assets\/pets\//.test(precacheBlock), '寵物圖未進 precache');
assert(dbText.includes('const DB_VERSION = 3'), 'DB_VERSION=3');

// --- Candidates ---
const standard = pets.filter((p) => (p.poolTags || []).includes('standard'));
const slumber = pets.filter((p) => (p.poolTags || []).includes('eternal_slumber_bloom'));
const awakened = pets.filter((p) => (p.poolTags || []).includes('eternal_slumber_bloom_awakened'));
assert(pets.length === 72, `pets=72 (got ${pets.length})`);
assert(lore.length === 72, `lore=72 (got ${lore.length})`);
assert(standard.length === 56, `standard=56 (got ${standard.length})`);
assert(slumber.length === 12, `eternal locked=12 (got ${slumber.length})`);
assert(slumber.length + awakened.length === 16, `eternal unlocked=16`);

const eternal = pools.find((p) => p.id === 'eternal_slumber_bloom');
const std = pools.find((p) => p.id === 'standard');
assert(eternal.cost === 100 && std.cost === 100, 'cost=100');
assert(eternal.pity.ssr === 30 && eternal.pity.ur === 100, 'pity unchanged');
assert(JSON.stringify(eternal.rates) === JSON.stringify({
  N: 0.55, R: 0.3, SR: 0.1, SSR: 0.03, UR: 0.02,
}), 'rates unchanged');

// --- Skip semantics (static) ---
assert(themedText.includes('introSkipped'), 'introSkipped flag');
assert(themedText.includes('skipIntroRitual'), 'skipIntroRitual');
assert(!/if\s*\(\s*!skipped\s*&&\s*ssrPlusQueue/.test(themedText), 'no skipped&&queue gate');
assert(svcText.includes('revealQueueSkipped'), 'revealQueueSkipped');
assert(svcText.includes('advanceOnce'), 'advanceOnce');
assert(svcText.includes('stopPropagation'), 'stopPropagation');
assert(svcText.includes('duplicateCompensation'), 'queue keeps compensation');

// --- UI guards ---
assert(uiText.includes('isAuthorLocalDevMode()'), 'localhost guard');
assert(uiText.includes('devSection.remove()'), 'prod removes dev section');
assert(uiText.includes('pendingAwakening'), 'pendingAwakening');
assert(/if\s*\(\s*pending\s*\)\s*\{[\s\S]*maybePlayMorningGardenAfterPull/.test(uiText), 'awakening after result');

// --- Queue no dedupe (pure logic via dynamic import with stubs) ---
// Minimal stub environment for collectSsrPlusRevealQueue
globalThis.window = {
  matchMedia: () => ({ matches: false }),
};
globalThis.document = {
  body: { classList: { add() {}, remove() {}, contains() { return false; } }, appendChild() {}, dataset: {}, style: {} },
  querySelectorAll: () => [],
  createElement: () => ({
    classList: { add() {}, remove() {}, toggle() {} },
    style: { setProperty() {} },
    setAttribute() {},
    appendChild() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => null,
  }),
};

const { collectSsrPlusRevealQueue, shouldPlayReveal } = await import(
  pathToFileURL(`${root}/src/summonRevealService.js`).href
);

const ssr = pets.find((p) => p.id === 'pet_ssr07');
const ur = pets.find((p) => p.id === 'pet_ur06');
const mockTen = [
  { pet: pets.find((p) => p.id === 'pet_n17'), rarity: 'N', isNew: false },
  { pet: ssr, rarity: 'SSR', isNew: true },
  { pet: pets.find((p) => p.id === 'pet_r13'), rarity: 'R', isNew: false },
  { pet: pets.find((p) => p.id === 'pet_r14'), rarity: 'R', isNew: false },
  { pet: ssr, rarity: 'SSR', isNew: false, fragmentsGained: 10 },
  { pet: pets.find((p) => p.id === 'pet_sr09'), rarity: 'SR', isNew: false },
  { pet: pets.find((p) => p.id === 'pet_sr10'), rarity: 'SR', isNew: false },
  { pet: pets.find((p) => p.id === 'pet_n18'), rarity: 'N', isNew: false },
  { pet: ur, rarity: 'UR', isNew: true },
  { pet: pets.find((p) => p.id === 'pet_n19'), rarity: 'N', isNew: false },
];
const queue = collectSsrPlusRevealQueue(mockTen);
assert(queue.length === 3, `queue length 3 (got ${queue.length})`);
assert(queue[0].petId === 'pet_ssr07' && queue[1].petId === 'pet_ssr07', 'duplicate petId preserved');
assert(queue[2].petId === 'pet_ur06', 'UR third');
assert(queue[0].index === 1 && queue[1].index === 4 && queue[2].index === 8, 'original order indices');
assert(queue[1].duplicateCompensation === 10, 'compensation retained');
assert(shouldPlayReveal('SR') === false && shouldPlayReveal('SSR') === true, 'shouldPlayReveal');

// --- SW URL helper ---
const { APP_VERSION, CACHE_NAME, getServiceWorkerRegisterUrl } = await import(
  pathToFileURL(`${root}/src/version.js`).href
);
assert(APP_VERSION === declaredVersion, 'runtime APP_VERSION');
assert(CACHE_NAME === declaredCache, 'runtime CACHE_NAME');
assert(getServiceWorkerRegisterUrl() === `./service-worker.js?v=${APP_VERSION.replace(/\./g, '')}`, 'SW URL matches version');

console.log('\n---');
if (failed) {
  console.error(`FAILED: ${failed} assertion(s)`);
  process.exit(1);
}
console.log('All Node logic assertions passed.');
void createRequire;
