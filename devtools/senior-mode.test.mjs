import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

// Isolated transaction-backed session store: never opens the user's IndexedDB.
const dbUrl = new URL('../src/db.js', import.meta.url).href;
const mockUrl = new URL('./companion-session-db.js', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  const result = next(specifier, context);
  return result.url === dbUrl ? { ...result, url: mockUrl } : result;
} });
const db = await import('./companion-session-db.js');
const preferences = await import('../src/preferencesService.js');
const { validateBackup, normalizeBackupPayload, migrateImportedData } = await import('../src/backupService.js');
const { normalizeReadingMode, normalizeUserPreferences, applyReadingModeToDocument,
  setReadingMode, setSeniorOnboardingCompleted, setTheme, setFontSize, getUserPreferences } = preferences;

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/backups/legacy-3.4.4.json', import.meta.url), 'utf8'));

test('older preferences stay in normal mode; invalid values never enable a different presentation', () => {
  for (const value of [undefined, null, '', 'SENIOR', 'unsupported', true, 1, '__proto__', {}]) {
    assert.equal(normalizeReadingMode(value), 'normal');
    assert.equal(normalizeUserPreferences({ readingMode: value }).readingMode, 'normal');
  }
  assert.equal(normalizeUserPreferences(null).readingMode, 'normal');
  assert.equal(normalizeUserPreferences({ theme: 'sweet' }).seniorOnboardingCompleted, false);
  for (const value of ['true', 1, {}, null, undefined]) {
    assert.equal(normalizeUserPreferences({ seniorOnboardingCompleted: value }).seniorOnboardingCompleted, false);
  }
  assert.equal(normalizeUserPreferences({ readingMode: 'senior', seniorOnboardingCompleted: true }).seniorOnboardingCompleted, true);
});

test('enabling, disabling and invalid mode removal preserve the original theme and text preference', () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    documentElement: { dataset: { theme: 'twilight', fontSize: 'extra-large' } },
    body: { dataset: { theme: 'twilight' } },
  };
  try {
    assert.equal(applyReadingModeToDocument('senior'), 'senior');
    assert.equal(document.documentElement.dataset.readingMode, 'senior');
    assert.equal(document.body.dataset.readingMode, 'senior');
    for (const mode of ['normal', 'senior', 'invalid']) {
      applyReadingModeToDocument(mode);
      assert.equal(document.documentElement.dataset.readingMode, mode === 'senior' ? 'senior' : 'normal');
      assert.equal(document.documentElement.dataset.theme, 'twilight');
      assert.equal(document.documentElement.dataset.fontSize, 'extra-large');
      assert.equal(document.body.dataset.theme, 'twilight');
    }
    delete document.body;
    assert.equal(applyReadingModeToDocument('senior'), 'senior', 'early boot does not require a body');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('mode persistence and concurrent preference updates do not change any task, pet, currency or progression', async () => {
  await db.dbPut('tasks', { id: 'senior-task', title: '晚上吃藥', completed: false });
  await db.dbPut('habits', { id: 'senior-habit', title: '散步', completionDates: [] });
  await db.dbPut('meta', { key: 'encounterEconomy', balance: 87, schemaVersion: 1, migrationVersion: 1, migrationReceipt: null });
  await db.dbPut('meta', normalizeUserPreferences({ theme: 'sweet', fontSize: 'extra-large' }));
  const before = await db.readAllStoresSnapshot();
  const withoutPreferences = (snapshot) => ({ ...snapshot,
    meta: snapshot.meta.filter((row) => row.key !== 'userPreferences') });
  await Promise.all([setReadingMode('senior'), setSeniorOnboardingCompleted(true), setTheme('twilight'), setFontSize('large')]);
  const secondClient = await import('../src/preferencesService.js?senior-reload');
  assert.deepEqual(await secondClient.getUserPreferences(), {
    key: 'userPreferences', reduceMotion: false, theme: 'twilight', fontSize: 'large',
    readingMode: 'senior', seniorOnboardingCompleted: true,
  });
  assert.deepEqual(withoutPreferences(await db.readAllStoresSnapshot()), withoutPreferences(before));
  await setReadingMode('normal');
  assert.equal((await getUserPreferences()).seniorOnboardingCompleted, true, 'switching off does not restart onboarding');
  await setReadingMode('senior');
  assert.equal((await getUserPreferences()).readingMode, 'senior');
  await setReadingMode('invalid');
  assert.equal((await getUserPreferences()).readingMode, 'normal');
  assert.deepEqual(withoutPreferences(await db.readAllStoresSnapshot()), withoutPreferences(before));
});

test('backup roundtrip preserves mode and guide status with exactly the same shared progression', () => {
  const original = migrateImportedData(normalizeBackupPayload(fixture()));
  for (const readingMode of ['normal', 'senior']) {
    for (const seniorOnboardingCompleted of [false, true]) {
      const raw = fixture();
      for (const section of [raw, raw.data]) {
        Object.assign(section.userPreferences, { readingMode, seniorOnboardingCompleted });
        Object.assign(section.settings, { readingMode, seniorOnboardingCompleted });
      }
      const result = validateBackup(raw);
      assert.equal(result.valid, true, result.error);
      const restored = migrateImportedData(normalizeBackupPayload(JSON.parse(JSON.stringify(raw))));
      const expected = structuredClone(original);
      for (const section of [expected.userPreferences, expected.settings]) {
        Object.assign(section, { readingMode, seniorOnboardingCompleted });
      }
      assert.deepEqual(restored, expected);
    }
  }
  assert.equal(original.userPreferences.readingMode, 'normal');
  assert.equal(original.userPreferences.seniorOnboardingCompleted, false);
});

test('invalid or conflicting backup preferences are rejected before normalization can hide corruption', () => {
  for (const patch of [{ readingMode: 'unexpected' }, { readingMode: true }, { seniorOnboardingCompleted: 'true' }]) {
    const raw = fixture();
    for (const section of [raw, raw.data]) {
      Object.assign(section.userPreferences, patch);
      Object.assign(section.settings, patch);
    }
    assert.equal(validateBackup(raw).valid, false);
    assert.throws(() => normalizeBackupPayload(raw), /備份驗證失敗/);
  }
  const conflicting = fixture();
  for (const section of [conflicting, conflicting.data]) {
    section.userPreferences.readingMode = 'senior';
    section.settings.readingMode = 'normal';
  }
  assert.equal(validateBackup(conflicting).valid, false);
});
