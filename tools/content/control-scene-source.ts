import { silhouette } from '../../src/domain/silhouette';
export { silhouette } from '../../src/domain/silhouette';
import { occupiedCells, type Point } from '../../src/domain/geometry';
import { validateLevel, type Level } from '../../src/domain/board';

const points = (values: readonly (readonly [number, number])[]): Point[] => values.map(([x, y]) => ({ x, y }));
export function hand(id: string, paths: readonly (readonly (readonly [number, number])[])[]): Level {
  const arrows = paths.map((path, i) => ({ id: `${id}-${i}`, path: points(path) }));
  const mask = new Map<string, Point>();
  for (const arrow of arrows) for (const p of occupiedCells(arrow.path)) mask.set(`${p.x},${p.y}`, p);
  return { id, contentVersion: 1, width: 9, height: 13, difficulty: 'normal', arrows, mask: [...mask.values()] };
}

/** Fixed, own authored control boards; these are not coordinates recovered from the reference. */
const straight = hand('straight', [
  [[1, 2], [4, 2]], [[6, 5], [6, 0]], [[5, 6], [1, 6]],
  [[3, 10], [3, 8]], [[1, 12], [6, 12]], [[8, 11], [8, 7]],
]);
const bent = hand('bent', [
  [[1, 3], [1, 1], [5, 1]], [[7, 4], [7, 0]],
  [[5, 6], [2, 6], [2, 4]], [[4, 9], [7, 9], [7, 6]],
  [[1, 10], [1, 12], [6, 12]], [[8, 11], [8, 7]],
]);

const hard = silhouette('hard-flower', 29, 31, 16407, (x, y) => {
  const a = (x - 14) / 13, b = (y - 15) / 14;
  const angle = Math.atan2(b, a), radius = .82 + .17 * Math.cos(angle * 5);
  return a * a + b * b < radius * radius;
}, 'hard');
const nightmare = silhouette('nightmare-butterfly', 47, 55, 29023, (x, y) => {
  const a = Math.abs(x - 23), b = y - 26;
  const top = ((a - 12) / 11) ** 2 + ((b + 11) / 14) ** 2 < 1;
  const bottom = ((a - 10) / 10) ** 2 + ((b - 12) / 13) ** 2 < 1;
  return top || bottom || a <= 2 && Math.abs(b) <= 23;
}, 'nightmare');

export const controlScenes: readonly Level[] = [straight, bent, hard, nightmare];
for (const level of controlScenes) validateLevel(level);
export const controlSceneStats = controlScenes.map(level => ({
  id: level.id, arrows: level.arrows.length, segments: level.arrows.reduce((sum, arrow) => sum + arrow.path.length - 1, 0), dots: level.mask.length,
}));
