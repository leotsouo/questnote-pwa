import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { validateExpeditionImages, checkSourceExpeditionImages } from '../scripts/validate-expedition-images.mjs';

const catalog = { areas: [{ id: 'test_city' }] };
test('expedition gate rejects a missing new destination even with an SVG placeholder', async () => {
  const assets = new Map([['assets/expeditions/test_city.svg', Buffer.from('<svg/>')]]);
  await assert.rejects(validateExpeditionImages({ catalog, readBytes: async file => assets.get(file) }), /Missing expedition artwork/);
});
test('expedition gate decodes pixels and rejects fake, corrupt or unusable images', async () => {
  for (const bytes of [Buffer.from('<svg/>'), Buffer.from('RIFFbrokenWEBP'),
    await sharp({ create: { width: 80, height: 80, channels: 3, background: '#345' } }).webp().toBuffer()]) {
    await assert.rejects(validateExpeditionImages({ catalog, readBytes: async () => bytes }), /Invalid expedition artwork/);
  }
  const valid = await sharp({ create: { width: 960, height: 540, channels: 3, background: '#345' } }).webp().toBuffer();
  await assert.rejects(validateExpeditionImages({ catalog, readBytes: async () => valid.subarray(0, valid.length - 20) }), /Invalid expedition artwork/);
});
test('every published expedition has decoded landscape artwork and offline precache', async () => {
  const results = await checkSourceExpeditionImages(fileURLToPath(new URL('../', import.meta.url)));
  assert.ok(results.some(row => row.areaId === 'lionheart_city'));
  assert.ok(results.every(row => row.width >= 960 && row.height >= 540));
});
