import { JsonStorageRepository, type ReceiptCommitResult, type StorageAdapter } from '@danilah/mini-games-kit/platform';
import { campaign, CATALOG_VERSION } from '../content/campaign';
import { Board, canExit, validateLevel, type Attempt, type Level, type MoveResult } from '../domain/board';
import { parseReceipt, type EarnedReceipt } from '../platform/ads';

export const SAVE_KEY = 'arrows.progress.v1';
export interface ViewState { centerX: number; centerY: number; zoom: number; }
export interface SavedAttempt {
  level: Level; board: Attempt; view: ViewState | null; guides: boolean; freeUsed: boolean;
  continuations: number; hint: string | null; started: boolean; activeMs: number;
}
export interface Win { attempt: string; levelId: string; completedAt: number; activeMs: number; mistakes: number; }
export interface GameSave {
  schema: 1; revision: number; catalogVersion: number; index: number; campaign: SavedAttempt;
  daily: Record<string, SavedAttempt>; wins: Win[]; tutorials: string[];
  receipts: string[]; reservedRewards: EarnedReceipt[];
}
export interface SaveChange { kind: 'load' | 'state' | 'move'; result?: MoveResult; }
export const freshAttempt = (level: Level, id = crypto.randomUUID()): SavedAttempt => ({
  level, board: new Board(level, id).snapshot(), view: null, guides: false, freeUsed: false,
  continuations: 0, hint: null, started: false, activeMs: 0,
});
export const freshSave = (): GameSave => ({ schema: 1, revision: 0, catalogVersion: CATALOG_VERSION, index: 0,
  campaign: freshAttempt(campaign[0]!), daily: {}, wins: [], tutorials: [], receipts: [], reservedRewards: [] });
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Invalid save object');
  return v as Record<string, unknown>;
};
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(v);
const integer = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number => Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) <= max;
function strings(v: unknown): string[] {
  if (!Array.isArray(v) || !v.every(id) || new Set(v).size !== v.length) throw Error('Invalid save ids');
  return v;
}
function attempt(value: unknown): SavedAttempt {
  const s = record(value), b = record(s.board), level = s.level as Level;
  validateLevel(level);
  if (!id(b.id) || b.levelId !== level.id || b.contentVersion !== level.contentVersion || !integer(b.lives, 3) ||
      typeof s.guides !== 'boolean' || typeof s.freeUsed !== 'boolean' || !integer(s.continuations) ||
      typeof s.started !== 'boolean' || !integer(s.activeMs) || s.freeUsed !== (s.continuations > 0)) throw Error('Invalid attempt');
  const removed = strings(b.removed), errors = strings(b.errors), ids = new Set(level.arrows.map(a => a.id));
  if ([...removed, ...errors].some(a => !ids.has(a)) || b.lives !== 3 * (s.continuations + 1) - errors.length) throw Error('Invalid attempt lives');
  const replay = new Board(level, b.id);
  for (const arrowId of removed) if (replay.activate(arrowId).kind !== 'removed') throw Error('Invalid removal history');
  if ((removed.length > 0 || errors.length > 0) && !s.started) throw Error('Invalid attempt start');
  if (s.hint !== null && (!id(s.hint) || removed.includes(s.hint) || !canExit(level.arrows.find(a => a.id === s.hint)!, replay.remaining))) throw Error('Invalid hint');
  // Camera is restartable presentation data; repairing it never guesses gameplay/rewards.
  let view: ViewState | null = null;
  if (s.view && typeof s.view === 'object') {
    const v = s.view as ViewState;
    if ([v.centerX, v.centerY, v.zoom].every(Number.isFinite) && Math.abs(v.centerX) <= 200 && Math.abs(v.centerY) <= 200 && v.zoom >= 1 && v.zoom <= 100) view = v;
  }
  return { ...s, level, board: { ...b, removed, errors }, view } as unknown as SavedAttempt;
}
/** No older progress schema shipped. Unknown schemas/catalogs fail closed without overwriting them. */
export function decodeSave(value: unknown): GameSave {
  const s = record(value);
  if (s.schema !== 1 || !integer(s.revision) || s.catalogVersion !== CATALOG_VERSION || !integer(s.index, campaign.length - 1) || !Array.isArray(s.wins)) throw Error('Unsupported save');
  const wins = s.wins.map(v => {
    const w = record(v);
    if (!id(w.attempt) || !id(w.levelId) || !integer(w.completedAt) || !integer(w.activeMs) || !integer(w.mistakes)) throw Error('Invalid history');
    return w as unknown as Win;
  });
  if (new Set(wins.map(w => w.attempt)).size !== wins.length || wins.some((w, i) => w.levelId !== campaign[i]?.id)) throw Error('Invalid campaign history');
  const current = attempt(s.campaign);
  if (current.level.id !== campaign[s.index]!.id || wins.length !== s.index + (new Board(current.level, current.board.id, current.board).complete ? 1 : 0) ||
      (wins.length > s.index && wins.at(-1)?.attempt !== current.board.id)) throw Error('Invalid campaign position');
  const daily = Object.fromEntries(Object.entries(record(s.daily)).map(([date, a]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0, 10) !== date) throw Error('Invalid daily date');
    return [date, attempt(a)];
  }));
  const receipts = strings(s.receipts), tutorials = strings(s.tutorials);
  if (!Array.isArray(s.reservedRewards)) throw Error('Invalid reward reservations');
  const reservedRewards = s.reservedRewards.map(parseReceipt);
  if (reservedRewards.some(r => !receipts.includes(r.id)) || new Set(reservedRewards.map(r => r.id)).size !== reservedRewards.length) throw Error('Invalid reward ledger');
  return { ...s, campaign: current, wins, daily, receipts, tutorials, reservedRewards } as GameSave;
}

