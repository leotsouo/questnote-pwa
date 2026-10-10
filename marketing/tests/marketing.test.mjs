import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { completeQuest, resetQuest, DEMO_REWARD } from '../demo.js';
import { getDistribution, MARKETING_CONFIG } from '../config.js';
import { getAttribution, distributionUrl } from '../analytics.js';

test('demo awards once, resets independently, and matches actual normal task rewards', async () => {
  const initial = resetQuest();
  const completed = completeQuest(initial);
  assert.equal(completed.progress, 3);
  assert.equal(completed.bond, 15);
  assert.equal(initial.progress, 2);
  assert.equal(completeQuest(completed), completed);
  assert.deepEqual(resetQuest(), initial);
  const source = await fs.readFile(new URL('../../src/rewardService.js', import.meta.url), 'utf8');
  for (const [constant, expected] of [['PRIORITY_REWARDS', DEMO_REWARD.stardust], ['PRIORITY_ENERGY', DEMO_REWARD.energy], ['PRIORITY_BOND', DEMO_REWARD.bond]]) {
    const match = source.match(new RegExp(`const ${constant} = \\{\\s*normal: (\\d+)`));
    assert.equal(Number(match?.[1]), expected, 'Marketing demo must agree with the source reward contract');
  }
});
test('a distribution mode cannot expose an invented or unconfigured destination', () => {
  assert.match(getDistribution().url, /^https:\/\//);
  for (const mode of ['waitlist', 'testflight', 'appstore']) {
    assert.throws(() => getDistribution({ ...MARKETING_CONFIG, distributionMode: mode }));
  }
});
test('UTM preserves allowed attribution; unrelated query and personal data are not forwarded', () => {
  const attribution = getAttribution('?utm_source=line&utm_medium=social&utm_campaign=beta&email=private@example.com');
  assert.deepEqual(attribution, { utm_source: 'line', utm_medium: 'social', utm_campaign: 'beta' });
  const target = new URL(distributionUrl(getDistribution().url, attribution));
  assert.equal(target.searchParams.get('utm_source'), 'line');
  assert.equal(target.searchParams.has('email'), false);
});
test('marketing uses no persistence, production writes or App runtime imports', async () => {
  for (const file of ['main.js', 'demo.js', 'analytics.js']) {
    const code = await fs.readFile(new URL('../' + file, import.meta.url), 'utf8');
    assert.doesNotMatch(code, /import.*src\/|indexedDB\.open|localStorage\.|sessionStorage\.|fetch\(/);
  }
});
