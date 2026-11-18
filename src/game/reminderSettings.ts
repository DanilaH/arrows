import type { DailyReminders } from '../platform/dailyReminders';
/** Fixed product schedule; Android owns the player's notification permission. */
export function reminderSettings(reminders: DailyReminders, language: string, unlocked: boolean): HTMLElement | null {
  if (!reminders.available || !unlocked) return null;
  const ru = language === 'ru', state = reminders.state, section = document.createElement('section');
  section.id = 'reminder-settings'; section.className = 'settings-section';
  section.innerHTML = `<h3>${ru ? 'Дэйлик каждый день' : 'Daily reminder'}</h3><p class="reminder-status">${ru ? 'Около 13:00 и 19:00 по времени телефона, пока сегодняшний дэйлик не пройден.' : 'Around 13:00 and 19:00 in your phone’s time zone, until today’s daily is completed.'}</p><p class="reminder-status" role="status"></p>`;
  const detail = section.querySelector<HTMLElement>('[role="status"]')!;
  detail.textContent = reminders.error ? ru ? 'Не удалось обновить напоминания.' : 'Could not update reminders.' : !state ? ru ? 'Проверяем настройки…' : 'Checking settings…' : !state.allowed ? ru ? 'Уведомления выключены в Android.' : 'Notifications are blocked in Android.' : ru ? 'Уведомления разрешены. Время доставки может немного сдвигаться.' : 'Notifications are allowed. Delivery time may vary.';
  if (reminders.error || state) {
    const button = document.createElement('button'); button.className = 'sound-preview'; button.type = 'button';
    button.textContent = reminders.error ? ru ? 'Повторить' : 'Retry' : ru ? 'Настройки Android' : 'Android settings';
    button.onclick = () => { if (reminders.error) { reminders.sync(); void reminders.refresh(); } else void reminders.openSettings(); };
    section.append(button);
  }
  return section;
}
