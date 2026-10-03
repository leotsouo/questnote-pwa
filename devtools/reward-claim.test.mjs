import test from 'node:test';
import assert from 'node:assert/strict';
import { claimRewardBatch, claimAllAvailableRewards, isBulkClaimInProgress } from '../src/rewardClaimService.js';

test('bulk claims wait for each commit and summarize all reward types', async () => {
  let active = 0;
  const order = [];
  const result = await claimRewardBatch([1, 2], async (id) => {
    assert.equal(active++, 0);
    await new Promise((resolve) => setImmediate(resolve));
    active--;
    order.push(id);
    return { success: true, reward: { stardust: id * 10, adventureEnergy: 1,
      materials: { forest_leaf: id }, items: { food: 1 } } };
  });
  assert.deepEqual(order, [1, 2]);
  assert.equal(result.count, 2);
  assert.deepEqual(result.rewards, { stardust: 30, adventureEnergy: 2,
    materials: { forest_leaf: 3 }, items: { food: 2 } });
});

test('partial failures preserve successful grants and identify retryable entries', async () => {
  const result = await claimRewardBatch(['first', 'invalid', 'broken', 'last'], async (entry) => {
    if (entry === 'invalid') return { success: false, error: '過期' };
    if (entry === 'broken') throw new Error('儲存失敗');
    return { success: true, reward: { stardust: 5 } };
  });
  assert.equal(result.success, true);
  assert.equal(result.count, 2);
  assert.equal(result.rewards.stardust, 10);
  assert.deepEqual(result.failures, [{ entry: 'invalid', error: '過期' }, { entry: 'broken', error: '儲存失敗' }]);
  assert.deepEqual(result.results.map((item) => item.entry), ['first', 'last']);
});

test('empty claims grant nothing; an invalid category releases the shared lock', async () => {
  const empty = await claimRewardBatch([], () => assert.fail('Must not grant'));
  assert.equal(empty.count, 0);
  assert.equal(empty.success, false);
  const pending = claimAllAvailableRewards('invalid');
  await pending;
  assert.equal(isBulkClaimInProgress(), false);
});
