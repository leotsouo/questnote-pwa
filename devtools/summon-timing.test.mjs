import test from 'node:test';
import assert from 'node:assert/strict';
import { SUMMON_TIMING, summonPreludeDurations, poolDebutDuration, poolDebutDissolveDuration, summonRevealDuration } from '../src/summonTiming.js';
import { lionheartPreludeDurations } from '../src/lionheartScene.js';
import { swordwildPreludeDurations } from '../src/swordwildShanheScene.js';
import { sugarPreludeDurations } from '../src/honeylightSugarScene.js';
import { identityRevealDuration } from '../src/summonRevealService.js';

test('single and ten preludes of every rarity preserve the Lionheart phase boundaries', () => {
  for (const reduced of [false, true]) {
    const expected = reduced ? [100, 100, 150, 150] : [650, 750, 900, 700];
    assert.deepEqual(lionheartPreludeDurations(reduced), expected);
    assert.deepEqual(summonPreludeDurations(reduced), expected);
    for (const rarity of ['N', 'R', 'SR', 'SSR', 'UR']) for (const mode of ['single', 'ten']) {
      assert.deepEqual(swordwildPreludeDurations(rarity, mode, reduced), expected, `${mode}/${rarity}`);
      assert.deepEqual(sugarPreludeDurations(rarity, mode, reduced), expected, `${mode}/${rarity}`);
    }
  }
});

test('every complete entry uses the original Honeylight clock, with no separate short clock', () => {
  assert.equal(poolDebutDuration(), 3400);
  assert.equal(poolDebutDuration(false), 3400);
  assert.equal(poolDebutDuration(true), 500);
  assert.equal(poolDebutDissolveDuration(), 550);
  assert.equal(poolDebutDissolveDuration(true), 240);
  assert.equal(poolDebutDuration() + poolDebutDissolveDuration(), 3950);
  assert.ok(Object.keys(SUMMON_TIMING).every((key) => !key.startsWith('debutShort')));
});

test('native and identity reveal clocks agree by rarity, with the same next-character gap', () => {
  for (const [rarity, full, reduced] of [['SSR', 2500, 550], ['UR', 4500, 750]]) {
    assert.equal(summonRevealDuration(rarity), full);
    assert.equal(identityRevealDuration(rarity), full);
    assert.equal(summonRevealDuration(rarity, true), reduced);
    assert.equal(identityRevealDuration(rarity, true), reduced);
  }
  assert.equal(SUMMON_TIMING.nextCharacter, 240);
});

test('a scene cannot mutate another pool timing through the duration array', () => {
  const timings = sugarPreludeDurations('UR', 'ten', false);
  timings[0] = 1;
  assert.deepEqual(lionheartPreludeDurations(false), [650, 750, 900, 700]);
  assert.throws(() => { SUMMON_TIMING.ur = 1; }, TypeError);
});
