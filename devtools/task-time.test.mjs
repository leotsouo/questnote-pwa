import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizePlannedTime, normalizeTask } from '../src/taskMigration.js';
import { createTask } from '../src/taskService.js';
import { validateBackup, normalizeBackupPayload, migrateImportedData } from '../src/backupService.js';
import { validateSnapshotData } from '../src/backupSchema.js';

test('optional clock metadata accepts a local HH:mm without changing planning or rewards', () => {
  for (const time of ['00:00', '08:05', '20:30', '23:59']) assert.equal(normalizePlannedTime(time), time);
  for (const value of [undefined, null, '', '24:00', '12:60', '8:05', '08:05:00', 830, {}]) {
    assert.equal(normalizePlannedTime(value), null);
  }
  const baseline = normalizeTask({ id: 'task', content: '晚上吃藥', plannedDate: '2026-10-04',
    createdAt: '2026-10-01T00:00:00Z', rewardClaimed: true }, '2026-10-04');
  const timed = normalizeTask({ ...baseline, plannedTime: '20:30' }, '2026-10-04');
  assert.deepEqual(timed, { ...baseline, plannedTime: '20:30' });
  assert.equal(baseline.plannedTime, null);
});

test('invalid task times reject before writing a task', async () => {
  for (const plannedTime of ['24:00', '12:60', 'tomorrow', {}, 1200]) {
    await assert.rejects(createTask({ content: '晚上吃藥', plannedTime }), /有效時間/);
  }
});

test('backup round trips optional time and rejects malformed time before normalization', () => {
  const load = () => JSON.parse(readFileSync(new URL('./fixtures/backups/legacy-3.4.4.json', import.meta.url), 'utf8'));
  const legacy = migrateImportedData(normalizeBackupPayload(load()));
  assert.equal(legacy.tasks[0].plannedTime, null);
  for (const plannedTime of ['00:00', '20:30', '23:59', null]) {
    const backup = load();
    backup.tasks[0].plannedTime = plannedTime;
    backup.data.tasks[0].plannedTime = plannedTime;
    assert.equal(validateBackup(backup).valid, true);
    const restored = migrateImportedData(normalizeBackupPayload(backup));
    assert.deepEqual(restored.tasks[0], { ...legacy.tasks[0], plannedTime });
    assert.deepEqual(restored.wallet, legacy.wallet);
    assert.deepEqual(restored.collection, legacy.collection);
    assert.deepEqual(validateSnapshotData(restored), []);
  }
  for (const plannedTime of ['24:00', '8:30', 830, '']) {
    const backup = load();
    backup.tasks[0].plannedTime = plannedTime;
    backup.data.tasks[0].plannedTime = plannedTime;
    assert.equal(validateBackup(backup).valid, false);
  }
});
