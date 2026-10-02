import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const memoryUrl = new URL('./companion-session-db.js', import.meta.url).href;
const dbUrl = new URL('../src/db.js', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  const resolved = next(specifier, context);
  return resolved.url === dbUrl ? { ...resolved, url: memoryUrl } : resolved;
} });
const db = await import('./companion-session-db.js');
const collection = await import('../src/collectionService.js');
const { isLocalArtPreview } = await import('../src/localArtPreview.js');
const { buildTwilightHome } = await import('../src/twilightPresentation.js');
const { applyStardustRewardAndUpdateMeta } = await import('../src/rewardService.js');

test('review gate accepts only the dedicated loopback source marker', () => {
  const context = { profile: null, origin: 'http://127.0.0.1:4193', marker: 'companion-art-session' };
  assert.equal(isLocalArtPreview(context), true);
  for (const change of [{ profile: { profile: 'preview' } }, { profile: undefined }, { origin: 'https://leotsouo.github.io' }, { origin: 'http://127.0.0.1:4187' }, { marker: '' }]) {
    assert.equal(isLocalArtPreview({ ...context, ...change }), false);
  }
});
test('native companion and nickname APIs share one in-memory collection', async () => {
  await collection.setCompanion('pet_ssr25');
  const nickname = await collection.setPetNickname('pet_ssr25', '橋橋');
  assert.equal(nickname.success, true);
  const rows = await collection.getCollection();
  assert.equal(rows.filter((row) => row.isCompanion).length, 1);
  assert.equal(rows.find((row) => row.petId === 'pet_n01').isCompanion, false);
  assert.equal(rows.find((row) => row.petId === 'pet_ssr25').nickname, '橋橋');
});
test('session reads clone records and aborted direct transactions roll back all queued writes', async () => {
  const before = await db.dbGet('meta', 'wallet');
  before.stardust = -1;
  assert.equal((await db.dbGet('meta', 'wallet')).stardust, 30000);
  const native = await db.openDB();
  await new Promise((resolve) => {
    const tx = native.transaction('meta', 'readwrite');
    tx.onabort = resolve;
    tx.objectStore('meta').put({ key: 'wallet', stardust: 1 });
    tx.abort();
  });
  assert.equal((await db.dbGet('meta', 'wallet')).stardust, 30000);
});
test('concurrent service mutations serialize and async reducers cannot leak writes', async () => {
  await db.dbPut('meta', { key: 'counter', count: 0 });
  await Promise.all(Array.from({ length: 8 }, () => db.dbUpdateRecord('meta', 'counter', (row) => ({ ...row, count: row.count + 1 }))));
  assert.equal((await db.dbGet('meta', 'counter')).count, 8);
  await assert.rejects(db.dbMutateRecords([{ store: 'meta', key: 'counter' }], async () => ({ puts: [{ store: 'meta', value: { key: 'counter', count: 99 } }] })), /synchronous/);
  assert.equal((await db.dbGet('meta', 'counter')).count, 8);
});
test('the App direct reward transaction remains idempotent inside the session', async () => {
  const options = { stardust: 20, stateKey: 'reviewReward', updateState: (raw) => raw ? null : { key: 'reviewReward', claimed: true } };
  await Promise.all([applyStardustRewardAndUpdateMeta(options), applyStardustRewardAndUpdateMeta(options)]);
  assert.equal((await db.dbGet('meta', 'wallet')).stardust, 30020);
});
test('nickname is primary and canonical identity stays readable on all three actual homes', () => {
  for (const theme of ['default', 'sweet', 'twilight']) {
    const html = buildTwilightHome({ id: 'pet_n01', name: '灰影幼狼', originalName: '灰影幼狼', displayName: '小灰', nickname: '小灰', rarity: 'N' }, true, theme);
    assert.match(html, /twilight-pet-name__text">小灰/);
    assert.match(html, /原名：灰影幼狼/);
  }
});
