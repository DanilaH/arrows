import { measurePath, occupiedCells, rayHitsPath, type Arrow, type Point } from './geometry';

export interface Level {
  readonly id: string; readonly contentVersion: number; readonly width: number; readonly height: number;
  readonly difficulty: 'normal' | 'hard' | 'nightmare'; readonly arrows: readonly Arrow[]; readonly mask: readonly Point[];
}
export interface Attempt {
  readonly id: string; readonly levelId: string; readonly contentVersion: number;
  readonly removed: readonly string[]; readonly errors: readonly string[]; readonly lives: number;
}
export type MoveResult = { kind: 'ignored' } | { kind: 'error'; first: boolean; arrow: Arrow } | { kind: 'removed'; arrow: Arrow; complete: boolean };
export function canExit(arrow: Arrow, remaining: readonly Arrow[]): boolean {
  const path = measurePath(arrow.path), head = arrow.path.at(-1)!;
  return !remaining.some(other => other.id !== arrow.id && rayHitsPath(head, path.direction, other.path));
}
export function validateLevel(level: Level): void {
  if (!level.id || !Number.isInteger(level.contentVersion) || level.contentVersion < 1 || !Number.isInteger(level.width) || !Number.isInteger(level.height) || level.width < 2 || level.height < 2 || level.width > 100 || level.height > 100 || !level.arrows.length) throw new Error('Invalid level');
  const ids = new Set<string>(), cells = new Set<string>();
  for (const arrow of level.arrows) {
    if (!arrow.id || ids.has(arrow.id)) throw new Error('Duplicate arrow');
    ids.add(arrow.id);
    const path = measurePath(arrow.path);
    if (rayHitsPath(arrow.path.at(-1)!, path.direction, arrow.path)) throw new Error('Ambiguous self-blocking arrow');
    for (const p of occupiedCells(arrow.path)) {
      const key = `${p.x},${p.y}`;
      if (p.x < 0 || p.y < 0 || p.x >= level.width || p.y >= level.height || cells.has(key)) throw new Error('Overlapping/out-of-bounds geometry');
      cells.add(key);
    }
  }
  if (level.mask.some(p => !Number.isInteger(p.x) || !Number.isInteger(p.y) || p.x < 0 || p.y < 0 || p.x >= level.width || p.y >= level.height)) throw new Error('Invalid dot mask');
  const remaining = [...level.arrows];
  while (remaining.length) {
    const index = remaining.findIndex(arrow => canExit(arrow, remaining));
    if (index === -1) throw new Error('Cyclic arrow dependencies');
    remaining.splice(index, 1);
  }
}

/** Canonical accepted moves are independent of how/when presentation finishes. */
export class Board {
  private readonly removed = new Set<string>();
  private readonly errors = new Set<string>();
  private lives = 3;
  public constructor(public readonly level: Level, public readonly attemptId: string) {}
  public get remaining(): Arrow[] { return this.level.arrows.filter(arrow => !this.removed.has(arrow.id)); }
  public get hearts(): number { return this.lives; }
  public get complete(): boolean { return this.removed.size === this.level.arrows.length; }
  public isError(id: string): boolean { return this.errors.has(id); }
  public snapshot(): Attempt {
    return { id: this.attemptId, levelId: this.level.id, contentVersion: this.level.contentVersion, removed: [...this.removed], errors: [...this.errors], lives: this.lives };
  }
  public activate(id: string): MoveResult {
    const arrow = this.level.arrows.find(a => a.id === id);
    if (!arrow || this.removed.has(id) || this.lives === 0) return { kind: 'ignored' };
    if (!canExit(arrow, this.remaining)) {
      const first = !this.errors.has(id);
      this.errors.add(id); if (first) this.lives = Math.max(0, this.lives - 1);
      return { kind: 'error', first, arrow };
    }
    this.removed.add(id);
    return { kind: 'removed', arrow, complete: this.complete };
  }
}
