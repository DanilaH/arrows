import fields from './daily.json' with { type: 'json' };
import type { Level } from '../domain/board';
export const DAILY_CATALOG_VERSION = 1;
/** Fixed offline-owned dates. Saved attempts retain embedded original geometry. */
export const dailyCatalog = fields as Record<string, Level>;
export const dailyDates = Object.keys(dailyCatalog).sort();
export const dailyMonths = [...new Set(dailyDates.map(date => date.slice(0, 7)))];
