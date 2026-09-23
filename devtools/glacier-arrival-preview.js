import { playThemedSummon, playDreamBloomSummon, playPoolDebutPresentation,
  isThemedSummonPlaying, skipThemedSummon } from '../src/themedSummonController.js';
import { createGlacierArrivalScene } from '../src/glacierArrivalScene.js';

// This engineering page never opens either product database, even accidentally.
indexedDB.open = () => { throw new Error('Database access is forbidden in presentation preview'); };
if (navigator.serviceWorker?.controller) throw new Error('Use a fresh loopback origin');
const pets = (await fetch('data/pets.json').then((response) => response.json())).pets;
const sample = (rarity) => ({ pet: pets.find((pet) => pet.rarity === rarity), rarity, isNew: true });
const presentation = { animationKey: 'glacier_arrival', debutLabel: '霜誓峽灣抵達預覽',
  debutLines: ['冰壁之間', '誓火引路', '霜誓峽灣'] };
const output = document.getElementById('test-results');
const reduced = () => document.getElementById('reduced').checked;
let busy = false;
function setBusy(value) {
  busy = value;
  document.querySelectorAll('main > button').forEach((button) => { button.disabled = value; });
}
async function preview(run) {
  if (busy) return;
  setBusy(true);
  try { await run(); } finally { setBusy(false); }
}
document.getElementById('debut').onclick = () => preview(() => playPoolDebutPresentation({ presentation, reduceMotion: reduced() }));
document.getElementById('single').onclick = () => preview(() => playThemedSummon({
  animationKey: 'glacier_arrival', poolName: '冰河模板樣本', results: [sample('N')], reduceMotion: reduced(),
}));
document.getElementById('ten').onclick = () => preview(() => playThemedSummon({
  animationKey: 'glacier_arrival', poolName: '冰河模板樣本',
  results: Array.from({ length: 10 }, (_, i) => sample(i === 4 ? 'SSR' : i === 8 ? 'UR' : 'N')), reduceMotion: reduced(),
}));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(check, message, timeout = 10000) {
  const start = performance.now();
  while (performance.now() - start < timeout) { if (check()) return; await delay(20); }
  throw new Error(`Timed out: ${message}`);
}
async function runTests() {
  const cases = [];
  async function test(name, run) {
    try { await run(); cases.push({ name, ok: true }); }
    catch (error) { cases.push({ name, ok: false, error: error.stack }); skipThemedSummon(); }
    output.textContent = JSON.stringify(cases, null, 2);
  }
  await test('unknown animation fails before creating DOM', async () => {
    const result = await playThemedSummon({ animationKey: '__proto__', results: [sample('N')] });
    assert(result.fallback && !isThemedSummonPlaying(), 'Unsupported template played');
    assert(!document.querySelector('.dream-bloom-overlay'), 'DOM created for unsupported key');
  });
  await test('debut uses only owned glacier scenery, inert copy and explicit close', async () => {
    const pending = playPoolDebutPresentation({ reduceMotion: true, presentation: { ...presentation,
      debutLines: ['<b data-injected="yes">冰壁</b>', '誓火', '抵達'] } });
    const overlay = document.querySelector('.dream-debut-overlay');
    assert(overlay.querySelector('.glacier-scene') && !overlay.querySelector('.dream-debut-flower'), 'Wrong scene');
    assert(!overlay.querySelector('[data-injected]'), 'Unsafe copy inserted markup');
    assert(overlay.querySelectorAll('.glacier-scene__beacons i').length === 6, 'Unbounded beacons');
    await waitFor(() => overlay.classList.contains('is-ready'), 'debut ready');
    assert(overlay.isConnected, 'Debut closed automatically');
    assert([...overlay.querySelectorAll('.glacier-scene *')].every((node) => getComputedStyle(node).animationName === 'none'), 'Reduced motion animated scenery');
    overlay.querySelector('[data-role="skip"]').click();
    await pending;
    assert(!document.querySelector('.dream-debut-overlay') && !document.body.classList.contains('themed-summon-active'), 'Debut cleanup failed');
  });
  await test('ten reduced results preserve order, duplicates and compensation without mutation', async () => {
    const results = Array.from({ length: 10 }, (_, index) => ({ ...sample(index % 2 ? 'R' : 'N'), isNew: false, fragmentsGained: 7 }));
    const before = JSON.stringify(results);
    const pending = playThemedSummon({ animationKey: 'glacier_arrival', results, reduceMotion: true });
    await waitFor(() => document.querySelector('.dream-bloom-overlay[data-state="summary"]'), 'summary');
    const overlay = document.querySelector('.dream-bloom-overlay');
    assert(overlay.textContent.includes('遠航夥伴已抵達'), 'Wrong summary copy');
    assert(overlay.querySelectorAll('.dream-bloom-mini-seal').length === 10, 'Duplicate results lost');
    assert([...overlay.querySelectorAll('.dream-bloom-mini-seal__name')].every((node, i) => node.textContent === results[i].pet.name), 'Result order changed');
    assert(document.documentElement.scrollWidth <= innerWidth, 'Horizontal overflow');
    overlay.querySelector('[data-action="close"]').click();
    assert((await pending).ok && JSON.stringify(results) === before, 'Results changed');
    assert(!isThemedSummonPlaying() && !document.querySelector('.dream-bloom-overlay'), 'Summon cleanup failed');
  });
  await test('intro skip preserves SSR/UR queue, then returns the same ten results', async () => {
    const results = [sample('N'), sample('SSR'), sample('UR'), ...Array.from({ length: 7 }, () => sample('N'))];
    const before = JSON.stringify(results);
    const pending = playThemedSummon({ animationKey: 'glacier_arrival', results, reduceMotion: true });
    await waitFor(() => document.querySelector('.dream-bloom-overlay [data-action="skip"]'), 'skip control');
    document.querySelector('.dream-bloom-overlay [data-action="skip"]').click();
    await waitFor(() => document.querySelector('.summon-reveal-overlay'), 'SSR queue');
    assert(document.querySelector('.summon-reveal-overlay').textContent.includes(results[1].pet.name), 'Queue skipped first rare result');
    // Wait for readiness, then advance by the real reveal button.
    await waitFor(() => document.querySelector('.summon-reveal-overlay.is-ready'), 'SSR ready');
    document.querySelector('.summon-reveal-overlay').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await waitFor(() => document.querySelector('.summon-reveal-overlay')?.textContent.includes(results[2].pet.name), 'UR queue');
    await waitFor(() => document.querySelector('.summon-reveal-overlay.is-ready'), 'UR ready');
    document.querySelector('.summon-reveal-overlay').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await waitFor(() => document.querySelector('.dream-bloom-overlay[data-state="summary"]'), 'post-reveal summary');
    document.querySelector('.dream-bloom-overlay [data-action="close"]').click();
    assert((await pending).ok && JSON.stringify(results) === before, 'Queue changed results');
  });
  await test('legacy entry point still renders the dream scene', async () => {
    const pending = playDreamBloomSummon({ results: [sample('N')], reduceMotion: true, skipRitual: true });
    await waitFor(() => document.querySelector('.dream-bloom-overlay[data-state="summary"]'), 'legacy summary');
    assert(document.querySelector('.dream-bloom-bg__moon') && !document.querySelector('.glacier-scene'), 'Legacy scene changed');
    document.querySelector('[data-action="close"]').click();
    assert((await pending).ok, 'Legacy controller failed');
  });
  await test('render failure cleans scroll and permits the next summon', async () => {
    const nativeAppend = document.body.appendChild;
    document.body.appendChild = () => { throw new Error('intentional render fault'); };
    let failed;
    try { failed = await playThemedSummon({ animationKey: 'glacier_arrival', results: [sample('N')], reduceMotion: true }); }
    finally { document.body.appendChild = nativeAppend; }
    assert(failed.fallback && !isThemedSummonPlaying(), 'Fallback stuck busy');
    assert(!document.body.classList.contains('themed-summon-active'), 'Fallback left scrolling locked');
    const pending = playThemedSummon({ animationKey: 'glacier_arrival', results: [sample('N')], reduceMotion: true, skipRitual: true });
    await waitFor(() => document.querySelector('.dream-bloom-overlay[data-state="summary"]'), 'retry summary');
    document.querySelector('[data-action="close"]').click();
    assert((await pending).ok, 'Next summon failed');
  });
  await test('full-motion scene has bounded layers and finite animation', async () => {
    const overlay = document.createElement('div');
    overlay.dataset.animation = 'glacier_arrival';
    overlay.className = 'is-active';
    overlay.appendChild(createGlacierArrivalScene());
    document.body.appendChild(overlay);
    try {
      assert(overlay.querySelectorAll('*').length < 55, 'Scene grew beyond its layer budget');
      assert([...overlay.querySelectorAll('*')].every((node) => getComputedStyle(node).animationIterationCount !== 'infinite'), 'Unbounded scenery animation');
    } finally { overlay.remove(); }
  });
  output.textContent = JSON.stringify({ passed: cases.filter((item) => item.ok).length, failed: cases.filter((item) => !item.ok).length, cases }, null, 2);
  document.title = cases.every((item) => item.ok) ? 'PASS — Glacier arrival' : 'FAIL — Glacier arrival';
}
document.getElementById('tests').onclick = () => preview(runTests);
if (new URL(location.href).searchParams.has('auto')) await preview(runTests);
