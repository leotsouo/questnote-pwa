import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBondJourney, validateBondJourney, normalizeBondJourney, advanceBondJourney,
  chapterIsAvailable, getBondSummary, CHAPTER_REWARDS, HABIT_TARGETS } from '../src/bondJourneyCore.js';
import { validateBondStories } from '../src/bondJourneyService.js';
import { renderBondChapter, renderBondSelector, renderBondKeepsake, renderBondOverview } from '../src/bondJourneyView.js';
import { validateBackup, normalizeBackupPayload, migrateImportedData } from '../src/backupService.js';
import { APP_VERSION } from '../src/version.js';

const read = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const stories = read('../data/bond-stories.json');
const pets = read('../data/pets.json').pets;
const at = '2026-10-01T01:00:00.000Z';
const later = '2026-10-01T02:00:00.000Z';
const pet = { ...pets[0], bondLevel: 5, owned: true };
const state = () => ({ companion: pet, enrichedCollection: [pet], tasks: [], habits: [], bondStories: stories, bondJourney: createBondJourney() });
const chapter = () => ({ choiceId: 'gentle', readAt: at, completedAt: null, claimedAt: null });
function agreement(type = 'task', level = 2) {
  const journey = createBondJourney();
  const chapters = {};
  for (let lv = 2; lv < level; lv += 1) chapters[lv] = { ...chapter(), completedAt: at, claimedAt: at };
  chapters[level] = chapter();
  journey.byPet[pet.id] = { chapters };
  journey.active = { petId: pet.id, chapter: level, sourceType: type, sourceId: 'source-1', sourceTitle: '讀書',
    target: type === 'task' ? 1 : HABIT_TARGETS[level], progress: 0, eventKeys: [], startedAt: at, observingSince: at, status: 'active' };
  return journey;
}

test('all current pets have four distinct authored chapters, two replies and unique keepsakes', () => {
  assert.deepEqual(validateBondStories(stories, pets), []);
  assert.equal(stories.stories.length, pets.length);
  for (const select of [(story) => story.keepsake.name, (story) => story.chapters[0].paragraphs[0], (story) => story.chapters[1].paragraphs[0]]) {
    assert.equal(new Set(stories.stories.map(select)).size, pets.length);
  }
  assert.ok(!JSON.stringify(stories).includes('undefined'));
  assert.ok(!JSON.stringify(stories).includes('null'));
  assert.deepEqual(CHAPTER_REWARDS, { 2: 30, 3: 50, 4: 70, 5: 100 });
});

test('new saves and old high-level pets retain their original level and start at the first story', () => {
  const journey = normalizeBondJourney(null);
  assert.deepEqual(validateBondJourney(journey), []);
  assert.equal(chapterIsAvailable(journey, pet, 2), true);
  assert.equal(chapterIsAvailable(journey, pet, 3), false);
  assert.equal(chapterIsAvailable(journey, { ...pet, bondLevel: 1 }, 2), false);
  assert.equal(chapterIsAvailable(journey, { ...pet, owned: false }, 2), false);
  assert.equal(getBondSummary(journey, pet, stories.stories[0]).next, 2);
});

test('malformed story chapters return validation errors, including array-like choices', () => {
  for (const replacement of [null, { choices: { length: 2 } }, { ...stories.stories[0].chapters[0], choices: { 0: { id: 'gentle' }, 1: { id: 'steady' }, length: 2 } }]) {
    const broken = structuredClone(stories);
    broken.stories[0].chapters[0] = replacement;
    assert.ok(validateBondStories(broken).length);
  }
});

test('Lv.5 habit agreements require five distinct completions', () => {
  const journey = agreement('habit', 5);
  const habit = { id: 'source-1', isActive: true, logs: {} };
  for (let day = 1; day <= 4; day += 1) habit.logs[`2026-10-0${day}`] = { completed: true, completedAt: `2026-10-0${day}T02:00:00Z` };
  const partial = advanceBondJourney(journey, [], [habit]);
  assert.equal(partial.active.progress, 4);
  assert.equal(partial.active.status, 'active');
  habit.logs['2026-10-06'] = { completed: true, completedAt: '2026-10-06T02:00:00Z' };
  assert.equal(advanceBondJourney(partial, [], [habit]).active.status, 'ready');
});

