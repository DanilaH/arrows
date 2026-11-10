import type { Level } from '../../src/domain/board';

/** Offline cell-walking oracle. Does not use the game's ray/occupancy/solver helpers. */
export function analyzeCampaignLevel(level: Level) {
  const cells = new Map<string, string>(), mask = new Set(level.mask.map(p => `${p.x},${p.y}`));
  let length = 0, bends = 0;
  for (const arrow of level.arrows) {
    const own = new Set<string>();
    bends += arrow.path.length - 2;
    for (let j = 1; j < arrow.path.length; j++) {
      const a = arrow.path[j - 1]!, b = arrow.path[j]!;
      if (a.x !== b.x && a.y !== b.y) throw Error(`${level.id}: diagonal`);
      const steps = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      length += steps;
      for (let k = 0; k <= steps; k++) own.add(`${a.x + Math.sign(b.x - a.x) * k},${a.y + Math.sign(b.y - a.y) * k}`);
    }
    for (const cell of own) {
      if (cells.has(cell) || !mask.has(cell)) throw Error(`${level.id}: overlap or outside silhouette`);
      cells.set(cell, arrow.id);
    }
  }
  const dependencies = new Map<string, Set<string>>();
  for (const arrow of level.arrows) {
    const h = arrow.path.at(-1)!, p = arrow.path.at(-2)!, dx = Math.sign(h.x - p.x), dy = Math.sign(h.y - p.y);
    const blockers = new Set<string>();
    for (let x = h.x + dx, y = h.y + dy; x >= 0 && y >= 0 && x < level.width && y < level.height; x += dx, y += dy) {
      const blocker = cells.get(`${x},${y}`); if (blocker) blockers.add(blocker);
    }
    dependencies.set(arrow.id, blockers);
  }
  const depths = new Map<string, number>(), visiting = new Set<string>();
  const depth = (id: string): number => {
    if (visiting.has(id)) throw Error(`${level.id}: cyclic dependencies`);
    if (depths.has(id)) return depths.get(id)!;
    visiting.add(id);
    const value = 1 + Math.max(0, ...[...dependencies.get(id)!].map(depth));
    visiting.delete(id); depths.set(id, value); return value;
  };
  const depthValue = Math.max(...level.arrows.map(a => depth(a.id)));
  const profiles: number[][] = [];
  for (let order = 0; order < 3; order++) {
    const remaining = new Set(level.arrows.map(a => a.id)), samples: number[] = [];
    while (remaining.size) {
      const available = [...remaining].filter(id => ![...dependencies.get(id)!].some(b => remaining.has(b)));
      if (!available.length) throw Error(`${level.id}: no legal removal`);
      if (remaining.size >= level.arrows.length / 2) samples.push(available.length / remaining.size);
      remaining.delete(available[order === 0 ? 0 : order === 1 ? available.length - 1 : Math.floor(available.length / 2)]!);
    }
    profiles.push(samples);
  }
  const early = profiles.flat();
  const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
  const empty = new Set(mask); for (const p of cells.keys()) empty.delete(p);
  let largestHole = 0;
  while (empty.size) {
    const todo = [empty.values().next().value!]; empty.delete(todo[0]!); let size = 0;
    while (todo.length) {
      const [x, y] = todo.pop()!.split(',').map(Number) as [number, number]; size++;
      for (const n of [`${x+1},${y}`, `${x-1},${y}`, `${x},${y+1}`, `${x},${y-1}`]) if (empty.delete(n)) todo.push(n);
    }
    largestHole = Math.max(largestHole, size);
  }
  return { arrows: level.arrows.length, dots: level.mask.length, coverage: cells.size / mask.size,
    initialFree: [...dependencies.values()].filter(v => v.size === 0).length,
    depth: depthValue, edges: [...dependencies.values()].reduce((n, v) => n + v.size, 0),
    meanLength: length / level.arrows.length, meanBends: bends / level.arrows.length,
    initialFreeFraction: [...dependencies.values()].filter(v => v.size === 0).length / level.arrows.length,
    meanEarlyFreeFraction: mean(early), peakEarlyFreeFraction: Math.max(...early), largestHole,
    straightFraction: level.arrows.filter(a => a.path.length === 2).length / level.arrows.length };
}
