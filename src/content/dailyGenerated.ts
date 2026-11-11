import { validateLevel, type Level } from '../domain/board';
import { kinds, shape, silhouette } from '../domain/silhouette';
import { validDate } from '../progression/calendar';

/** Published algorithm v1: applies from 2027-01-01. Never edit its output policy;
 * future algorithms need a new date boundary. Attempt geometry is saved on first entry. */
export const GENERATED_DAILY_CONTENT_VERSION = 2;
export const dailyId = (date: string): string => `d${date.replaceAll('-', '')}`;
export function generatedDailySpec(date: string) {
  if (!validDate(date) || date < '2027-01-01') throw Error('Invalid generated daily date');
  const day = Number(date.slice(-2)), seed = Number(date.replaceAll('-', ''));
  const difficulty = day === 8 || day === 28 ? 'nightmare' : day % 7 === 0 ? 'hard' : 'normal';
  const width = difficulty === 'nightmare' ? 37 : difficulty === 'hard' ? 27 : 13 + 2 * (day % 4);
  return { seed, difficulty, width, height: width + 4, kind: kinds[(seed * 3 + day * 2) % kinds.length]! } as const;
}

/** Bounded safety layout: one horizontal path per mask run, all solvable right-to-left.
 * Same identity/policy on every device, never a random retry or a different reward. */
export function dailyFallback(date: string): Level {
  const { width, height, difficulty, kind } = generatedDailySpec(date), inside = shape(kind, width, height);
  const mask = [], arrows = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) if (inside(x, y)) mask.push({ x, y });
    for (let x = 0; x < width; x++) {
      if (!inside(x, y)) continue;
      const start = x;
      while (x + 1 < width && inside(x + 1, y)) x++;
      if (x > start) arrows.push({ id: `${dailyId(date)}-${arrows.length}`, path: [{ x: start, y }, { x, y }] });
    }
  }
  const level = { id: dailyId(date), contentVersion: GENERATED_DAILY_CONTENT_VERSION, width, height, difficulty, arrows, mask };
  validateLevel(level); return level;
}

export function generateDaily(date: string): Level {
  const { width, height, difficulty, kind, seed } = generatedDailySpec(date);
  // Finite work: at most three mask.length * 100 construction passes, then a bounded fallback.
  for (let candidate = 0; candidate < 3; candidate++) {
    try {
      const level = { ...silhouette(dailyId(date), width, height, seed + candidate * 104729, shape(kind, width, height), difficulty), contentVersion: GENERATED_DAILY_CONTENT_VERSION };
      validateLevel(level);
      if (level.arrows.length >= 6) return level;
    } catch { /* Deterministic next candidate; never swallow storage/SDK errors. */ }
  }
  return dailyFallback(date);
}
