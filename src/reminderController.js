import { getReminderState, reminderCapability, enableReminders, saveReminderSettings, disableReminders, syncReminders, testReminder, getReminderServerStatus } from './reminderService.js';

let initialized = false;
let timer;
const $ = (id) => document.getElementById(id);
function settings() {
  return { time: $('reminder-time').value || '08:00', tasks: $('reminder-tasks').checked, habits: $('reminder-habits').checked,
    weekly: $('reminder-weekly').checked, overdue: $('reminder-overdue').checked, showTitles: $('reminder-titles').checked };
}
export async function renderReminderSettings() {
  const state = await getReminderState();
  if (!$('reminder-status')) return;
  if (!$('reminder-form').contains(document.activeElement)) {
    $('reminder-time').value = state.settings.time;
    for (const [id, key] of [['tasks', 'tasks'], ['habits', 'habits'], ['weekly', 'weekly'], ['overdue', 'overdue'], ['titles', 'showTitles']]) $('reminder-' + id).checked = state.settings[key];
  }
  $('reminder-enable').textContent = state.enabled ? '重新啟用通知' : '啟用每日提醒';
  $('reminder-disable').hidden = !state.enabled && !state.pendingDisable;
  $('reminder-test').hidden = !state.enabled;
  const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  const status = state.pendingDisable ? '本機已關閉，雲端停用待確認' : !state.enabled ? '尚未啟用' : permission !== 'granted' ? '系統通知權限已關閉' : state.error ? '已儲存在本機，提醒資料待同步' : state.dirty ? '提醒資料待同步' : '每日提醒已啟用';
  $('reminder-status').textContent = status;
  $('reminder-hint').textContent = state.error || reminderCapability() || '關閉 App 也能接收通知；離線修改請先恢復連線同步。手機系統可能延後顯示通知。';
  $('reminder-timezone').textContent = `依此裝置時區：${state.settings.timeZone}。更換時區後，開啟 App 會更新排程。`;
  $('reminder-next').textContent = state.nextAt && state.enabled ? `下次發送：${new Date(state.nextAt).toLocaleString('zh-TW', { timeZone: state.settings.timeZone, hour12: false })}` : '';
  $('reminder-synced').textContent = state.lastSyncedAt ? `最後同步：${new Date(state.lastSyncedAt).toLocaleString('zh-TW', { hour12: false })}。持續 30 天未開啟 App 時提醒會停用。` : '';
}
export function initReminders({ openToday }) {
  if (initialized) return; initialized = true;
  const form = $('reminder-form'); if (!form) return;
  const feedback = (message) => { $('reminder-result').textContent = message; };
  const run = async (button, action, success) => {
    button.disabled = true;
    try { await action(); feedback(success); } catch (error) { feedback(error.message); }
    finally { button.disabled = false; await renderReminderSettings(); }
  };
  $('reminder-enable').addEventListener('click', (event) => {
    if (!$('reminder-consent').checked) { feedback('請先勾選允許同步提醒所需的資料。'); return; }
    void run(event.currentTarget, () => enableReminders(settings()), '已啟用每日提醒。可發送測試通知確認手機收件。');
  });
  form.addEventListener('submit', (event) => { event.preventDefault(); void run($('reminder-save'), () => saveReminderSettings(settings()), '提醒設定已儲存。'); });
  $('reminder-disable').addEventListener('click', (event) => { void run(event.currentTarget, disableReminders, '每日提醒已關閉，雲端提醒資料已刪除。'); });
  $('reminder-test').addEventListener('click', (event) => { void run(event.currentTarget, testReminder, '推播服務已接受測試通知，請查看手機通知中心。'); });
  $('reminder-sync').addEventListener('click', (event) => { void run(event.currentTarget, syncReminders, '提醒資料已同步。'); });
  $('reminder-open-today').addEventListener('click', openToday);
  window.addEventListener('questnote-reminder-status', () => { void renderReminderSettings(); });
  const queueSync = () => {
    clearTimeout(timer); timer = setTimeout(() => { void syncReminders().catch(() => {}); }, 500);
  };
  window.addEventListener('questnote-reminder-change', queueSync);
  window.addEventListener('online', queueSync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) queueSync(); });
  navigator.serviceWorker?.addEventListener('message', (event) => { if (event.data?.type === 'questnote-open-today') openToday(); });
  const url = new URL(location.href);
  if (url.searchParams.get('reminder') === 'today') {
    url.searchParams.delete('reminder'); history.replaceState(null, '', url); setTimeout(openToday, 1000);
  }
  void renderReminderSettings();
  void syncReminders().then(async () => {
    const status = await getReminderServerStatus();
    if (status && !status.enabled) feedback('推播訂閱已失效，請重新啟用每日提醒。');
  }).catch(() => {});
}
