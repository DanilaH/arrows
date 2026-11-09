import { measurePath, rayHitsPath, type Arrow, type Point } from '../../src/domain/geometry';
import type { Level } from '../../src/domain/board';

const directions: readonly Point[] = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }];
const key = (p: Point): string => `${p.x},${p.y}`;
/** New-bank generator only: published campaign/daily v1 generation is deliberately untouched.
 * Reverse construction guarantees a witness; candidate scoring prefers bent paths that
 * unlock other arrows, rather than equating a large silhouette with logical difficulty. */
export function campaignField(id: string, width: number, height: number, seed: number, inside: (x: number, y: number) => boolean, difficulty: Level['difficulty']): Level {
  const rng = (): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const mask: Point[] = [], occupied = new Set<string>(), arrows: Arrow[] = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (inside(x, y)) mask.push({ x, y });
  const valid = new Set(mask.map(key));
  let best: { path: Point[]; cells: Point[]; score: number } | null = null;
  let free: Arrow[] = [];
  for (let trial = 0; trial < mask.length * 65; trial++) {
    const start = mask[Math.floor(rng() * mask.length)]!;
    if (!occupied.has(key(start))) {
      const cells = [start], used = new Set([key(start)]), limit = 5 + Math.floor(rng() * 16);
      let direction = Math.floor(rng() * 4);
      for (let i = 1; i < limit; i++) {
        if (rng() < .29) direction = (direction + (rng() < .5 ? 1 : 3)) % 4;
        const last = cells.at(-1)!;
        // Turn around occupied cells instead of reducing most candidates to tiny straight lines.
        const candidates = [direction, (direction + 1) % 4, (direction + 3) % 4];
        let next: Point | null = null;
        for (const d of candidates) {
          const p = { x: last.x + directions[d]!.x, y: last.y + directions[d]!.y };
          if (valid.has(key(p)) && !occupied.has(key(p)) && !used.has(key(p))) { next = p; direction = d; break; }
        }
        if (!next) break;
        cells.push(next); used.add(key(next));
      }
      if (cells.length >= 3) {
        const path = cells.filter((_, i) => i === 0 || i === cells.length - 1 || cells[i - 1]!.x !== cells[i + 1]!.x && cells[i - 1]!.y !== cells[i + 1]!.y);
        const direction = measurePath(path).direction, head = path.at(-1)!;
        if (!rayHitsPath(head, direction, path) && !arrows.some(a => rayHitsPath(head, direction, a.path))) {
          const blocked = arrows.filter(a => rayHitsPath(a.path.at(-1)!, measurePath(a.path).direction, path)).length;
          const blockedFree = free.filter(a => rayHitsPath(a.path.at(-1)!, measurePath(a.path).direction, path)).length;
          const score = cells.length + (path.length - 2) * 1.2 + blocked * 3 + blockedFree * 24;
          if (!best || score > best.score) best = { path, cells, score };
        }
      }
    }
    if (trial % 24 === 23 && best) {
      arrows.push({ id: `${id}-${arrows.length}`, path: best.path });
      for (const p of best.cells) occupied.add(key(p));
      free = arrows.filter(a => !arrows.some(b => a !== b && rayHitsPath(a.path.at(-1)!, measurePath(a.path).direction, b.path)));
      best = null;
    }
  }
  if (best) arrows.push({ id: `${id}-${arrows.length}`, path: best.path });
  return { id, contentVersion: 1, width, height, difficulty, arrows, mask };
}
