import type { GameSave } from './save';
import { dateOrdinal, localDate } from './calendar';
export type UnlockId = 'collection' | 'calendar';
export const availableUnlocks = (index: number): UnlockId[] => index >= 19 ? ['collection','calendar'] : index >= 9 ? ['collection'] : [];
export const collectionOpen = (save: GameSave): boolean => save.index >= 9;
export const challengeOpen = (save: GameSave): boolean => save.index >= 19;
/** Explicit local product rules; the original League/thresholds have not been established. */
export function collectionStats(save: GameSave, today = localDate()) {
  const wins = [...save.wins, ...Object.values(save.dailyWins)].sort((a, b) => a.completedAt - b.completedAt);
  const counts = new Map<string, number>();
  for (const win of wins) { const day = win.localDate ?? localDate(new Date(win.completedAt)); counts.set(day, (counts.get(day) ?? 0) + 1); }
  let longest = 0, run = 0, previous = -Infinity, longestDate = '', most = 0, mostDate = '';
  for (const day of [...counts.keys()].sort()) {
    const ordinal = dateOrdinal(day); run = ordinal === previous + 1 ? run + 1 : 1; previous = ordinal;
    if (run > longest) { longest = run; longestDate = day; }
    if (counts.get(day)! > most) { most = counts.get(day)!; mostDate = day; }
  }
  let consecutive = 0, highest = 0, highestDate = '';
  for (const fact of save.facts) {
    consecutive = fact.kind === 'win' ? consecutive + 1 : 0;
    if (consecutive > highest) { highest = consecutive; highestDate = fact.localDate; }
  }
  const todayOrdinal = dateOrdinal(today), played = new Set([...counts.keys()].map(dateOrdinal));
  let cursor = played.has(todayOrdinal) ? todayOrdinal : todayOrdinal - 1, current = 0;
  while (played.has(cursor)) { current++; cursor--; }
  return { current, longest, longestDate, highest, highestDate, most, mostDate, perfect: wins.filter(w => w.mistakes === 0).length, wins: wins.length };
}
export function medals(save: GameSave) {
  const stats = collectionStats(save);
  return [
    { id: 'legend', progress: save.wins.length, target: 20 },
    { id: 'perfect', progress: stats.perfect, target: 10 },
    { id: 'unstoppable', progress: stats.highest, target: 10 },
  ].map(m => ({ ...m, earned: m.progress >= m.target }));
}
export function earnedAwards(save: GameSave): string[] {
  return [...medals(save).filter(m => m.earned).map(m => m.id), ...save.cups.map(m => 'cup-' + m)];
}