test('past completions and exact acceptance time are not credited', () => {
  const journey = agreement();
  for (const completedAt of ['2026-09-30T23:59:00Z', at]) {
    assert.equal(advanceBondJourney(journey, [{ id: 'source-1', completed: true, completedAt }], []).active.progress, 0);
  }
  assert.deepEqual(journey, agreement(), 'Pure reducer cannot mutate the input');
});

test('fresh matching task completion survives reload and cannot be credited twice or undone', () => {
  const journey = agreement();
  const tasks = [{ id: 'different', completed: true, completedAt: later }, { id: 'source-1', completed: true, completedAt: later }];
  const completed = advanceBondJourney(journey, tasks, []);
  assert.equal(completed.active.status, 'ready');
  assert.equal(completed.active.progress, 1);
  assert.deepEqual(completed.usedEventKeys, ['task:source-1']);
  assert.equal(completed.byPet[pet.id].chapters[2].completedAt, later);
  assert.deepEqual(validateBondJourney(completed), []);
  assert.deepEqual(advanceBondJourney(completed, tasks, []), completed);
  assert.deepEqual(advanceBondJourney(completed, [{ ...tasks[1], completed: false }], []), completed);
});

test('habit progress counts distinct dates, ignores weekly reward aliases and preserves nonconsecutive progress', () => {
  const journey = agreement('habit', 4);
  const habits = [{ id: 'source-1', isActive: true, archivedAt: null, logs: {
    '2026-09-30': { completed: true, completedAt: '2026-09-30T02:00:00Z' },
    '2026-10-01': { completed: true, completedAt: later },
    '2026-10-03': { completed: true, completedAt: '2026-10-03T02:00:00Z' },
    week_2026_10_01: { completed: true, completedAt: later },
  } }];
  const progress = advanceBondJourney(journey, [], habits);
  assert.equal(progress.active.progress, 2);
  assert.deepEqual(validateBondJourney(progress), []);
  habits[0].logs['2026-10-04'] = { completed: true, completedAt: '2026-10-04T02:00:00Z' };
  assert.equal(advanceBondJourney(progress, [], habits).active.status, 'ready');
});

test('pausing excludes completions; resuming uses a new observation boundary without losing progress', () => {
  const journey = agreement('habit', 3);
  journey.active.status = 'paused';
  const habits = [{ id: 'source-1', isActive: true, logs: { '2026-10-01': { completed: true, completedAt: later } } }];
  assert.equal(advanceBondJourney(journey, [], habits).active.progress, 0);
  journey.active.status = 'active';
  journey.active.observingSince = '2026-10-02T01:00:00Z';
  assert.equal(advanceBondJourney(journey, [], habits).active.progress, 0);
  habits[0].logs['2026-10-03'] = { completed: true, completedAt: '2026-10-03T02:00:00Z' };
  assert.equal(advanceBondJourney(journey, [], habits).active.progress, 1);
});

test('already used completions cannot earn another chapter or daily reward', () => {
  const journey = agreement();
  journey.usedEventKeys.push('task:source-1');
  assert.equal(advanceBondJourney(journey, [{ id: 'source-1', completed: true, completedAt: later }], []).active.progress, 0);
  const h = agreement('habit');
  h.usedEventKeys.push('habit:source-1:2026-10-01');
  assert.equal(advanceBondJourney(h, [], [{ id: 'source-1', isActive: true, logs: {
    '2026-10-01': { completed: true, completedAt: later },
  } }]).active.progress, 0);
});

test('deleted/archived goals do not invent progress or force punishment', () => {
  assert.deepEqual(advanceBondJourney(agreement(), [], []), agreement());
  const h = { id: 'source-1', isActive: false, archivedAt: later, logs: { '2026-10-01': { completed: true, completedAt: later } } };
  assert.equal(advanceBondJourney(agreement('habit'), [], [h]).active.progress, 0);
});

test('malformed journey snapshots are rejected without exceptions or silent defaulting', () => {
  for (const active of [undefined, 2, [], {}, { ...agreement().active, eventKeys: null }]) {
    const broken = { ...createBondJourney(), active };
    assert.ok(validateBondJourney(broken).length);
    assert.throws(() => normalizeBondJourney(broken));
  }
  for (const transform of [
    (j) => { j.dailyClaimDates = ['2026-02-30']; },
    (j) => { j.byPet[pet.id].chapters[2].claimedAt = later; },
    (j) => { j.active.status = 'ready'; },
    (j) => { j.active.progress = 99; },
    (j) => { j.displayPetId = pet.id; },
    (j) => { j.usedEventKeys = {}; },
  ]) {
    const broken = agreement(); transform(broken);
    assert.ok(validateBondJourney(broken).length);
  }
});

