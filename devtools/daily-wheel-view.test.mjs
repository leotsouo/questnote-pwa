import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildWheelDiscHtml, getWheelShortLabel, computeWheelRotationDeg } from '../src/ui/dailyWheelView.js';

const REWARDS = [
  { type: 'stardust', amount: 50, label: '星塵 +50' },
  { type: 'adventureEnergy', amount: 2, label: '冒險能量 +2' },
  { type: 'material', materialId: 'forest_leaf', amount: 3, label: '森林嫩葉 +3' },
  { type: 'item', itemId: 'item_small_spirit_food', label: '小份靈食 +1' },
  { type: 'material', materialId: 'unknown_ore', amount: 4, label: '神秘的遠古礦石碎片結晶 +4' },
  { type: 'bonus', label: '<script>alert(1)</script>沒有加號的超長獎勵名稱' },
  { type: 'item', itemId: 'item_other', amount: 7, label: '' },
  { type: 'stardust', label: '星塵' },
];
const sha256 = (text) => createHash('sha256').update(text).digest('hex');

// Recorded from the wheel code as it existed inside src/ui.js (tag pre-cleanup-2026-10-14),
// so the extracted module must keep producing exactly the same markup.
test('wheel markup is unchanged from the pre-extraction implementation in both palettes', () => {
  assert.equal(sha256(buildWheelDiscHtml(REWARDS)), 'e5f4edb5f26c29892fdb29c5a7c6ad92ce4a57911b9d872679ad0020d23c8e89');
  assert.equal(sha256(buildWheelDiscHtml(REWARDS, { sweet: true })), 'ef8b1842ed99e9f7f268394ea269bc527330012e7caac3e21a422b28b42a9963');
});

test('the disc has one sector per reward and escapes reward text', () => {
  const html = buildWheelDiscHtml(REWARDS);
  assert.equal(html.split('class="daily-wheel-sector"').length - 1, REWARDS.length);
  assert.equal(html.split('class="daily-wheel-preview__item"').length - 1, REWARDS.length);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes(' fill="#4A2E3B"'), 'default palette leaves label colour to CSS');
  assert.ok(buildWheelDiscHtml(REWARDS, { sweet: true }).includes(' fill="#4A2E3B"'));
});

test('short labels use known names, parse a trailing amount and truncate to eight characters', () => {
  assert.deepEqual(REWARDS.map(getWheelShortLabel), [
    { name: '星塵', amount: '+50' },
    { name: '能量', amount: '+2' },
    { name: '嫩葉', amount: '+3' },
    { name: '靈食', amount: '+1' },
    { name: '神秘的遠古礦石碎', amount: '+4' },
    { name: '<script>', amount: '+1' },
    { name: '', amount: '+7' },
    { name: '星塵', amount: '+1' },
  ]);
});

test('rotation lands the chosen segment under the pointer within its jitter band', () => {
  assert.equal(computeWheelRotationDeg(2, 8, 3, () => 0.5), 1327.5);
  for (let index = 0; index < 8; index += 1) {
    for (const roll of [0, 0.25, 0.999]) {
      const rotation = computeWheelRotationDeg(index, 8, 4, () => roll);
      const pointerAngle = ((360 - (rotation % 360)) % 360);
      assert.ok(pointerAngle > index * 45 && pointerAngle < (index + 1) * 45, `segment ${index}, roll ${roll}`);
    }
  }
});

test('every view module extracted from ui.js is listed for source checks and precached', async () => {
  const fs = await import('node:fs');
  const { UI_SOURCE_PARTS } = await import('../src/uiSourceParts.js');
  const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const extracted = [...read('src/ui.js').matchAll(/from '\.\/(ui\/[^']+\.js)'/g)].map((match) => `src/${match[1]}`);
  assert.ok(extracted.includes('src/ui/dailyWheelView.js'));
  assert.deepEqual([...UI_SOURCE_PARTS], ['src/ui.js', ...extracted]);
  const worker = read('service-worker.js');
  for (const file of [...extracted, 'src/uiSourceParts.js']) assert.ok(worker.includes(`'${file}',`), `${file} missing from PRECACHE_URLS`);
});
