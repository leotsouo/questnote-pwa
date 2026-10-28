// Moving a save from the PWA to the iOS app (V3.14.x). The two sides have separate
// IndexedDB containers, so the move is export → file → restore. These tests run the
// real db.js / backupService.js against an in-memory IndexedDB and check that the
// save arrives unchanged, that a failed restore leaves the app empty, and that the
// app offers the move only on its very first open.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMemoryIndexedDB } from './memory-indexeddb.mjs';

const memory = createMemoryIndexedDB();
globalThis.indexedDB = memory.indexedDB;

const { exportBackup, normalizeBackupPayload, restoreBackup, validateBackup } = await import('../src/backupService.js');
const { readAllStoresSnapshot } = await import('../src/db.js');
const { summarizeBackupForMigration, compareMigrationSummaries, shouldOfferWebMigration,
  migrationFileName, canShareBackupFile, MIGRATION_SUMMARY_ROWS } = await import('../src/webToAppMigration.js');
const { initialGuidedState } = await import('../src/guidedOnboardingCore.js');

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/backups/legacy-3.4.4.json', import.meta.url), 'utf8'));
const withoutTime = ({ exportedAt, data, ...rest }) => ({ ...rest, data: { ...data } });

/** A PWA with a real save: the historical fixture restored through the normal path. */
async function seedWebApp() {
  memory.wipe();
  await restoreBackup(normalizeBackupPayload(fixture()));
}

test('web export → app restore → app export carries the identical save', async () => {
  await seedWebApp();
  const fromWeb = await exportBackup();
  assert.equal(validateBackup(fromWeb).valid, true);
  const webSnapshot = memory.dump();

  // The app is another device: its own empty container.
  memory.wipe();
  const file = JSON.parse(JSON.stringify(fromWeb));
  await restoreBackup(normalizeBackupPayload(file));
  const fromApp = await exportBackup();

  assert.deepEqual(withoutTime(fromApp), withoutTime(fromWeb));
  assert.deepEqual(memory.dump(), webSnapshot, 'every store row arrives unchanged');
  const webSummary = summarizeBackupForMigration(normalizeBackupPayload(fromWeb));
  const appSummary = summarizeBackupForMigration(normalizeBackupPayload(fromApp));
  assert.deepEqual(appSummary, webSummary);
  assert.deepEqual(compareMigrationSummaries(webSummary, appSummary), []);
  assert.ok(webSummary.taskCount > 0 && webSummary.petCount > 0, 'the fixture exercises real rows');
});

test('exporting for the move does not change the web save', async () => {
  await seedWebApp();
  const before = memory.dump();
  await exportBackup();
  assert.deepEqual(memory.dump(), before);
});

test('a failed restore leaves the fresh app empty and can be retried', async () => {
  await seedWebApp();
  const fromWeb = await exportBackup();
  memory.wipe();
  const empty = memory.dump();

  memory.failNextPut('collection');
  await assert.rejects(restoreBackup(normalizeBackupPayload(fromWeb)));
  assert.deepEqual(memory.dump(), empty, 'nothing from the half-written restore remains');

  await restoreBackup(normalizeBackupPayload(fromWeb));
  const snapshot = await readAllStoresSnapshot();
  assert.ok(snapshot.tasks.length > 0, 'retry succeeds');
});

test('an invalid file is rejected before anything is written', async () => {
  memory.wipe();
  const broken = fixture();
  broken.data.wallet = 'not a wallet';
  assert.equal(validateBackup(broken).valid, false);
  assert.throws(() => normalizeBackupPayload(broken));
  assert.deepEqual(memory.dump(), { tasks: [], meta: [], collection: [], expeditions: [], habits: [] });
});

test('summary counts tasks, pets, currency and pulls from the backup', () => {
  const normalized = normalizeBackupPayload(fixture());
  const summary = summarizeBackupForMigration(normalized);
  assert.deepEqual(Object.keys(summary), MIGRATION_SUMMARY_ROWS.map(([key]) => key));
  assert.equal(summary.taskCount, normalized.tasks.length);
  assert.equal(summary.completedTaskCount, normalized.tasks.filter((task) => task.completed).length);
  assert.equal(summary.petCount, normalized.collection.filter((item) => item.owned !== false).length);
  assert.equal(summary.stardust, normalized.wallet.stardust);
  assert.equal(summary.totalPulls, normalized.gachaStats.totalPulls ?? 0);
  assert.deepEqual(compareMigrationSummaries(summary, { ...summary, stardust: summary.stardust + 1, petCount: 0 }), ['寵物', '星塵']);
});

test('the app offers the move only on the iOS first open with nothing saved', () => {
  const fresh = initialGuidedState({ tasks: [], meta: [], collection: [], expeditions: [], habits: [] });
  assert.equal(shouldOfferWebMigration({ profile: 'ios', guided: fresh }), true);
  assert.equal(shouldOfferWebMigration({ profile: 'production', guided: fresh }), false, 'web app never offers it');
  assert.equal(shouldOfferWebMigration({ profile: undefined, guided: fresh }), false, 'source checkout never offers it');
  assert.equal(shouldOfferWebMigration({ profile: 'ios', guided: { ...fresh, step: 'MEET_COMPANION' } }), false, 'after choosing to start fresh');
  assert.equal(shouldOfferWebMigration({ profile: 'ios', guided: { ...fresh, mode: 'replay' } }), false);
  assert.equal(shouldOfferWebMigration({ profile: 'ios', guided: { ...fresh, status: 'existing' } }), false);
  assert.equal(shouldOfferWebMigration({ profile: 'ios', guided: fresh, taskCount: 1 }), false, 'never over an existing save');
  assert.equal(shouldOfferWebMigration({ profile: 'ios', guided: fresh, petCount: 1 }), false);
  const restoredDevice = initialGuidedState({ tasks: [{ id: 'a' }], meta: [], collection: [], expeditions: [], habits: [] });
  assert.equal(shouldOfferWebMigration({ profile: 'ios', guided: restoredDevice }), false);
});

test('file helpers: settings-compatible name and share detection', () => {
  assert.equal(migrationFileName(new Date('2026-10-25T08:00:00Z')), 'questnote-backup-2026-10-25.json');
  const file = { name: 'x.json' };
  assert.equal(canShareBackupFile({ share() {}, canShare: () => true }, file), true);
  assert.equal(canShareBackupFile({ share() {}, canShare: () => false }, file), false);
  assert.equal(canShareBackupFile({ share() {} }, file), false, 'no canShare means no file sharing');
  assert.equal(canShareBackupFile({ share() {}, canShare: () => { throw new Error('x'); } }, file), false);
  assert.equal(canShareBackupFile(undefined, file), false);
});

// V3.14.0: the developer health check showed in the iOS app because only production hid it.
test('the developer health check is hidden in production and in the iOS app', async () => {
  const { isHealthCheckVisible } = await import('../src/ui/settingsView.js');
  assert.equal(isHealthCheckVisible('production'), false);
  assert.equal(isHealthCheckVisible('ios'), false);
  assert.equal(isHealthCheckVisible('preview'), true);
  assert.equal(isHealthCheckVisible(undefined), true, 'source checkout keeps it');
});
