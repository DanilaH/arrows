import { shape } from './silhouettes';
import { silhouette } from './control-scene-source';
import { validateLevel, type Level } from '../../src/domain/board';
import { monthDates } from '../../src/progression/calendar';
const shapes = ['diamond', 'flower', 'heart', 'ring', 'star', 'leaf', 'cross', 'butterfly'] as const;
export const dailyCatalog: Record<string, Level> = {};
const months = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
for (const date of months.flatMap(monthDates)) {
  const day = Number(date.slice(-2)), seed = Number(date.replaceAll('-', ''));
  const difficulty = day === 8 || day === 28 ? 'nightmare' : day % 7 === 0 ? 'hard' : 'normal';
  const width = difficulty === 'nightmare' ? 37 : difficulty === 'hard' ? 27 : 13 + 2 * (day % 4);
  const kind = shapes[(seed * 3 + day * 2) % shapes.length]!;
  const level = silhouette(`d${date.replaceAll('-', '')}`, width, width + 4, seed, shape(kind, width, width + 4), difficulty);
  validateLevel(level); dailyCatalog[date] = level;
}
