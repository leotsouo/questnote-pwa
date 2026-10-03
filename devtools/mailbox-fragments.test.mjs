import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const dbUrl = new URL('../src/db.js', import.meta.url).href;
const mockUrl = new URL('./companion-session-db.js', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  const result = next(specifier, context);
  return result.url === dbUrl ? { ...result, url: mockUrl } : result;
} });
const db = await import('./companion-session-db.js');
const mailbox = await import('../src/mailboxService.js');
const otherClient = await import('../src/mailboxService.js?other-client');
const { validateMailboxReward, validateMailboxDocument, normalizeMailboxMessage } = await import('../src/mailboxSchema.js');
const { claimRewardBatch } = await import('../src/rewardClaimService.js');
const base = { key:'encounterEconomy', schemaVersion:1, migrationVersion:1, balance:242, migrationReceipt:null };
const raw = { id:'fragment-test', type:'compensation', title:'相遇贈禮', body:'50枚', publishedAt:'2026-10-03T00:00:00Z',
  expiresAt:null, enabled:true, minAppVersion:'3.6.2', reward:{encounterFragments:50} };
const message = (id, changes = {}) => normalizeMailboxMessage({ ...raw, id, ...changes });
test('fragment rewards require integers, a cap, known keys and compatible publication version', () => {
  assert.equal(validateMailboxReward({encounterFragments:50}).reward.encounterFragments,50);
  for(const value of [-1,0.5,501,'50',NaN,Infinity]) assert.equal(validateMailboxReward({encounterFragments:value}).ok,false);
  assert.equal(validateMailboxReward({petFragments:50}).ok,false);
  assert.equal(validateMailboxDocument({schemaVersion:1,messages:[raw]}).ok,true);
  assert.equal(validateMailboxDocument({schemaVersion:1,messages:[{...raw,minAppVersion:'3.6.1'}]}).ok,false);
});
test('a fragment-only gift commits exactly 50 and the same gift cannot be reclaimed by another client', async () => {
  await db.dbPut('meta',base);
  const wallet=await db.dbGet('meta','wallet');
  const first=await mailbox.claimMailboxReward(message('once'));
  assert.equal(first.success,true);
  assert.equal(first.encounterEconomy.balance,292);
  const second=await otherClient.claimMailboxReward(message('once'));
  assert.equal(second.alreadyClaimed,true);
  assert.equal((await db.dbGet('meta','encounterEconomy')).balance,292);
  assert.equal((await db.dbGet('meta','wallet')).stardust,wallet.stardust);
  assert.ok((await db.dbGet('meta','globalMailboxState')).claimedIds.includes('once'));
  assert.deepEqual(mailbox.formatMailboxRewardPreview(first.reward),[{type:'fragment',text:'相遇碎片 ×50'}]);
});
test('concurrent clients grant one gift once through the persisted transaction marker', async () => {
  const before=(await db.dbGet('meta','encounterEconomy')).balance;
  const results=await Promise.all([mailbox.claimMailboxReward(message('race')),otherClient.claimMailboxReward(message('race'))]);
  assert.equal(results.filter(result=>result.success).length,1);
  assert.equal((await db.dbGet('meta','encounterEconomy')).balance,before+50);
});
test('overflow, invalid state and unfinished migration never mark a failed reward claimed or grant other resources', async () => {
  for(const row of [{...base,balance:Number.MAX_SAFE_INTEGER},{...base,migrationVersion:0},{...base,balance:-1}]) {
    await db.dbPut('meta',row);
    const beforeWallet=await db.dbGet('meta','wallet');
    const result=await mailbox.claimMailboxReward(message('abort',{reward:{encounterFragments:50,stardust:7}}));
    assert.equal(result.success,false);
    assert.deepEqual(await db.dbGet('meta','encounterEconomy'),row);
    assert.equal((await db.dbGet('meta','wallet')).stardust,beforeWallet.stardust);
    assert.equal((await db.dbGet('meta','globalMailboxState')).claimedIds.includes('abort'),false);
  }
  await db.dbPut('meta',base);
  assert.equal((await mailbox.claimMailboxReward(message('abort'))).success,true);
});
test('an old App cannot claim the gift and bulk claims report fragments without losing other rewards', async () => {
  assert.equal((await mailbox.claimMailboxReward(message('old'),{appVersion:'3.6.1'})).success,false);
  const result=await claimRewardBatch(['a','b'],async()=>({success:true,reward:{encounterFragments:50,stardust:1}}));
  assert.equal(result.rewards.encounterFragments,100);
  assert.equal(result.rewards.stardust,2);
});
