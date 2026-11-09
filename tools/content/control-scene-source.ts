import { occupiedCells, measurePath, rayHitsPath, type Arrow, type Point } from '../../src/domain/geometry';
import { validateLevel, type Level } from '../../src/domain/board';

const points = (values: readonly (readonly [number, number])[]): Point[] => values.map(([x, y]) => ({ x, y }));
function hand(id: string, paths: readonly (readonly (readonly [number, number])[])[]): Level {
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

function random(seed: number): () => number {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
const directions: readonly Point[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];

/** Reverse construction: a newly accepted arrow can exit past all previously accepted arrows.
 * Reverse insertion order is therefore a completion witness, independent validation still runs. */
function silhouette(id: string, width: number, height: number, seed: number, inside: (x: number, y: number) => boolean, difficulty: 'hard' | 'nightmare'): Level {
  const rng = random(seed), mask: Point[] = [], occupied = new Set<string>(), arrows: Arrow[] = [];
  const key = (p: Point): string => `${p.x},${p.y}`;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (inside(x, y)) mask.push({ x, y });
  const valid = new Set(mask.map(key));
  for (let trial = 0; trial < mask.length * 100; trial++) {
    const start = mask[Math.floor(rng() * mask.length)]!;
    if (occupied.has(key(start))) continue;
    const path: Point[] = [start], used = new Set([key(start)]);
    const length = 3 + Math.floor(rng() * 18);
    let direction = Math.floor(rng() * 4);
    for (let i = 1; i < length; i++) {
      if (rng() < .32) direction = Math.floor(rng() * 4);
      const last = path.at(-1)!, step = directions[direction]!;
      const next = { x: last.x + step.x, y: last.y + step.y };
      if (!valid.has(key(next)) || occupied.has(key(next)) || used.has(key(next))) break;
      path.push(next); used.add(key(next));
    }
    if (path.length < 2) continue;
    // Normalize collinear integer cells into just the turns.
    const turns = path.filter((p, i) => i === 0 || i === path.length - 1 ||
      path[i - 1]!.x !== path[i + 1]!.x && path[i - 1]!.y !== path[i + 1]!.y);
    const measured = measurePath(turns), head = turns.at(-1)!;
    if (rayHitsPath(head, measured.direction, turns) || arrows.some(a => rayHitsPath(head, measured.direction, a.path))) continue;
    arrows.push({ id: `${id}-${arrows.length}`, path: turns });
    for (const p of path) occupied.add(key(p));
  }
  return { id, contentVersion: 1, width, height, difficulty, arrows, mask };
}
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
