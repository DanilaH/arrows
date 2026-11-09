export interface Point { readonly x: number; readonly y: number; }
export interface Arrow { readonly id: string; readonly path: readonly Point[]; }
export interface MeasuredPath { readonly points: readonly Point[]; readonly distances: readonly number[]; readonly length: number; readonly direction: Point; }
export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export function measurePath(points: readonly Point[]): MeasuredPath {
  if (points.length < 2) throw new Error('An arrow needs at least two vertices');
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    if (![a.x, a.y, b.x, b.y].every(Number.isFinite) || (a.x !== b.x && a.y !== b.y) || distance(a, b) === 0) throw new Error('Invalid orthogonal segment');
    distances.push(distances[i - 1]! + distance(a, b));
  }
  const a = points.at(-2)!, b = points.at(-1)!;
  return { points, distances, length: distances.at(-1)!, direction: { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) } };
}

export function pointAt(path: MeasuredPath, position: number): Point {
  if (!Number.isFinite(position) || position < 0) throw new Error('Invalid path distance');
  const head = path.points.at(-1)!;
  if (position >= path.length) return { x: head.x + path.direction.x * (position - path.length), y: head.y + path.direction.y * (position - path.length) };
  for (let i = 1; i < path.points.length; i++) {
    if (position > path.distances[i]!) continue;
    const a = path.points[i - 1]!, b = path.points[i]!;
    const t = (position - path.distances[i - 1]!) / (path.distances[i]! - path.distances[i - 1]!);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  return head;
}

/** The visible window [distance, distance + original length] on the extended path. */
export function extractPath(path: MeasuredPath, travelled: number, visibleLength = path.length): Point[] {
  if (!Number.isFinite(visibleLength) || visibleLength < 0) throw new Error('Invalid visible length');
  const end = travelled + visibleLength;
  const result: Point[] = [pointAt(path, travelled)];
  for (let i = 1; i < path.points.length; i++) {
    if (path.distances[i]! > travelled && path.distances[i]! < end) result.push(path.points[i]!);
  }
  const last = pointAt(path, end);
  if (distance(result.at(-1)!, last) > 1e-9) result.push(last);
  return result.filter((p, index) => index === 0 || index === result.length - 1 ||
    Math.abs((p.x - result[index - 1]!.x) * (result[index + 1]!.y - p.y) - (p.y - result[index - 1]!.y) * (result[index + 1]!.x - p.x)) > 1e-9);
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length));
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}
export function distanceToPath(p: Point, points: readonly Point[]): number {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) best = Math.min(best, distanceToSegment(p, points[i - 1]!, points[i]!));
  return best;
}

export function rayHitsPath(origin: Point, direction: Point, points: readonly Point[]): boolean {
  // Project each segment into ray-aligned forward/across coordinates.
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    const forwardA = (a.x - origin.x) * direction.x + (a.y - origin.y) * direction.y;
    const forwardB = (b.x - origin.x) * direction.x + (b.y - origin.y) * direction.y;
    const acrossA = (a.x - origin.x) * -direction.y + (a.y - origin.y) * direction.x;
    const acrossB = (b.x - origin.x) * -direction.y + (b.y - origin.y) * direction.x;
    if (Math.min(acrossA, acrossB) <= 0 && Math.max(acrossA, acrossB) >= 0 && Math.max(forwardA, forwardB) > 1e-8) return true;
  }
  return false;
}

export function occupiedCells(points: readonly Point[]): Point[] {
  measurePath(points);
  const result: Point[] = [points[0]!];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    if (![a.x, a.y, b.x, b.y].every(Number.isInteger)) throw new Error('Noninteger level geometry');
    const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y), steps = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    for (let step = 1; step <= steps; step++) result.push({ x: a.x + dx * step, y: a.y + dy * step });
  }
  return result;
}
