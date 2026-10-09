/** Read-only planning model. No database calls, random rewards, or runtime changes. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { calculateRewardAmount, GACHA_COST, GACHA_TEN_COST } from '../src/rewardService.js';
import { calculateCheckInRewards } from '../src/dailyCheckInService.js';
import { DAILY_STARDUST_REWARD, DAILY_STARDUST_CAP } from '../src/habitService.js';
import { DAILY_QUEST_DEFS, WEEKLY_QUEST_DEFS } from '../src/questService.js';
import { INVITATION_COSTS, ENCOUNTER_FRAGMENTS_BY_RARITY } from '../src/encounterEconomyCore.js';

const pools = JSON.parse(await readFile(new URL('../data/pools.json', import.meta.url), 'utf8')).pools.filter(p => p.active);
const wheel = JSON.parse(await readFile(new URL('../data/dailyWheelRewards.json', import.meta.url), 'utf8'));
assert.ok(pools.every(p => p.cost === GACHA_COST && p.pity.ssr === 30 && p.pity.ur === 100));
assert.equal(GACHA_TEN_COST, 10 * GACHA_COST);
assert.deepEqual(INVITATION_COSTS, { SSR: 100, UR: 200 });
assert.deepEqual([1, 2, 3, 7, 14, 30, 31].map(day => calculateCheckInRewards(day).stardust), [20, 20, 50, 120, 220, 520, 20]);

function questDust(defs, activity) {
  return defs.reduce((total, quest) => total + ((activity[quest.type] || 0) >= quest.target ? quest.reward.stardust || 0 : 0), 0);
}

// Two complete Monday–Sunday weeks; all eligible rewards claimed within their period.
// Mature starts at streak 30, so days 31–44 do not repeat the milestone bonuses.
function scenario(name, normal, important, habits, pet, weekdaysOnly = false) {
  const runs = {};
  for (const mode of ['first', 'mature']) {
    let streak = mode === 'first' || weekdaysOnly ? 0 : 30;
    const parts = { tasks: 0, habits: 0, checkIn: 0, dailyQuests: 0, weeklyQuests: 0 };
    let days = 0;
    for (let week = 0; week < 2; week++) {
      const weekly = {};
      for (let weekday = 0; weekday < 7; weekday++) {
        if (weekdaysOnly && weekday >= 5) { streak = 0; continue; }
        days++;
        const activity = { complete_tasks: normal + important, complete_habits: habits, pet_companion: pet, daily_checkin: 1 };
        parts.tasks += normal * calculateRewardAmount({ priority: 'normal' }) + important * calculateRewardAmount({ priority: 'important' });
        parts.habits += Math.min(DAILY_STARDUST_CAP, habits * DAILY_STARDUST_REWARD);
        parts.checkIn += calculateCheckInRewards(++streak).stardust;
        parts.dailyQuests += questDust(DAILY_QUEST_DEFS, activity);
        for (const [key, count] of Object.entries(activity)) weekly[key] = (weekly[key] || 0) + count;
      }
      parts.weeklyQuests += questDust(WEEKLY_QUEST_DEFS, weekly);
    }
    const total = Object.values(parts).reduce((a, b) => a + b, 0);
    runs[mode] = { days, parts, total, pulls: Math.floor(total / GACHA_COST), remainder: total % GACHA_COST };
  }
  return { name, daily: { normal, important, habits, pet }, weekdaysOnly, ...runs };
}
const scenarios = [
  scenario('平日輕量', 1, 0, 1, 0, true),
  scenario('每日輕量', 1, 0, 1, 0),
  scenario('每日穩定', 3, 0, 2, 1),
  scenario('每日積極', 3, 1, 4, 1),
];
assert.deepEqual(scenarios.map(s => s.first.total), [1510, 2160, 4730, 5500]);
assert.deepEqual(scenarios.map(s => s.mature.total), [1510, 1830, 4400, 5170]);
const weight = wheel.reduce((sum, r) => sum + r.weight, 0);
const wheelMean = wheel.reduce((sum, r) => sum + (r.type === 'stardust' ? r.amount * r.weight : 0), 0) / weight;
assert.equal(wheelMean, 17.5);
// Guard against accidentally treating the first 14-day bonus as a periodic income.
assert.equal(scenarios[1].first.total - scenarios[1].mature.total, 330);
const report = {
  scope: 'Source-based scenarios, not observed player averages; all resource balances start at zero.',
  period: 'Two complete Monday–Sunday weeks; mature daily participation starts at streak 30; weekday-only starts after a weekend break; no spending except draws.',
  scenarios,
  wheel: { dailyMean: wheelMean, fourteenDayMean: wheelMean * 14, guaranteedStardust: 0 },
  invitationCosts: INVITATION_COSTS,
  duplicatesNeededIfEveryDuplicateHasSameRarity: Object.fromEntries(Object.entries(ENCOUNTER_FRAGMENTS_BY_RARITY).map(([rarity, gain]) => [rarity, { SSR: Math.ceil(INVITATION_COSTS.SSR / gain), UR: Math.ceil(INVITATION_COSTS.UR / gain) }])),
  activePools: pools.map(p => ({ id: p.id, cost: p.cost, pity: p.pity })),
  proposedActiveDayGrant: { fragments: 10, SSRActiveDays: INVITATION_COSTS.SSR / 10, URActiveDays: INVITATION_COSTS.UR / 10, implemented: false },
};
if (process.argv[2]) {
  await mkdir(process.argv[2], { recursive: true });
  await writeFile(`${process.argv[2]}/economy.json`, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
