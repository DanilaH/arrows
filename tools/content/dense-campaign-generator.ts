import type { Level } from '../../src/domain/board';
import type { Point } from '../../src/domain/geometry';

const dx = [1, 0, -1, 0], dy = [0, 1, 0, -1];
/** Forward peeling of a filled silhouette. At birth each head sees no unassigned
 * cell ahead. Later paths therefore cannot block it; the birth order is a witness.
 * Earlier paths still occupy the original board and create real dependencies. */
export function denseCampaignField(id: string, width: number, height: number, seed: number, inside: (x: number, y: number) => boolean, difficulty: Level['difficulty'], freeRatio = difficulty === 'nightmare' ? .08 : difficulty === 'hard' ? .12 : .25): Level {
  const random = (): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const owner = new Int32Array(width * height).fill(-1), mask: Point[] = [], valid: number[] = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (inside(x, y)) { const p = y * width + x; owner[p] = 0; valid.push(p); mask.push({ x, y }); }
  const point = (p: number): Point => ({ x: p % width, y: Math.floor(p / width) });
  const neighbor = (p: number, direction: number): number => {
    const x = p % width + dx[direction]!, y = Math.floor(p / width) + dy[direction]!;
    return x >= 0 && y >= 0 && x < width && y < height ? y * width + x : -1;
  };
  const paths: number[][] = [], depths = [0];
  const rootBudget = Math.max(2, Math.ceil(valid.length / 12 * freeRatio)); let roots = 0;
  const desiredDepth = difficulty === 'nightmare' ? 22 : difficulty === 'hard' ? 15 : valid.length < 250 ? 6 : 10;
  const degree = (p: number, used: Set<number>): number => {
    let n = 0; for (let d = 0; d < 4; d++) { const q = neighbor(p, d); if (q >= 0 && owner[q] === 0 && !used.has(q)) n++; } return n;
  };
  for (let iteration = 0; iteration < valid.length; iteration++) {
    const left = new Int32Array(height).fill(width), right = new Int32Array(height).fill(-1), top = new Int32Array(width).fill(height), bottom = new Int32Array(width).fill(-1);
    for (const p of valid) if (owner[p] === 0) {
      const x = p % width, y = Math.floor(p / width); left[y] = Math.min(left[y]!, x); right[y] = Math.max(right[y]!, x); top[x] = Math.min(top[x]!, y); bottom[x] = Math.max(bottom[x]!, y);
    }
    const heads: { p: number; d: number; depth: number; root: boolean; score: number }[] = [];
    for (const p of valid) if (owner[p] === 0) {
      const x = p % width, y = Math.floor(p / width);
      for (let d = 0; d < 4; d++) {
        if (d === 0 && x !== right[y] || d === 2 && x !== left[y] || d === 1 && y !== bottom[x] || d === 3 && y !== top[x]) continue;
        const inward = neighbor(p, (d + 2) % 4); if (inward < 0 || owner[inward] !== 0) continue;
        const blockers = new Set<number>();
        for (let q = neighbor(p, d); q >= 0; q = neighbor(q, d)) if (owner[q]! > 0) blockers.add(owner[q]!);
        const depth = 1 + Math.max(0, ...[...blockers].map(i => depths[i]!));
        const score = (blockers.size ? 24 : roots < rootBudget ? 70 : -8) + Math.min(depth, desiredDepth) * 2 - Math.max(0, depth - desiredDepth) * 4 + Math.min(blockers.size, 4) + random() * 8;
        heads.push({ p, d, depth, root: blockers.size === 0, score });
      }
    }
    if (!heads.length) break;
    heads.sort((a, b) => b.score - a.score);
    let best: { cells: number[]; depth: number; root: boolean; score: number } | undefined;
    for (const head of heads.slice(0, 14)) for (let trial = 0; trial < 4; trial++) {
      const cells = [head.p, neighbor(head.p, (head.d + 2) % 4)], used = new Set(cells);
      const target = 8 + Math.floor(random() * 13); let direction = (head.d + 2) % 4, bends = 0;
      for (let step = 2; step < target; step++) {
        const tail = cells.at(-1)!, next: { p: number; d: number; score: number }[] = [];
        for (let d = 0; d < 4; d++) {
          const q = neighbor(tail, d); if (q < 0 || owner[q] !== 0 || used.has(q)) continue;
          const onward = degree(q, used);
          const score = random() * 3 + (d === direction ? 1.2 : 0) - onward * .7 - (onward === 0 && step < target - 3 ? 5 : 0);
          next.push({ p: q, d, score });
        }
        if (!next.length) break; next.sort((a, b) => b.score - a.score);
        const chosen = next[0]!; if (chosen.d !== direction) bends++; direction = chosen.d; cells.push(chosen.p); used.add(chosen.p);
      }
      const adjacent = new Set<number>();
      for (const p of cells) for (let d = 0; d < 4; d++) { const q = neighbor(p, d); if (q >= 0 && owner[q] === 0 && !used.has(q)) adjacent.add(q); }
      let orphans = 0; for (const p of adjacent) if (degree(p, used) === 0) orphans++;
      const score = head.score + cells.length * .8 + Math.min(bends, 6) * 2 - orphans * 45 - (cells.length < 4 ? 18 : 0);
      if (!best || score > best.score) best = { cells, depth: head.depth, root: head.root, score };
    }
    if (!best) break;
    paths.push(best.cells.reverse()); depths.push(best.depth); if (best.root) roots++; for (const p of best.cells) owner[p] = paths.length;
  }
  // Leftover single cells can extend an existing tail without changing any head/ray.
  // They lay outside every earlier birth ray, so this cannot introduce a blocker cycle.
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const cells of paths) {
      const tail = cells[0]!;
      const options = [0, 1, 2, 3].map(d => neighbor(tail, d)).filter(q => q >= 0 && owner[q] === 0);
      if (options.length) { const q = options[Math.floor(random() * options.length)]!; cells.unshift(q); owner[q] = owner[tail]!; changed = true; }
    }
    if (!changed) break;
  }
  // Two-cell detours fill thin pockets while retaining all endpoints and directions.
  for (let pass = 0; pass < 3; pass++) for (const cells of paths) {
    for (let i = 0; i < cells.length - 2; i++) {
      const a = cells[i]!, b = cells[i + 1]!, ax = a % width, ay = Math.floor(a / width), bx = b % width, by = Math.floor(b / width);
      for (const sign of [-1, 1]) {
        const sx = by !== ay ? sign : 0, sy = bx !== ax ? sign : 0;
        const x1 = ax + sx, y1 = ay + sy, x2 = bx + sx, y2 = by + sy;
        if ([x1, x2].some(x => x < 0 || x >= width) || [y1, y2].some(y => y < 0 || y >= height)) continue;
        const p = y1 * width + x1, q = y2 * width + x2;
        if (owner[p] === 0 && owner[q] === 0) { owner[p] = owner[a]!; owner[q] = owner[a]!; cells.splice(i + 1, 0, p, q); i += 2; break; }
      }
    }
  }
  // Absorb late tiny fragments into an earlier tail. Moving only later-born cells
  // earlier cannot obstruct an earlier head; contracting this edge preserves the witness.
  for (let pass = 0; pass < 4; pass++) for (let j = paths.length - 1; j >= 0; j--) {
    const fragment = paths[j]!; if (!fragment.length || fragment.length > 4) continue;
    for (let i = j - 1; i >= 0; i--) {
      const target = paths[i]!; if (!target.length) continue;
      const tail = point(target[0]!), adjacent = (p: number): boolean => { const q = point(p); return Math.abs(q.x-tail.x)+Math.abs(q.y-tail.y) === 1; };
      if (adjacent(fragment.at(-1)!)) { paths[i] = [...fragment, ...target]; paths[j] = []; break; }
      if (adjacent(fragment[0]!)) { paths[i] = [...fragment].reverse().concat(target); paths[j] = []; break; }
    }
  }
  const arrows = paths.filter(cells => cells.length).map((cells, i) => {
    const points = cells.map(point), path = points.filter((_, j) => j === 0 || j === points.length - 1 || points[j - 1]!.x !== points[j + 1]!.x && points[j - 1]!.y !== points[j + 1]!.y);
    return { id: `${id}-${i}`, path };
  });
  return { id, contentVersion: 4, width, height, difficulty, arrows, mask };
}
