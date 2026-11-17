import type { DailyReminders } from '../platform/dailyReminders';
/** Real player preferences stay outside the playtest-only technical controls. */
export function reminderSettings(reminders: DailyReminders, language: string, unlocked: boolean): HTMLElement | null {
  if (!reminders.available || !unlocked) return null;
  const ru = language === 'ru', state = reminders.state, section = document.createElement('section');
  section.id = 'reminder-settings'; section.className = 'settings-section';
  section.innerHTML = `<h3>${ru ? 'Дэйлик каждый день' : 'Daily reminder'}</h3><div class="settings-group"><button id="reminder-toggle" class="setting-toggle" type="button" role="switch" aria-checked="${!!state?.enabled}" ${reminders.busy || !state ? 'disabled' : ''}><span><strong>${ru ? 'Напоминать о дэйлике' : 'Remind me about the daily'}</strong><small>${ru ? 'Без напоминания, если уже пройден' : 'No reminder after today is completed'}</small></span><i class="switch-track" aria-hidden="true"><i></i></i></button></div><label class="reminder-time" for="reminder-time">${ru ? 'Местное время' : 'Local time'}<input id="reminder-time" type="time" value="${state?.time ?? '19:00'}" ${reminders.busy || !state ? 'disabled' : ''}></label><p class="reminder-status" role="status"></p>`;
  section.querySelector('button')!.addEventListener('click', () => { if (state?.enabled) void reminders.configure({ enabled: false }); else void reminders.enable(); });
  section.querySelector('input')!.addEventListener('change', event => { const value = (event.target as HTMLInputElement).value; if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) void reminders.configure({ time: value }); });
  const detail = section.querySelector('p')!;
  detail.textContent = reminders.error ? ru ? 'Не удалось обновить напоминания.' : 'Could not update reminders.' : !state ? ru ? 'Проверяем настройки…' : 'Checking settings…' : state.enabled && !state.allowed ? ru ? 'Уведомления выключены в Android.' : 'Notifications are blocked in Android.' : state.enabled ? ru ? 'Один раз в день. Время может немного сдвигаться.' : 'Once a day. Delivery time may vary.' : ru ? 'Можно включить в любой момент.' : 'You can turn this on anytime.';
  if (reminders.error || state?.enabled && !state.allowed) {
    const button = document.createElement('button'); button.className = 'sound-preview'; button.type = 'button';
    button.textContent = reminders.error ? ru ? 'Повторить' : 'Retry' : ru ? 'Настройки Android' : 'Android settings';
    button.onclick = () => { if (reminders.error) { reminders.sync(); void reminders.refresh(); } else void reminders.openSettings(); };
    section.append(button);
  }
  return section;
}
