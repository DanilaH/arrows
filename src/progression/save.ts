import { JsonStorageRepository, type ReceiptCommitResult, type StorageAdapter } from '@danilah/mini-games-kit/platform';
import { campaign, CATALOG_VERSION } from '../content/campaign';
import { dailyCatalog, dailyMonths, DAILY_CATALOG_VERSION } from '../content/daily';
import { localDate, validDate, monthDates } from './calendar';
import { legacyTrophyBinding, trophyBinding, validTrophyBinding } from '../content/trophies';
import type { TrophyBinding } from '../domain/trophy';
import { Board, canExit, validateLevel, type Attempt, type Level, type MoveResult } from '../domain/board';
import { parseReceipt, type EarnedReceipt } from '../platform/ads';

export const SAVE_KEY = 'arrows.progress.v1';
export interface ViewState { centerX: number; centerY: number; zoom: number; }
export interface SavedAttempt {
  level: Level; board: Attempt; view: ViewState | null; guides: boolean; freeUsed: boolean;
  continuations: number; hint: string | null; started: boolean; activeMs: number;
}
export interface Win { attempt: string; levelId: string; completedAt: number; activeMs: number; mistakes: number; localDate?: string; }
export interface RunFact { kind: 'win' | 'restart'; attempt: string; mode: 'campaign' | 'daily'; localDate: string; at: number; }
export interface GameSave {
  schema: 2; revision: number; catalogVersion: number; index: number; campaign: SavedAttempt;
  daily: Record<string, SavedAttempt>; wins: Win[]; tutorials: string[];
  receipts: string[]; reservedRewards: EarnedReceipt[];
  dailyCatalogVersion: number; dailyWins: Record<string, Win>; cups: string[]; facts: RunFact[]; seenAwards: string[]; collectionSeen: boolean;
  trophyDesigns: Record<string, TrophyBinding>;
}
export interface SaveChange { kind: 'load' | 'state' | 'move'; result?: MoveResult; attempt?: string; mode?: 'campaign' | 'daily'; date?: string; startedNow?: boolean; }
export const freshAttempt = (level: Level, id = crypto.randomUUID()): SavedAttempt => ({
  level, board: new Board(level, id).snapshot(), view: null, guides: false, freeUsed: false,
  continuations: 0, hint: null, started: false, activeMs: 0,
});
export const freshSave = (): GameSave => ({ schema: 2, revision: 0, catalogVersion: CATALOG_VERSION, index: 0,
  campaign: freshAttempt(campaign[0]!), daily: {}, wins: [], tutorials: [], receipts: [], reservedRewards: [], dailyCatalogVersion: DAILY_CATALOG_VERSION, dailyWins: {}, cups: [], facts: [], seenAwards: [], collectionSeen: false, trophyDesigns: {} });
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
/** Schema 1 is the shipped 0.2 save. Migrate without changing attempt IDs, geometry, receipts or accepted moves. */
export function decodeSave(value: unknown): GameSave {
  let s = record(value);
  if (s.schema === 1) s = { ...s, schema: 2, dailyCatalogVersion: DAILY_CATALOG_VERSION, dailyWins: {}, cups: [], facts: [], seenAwards: [], collectionSeen: false };
  if (s.schema === 2 && s.dailyCatalogVersion === 1) s = { ...s, dailyCatalogVersion: DAILY_CATALOG_VERSION };
  if (s.schema !== 2 || !integer(s.revision) || s.catalogVersion !== CATALOG_VERSION || !integer(s.index, campaign.length - 1) || !Array.isArray(s.wins)) throw Error('Unsupported save');
  const wins = s.wins.map(v => {
    const w = record(v);
    if (!id(w.attempt) || !id(w.levelId) || !integer(w.completedAt) || !integer(w.activeMs) || !integer(w.mistakes)) throw Error('Invalid history');
    if (w.localDate !== undefined && !validDate(w.localDate)) throw Error('Invalid win date');
    return { ...w, localDate: w.localDate ?? localDate(new Date(w.completedAt)) } as unknown as Win;
  });
  if (new Set(wins.map(w => w.attempt)).size !== wins.length || wins.some((w, i) => w.levelId !== campaign[i]?.id)) throw Error('Invalid campaign history');
  const current = attempt(s.campaign);
  if (current.level.id !== campaign[s.index]!.id || wins.length !== s.index + (new Board(current.level, current.board.id, current.board).complete ? 1 : 0) ||
      (wins.length > s.index && wins.at(-1)?.attempt !== current.board.id)) throw Error('Invalid campaign position');
  const daily = Object.fromEntries(Object.entries(record(s.daily)).map(([date, a]) => {
    if (!validDate(date) || !dailyCatalog[date]) throw Error('Invalid daily date');
    const current = attempt(a); if (current.level.id !== dailyCatalog[date]!.id) throw Error('Wrong daily field');
    return [date, current];
  }));
  const receipts = strings(s.receipts), tutorials = strings(s.tutorials);
  if (!Array.isArray(s.reservedRewards)) throw Error('Invalid reward reservations');
  const reservedRewards = s.reservedRewards.map(parseReceipt);
  if (reservedRewards.some(r => !receipts.includes(r.id)) || new Set(reservedRewards.map(r => r.id)).size !== reservedRewards.length) throw Error('Invalid reward ledger');
  if (s.dailyCatalogVersion !== DAILY_CATALOG_VERSION || typeof s.collectionSeen !== 'boolean' || !Array.isArray(s.facts)) throw Error('Invalid meta save');
  const dailyWins = Object.fromEntries(Object.entries(record(s.dailyWins)).map(([date, value]) => {
    const w = record(value), a = daily[date];
    if (!a || !new Board(a.level, a.board.id, a.board).complete || w.attempt !== a.board.id || w.levelId !== a.level.id ||
        !integer(w.completedAt) || !integer(w.activeMs) || !integer(w.mistakes) || !validDate(w.localDate)) throw Error('Invalid daily win');
    return [date, w as unknown as Win];
  }));
  if (Object.entries(daily).some(([date, a]) => new Board(a.level, a.board.id, a.board).complete && !dailyWins[date])) throw Error('Missing daily win');
  const allIds = [current.board.id, ...Object.values(daily).map(a => a.board.id)];
  if (new Set(allIds).size !== allIds.length) throw Error('Duplicate attempt ownership');
  const facts = s.facts.map(value => {
    const f = record(value);
    if (!['win', 'restart'].includes(f.kind as string) || !['campaign', 'daily'].includes(f.mode as string) || !id(f.attempt) || !validDate(f.localDate) || !integer(f.at)) throw Error('Invalid run fact');
    return f as unknown as RunFact;
  });
  const factIds = new Set<string>();
  for (const fact of facts) {
    if (factIds.has(fact.attempt)) throw Error('Duplicate run fact');
    factIds.add(fact.attempt);
    if (fact.kind === 'win') {
      const win = fact.mode === 'campaign' ? wins.find(w => w.attempt === fact.attempt) : Object.values(dailyWins).find(w => w.attempt === fact.attempt);
      if (!win || win.completedAt !== fact.at || win.localDate !== fact.localDate) throw Error('Unconfirmed win fact');
    }
  }
  const cups = s.cups;
  if (!Array.isArray(cups) || !cups.every(m => typeof m === 'string' && dailyMonths.includes(m) && monthDates(m).every(d => dailyWins[d])) || new Set(cups).size !== cups.length) throw Error('Invalid trophy');
  const trophyDesigns = s.trophyDesigns === undefined
    ? Object.fromEntries(cups.map(month => [month, legacyTrophyBinding(month)]))
    : record(s.trophyDesigns);
  if (Object.entries(trophyDesigns).some(([month, binding]) => !cups.includes(month) || !validTrophyBinding(month, binding)) ||
      cups.some(month => !Object.hasOwn(trophyDesigns, month))) throw Error('Invalid awarded trophy design');
  const seenAwards = strings(s.seenAwards);
  return { ...s, campaign: current, wins, daily, receipts, tutorials, reservedRewards, dailyWins, cups, facts, seenAwards, trophyDesigns } as GameSave;
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
  public constructor(private readonly storage: StorageAdapter, private readonly now: () => Date = () => new Date()) {
    this.repository = new JsonStorageRepository({ storage, key: SAVE_KEY, createDefault: freshSave, codec: { decode: decodeSave } });
  }
  public get board(): Board { const a = this.state.campaign; return new Board(a.level, a.board.id, a.board); }
  public findAttempt(expected: string, state = this.state): { saved: SavedAttempt; mode: 'campaign' | 'daily'; date?: string } | null {
    if (state.campaign.board.id === expected) return { saved: state.campaign, mode: 'campaign' };
    const entry = Object.entries(state.daily).find(([, a]) => a.board.id === expected);
    return entry ? { saved: entry[1], mode: 'daily', date: entry[0] } : null;
  }
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
        if (raw === null && this.state.revision === 0 || raw !== null && JSON.stringify(decodeSave(JSON.parse(raw))) === JSON.stringify(this.state)) {
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
      const target = this.findAttempt(expected, next); if (!target) return null;
      const a = target.saved, startedNow = !a.started;
      const board = new Board(a.level, a.board.id, a.board), result = board.activate(arrow);
      if (result.kind === 'ignored') return null;
      a.started = true; a.activeMs += Math.max(0, Math.round(activeMs)); a.board = board.snapshot();
      if (result.kind === 'removed') {
        if (a.hint === arrow) a.hint = null;
        if (board.complete) {
          const now = this.now(), win: Win = { attempt: a.board.id, levelId: a.level.id, completedAt: now.getTime(), localDate: localDate(now), activeMs: a.activeMs, mistakes: a.board.errors.length };
          if (target.mode === 'campaign') next.wins.push(win);
          else {
            next.dailyWins[target.date!] = win;
            const month = target.date!.slice(0, 7);
            if (!next.cups.includes(month) && monthDates(month).every(d => next.dailyWins[d])) {
              next.cups.push(month); next.trophyDesigns[month] = trophyBinding(month);
            }
          }
          next.facts.push({ kind: 'win', attempt: a.board.id, mode: target.mode, localDate: win.localDate!, at: win.completedAt });
        }
      }
      return { value: result, event: { kind: 'move', result, attempt: expected, mode: target.mode, ...(target.date ? { date: target.date } : {}), startedNow } };
    });
  }
  public presentation(expected: string, fields: Partial<Pick<SavedAttempt, 'view' | 'guides'>>, activeMs = 0): Promise<void | undefined> {
    return this.update(next => {
      const target = this.findAttempt(expected, next); if (!target) return null;
      Object.assign(target.saved, fields); target.saved.activeMs += Math.max(0, Math.round(activeMs)); return { value: undefined };
    });
  }
  public tutorial(step: string): Promise<boolean | undefined> {
    return this.update(next => { if (next.tutorials.includes(step)) return null; next.tutorials.push(step); return { value: true }; });
  }
  public restart(expected: string): Promise<boolean | undefined> {
    return this.update(next => {
      const target = this.findAttempt(expected, next); if (!target || new Board(target.saved.level, expected, target.saved.board).complete) return null;
      const old = target.saved;
      if (old.started) next.facts.push({ kind: 'restart', attempt: expected, mode: target.mode, localDate: localDate(this.now()), at: this.now().getTime() });
      const fresh = freshAttempt(old.level);
      if (target.mode === 'campaign') next.campaign = fresh; else next.daily[target.date!] = fresh;
      return { value: true };
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
      const a = this.findAttempt(expected, next)?.saved; if (!a || a.freeUsed || a.board.lives !== 0) return null;
      a.freeUsed = true; a.continuations++; a.board = { ...a.board, lives: 3 }; return { value: true };
    });
  }
  public openDaily(date: string): Promise<string | undefined> {
    return this.update(next => {
      if (next.index < 19 || !validDate(date) || !dailyCatalog[date] || date > localDate(this.now())) return null;
      next.daily[date] ??= freshAttempt(dailyCatalog[date]!);
      return { value: next.daily[date]!.board.id };
    });
  }
  public markCollectionSeen(awards: string[]): Promise<void | undefined> {
    return this.update(next => {
      const fresh = awards.filter(key => !next.seenAwards.includes(key));
      if (next.collectionSeen && !fresh.length) return null;
      next.collectionSeen = true; next.seenAwards.push(...fresh); return { value: undefined };
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
