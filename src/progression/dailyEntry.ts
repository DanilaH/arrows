import type { GameSave } from './save';
import { calendarDate, dateOrdinal, localDate, monthDates, validDate } from './calendar';

export type DailyDestination = { kind: 'locked' } | { kind: 'tomorrow' } | { kind: 'daily'; date: string; today: boolean; resumed: boolean };
/** Navigation only: never constructs a field or creates an attempt. */
export function dailyDestination(save: GameSave, today = localDate()): DailyDestination {
  if (save.index < 19) return { kind: 'locked' };
  if (!validDate(today) || today < '2026-01-01') return { kind: 'tomorrow' };
  for (let day = dateOrdinal(today), first = dateOrdinal('2026-01-01'); day >= first; day--) {
    const date = new Date(day * 86400000).toISOString().slice(0, 10);
    if (!save.dailyWins[date]) return { kind: 'daily', date, today: date === today, resumed: !!save.daily[date]?.started };
  }
  return { kind: 'tomorrow' };
}
/** Surface-local cache: the store publishes a new snapshot on each commit. */
export function createDailyEntrySelector() {
  let previous: GameSave | undefined, day='', selected: DailyDestination={kind:'locked'};
  return (save:GameSave,today=localDate()):DailyDestination=>{
    if(save!==previous||day!==today){previous=save;day=today;selected=dailyDestination(save,today);}return selected;
  };
}
export function dailyEntryLabel(destination: DailyDestination, language: string): string {
  const ru = language === 'ru';
  if (destination.kind === 'locked') return ru ? 'Дэйлики с уровня 20' : 'Dailies at level 20';
  if (destination.kind === 'tomorrow') return ru ? 'Новый дэйлик — завтра' : 'New daily tomorrow';
  const date = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(calendarDate(destination.date));
  return `${ru ? destination.resumed ? 'Продолжить дэйлик' : destination.today ? 'Дэйлик сегодня' : 'Дэйлик' : destination.resumed ? 'Resume daily' : destination.today ? "Today's daily" : 'Daily'} · ${date}`;
}
export function dailyCupProgress(save: GameSave, date: string): { done: number; total: number; earned: boolean } {
  const month = date.slice(0, 7), dates = monthDates(month);
  return { done: dates.filter(key => !!save.dailyWins[key]).length, total: dates.length, earned: save.cups.includes(month) };
}
/** Small read projection, coupled to the exact confirmed root. No geometry or rights. */
export function reminderProjection(save: GameSave, today = localDate()) {
  if (!validDate(today) || today < '2026-01-01') return null;
  const from = today.slice(0, 7) + '-01', next = calendarDate(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const end = monthDates(next.toISOString().slice(0, 7)).at(-1)!, to = end > '2200-12-31' ? '2200-12-31' : end;
  const lastCompleted=Object.keys(save.dailyWins).reduce((last,date)=>date>last?date:last,'');
  return { version: 1, from, to, lastCompleted, unlocked: save.index >= 19,
    completed: Object.keys(save.dailyWins).filter(d => d >= from && d <= to).sort(),
    started: Object.keys(save.daily).filter(d => d >= from && d <= to && save.daily[d]!.started && !save.dailyWins[d]).sort() };
}
