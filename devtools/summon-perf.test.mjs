import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getPetImageSrc,
  preloadImage,
  preloadPetImage,
  preloadGachaResultImages,
  getPreloadStats,
} from '../src/imagePreloadService.js';
import { createDeferredRenderGate } from '../src/deferredRenderGate.js';
import { validatePet } from '../src/petDataSchema.js';

const pets = JSON.parse(readFileSync(new URL('../data/pets.json', import.meta.url), 'utf8')).pets;
const requested = [];
globalThis.Image = class {
  set src(value) {
    requested.push(value);
    queueMicrotask(() => {
      if (value.includes('broken')) this.onerror?.();
      else this.onload?.();
    });
  }
};

test('sized image paths are optional and originals remain the fallback', () => {
  const oldPet = { image: 'assets/pets/old.png' };
  assert.equal(getPetImageSrc(oldPet, 'card'), oldPet.image);
  assert.equal(getPetImageSrc(pets[0], 'card'), pets[0].imageVariants.card);
  assert.equal(getPetImageSrc(pets[0], 'stage'), pets[0].imageVariants.stage);
  assert.equal(getPetImageSrc(pets[0]), pets[0].image);
  assert.equal(validatePet(pets[0]).ok, true);
  assert.equal(validatePet({ ...pets[0], imageVariants: undefined }).ok, true);
  assert.equal(validatePet({ ...pets[0], imageVariants: { card: 'wrong.webp' } }).ok, false);
});

test('preloads with the same URL share one in-flight Image and retry failures', async () => {
  const before = requested.length;
  const first = preloadImage('assets/pets/variants/shared.webp');
  const second = preloadImage('assets/pets/variants/shared.webp');
  assert.strictEqual(first, second);
  await Promise.all([first, second]);
  assert.equal(requested.length, before + 1);
  assert.equal((await preloadImage('assets/pets/variants/shared.webp')).cached, true);
  assert.equal(requested.length, before + 1);
  const broken = 'assets/pets/variants/broken.webp';
  assert.equal((await preloadImage(broken)).ok, false);
  assert.equal((await preloadImage(broken)).ok, false);
  assert.equal(requested.filter((src) => src === broken).length, 2);
  assert.equal(getPreloadStats().inFlight, 0);
});

test('first reveal image starts before ten-pull card thumbnails', async () => {
  requested.length = 0;
  const results = [
    { pet: { image: 'first.png', imageVariants: { card: 'first-card.webp', stage: 'first-stage.webp' }, rarity: 'N' }, rarity: 'N' },
    { pet: { image: 'rare.png', imageVariants: { card: 'rare-card.webp', stage: 'rare-stage.webp' }, rarity: 'UR' }, rarity: 'UR' },
  ];
  await preloadGachaResultImages(results);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(requested[0], 'rare-stage.webp');
  assert.ok(requested.indexOf('first-card.webp') > 0);
  assert.ok(requested.indexOf('rare-card.webp') > 0);
});

test('a failed sized asset retries the original PNG', async () => {
  requested.length = 0;
  const result = await preloadPetImage({ image: 'fallback-original.png', imageVariants: { card: 'broken-card.webp' } }, 'card');
  assert.equal(result.ok, true);
  assert.equal(result.src, 'fallback-original.png');
  assert.deepEqual(requested, ['broken-card.webp', 'fallback-original.png']);
});

test('collection redraw is deferred once and remains dirty if rendering throws', () => {
  const gate = createDeferredRenderGate();
  let rendered = 0;
  gate.markDirty();
  assert.equal(rendered, 0);
  assert.throws(() => gate.flush(() => { throw new Error('render failed'); }));
  assert.equal(gate.dirty, true);
  assert.equal(gate.flush(() => { rendered += 1; }), true);
  assert.equal(rendered, 1);
  assert.equal(gate.flush(() => { rendered += 1; }), false);
  assert.equal(rendered, 1);
});
