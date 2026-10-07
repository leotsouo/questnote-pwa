import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';
const dbUrl = new URL('../src/db.js', import.meta.url).href;
const mockUrl = new URL('./companion-session-db.js', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  const result = next(specifier, context);
  return result.url === dbUrl ? { ...result, url: mockUrl } : result;
} });
const db = await import('./companion-session-db.js');
const mailbox = await import('../src/mailboxService.js');
const { validateMailboxDocument } = await import('../src/mailboxSchema.js');
const { claimAllAvailableRewards } = await import('../src/rewardClaimService.js');
const document = JSON.parse(fs.readFileSync(new URL('../data/global-mailbox.json', import.meta.url)));
const preservedMessageHashes = {
  "2026-10-v362-encounter-fragments-gift-01": "563507fa383e4b6d49f7a3715f5135c1da188322c333e0445ba2ff73b36ac552",
  "2026-10-lionheart-inverse-oath-summon-gift-01": "a8401e408e1becfbcf58a3f5f0a2744e61441a8d7c97ec555d3c3b9b0bb7453b",
  "2026-10-v3521-collection-summon-redesign-gift": "d6700de1cbbef5778447f289f6002fc73a07281e44ed3e0839262bf3f3bebd48",
  "2026-10-frequent-updates-compensation-01": "759654d3fc683dca80a7e74502531b5476a48be6d7d9d2bd6f3bcd5e94dd844a",
  "2026-09-v3421-expedition-update-gift": "f1284f49c91fd0cd408bc2320d6489bf47b4e429905c66dae20b4f624b8fa6c8",
  "2026-09-v3413-growth-lessons-gift": "0d48d6906de896cf7da20af5bb4c76850fbc8d668499b888ea6396d64ae838cb",
  "system_mail_v342_eternal_slumber_launch": "66542e352b7df59f971ee49c79d9676c69989cc0e1522b28ee806afb2769e729",
  "2026-07-v300-compensation": "856bf3b00ec04984ae74ba45a4c3303b79ef3b796463216781e0bc7e6a12d2f2",
  "2026-07-welcome-10pull": "355fb72622994355069324d66602ea3798324343f34cf7bc8197a42fa03a0554",
  "2026-10-v386-task-wizard-collection-update": "903603b0168fdd8d77d979ced186560bcaa312e211f3bae70b91edbf00a7b821"
};
const now = Date.parse('2026-10-08T12:00:00+08:00');
const options = { now, appVersion: '3.8.7', includeLocalDev: false };
const payload = mailbox.normalizeMailboxPayload(document);
const empty = { readIds: [], claimedIds: [] };
const vm = (state = empty, extra = {}) => mailbox.buildMailboxViewModel(payload, state, { ...options, ...extra });

test('existing reward identities, amounts, eligibility and deadlines are unchanged; announcement is untouched', () => {
  assert.equal(validateMailboxDocument(document).ok, true);
  for (const [id, hash] of Object.entries(preservedMessageHashes)) {
    const message = document.messages.find((candidate) => candidate.id === id);
    assert.ok(message, id);
    assert.equal(createHash('sha256').update(JSON.stringify(message)).digest('hex'), hash, id);
  }
});

test('fresh profiles see three envelopes with eight original attachments and no extra reward', () => {
  const summary = vm();
  assert.equal(summary.totalVisible, 3);
  assert.equal(summary.messages.length, 3);
  assert.equal(summary.unreadCount, 3);
  assert.equal(summary.claimableCount, 8);
  assert.equal(summary.messages.filter((message) => message.memberMessages).length, 2);
  assert.equal(summary.messages.flatMap((message) => message.memberMessages || []).length, 8);
  const claimable = summary.allVisible.filter((message) => message.status.claimable);
  assert.equal(claimable.reduce((sum, message) => sum + message.reward.stardust, 0), 5300);
  assert.equal(claimable.reduce((sum, message) => sum + message.reward.adventureEnergy, 0), 23);
  assert.equal(claimable.reduce((sum, message) => sum + (message.reward.encounterFragments || 0), 0), 50);
  assert.equal(claimable.reduce((sum, message) => sum + (message.reward.items.item_small_spirit_food || 0), 0), 5);
});

test('partial claims and reads are reflected on envelopes; filter preserves all group members', () => {
  const gifts = vm().allVisible.filter((message) => message.type === 'compensation');
  const summary = vm({ claimedIds: [gifts[0].id], readIds: gifts.map((message) => message.id) });
  assert.equal(summary.unreadCount, 1);
  assert.equal(summary.claimableCount, 7);
  assert.equal(vm({ claimedIds: gifts.map((message) => message.id), readIds: [] }, { filter: 'claimable' }).messages.length, 0);
  assert.equal(vm(empty, { filter: 'unread' }).messages.length, 3);
});

test('expiry and version filtering apply to each original attachment; later announcements remain independent', () => {
  const expired = vm(empty, { now: Date.parse('2026-12-01T00:00:00Z') });
  assert.equal(expired.totalVisible, 2);
  assert.equal(expired.claimableCount, 2);
  assert.equal(vm(empty, { appVersion: '3.6.1' }).allVisible.some((message) => message.id.includes('v362')), false);
  const future = mailbox.normalizeMailboxMessage({ id: 'future-update', type: 'update', title: '新公告', body: '',
    publishedAt: '2026-10-08T00:00:00Z', enabled: true });
  assert.equal(mailbox.buildMailboxViewModel({ messages: [...payload.messages, future] }, empty, options).messages.length, 4);
});

test('bulk claim pays only unclaimed source attachments, persists original IDs, and survives subsequent retries', async () => {
  await db.dbPut('meta', { key: 'encounterEconomy', schemaVersion: 1, migrationVersion: 1, balance: 0, migrationReceipt: null });
  await db.dbPut('meta', { key: 'wallet', stardust: 0, adventureEnergy: 0, materials: {} });
  await db.dbPut('meta', { key: 'inventory', items: {} });
  const claimedId = '2026-10-lionheart-inverse-oath-summon-gift-01';
  await db.dbPut('meta', { key: mailbox.MAILBOX_STATE_KEY, ...empty, claimedIds: [claimedId] });
  const result = await claimAllAvailableRewards('mailbox', { ...options, payload });
  assert.equal(result.count, 7);
  assert.equal(result.failures.length, 0);
  assert.equal(result.rewards.stardust, 4300);
  assert.equal(result.rewards.adventureEnergy, 23);
  assert.equal(result.rewards.encounterFragments, 50);
  assert.equal(result.rewards.items.item_small_spirit_food, 5);
  const state = await mailbox.getGlobalMailboxState();
  assert.equal(state.claimedIds.length, 8);
  assert.equal(state.claimedIds.some((id) => id.startsWith('mailbox-bundle-')), false);
  assert.equal((await claimAllAvailableRewards('mailbox', { ...options, payload })).count, 0);
  assert.equal((await db.dbGet('meta', 'wallet')).stardust, 4300);
  assert.equal((await db.dbGet('meta', 'encounterEconomy')).balance, 50);
});
