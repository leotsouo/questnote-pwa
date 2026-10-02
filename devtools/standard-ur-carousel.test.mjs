import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { resolvePoolPresentationModel } from '../src/poolContentContract.js';
import { createStandardUrCarousel, getStandardUrPreviews } from '../src/standardUrCarousel.js';

test('preview uses only the standard pool eligible URs, excluding limited characters', async () => {
  const { pools } = JSON.parse(await fs.readFile(new URL('../data/pools.json', import.meta.url)));
  const { pets } = JSON.parse(await fs.readFile(new URL('../data/pets.json', import.meta.url)));
  const model = resolvePoolPresentationModel(pools.find((pool) => pool.id === 'standard'), pets);
  const previews = getStandardUrPreviews(model);
  assert.ok(previews.length > 1);
  assert.deepEqual(previews.map((pet) => pet.id), pets.filter((pet) => pet.rarity === 'UR' && pet.poolTags.includes('standard')).map((pet) => pet.id));
  assert.deepEqual(getStandardUrPreviews({ ...model, poolId: 'limited' }), []);
});

test('repeated clicks wrap, rerender retains selection, and obsolete image loads stay hidden', () => {
  const classes = new Set();
  const image = { dataset: {}, classList: { add: (v) => classes.add(v), remove: (v) => classes.delete(v) }, removeAttribute: () => {} };
  const name = {};
  const count = {};
  const button = {};
  const elements = { img: image, '[data-carousel-name]': name, '[data-carousel-count]': count, button };
  const host = { querySelector: (selector) => elements[selector] };
  const carousel = createStandardUrCarousel(host);
  const model = { poolId: 'standard', eligiblePets: [
    { id: 'one', name: 'One', rarity: 'UR', image: 'one.png', imageVariants: { stage: 'one.webp' } },
    { id: 'two', name: 'Two', rarity: 'UR', image: 'two.png', imageVariants: { stage: 'two.webp' } },
  ] };
  carousel.render(model);
  const staleLoad = image.onload;
  button.onclick();
  staleLoad();
  assert.ok(classes.has('is-loading'));
  assert.equal(image.src, 'two.webp');
  image.onerror();
  assert.equal(image.src, 'two.png');
  image.onload();
  assert.ok(!classes.has('is-loading'));
  carousel.render(model);
  assert.equal(count.textContent, '2 / 2');
  button.onclick();
  assert.equal(count.textContent, '1 / 2');
  assert.equal(name.textContent, 'One');
  carousel.render({ ...model, poolId: 'limited' });
  assert.equal(host.hidden, true);
  assert.equal(button.disabled, true);
  carousel.render({ ...model, eligiblePets: model.eligiblePets.slice(0, 1) });
  assert.equal(host.hidden, false);
  assert.equal(button.disabled, true);
});
