import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareRaceDay, settleRace, racePayout, normalizeDailyRace, validateDailyRace, randomRaceIndex } from '../src/dailyRaceCore.js';
import { normalizeBackupPayload, migrateImportedData, validateBackup } from '../src/backupService.js';
import { validateStoredSnapshot, SNAPSHOT_KEYS } from '../src/backupSchema.js';

const pets = Array.from({ length: 12 }, (_, i) => ({ id: `pet_r${i}`, rarity: i ? 'N' : 'UR' }));
const date = '2026-10-09';
const now = `${date}T10:00:00.000Z`;
const day = () => prepareRaceDay(null, date, pets, () => 0);
const bet = (round = 0, stake = 100) => ({ date, round, mode: 'bet', selectedId: 'pet_r0', stake });
const settle = (state, wallet = { key: 'wallet', stardust: 1500 }, request = bet(), winner = 0) =>
  settleRace(state, wallet, request, date, now, () => winner);

test('four equally sized winning outcomes; no rarity/history/amount bias; exact 95% return', () => {
  for (const stake of [5, 100, 500]) {
    const results = [0, 1, 2, 3].map(winner => settle(day(), undefined, bet(0, stake), winner));
    assert.deepEqual(results.map(r => r.result.winnerId), pets.slice(0, 4).map(p => p.id));
    assert.equal(results.reduce((sum, r) => sum + r.result.payout, 0), stake * 3.8);
    assert.equal(results.filter(r => r.result.payout > 0).length, 1);
  }
  // Production sampler uses unbiased uint32 rejection rather than float/modulo bias.
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  let draw = 0;
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues: a => { a[0] = draw++; return a; } } });
  try {
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 400; i++) counts[randomRaceIndex(4)]++;
    assert.deepEqual(counts, [100, 100, 100, 100]);
    let rejected = false;
    globalThis.crypto.getRandomValues = a => { a[0] = rejected ? 2 : 0xffffffff; rejected = true; return a; };
    assert.equal(randomRaceIndex(3), 2);
  } finally { Object.defineProperty(globalThis, 'crypto', previous); }
});

test('stakes, insufficient balances, unknown selections and fourth races fail without mutation', () => {
  const original = day();
  const serialized = JSON.stringify(original);
  for (const stake of [-5, 0, 1, 7, 501, 505, 10.5, NaN, '100']) assert.throws(() => settle(original, undefined, bet(0, stake)));
  assert.throws(() => settle(original, { stardust: 4 }, bet(0, 5)), /不足/);
  assert.throws(() => settle(original, undefined, { ...bet(), selectedId: 'pet_missing' }));
  assert.throws(() => settle(original, undefined, bet(3)));
  assert.throws(() => settle(original, { stardust: Number.MAX_SAFE_INTEGER }));
  assert.equal(JSON.stringify(original), serialized);
  assert.equal(racePayout(500), 1900);
});

test('three losses can spend 1500; duplicate play preserves result and balance', () => {
  let state = day(), wallet = { key: 'wallet', stardust: 1500 };
  for (let round = 0; round < 3; round++) {
    const result = settle(state, wallet, bet(round, 500), 1);
    ({ state, wallet } = result);
    const duplicate = settle(state, wallet, bet(round, 500), 0);
    assert.equal(duplicate.duplicate, true);
    assert.deepEqual(duplicate.wallet, wallet);
    assert.deepEqual(duplicate.result, result.result);
  }
  assert.equal(wallet.stardust, 0);
  assert.deepEqual(validateDailyRace(state), []);
});

test('free watch uses the round, never changes wallet, cannot bet after seeing winner', () => {
  const watch = { ...bet(), mode: 'watch', stake: 0, selectedId: null };
  const result = settle(day(), { key: 'wallet', stardust: 0 }, watch);
  assert.equal(result.wallet.stardust, 0);
  assert.equal(result.result.payout, 0);
  assert.equal(settle(result.state, result.wallet).duplicate, true);
});

test('rosters persist across reopen; rollover archives and rejects stale/clock-rollback bets', () => {
  const result = settle(day());
  assert.deepEqual(prepareRaceDay(result.state, date, [], () => { throw new Error('reroll'); }), result.state);
  const tomorrow = prepareRaceDay(result.state, '2026-10-10', pets, () => 0);
  assert.deepEqual(tomorrow.history, [result.state.day]);
  assert.equal(tomorrow.day.rounds.filter(r => r.result === null).length, 3);
  assert.throws(() => settleRace(tomorrow, result.wallet, bet(), '2026-10-10', now), /日期/);
  assert.throws(() => prepareRaceDay(tomorrow, date, pets), /日期/);
  assert.throws(() => prepareRaceDay(null, '2026-02-30', pets));
  assert.throws(() => prepareRaceDay(null, date, pets.slice(0, 3)));
});

test('old backups gain empty race state; current backup preserves receipts and rejects tampering', () => {
  const legacy = JSON.parse(readFileSync(new URL('./fixtures/backups/legacy-3.4.4.json', import.meta.url)));
  const baseline = migrateImportedData(normalizeBackupPayload(legacy));
  assert.deepEqual(baseline.dailyRace, normalizeDailyRace());
  baseline.dailyRace = settle(day()).state;
  const backup = { app: 'QuestNote', version: 2, appVersion: '3.9.2', data: Object.fromEntries(SNAPSHOT_KEYS.map(key => [key, baseline[key]])) };
  assert.equal(validateBackup(backup).valid, true, validateBackup(backup).error);
  assert.deepEqual(normalizeBackupPayload(backup).dailyRace, baseline.dailyRace);
  const previous = structuredClone(backup);
  previous.appVersion = '3.9.1';
  delete previous.data.dailyRace;
  assert.equal(validateBackup(previous).valid, true);
  baseline.dailyRace.day.rounds[0].result.payout++;
  assert.equal(validateBackup(backup).valid, false);
  assert.throws(() => normalizeDailyRace(baseline.dailyRace));
  assert.ok(validateStoredSnapshot({ tasks: [], collection: [], expeditions: [], habits: [], meta: [baseline.dailyRace] }).length);
});
