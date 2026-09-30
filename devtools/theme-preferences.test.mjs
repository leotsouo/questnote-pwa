import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeTheme, normalizeUserPreferences } from '../src/preferencesService.js';
import { validateBackup, normalizeBackupPayload, migrateImportedData } from '../src/backupService.js';
import { getTwilightJourney, buildTwilightHome } from '../src/twilightPresentation.js';

test('all three user themes survive preference normalization; legacy and unknown values fall back', () => {
  for (const theme of ['default', 'sweet', 'twilight']) {
    assert.equal(normalizeTheme(theme), theme);
    assert.equal(normalizeUserPreferences({ theme }).theme, theme);
  }
  for (const value of [undefined, null, '', 'unknown', '__proto__']) assert.equal(normalizeTheme(value), 'default');
  assert.equal(normalizeUserPreferences(null).theme, 'default');
});

test('third theme backup restore preserves tasks, wallet, collection and progression exactly', () => {
  const load = () => JSON.parse(readFileSync(new URL('./fixtures/backups/legacy-3.4.4.json', import.meta.url), 'utf8'));
  const original = migrateImportedData(normalizeBackupPayload(load()));
  for (const theme of ['default', 'sweet', 'twilight']) {
    const backup = load();
    for (const section of [backup, backup.data]) {
      section.userPreferences.theme = theme;
      section.settings.theme = theme;
    }
    const result = validateBackup(backup);
    assert.equal(result.valid, true, result.error);
    const restored = migrateImportedData(normalizeBackupPayload(backup));
    assert.equal(restored.userPreferences.theme, theme);
    const expected = structuredClone(original);
    expected.userPreferences.theme = theme;
    expected.settings.theme = theme;
    assert.deepEqual(restored, expected);
  }
  const invalid = load();
  for (const section of [invalid, invalid.data]) {
    section.userPreferences.theme = 'unsupported';
    section.settings.theme = 'unsupported';
  }
  assert.equal(validateBackup(invalid).valid, false);
});

test('journey counts only actual today plans and today completions, including the empty state', () => {
  const today = '2026-09-30';
  const tasks = [
    { plannedDate: today, completed: false },
    { plannedDate: today, completed: true, completedAt: '2026-09-30T12:00:00' },
    { plannedDate: today, completed: true, completedAt: '2026-09-29T12:00:00' },
    { plannedDate: '2026-09-29', completed: false },
    { plannedDate: null, completed: true, completedAt: '2026-09-30T12:00:00' },
  ];
  const before = structuredClone(tasks);
  assert.deepEqual(getTwilightJourney(tasks, today), { pending: 1, done: 1, total: 2, percent: 50 });
  assert.deepEqual(getTwilightJourney([], today), { pending: 0, done: 0, total: 0, percent: 0 });
  assert.deepEqual(tasks, before);
});

test('companion presentation escapes user names and does not pretend an empty collection owns a pet', () => {
  const html = buildTwilightHome({ id: 'test', name: '<img onerror="bad">', rarity: 'N', image: './pet.png' });
  assert.ok(html.includes('&lt;img onerror=&quot;bad&quot;&gt;'));
  assert.ok(!html.includes('<img onerror="bad">'));
  const empty = buildTwilightHome(null);
  assert.ok(empty.includes('等待第一位夥伴'));
  assert.ok(empty.includes('empty-go-gacha'));
  assert.ok(!empty.includes('data-action="companion-pet"'));
});
