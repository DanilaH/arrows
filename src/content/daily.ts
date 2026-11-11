import fields from './daily.json' with { type: 'json' };
import type { Level } from '../domain/board';
import { localDate, validDate } from '../progression/calendar';
import { generateDaily, generatedDailySpec } from './dailyGenerated';
export { dailyId } from './dailyGenerated';
export const DAILY_CATALOG_VERSION = 3;
/** Fixed offline-owned dates. Saved attempts retain embedded original geometry. */
export const dailyCatalog = fields as Record<string, Level>;
export const dailyDates = Object.keys(dailyCatalog).sort();
export const dailyMonths = [...new Set(dailyDates.map(date => date.slice(0, 7)))];

/** The JSON exports above are the immutable 2026 archive, not the availability horizon. */
export const supportsDailyDate = (date: string): boolean => validDate(date) && date >= dailyDates[0]!;
export const supportsDailyMonth = (month: string): boolean => supportsDailyDate(`${month}-01`);
export const dailyDifficulty = (date: string): Level['difficulty'] => dailyCatalog[date]?.difficulty ?? generatedDailySpec(date).difficulty;
const generated = new Map<string, Level>();
export function dailyLevel(date: string): Level | undefined {
  if (!supportsDailyDate(date)) return undefined;
  if (dailyCatalog[date]) return dailyCatalog[date];
  let level = generated.get(date);
  if (!level) {
    level = generateDaily(date);
    if (generated.size >= 16) generated.delete(generated.keys().next().value!);
    generated.set(date, level);
  }
  return level;
}
/** Current-year shelf preserves the original twelve-month view, without future-year art. */
export function availableDailyMonths(today = localDate()): string[] {
  const lastYear = Math.max(2026, Math.min(2200, Number(today.slice(0, 4))));
  return Array.from({ length: (lastYear - 2026 + 1) * 12 }, (_, i) => `${2026 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`);
}
