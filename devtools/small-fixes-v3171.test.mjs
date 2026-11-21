/**
 * V3.17.1 small fixes (2026-11-12 audit), checked at source level because these paths need IndexedDB or the DOM:
 * - 快速語音的「復原」5 秒後應消失：`.btn { display: inline-flex }` 蓋過 [hidden]，按鈕一直留到 12 秒還能刪任務。
 * - 只給了親密度的習慣（每週習慣、星塵已達上限）取消完成會刪掉紀錄，重新完成又 +1，親密度可無限刷。
 * - 同一個任務完成→取消→再完成，「提前完成」計數每次都 +1，一個任務就能解鎖 ach_complete_before_due_10。
 * - 編輯任務改了子任務文字後按「取消」，修改仍留在記憶體 state 裡，下次儲存會被寫進去。
 * - 週回顧「上週」沒有完成任務時，空狀態仍寫「這週」。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = (file) => readFile(new URL(`../src/${file}`, import.meta.url), 'utf8');

test('quick voice removes the 復原 button after the undo window instead of relying on [hidden]', async () => {
  const code = await src('ui/quickVoiceView.js');
  assert.match(code, /setTimeout\(\(\) => bar\.querySelector\('\[data-qv="undo"\]'\)\?\.remove\(\), UNDO_MS\)/);
  assert.doesNotMatch(code, /data-qv="undo"\]'\)\?\.setAttribute\('hidden'/);
});

test('uncompleting a habit keeps a placeholder log when only bond was given', async () => {
  const code = await src('habitService.js');
  assert.match(code, /if \(hadReward \|\| hadStardust > 0 \|\| hadBond > 0\) \{/);
});

test('the before-due counter only counts the first completion of a task', async () => {
  const code = await src('taskService.js');
  assert.match(code, /if \(!task\.rewardClaimed && isCompletedBeforeDue\(updated\)\) \{/);
});

test('the task form edits copies of the subtasks, not the objects in state', async () => {
  const code = await src('ui/taskFormView.js');
  assert.match(code, /const formSubtasks = subtasks\.map\(\(s\) => \(\{ \.\.\.s \}\)\);/);
});

test('the weekly review empty-task message names the week being shown', async () => {
  const code = await src('ui/weeklyReviewView.js');
  assert.match(code, /review\.isCurrentWeek \? '這週還沒有完成的任務。' : '上週沒有完成的任務。'/);
});