test('locked chapters do not expose secret paragraphs and choices cannot inject markup', () => {
  const s = state(); s.companion = { ...pet, bondLevel: 1 };
  assert.equal(renderBondChapter(s.companion, s, 2), '<p>這一章尚未解鎖。</p>');
  assert.ok(!renderBondOverview(s.companion, s).includes(stories.stories[0].chapters[1].paragraphs[0]));
  const saved = agreement(); saved.active = null;
  s.bondJourney = saved;
  const html = renderBondChapter({ ...pet, nickname: '<img src=x onerror=alert(1)>' }, s, 2, 'steady');
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('aria-pressed="true"'));
  assert.equal(s.bondJourney.byPet[pet.id].chapters[2].choiceId, 'gentle');
});

test('selectors expose only eligible goals and mark replacement progress reset', () => {
  const s = state();
  s.tasks = [{ id: 'done', title: '已完成', completed: true }, { id: 'used', title: '已計入', completed: false }, { id: 'fresh', title: '<任務>', completed: false }];
  s.bondJourney.usedEventKeys = ['task:used'];
  const html = renderBondSelector(pet, s, 3, 'task', true);
  assert.ok(!html.includes('value="done"'));
  assert.ok(!html.includes('value="used"'));
  assert.ok(html.includes('value="fresh"'));
  assert.ok(html.includes('&lt;任務&gt;'));
  assert.ok(html.includes('進度從 0 開始'));
});

test('keepsakes remain private until the final story agreement is claimed', () => {
  const s = state();
  s.bondJourney.displayPetId = pet.id;
  assert.equal(renderBondKeepsake(s), '');
  s.bondJourney.byPet[pet.id] = { chapters: { 5: { ...chapter(), completedAt: later, claimedAt: later } } };
  assert.ok(renderBondKeepsake(s).includes(stories.stories[0].keepsake.name));
});

test('historical backup migration creates empty journeys without changing wallet, pet levels or fonts', () => {
  const legacy = read('./fixtures/backups/legacy-3.4.4.json');
  const migrated = migrateImportedData(normalizeBackupPayload(legacy));
  assert.deepEqual(migrated.bondJourney, createBondJourney());
  assert.equal(migrated.wallet.stardust, legacy.data.wallet.stardust);
  assert.equal(migrated.collection[0].bondExp, legacy.data.collection[0].bondExp);
  assert.equal(migrated.userPreferences.fontSize, 'standard');
  const version3437 = { app: 'QuestNote', version: 2, appVersion: '3.4.37', data: structuredClone(migrated) };
  delete version3437.data.appVersion;
  version3437.data.settings = { ...version3437.data.userPreferences };
  delete version3437.data.bondJourney;
  assert.equal(validateBackup(version3437).valid, true);
});

test('V3.5.1 backups require journey data and preserve active, paused, completed and reward records', () => {
  const baseline = migrateImportedData(normalizeBackupPayload(read('./fixtures/backups/legacy-3.4.4.json')));
  delete baseline.appVersion;
  baseline.settings = { ...baseline.userPreferences };
  const raw = { app: 'QuestNote', version: 2, appVersion: APP_VERSION, data: baseline };
  for (const journey of [createBondJourney(), agreement(), { ...agreement(), active: { ...agreement().active, status: 'paused' } },
    advanceBondJourney(agreement(), [{ id: 'source-1', completed: true, completedAt: later }], [])]) {
    raw.data.bondJourney = journey;
    assert.equal(validateBackup(raw).valid, true, validateBackup(raw).error);
    assert.deepEqual(migrateImportedData(normalizeBackupPayload(raw)).bondJourney, journey);
  }
  delete raw.data.bondJourney;
  assert.equal(validateBackup(raw).valid, false);
  raw.data.bondJourney = agreement(); raw.data.bondJourney.active.target = 999;
  assert.equal(validateBackup(raw).valid, false);
});
