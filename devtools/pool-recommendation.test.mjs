import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { recommendationCopy, recommendationState } from '../src/poolRecommendation.js';
import { POOL_NAVIGATION, poolNavigation } from '../src/poolDirectory.js';

const schedule = { startsAt: '2026-10-10T00:00:00+08:00', endsAt: '2026-10-24T00:00:00+08:00' };
const start = Date.parse(schedule.startsAt);
const end = Date.parse(schedule.endsAt);
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

test('Unconfirmed launch has no invented date, timer or countdown', () => {
  for (const input of [null, undefined]) {
    const state = recommendationState(input, start);
    assert.equal(state.status, 'unscheduled');
    assert.equal(state.nextUpdateAt, null);
    assert.equal(recommendationCopy(state), null);
  }
});

test('Starts inclusive, ends exclusive, and the 14-day schedule is shared by every player', () => {
  assert.equal(end - start, 14 * DAY);
  assert.equal(recommendationState(schedule, start - 1).status, 'upcoming');
  assert.equal(recommendationState(schedule, start).status, 'active');
  assert.equal(recommendationState(schedule, end - 1).status, 'active');
  assert.equal(recommendationState(schedule, end).status, 'ended');
  assert.equal(recommendationState(schedule, end + DAY).status, 'ended');
});

test('Invalid or ambiguous dates cannot advertise a countdown', () => {
  for (const invalid of [
    {}, { startsAt: schedule.startsAt }, { ...schedule, startsAt: '2026-10-10T00:00:00' },
    { ...schedule, startsAt: '2026-02-30T00:00:00+08:00' },
    { ...schedule, endsAt: schedule.startsAt }, { startsAt: schedule.endsAt, endsAt: schedule.startsAt },
    { ...schedule, endsAt: '2026-13-01T00:00:00Z' }, { ...schedule, endsAt: 'not-a-date' },
  ]) {
    const state = recommendationState(invalid, start);
    assert.equal(state.status, 'invalid');
    assert.equal(state.nextUpdateAt, null);
    assert.equal(recommendationCopy(state), null);
  }
  assert.equal(recommendationState(schedule, NaN).status, 'invalid');
});

test('Display uses days/hours then hours/minutes; positive time never becomes expired or negative', () => {
  const cases = [
    [14 * DAY, '14 天 0 小時'], [DAY + 3 * 60 * MINUTE, '1 天 3 小時'],
    [DAY, '24 小時 0 分鐘'], [DAY - 1, '24 小時 0 分鐘'],
    [61 * MINUTE, '1 小時 1 分鐘'], [MINUTE, '0 小時 1 分鐘'], [1, '0 小時 1 分鐘'],
  ];
  for (const [remaining, text] of cases) {
    assert.equal(recommendationCopy(recommendationState(schedule, end - remaining)).label, `推薦期剩餘 ${text}`);
  }
  assert.equal(recommendationCopy(recommendationState(schedule, end)).label, '持續開放');
});

test('The refresh clock is bounded to a minute and wakes at exact start/end boundaries', () => {
  assert.equal(recommendationState(schedule, start - 1).nextUpdateAt, start);
  assert.equal(recommendationState(schedule, start).nextUpdateAt, start + MINUTE);
  assert.equal(recommendationState(schedule, end - 1).nextUpdateAt, end);
  assert.equal(recommendationState(schedule, end).nextUpdateAt, null);
  assert.equal(recommendationState(schedule, start - DAY).nextUpdateAt, start - DAY + MINUTE);
});

test('Exact date is Taipei time independent of device timezone and offset notation', () => {
  const state = recommendationState(schedule, start);
  const copy = recommendationCopy(state);
  assert.equal(copy.dateTime, '2026-10-23T16:00:00.000Z');
  assert.match(copy.dateText, /2026\/10\/24\s00:00/);
  assert.deepEqual(state, recommendationState({ startsAt: '2026-10-09T16:00:00Z', endsAt: '2026-10-23T16:00:00Z' }, start));
  const moduleUrl = new URL('../src/poolRecommendation.js', import.meta.url).href;
  for (const zone of ['UTC', 'America/New_York', 'Asia/Taipei']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import { recommendationState, recommendationCopy } from ${JSON.stringify(moduleUrl)}; console.log(recommendationCopy(recommendationState(${JSON.stringify(schedule)}, ${start})).dateText);`], { env: { ...process.env, TZ: zone }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), copy.dateText);
  }
});

test('Recommendation expiry only removes exposure; active pools and draw configuration survive unchanged', () => {
  const pools = [{ id: 'standard', active: true, cost: 100 }, { id: 'featured', active: true, cost: 100, pity: { ur: 100 } }, { id: 'inactive', active: false }];
  const before = JSON.stringify(pools);
  const policy = { ...POOL_NAVIGATION, featuredPoolId: 'featured', recommendation: schedule };
  assert.equal(poolNavigation(pools, policy, start).featured.id, 'featured');
  assert.equal(poolNavigation(pools, policy, end).featured, null);
  assert.deepEqual(poolNavigation(pools, policy, start).entries, poolNavigation(pools, policy, end).entries);
  assert.equal(JSON.stringify(pools), before);
  assert.equal(poolNavigation(pools, { ...policy, recommendation: {} }, start).featured, null);
});

test('Upcoming and ended copy clearly preserve access and pity, even after a large clock jump', () => {
  const upcoming = recommendationCopy(recommendationState(schedule, start - DAY));
  assert.equal(upcoming.dateTime, '2026-10-09T16:00:00.000Z');
  assert.match(upcoming.explanation, /現在即可抽取/);
  const ended = recommendationCopy(recommendationState(schedule, end + 100 * DAY));
  assert.match(ended.explanation, /全部系列/);
  assert.match(ended.explanation, /保底累積保留/);
  assert.equal(recommendationState(schedule, start).status, 'active', 'Re-evaluation uses current time, not stale cached countdown');
});
