import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeUserPreferences, normalizeFontSize, applyFontSizeToDocument } from '../src/preferencesService.js';
import { validateBackup, normalizeBackupPayload, migrateImportedData } from '../src/backupService.js';

test('old preferences use the original size; invalid font sizes cannot alter the scale', () => {
  for (const value of [undefined, null, '', 'enormous', 24, '__proto__']) {
    assert.equal(normalizeFontSize(value), 'standard');
  }
  assert.equal(normalizeUserPreferences(null).fontSize, 'standard');
  assert.equal(normalizeUserPreferences({ theme: 'sweet' }).fontSize, 'standard');
  for (const fontSize of ['standard', 'large', 'extra-large']) {
    assert.equal(normalizeUserPreferences({ theme: 'twilight', fontSize }).fontSize, fontSize);
    assert.equal(normalizeUserPreferences({ theme: 'twilight', fontSize }).theme, 'twilight');
  }
});

test('applying a font size does not overwrite the selected theme', () => {
  const previousDocument = globalThis.document;
  globalThis.document = { documentElement: { dataset: { theme: 'sweet' } } };
  try {
    assert.equal(applyFontSizeToDocument('extra-large'), 'extra-large');
    assert.equal(document.documentElement.dataset.fontSize, 'extra-large');
    assert.equal(document.documentElement.dataset.theme, 'sweet');
    applyFontSizeToDocument('standard');
    assert.equal(document.documentElement.dataset.fontSize, 'standard');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('backups preserve font size and gameplay; backups without the field restore the original size', () => {
  const load = () => JSON.parse(readFileSync(new URL('./fixtures/backups/legacy-3.4.4.json', import.meta.url), 'utf8'));
  const original = migrateImportedData(normalizeBackupPayload(load()));
  assert.equal(original.userPreferences.fontSize, 'standard');
  for (const fontSize of ['standard', 'large', 'extra-large']) {
    const backup = load();
    for (const section of [backup, backup.data]) {
      section.userPreferences.fontSize = fontSize;
      section.settings.fontSize = fontSize;
    }
    assert.equal(validateBackup(backup).valid, true);
    const restored = migrateImportedData(normalizeBackupPayload(backup));
    const expected = structuredClone(original);
    expected.userPreferences.fontSize = fontSize;
    expected.settings.fontSize = fontSize;
    assert.deepEqual(restored, expected);
  }
  const invalid = load();
  for (const section of [invalid, invalid.data]) {
    section.userPreferences.fontSize = 'unsupported';
    section.settings.fontSize = 'unsupported';
  }
  assert.equal(validateBackup(invalid).valid, false);
});