/** Every mutation derives from the latest committed state inside ONE queue, including camera and SDK receipts. */
export class ProgressStore {
  public state = freshSave();
  public available = true;
  public uncertain = false;
  public error: 'load' | 'write' | 'uncertain' | null = null;
  private tail: Promise<unknown> = Promise.resolve();
  private readonly listeners = new Set<(event: SaveChange) => void>();
  private readonly repository: JsonStorageRepository<GameSave>;
  private alive = true;
  private loadEpoch = 0;
  public constructor(private readonly storage: StorageAdapter) {
    this.repository = new JsonStorageRepository({ storage, key: SAVE_KEY, createDefault: freshSave, codec: { decode: decodeSave } });
  }
  public get board(): Board { const a = this.state.campaign; return new Board(a.level, a.board.id, a.board); }
  public subscribe(fn: (event: SaveChange) => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(event: SaveChange): void { if (this.alive) for (const fn of this.listeners) fn(event); }
  public async load(): Promise<void> {
    const epoch = ++this.loadEpoch;
    try { const loaded = await this.repository.load(); if (!this.alive || epoch !== this.loadEpoch) return; this.state = loaded; }
    catch { if (!this.alive || epoch !== this.loadEpoch) return; this.available = false; this.error = 'load'; }
    this.emit({ kind: 'load' });
  }
  public startSessionOnly(): void {
    this.loadEpoch++; this.available = false; this.error = 'load'; this.emit({ kind: 'load' });
  }
  private queue<T>(fn: () => Promise<T>): Promise<T> {
    const operation = this.tail.then(fn, fn); this.tail = operation.catch(() => undefined); return operation;
  }
  private async persist(candidate: GameSave, requireDurable = false): Promise<void> {
    if (!this.alive || this.uncertain) throw Error('Save mutation unavailable');
    if (!this.available) { if (requireDurable) throw Error('No durable storage'); return; }
    try { await this.repository.write(candidate); this.error = null; }
    catch {
      try {
        const raw = await this.storage.getItem(SAVE_KEY);
        if (raw === JSON.stringify(candidate)) { this.error = null; return; }
        // A failed write may still have committed. Only authoritative readback can settle it.
        if (raw === null && this.state.revision === 0 || raw === JSON.stringify(this.state)) {
          this.error = 'write'; this.emit({ kind: 'state' }); throw Error('Confirmed failed save');
        }
      } catch (error) { if (this.error === 'write') throw error; }
      this.uncertain = true; this.error = 'uncertain'; this.emit({ kind: 'state' }); throw Error('Unknown save outcome');
    }
  }
  private update<T>(change: (next: GameSave) => { value: T; event?: SaveChange } | null, requireDurable = false): Promise<T | undefined> {
    return this.queue(async () => {
      if (!this.alive || this.uncertain) throw Error('Save mutation unavailable');
      const next = structuredClone(this.state), result = change(next); if (!result) return undefined;
      next.revision++;
      await this.persist(next, requireDurable);
      if (!this.alive) throw Error('Disposed save');
      this.state = next; this.emit(result.event ?? { kind: 'state' }); return result.value;
    });
  }
  public async recover(): Promise<void> {
    return this.queue(async () => {
      const loaded = await this.repository.load();
      if (!this.alive) return;
      this.state = loaded; this.available = true; this.uncertain = false; this.error = null; this.emit({ kind: 'load' });
    });
  }
  public move(expected: string, arrow: string, activeMs = 0): Promise<MoveResult | undefined> {
    return this.update(next => {
      const a = next.campaign; if (a.board.id !== expected) return null;
      const board = new Board(a.level, a.board.id, a.board), result = board.activate(arrow);
      if (result.kind === 'ignored') return null;
      a.started = true; a.activeMs += Math.max(0, Math.round(activeMs)); a.board = board.snapshot();
      if (result.kind === 'removed') {
        if (a.hint === arrow) a.hint = null;
        if (board.complete && !next.wins.some(w => w.attempt === a.board.id)) next.wins.push({ attempt: a.board.id, levelId: a.level.id,
          completedAt: Date.now(), activeMs: a.activeMs, mistakes: a.board.errors.length });
      }
      return { value: result, event: { kind: 'move', result } };
    });
  }
  public presentation(expected: string, fields: Partial<Pick<SavedAttempt, 'view' | 'guides'>>, activeMs = 0): Promise<void | undefined> {
    return this.update(next => {
      if (next.campaign.board.id !== expected) return null;
      Object.assign(next.campaign, fields); next.campaign.activeMs += Math.max(0, Math.round(activeMs)); return { value: undefined };
    });
  }
  public tutorial(step: string): Promise<boolean | undefined> {
    return this.update(next => { if (next.tutorials.includes(step)) return null; next.tutorials.push(step); return { value: true }; });
  }
  public restart(expected: string): Promise<boolean | undefined> {
    return this.update(next => {
      if (next.campaign.board.id !== expected || this.board.complete) return null;
      next.campaign = freshAttempt(next.campaign.level); return { value: true };
    });
  }
  public next(expected: string): Promise<boolean | undefined> {
    return this.update(next => {
      if (next.campaign.board.id !== expected || !this.board.complete || next.index === campaign.length - 1) return null;
      next.index++; next.campaign = freshAttempt(campaign[next.index]!); return { value: true };
    });
  }
  public continueFree(expected: string): Promise<boolean | undefined> {
    return this.update(next => {
      const a = next.campaign; if (a.board.id !== expected || a.freeUsed || a.board.lives !== 0) return null;
      a.freeUsed = true; a.continuations++; a.board = { ...a.board, lives: 3 }; return { value: true };
    });
  }
  public async commitReward(receipt: EarnedReceipt): Promise<ReceiptCommitResult> {
    const result = await this.update(next => {
      if (next.receipts.includes(receipt.id)) return { value: 'already-applied' as const };
      const target = receipt.mode === 'campaign' ? next.campaign : Object.values(next.daily).find(a => a.board.id === receipt.attempt);
      const board = target && new Board(target.level, target.board.id, target.board);
      if (!target || target.board.id !== receipt.attempt || board?.complete || receipt.placement === 'lives' && target.board.lives !== 0) {
        // Earned rights for a retired/completed attempt remain explicitly reserved; never redirect them.
        next.reservedRewards.push(receipt);
      } else if (receipt.placement === 'hint') target.hint = board!.hint();
      else { target.board = { ...target.board, lives: 3 }; target.freeUsed = true; target.continuations++; }
      next.receipts.push(receipt.id); return { value: 'applied' as const };
    }, true);
    if (!result) throw Error('Reward not committed');
    return result;
  }
  public flush(): Promise<unknown> { return this.tail; }
  public destroy(): void { this.alive = false; this.loadEpoch++; this.listeners.clear(); }
}
