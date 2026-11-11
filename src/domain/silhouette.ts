import { measurePath, rayHitsPath, type Arrow, type Point } from './geometry';
import type { Level } from './board';

function random(seed: number): () => number {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
const directions: readonly Point[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];

/** Frozen construction/shape libraries used by published dated generator v1.
 * Algorithm changes need a new version, not an in-place edit of this implementation.
 * Reverse construction: a newly accepted arrow can exit past all previously accepted arrows.
 * Reverse insertion order is therefore a completion witness, independent validation still runs. */
export function silhouette(id: string, width: number, height: number, seed: number, inside: (x: number, y: number) => boolean, difficulty: Level['difficulty']): Level {
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
export const kinds = ['diamond', 'flower', 'heart', 'ring', 'star', 'leaf', 'cross', 'butterfly'] as const;
export function shape(kind: typeof kinds[number], width: number, height: number): (x: number, y: number) => boolean {
  return (x, y) => {
    const a = (x - (width - 1) / 2) / ((width - 2) / 2), b = (y - (height - 1) / 2) / ((height - 2) / 2);
    const radius = Math.hypot(a, b), angle = Math.atan2(b, a);
    if (kind === 'diamond') return Math.abs(a) + Math.abs(b) < 1;
    if (kind === 'flower') return radius < .79 + .18 * Math.cos(5 * angle);
    if (kind === 'heart') return (a * a + (b + .12) ** 2 - .55) ** 3 + a * a * (b + .12) ** 3 < 0;
    if (kind === 'ring') return radius < .96 && radius > .46;
    if (kind === 'star') return radius < .69 + .26 * Math.cos(5 * (angle + Math.PI / 2));
    if (kind === 'leaf') return a * a + b * b < .94 && Math.abs(a + b * .5) < .7;
    if (kind === 'cross') return Math.abs(a) < .35 && Math.abs(b) < .95 || Math.abs(b) < .35 && Math.abs(a) < .95;
    return ((Math.abs(a) - .5) / .46) ** 2 + ((b + .4) / .52) ** 2 < 1 ||
      ((Math.abs(a) - .42) / .42) ** 2 + ((b - .48) / .48) ** 2 < 1 || Math.abs(a) < .07 && Math.abs(b) < .9;
  };
}
