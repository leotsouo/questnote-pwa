import { playThemedSummon, playDreamBloomSummon, playPoolDebutPresentation, isThemedSummonPlaying, skipThemedSummon } from '../src/themedSummonController.js';
import { createSummonRevealOverlay, playSummonReveal, skipSummonReveal } from '../src/summonRevealService.js';

// Presentation-only test page. Even accidental database access must fail.
indexedDB.open = () => { throw new Error('Player database access is forbidden in animation preview'); };
if (navigator.serviceWorker?.controller) throw new Error('Use a fresh loopback origin');
const pets = (await fetch('data/pets.json').then((response) => response.json())).pets;
const sugarPets = pets.filter((pet) => pet.poolTags.includes('honeylight_sugar_garden_v2'));
const sample = (rarity, key) => {
  const original = key ? sugarPets.find((pet) => pet.id === (key === 'caramel' ? 'pet_ur09' : 'pet_ur10')) : sugarPets.find((pet) => pet.rarity === rarity);
  const pet = key ? { ...original, presentation: { ...original.presentation, revealKey: key } } : original;
  return { pet, rarity, isNew: true };
};
const presentation = { animationKey: 'honeylight_sugar', debutLabel: '蜜光糖庭登場', debutLines: ['穿過糖晶溫室', '每一步努力', '都值得一點甜'] };
const ten = () => [sample('N'), sample('UR', 'cream'), sample('SSR'), sample('UR', 'caramel'), sample('UR', 'cream'), ...Array.from({ length: 5 }, () => sample('R'))];
const output = document.getElementById('test-results');
const reduced = () => document.getElementById('reduced').checked;
let busy = false;
async function preview(run) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('main > button').forEach((button) => { button.disabled = true; });
  try { await run(); } finally { busy = false; document.querySelectorAll('main > button').forEach((button) => { button.disabled = false; }); }
}
const summon = (results, extra = {}) => playThemedSummon({ animationKey: 'honeylight_sugar', poolName: '蜜光糖庭', results, reduceMotion: reduced(), ...extra });
document.getElementById('debut').onclick = () => preview(() => playPoolDebutPresentation({ presentation, reduceMotion: reduced() }));
document.getElementById('short').onclick = () => preview(() => playPoolDebutPresentation({ presentation, full: false, reduceMotion: reduced() }));
document.getElementById('single').onclick = () => preview(() => summon([sample('N')]));
document.getElementById('ssr').onclick = () => preview(() => summon([sample('SSR')]));
document.getElementById('caramel').onclick = () => preview(() => summon([sample('UR', 'caramel')]));
document.getElementById('cream').onclick = () => preview(() => summon([sample('UR', 'cream')]));
document.getElementById('ten').onclick = () => preview(() => summon(ten()));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(check, message, timeout = 11000) {
  const start = performance.now();
  while (performance.now() - start < timeout) { if (check()) return; await delay(20); }
  throw new Error(`Timed out: ${message}`);
}
async function closeSummary() {
  await waitFor(() => document.querySelector('.dream-bloom-overlay[data-state="summary"]'), 'summary');
  document.querySelector('[data-action="close"]').click();
}
async function runTests() {
  const cases = [];
  async function test(name, run) {
    try { await run(); cases.push({ name, ok: true }); }
    catch (error) { cases.push({ name, ok: false, error: error.stack }); skipThemedSummon(); skipSummonReveal(); }
    output.textContent = JSON.stringify(cases, null, 2);
  }
  await test('unsupported template fails closed', async () => {
    assert((await playThemedSummon({ animationKey: '__proto__', results: [sample('N')] })).fallback, 'Unknown key played');
    assert(!document.querySelector('.dream-bloom-overlay'), 'Unknown key created DOM');
  });
  for (const full of [true, false]) await test(`${full ? 'full' : 'short'} debut is skippable and restores focus`, async () => {
    const button = output; button.tabIndex = -1; button.focus();
    const pending = playPoolDebutPresentation({ presentation: { ...presentation, debutLines: ['<b data-injected="yes">糖</b>', '奶霜', '庭'] }, full, reduceMotion: true });
    const overlay = document.querySelector('.dream-debut-overlay');
    assert(overlay.querySelector('.sugar-scene') && !overlay.querySelector('.dream-debut-flower'), 'Wrong scenery');
    assert(!overlay.querySelector('[data-injected]'), 'Catalog text became markup');
    await waitFor(() => overlay.classList.contains('is-ready'), 'debut ready');
    assert([...overlay.querySelectorAll('.sugar-scene *')].every((node) => getComputedStyle(node).animationName === 'none'), 'Reduced motion moved scenery');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await pending;
    assert(!overlay.isConnected && document.activeElement === button && document.body.style.overflow !== 'hidden', 'Debut cleanup/focus failed');
  });
  for (const phase of ['dreamDust', 'mirrorRipple', 'rarityOmen', 'bloom']) await test(`double skip at ${phase} gives the same result`, async () => {
    const results = [sample('N')], before = JSON.stringify(results);
    const pending = summon(results, { reduceMotion: false });
    await waitFor(() => document.querySelector(`.dream-bloom-overlay[data-state="${phase}"]`), phase);
    const button = document.querySelector('[data-action="skip"]'); button.click(); button.click();
    await closeSummary();
    assert((await pending).ok && JSON.stringify(results) === before, 'Skip altered results');
    assert(!isThemedSummonPlaying() && document.body.style.position !== 'fixed', 'Skip left scroll locked');
  });
  await test('ten-pull intro skip preserves SSR, both URs and duplicates in order', async () => {
    const results = ten(), before = JSON.stringify(results), pending = summon(results, { reduceMotion: true });
    await waitFor(() => document.querySelector('[data-action="skip"]'), 'intro skip');
    document.querySelector('[data-action="skip"]').click();
    for (const item of results.filter((result) => ['SSR', 'UR'].includes(result.rarity))) {
      await waitFor(() => document.querySelector('.summon-reveal-overlay')?.textContent.includes(item.pet.name), item.pet.name);
      const overlay = document.querySelector('.summon-reveal-overlay');
      assert(overlay.classList.contains('is-sugar-reveal'), 'Missing sugar reveal context');
      if (item.rarity === 'UR') {
        assert(overlay.dataset.theme === item.pet.presentation.revealKey, 'Wrong UR scene');
        assert(getComputedStyle(overlay.querySelector('.sugar-reveal-ornament')).display === 'none', 'Reduced ornament visible');
      }
      await waitFor(() => overlay.classList.contains('is-ready'), 'reveal ready');
      overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await waitFor(() => !overlay.isConnected, 'reveal cleanup');
    }
    await waitFor(() => document.querySelector('.dream-bloom-overlay[data-state="summary"]'), 'ten summary');
    const names = [...document.querySelectorAll('.dream-bloom-mini-seal__name')].map((node) => node.textContent);
    assert(names.length === 10 && names.every((name, i) => name === results[i].pet.name), 'Summary reordered/deduplicated');
    assert(document.documentElement.scrollWidth <= innerWidth, 'Horizontal overflow');
    await closeSummary(); assert((await pending).ok && JSON.stringify(results) === before, 'Results mutated');
  });
  await test('queue skip from UR ends presentation without dropping summary results', async () => {
    const pending = summon(ten(), { reduceMotion: true, skipRitual: true });
    await waitFor(() => document.querySelector('.summon-reveal-skip'), 'reveal skip');
    document.querySelector('.summon-reveal-skip').click();
    await waitFor(() => document.querySelectorAll('.dream-bloom-mini-seal').length === 10, 'all summary items');
    await closeSummary(); assert((await pending).ok, 'Queue skip stuck');
  });
  for (const key of ['caramel', 'cream']) await test(`${key} full-motion UR has owned bounded ornament`, async () => {
    const item = sample('UR', key);
    const overlay = createSummonRevealOverlay({ rarity: 'UR', pet: item.pet, theme: key, reduceMotion: false, presentationKey: 'honeylight_sugar' });
    document.body.appendChild(overlay);
    try {
      assert(overlay.querySelectorAll('.sugar-reveal-ornament i').length === 8, 'Unbounded ornament');
      assert(!overlay.querySelector('audio, video, canvas'), 'Unexpected renderer');
      assert(overlay.querySelector('img').getAttribute('src').includes(item.pet.id), 'Wrong approved card');
    } finally { overlay.remove(); }
  });
  await test('missing image reveals a readable fallback and remains closable', async () => {
    const item = sample('UR', 'cream');
    const overlay = createSummonRevealOverlay({ pet: { ...item.pet, image: 'assets/pets/not-found.png', imageVariants: undefined }, rarity: 'UR', theme: 'cream', reduceMotion: true });
    document.body.appendChild(overlay);
    try {
      await waitFor(() => overlay.querySelector('.summon-reveal-fallback-label'), 'actual image error');
      assert(overlay.querySelector('.summon-reveal-fallback-label').textContent === item.pet.name, 'Missing fallback name');
    } finally { overlay.remove(); }
    const pending = playSummonReveal({ pet: item.pet, rarity: 'UR', theme: 'cream', reduceMotion: true, forceFallback: true });
    await waitFor(() => document.querySelector('.summon-reveal-overlay.is-fallback.is-ready'), 'closable fallback');
    document.querySelector('.summon-reveal-skip').click(); await pending;
  });
  await test('render failure cleans scroll and permits the next summon', async () => {
    const nativeAppend = document.body.appendChild; document.body.appendChild = () => { throw new Error('intentional render fault'); };
    let failed;
    try { failed = await summon([sample('N')], { reduceMotion: true }); } finally { document.body.appendChild = nativeAppend; }
    assert(failed.fallback && !isThemedSummonPlaying() && document.body.style.position !== 'fixed', 'Fault left UI locked');
    const pending = summon([sample('N')], { reduceMotion: true }); await closeSummary(); assert((await pending).ok, 'Retry failed');
  });
  await test('legacy dream remains the dream scene', async () => {
    const pending = playDreamBloomSummon({ results: [sample('N')], reduceMotion: true, skipRitual: true });
    await waitFor(() => document.querySelector('.dream-bloom-overlay[data-state="summary"]'), 'legacy summary');
    assert(document.querySelector('.dream-bloom-bg__moon') && !document.querySelector('.sugar-scene'), 'Legacy scene changed');
    await closeSummary(); assert((await pending).ok, 'Legacy failed');
  });
  output.textContent = JSON.stringify({ passed: cases.filter((item) => item.ok).length, failed: cases.filter((item) => !item.ok).length, cases }, null, 2);
  document.title = cases.every((item) => item.ok) ? 'PASS — Honeylight animation' : 'FAIL — Honeylight animation';
}
document.getElementById('tests').onclick = () => preview(runTests);
if (new URL(location.href).searchParams.has('auto')) await preview(runTests);
