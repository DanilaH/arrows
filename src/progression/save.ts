import { JsonStorageRepository, type ReceiptCommitResult, type StorageAdapter } from '@danilah/mini-games-kit/platform';
import { campaign, CATALOG_VERSION } from '../content/campaign';
import { dailyLevel, dailyId, supportsDailyDate, supportsDailyMonth, DAILY_CATALOG_VERSION } from '../content/daily';
import { localDate, validDate, monthDates } from './calendar';
import { legacyTrophyBinding, trophyBinding, validTrophyBinding } from '../content/trophies';
import type { TrophyBinding } from '../domain/trophy';
import { Board, canExit, validateLevel, type Attempt, type Level, type MoveResult } from '../domain/board';
import { parseReceipt, type EarnedReceipt } from '../platform/ads';
import { availableUnlocks, type UnlockId } from './collection';
import { decodeAdCadence, deferAds, freshAdCadence, interstitialReason, type AdCadence } from './adCadence';
import { predictHelp, routePending, routeCurrent, validatePlan, localIdentity, type HelpVariant } from '../domain/assistance';
import { freshHelpLedger, decodeHelpLedger, activeRight, ownerOf, makeOffer, sameOwner, applyRight, reserveAttempt, compatibleReserve, fact, assignmentId, beginContinue, continueFacts, type ContinueFact, type HelpLedger, type HelpOffer, type HelpRequest, type HelpFact, type HelpRight } from './helpLedger';

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
  trophyDesigns: Record<string, TrophyBinding>; seenUnlocks: UnlockId[];
  adCadence: AdCadence;
  freeContinueUsed: boolean;
  helpLedger: HelpLedger;
}
export interface SaveChange { kind: 'load' | 'state' | 'move'; result?: MoveResult; attempt?: string; mode?: 'campaign' | 'daily'; date?: string; startedNow?: boolean; helpFacts?:HelpFact[]; continueFacts?:ContinueFact[]; }
export const freshAttempt = (level: Level, id = crypto.randomUUID()): SavedAttempt => ({
  level, board: new Board(level, id).snapshot(), view: null, guides: false, freeUsed: false,
  continuations: 0, hint: null, started: false, activeMs: 0,
});
export const freshSave = (): GameSave => {const save:GameSave={ schema: 2, revision: 0, catalogVersion: CATALOG_VERSION, index: 0,
  campaign: freshAttempt(campaign[0]!), daily: {}, wins: [], tutorials: [], receipts: [], reservedRewards: [], dailyCatalogVersion: DAILY_CATALOG_VERSION, dailyWins: {}, cups: [], facts: [], seenAwards: [], collectionSeen: false, trophyDesigns: {}, seenUnlocks: [], adCadence: freshAdCadence(), freeContinueUsed: false, helpLedger:freshHelpLedger() };
  save.helpLedger.assignments[save.campaign.board.id]=save.helpLedger.nextVariant;return save;
};
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
  // Replay the recorded order without applying today's release policy to an
  // older save or silently accepting additional moves on hydration.
  const remaining = [...level.arrows];
  for (const arrowId of removed) {
    const index = remaining.findIndex(a => a.id === arrowId);
    if (index < 0 || !canExit(remaining[index]!, remaining)) throw Error('Invalid removal history');
    remaining.splice(index, 1);
  }
  if ((removed.length > 0 || errors.length > 0) && !s.started) throw Error('Invalid attempt start');
  if (s.hint !== null && (!id(s.hint) || removed.includes(s.hint) || !canExit(level.arrows.find(a => a.id === s.hint)!, remaining))) throw Error('Invalid hint');
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
  if (s.schema === 2 && (s.dailyCatalogVersion === 1 || s.dailyCatalogVersion === 2)) s = { ...s, dailyCatalogVersion: DAILY_CATALOG_VERSION };
  // Known catalogues retain embedded attempts, geometry and receipts. Catalogue 5 selects the dense bank only for fresh attempts.
  if (s.schema === 2 && (s.catalogVersion === 1 || s.catalogVersion === 2 || s.catalogVersion === 3 || s.catalogVersion === 4)) s = { ...s, catalogVersion: CATALOG_VERSION };
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
    if (!supportsDailyDate(date)) throw Error('Invalid daily date');
    const current = attempt(a); if (current.level.id !== dailyId(date)) throw Error('Wrong daily field');
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
  if (!Array.isArray(cups) || !cups.every(m => typeof m === 'string' && supportsDailyMonth(m) && monthDates(m).every(d => dailyWins[d])) || new Set(cups).size !== cups.length) throw Error('Invalid trophy');
  const trophyDesigns = s.trophyDesigns === undefined
    ? Object.fromEntries(cups.map(month => [month, legacyTrophyBinding(month)]))
    : record(s.trophyDesigns);
  if (Object.entries(trophyDesigns).some(([month, binding]) => !cups.includes(month) || !validTrophyBinding(month, binding)) ||
      cups.some(month => !Object.hasOwn(trophyDesigns, month))) throw Error('Invalid awarded trophy design');
  const seenAwards = strings(s.seenAwards);
  // Existing unlocked sections stay quiet on upgrade. New fresh saves explicitly start empty.
  const unlocked = availableUnlocks(s.index as number);
  const seenUnlocks = Array.isArray(s.seenUnlocks) && s.seenUnlocks.every(key=>unlocked.includes(key as UnlockId))
    ? [...new Set(s.seenUnlocks)] : unlocked;
  const adCadence = decodeAdCadence(s.adCadence, wins.length + Object.keys(dailyWins).length);
  if (s.freeContinueUsed !== undefined && typeof s.freeContinueUsed !== 'boolean') throw Error('Invalid lifetime continuation');
  // Old versions discarded refill history on Restart. A retired attempt is
  // conservatively treated as spent; documented migration, no progress loss.
  const freeContinueUsed = s.freeContinueUsed ?? (current.freeUsed || Object.values(daily).some(a => a.freeUsed) ||
    [...wins, ...Object.values(dailyWins)].some(w => w.mistakes >= 3) || facts.some(f => f.kind === 'restart'));
  const helpLedger=decodeHelpLedger(s.helpLedger,current,daily,reservedRewards);
  if(Object.values(helpLedger.rights).some(r=>r.receiptId&&!receipts.includes(r.receiptId))||helpLedger.unresolved.some(r=>!receipts.includes(r.id)))throw Error('Uncommitted help right');
  return { ...s, campaign: current, wins, daily, receipts, tutorials, reservedRewards, dailyWins, cups, facts, seenAwards, trophyDesigns, seenUnlocks, adCadence, freeContinueUsed,helpLedger } as GameSave;
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
      let confirmedFailure=false;
      try {
        const raw = await this.storage.getItem(SAVE_KEY);
        if (raw === JSON.stringify(candidate)) { this.error = null; return; }
        // A failed write may still have committed. Only authoritative readback can settle it.
        if (raw === null && this.state.revision === 0 || raw !== null && JSON.stringify(decodeSave(JSON.parse(raw))) === JSON.stringify(this.state)) {
          confirmedFailure=true;this.error = 'write'; this.emit({ kind: 'state' }); throw Error('Confirmed failed save');
        }
      } catch (error) { if (confirmedFailure) throw error; }
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
  public move(expected: string, arrow: string, activeMs = 0, adActiveMs = activeMs): Promise<MoveResult | undefined> {
    return this.moveAction(expected,arrow,activeMs,adActiveMs);
  }
  /** Upgrade/resume applies an already queued error only on explicit game entry,
   * through the same durable writer. Hydration never silently changes moves. */
  public releaseReadyErrors(expected:string): Promise<MoveResult | undefined> { return this.moveAction(expected,null,0,0); }
  private moveAction(expected: string, arrow: string | null, activeMs: number, adActiveMs: number): Promise<MoveResult | undefined> {
    return this.update(next => {
      const target = this.findAttempt(expected, next); if (!target) return null;
      const a = target.saved, startedNow = !a.started;
      let board = new Board(a.level, a.board.id, a.board);
      const selected=arrow??board.remaining.find(candidate=>board.isError(candidate.id)&&canExit(candidate,board.remaining))?.id;
      if(!selected)return null;
      const help=activeRight(next,expected),routeBefore=help?.kind==='route-v1'&&help.plan?routePending(board,help.plan):null,prediction=help?.kind==='cascade-v1'&&help.plan?.root===selected?predictHelp(board,help.plan):null;
      if(help?.kind==='cascade-v1'&&help.plan?.root===selected&&!prediction)throw Error('Earned cascade cannot be applied');
      const result = prediction?prediction.result:board.activate(selected);
      if(prediction)board=prediction.board;
      if (result.kind === 'ignored') return null;
      a.started = true; a.activeMs += Math.max(0, Math.round(activeMs)); a.board = board.snapshot();
      next.adCadence.activeMs += Math.max(0, Math.round(adActiveMs));
      const helpFacts:HelpFact[]=[],continuations:ContinueFact[]=[];
      if (result.kind === 'removed') {
        const native=prediction?.native??[...(arrow===null?[result.arrow.id]:[]),...(result.released??[]).map(a=>a.id)],manual=arrow===null?[]:[result.arrow.id],bonus=prediction?.bonus??[];
        const routeAfter=routeBefore&&help?.plan?routePending(board,help.plan):null,routeProgress=routeBefore!==null&&routeAfter!==null&&routeAfter.length<routeBefore.length;
        const consumed=!!help?.plan&&a.board.removed.includes(help.kind==='route-v1'?help.plan.target!:help.plan.root),related=consumed||routeProgress;
        const operation={id:crypto.randomUUID(),entitlement:related?help!.id:'',kind:related?help!.kind:'ordinary',manual,native,bonus,
          ...(routeProgress?{route:{manualStep:arrow!==null&&routeBefore!.includes(selected),completed:help!.plan!.route!.length-routeAfter!.length,total:help!.plan!.route!.length,targetReached:consumed}}:{})};
        result.help=operation;
        if(help&&related){
          const members=help.kind==='route-v1'?new Set(help.plan!.route):null;
          help.operation={id:operation.id,manual:members?manual.filter(id=>members.has(id)):manual,native:members?native.filter(id=>members.has(id)):native,bonus};
          if(consumed)help.status='used';helpFacts.push(fact(consumed?'use':'progress',help,expected));
        }
        if(help?.kind==='route-v1'&&help.plan)a.hint=consumed?null:routeCurrent(board,help.plan);
        else if (a.hint && a.board.removed.includes(a.hint)) a.hint = null;
        if(arrow!==null)continuations.push(...continueFacts(next.helpLedger,a,'first_move'));
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
          continuations.push(...continueFacts(next.helpLedger,a,'completed'));
        }
      }
      if(result.kind==='error'&&a.board.lives===0)continuations.push(...continueFacts(next.helpLedger,a,'repeat_loss'));
      return { value: result, event: { kind: 'move', result, attempt: expected, mode: target.mode, ...(target.date ? { date: target.date } : {}), startedNow,helpFacts,continueFacts:continuations } };
    });
  }
  public presentation(expected: string, fields: Partial<Pick<SavedAttempt, 'view' | 'guides'>>, activeMs = 0, adActiveMs = activeMs): Promise<void | undefined> {
    return this.update(next => {
      const target = this.findAttempt(expected, next); if (!target) return null;
      Object.assign(target.saved, fields); target.saved.activeMs += Math.max(0, Math.round(activeMs)); next.adCadence.activeMs += Math.max(0, Math.round(adActiveMs)); return { value: undefined };
    });
  }
  public get confirmedWins(): number { return this.state.wins.length + Object.keys(this.state.dailyWins).length; }
  public consumeInterstitial(expected: string): Promise<boolean | undefined> {
    return this.update(next => {
      const owner = this.findAttempt(expected, next), wins = next.wins.length + Object.keys(next.dailyWins).length;
      if (!owner || !new Board(owner.saved.level, expected, owner.saved.board).complete || interstitialReason(next.adCadence, wins) !== 'eligible') return null;
      deferAds(next.adCadence, wins); return { value: true };
    }, true);
  }
  public postponeAds(): Promise<boolean | undefined> {
    return this.update(next => { deferAds(next.adCadence, next.wins.length + Object.keys(next.dailyWins).length); return { value: true }; }, true);
  }
  public tutorial(step: string): Promise<boolean | undefined> {
    return this.update(next => { if (next.tutorials.includes(step)) return null; next.tutorials.push(step); return { value: true }; });
  }
  public restart(expected: string): Promise<boolean | undefined> {
    return this.update(next => {
      const target = this.findAttempt(expected, next); if (!target || new Board(target.saved.level, expected, target.saved.board).complete) return null;
      const old = target.saved;
      const helpFacts=reserveAttempt(next,expected),continuations=continueFacts(next.helpLedger,old,'restart');
      if (old.started) next.facts.push({ kind: 'restart', attempt: expected, mode: target.mode, localDate: localDate(this.now()), at: this.now().getTime() });
      const fresh = freshAttempt(old.level);
      next.helpLedger.assignments[fresh.board.id]=next.helpLedger.nextVariant;
      if (target.mode === 'campaign') next.campaign = fresh; else next.daily[target.date!] = fresh;
      return { value: true,event:{kind:'state',helpFacts,continueFacts:continuations} };
    });
  }
  public next(expected: string): Promise<boolean | undefined> {
    return this.update(next => {
      if (next.campaign.board.id !== expected || !this.board.complete || next.index === campaign.length - 1) return null;
      next.index++; next.campaign = freshAttempt(campaign[next.index]!);next.helpLedger.assignments[next.campaign.board.id]=next.helpLedger.nextVariant; return { value: true };
    });
  }
  public continueFree(expected: string): Promise<boolean | undefined> {
    return this.update(next => {
      const a = this.findAttempt(expected, next)?.saved; if (!a || next.freeContinueUsed || a.freeUsed || a.board.lives !== 0) return null;
      next.freeContinueUsed = true; a.freeUsed = true; a.continuations++; a.board = { ...a.board, lives: 3 };beginContinue(next.helpLedger,a,`gift-${localIdentity(next.helpLedger.installId)}`); return { value: true };
    }, true);
  }
  public openDaily(date: string): Promise<string | undefined> {
    return this.update(next => {
      if (next.index < 19 || !supportsDailyDate(date) || date > localDate(this.now())) return null;
      next.daily[date] ??= freshAttempt(dailyLevel(date)!);
      next.helpLedger.assignments[next.daily[date]!.board.id]??=next.helpLedger.nextVariant;
      return { value: next.daily[date]!.board.id };
    });
  }
  public markUnlockSeen(key: UnlockId): Promise<boolean | undefined> {
    return this.update(next => {
      if(!availableUnlocks(next.index).includes(key) || next.seenUnlocks.includes(key))return null;
      next.seenUnlocks.push(key); return {value:true};
    }, true);
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
      const found=this.findAttempt(receipt.attempt,next),target=found?.mode===receipt.mode?found.saved:undefined;
      const descriptor=receipt.schema===2?next.helpLedger.requests[receipt.requestId]:undefined;
      if(receipt.schema===2&&(!descriptor||descriptor.owner.attempt!==receipt.attempt||descriptor.owner.mode!==receipt.mode||
        (receipt.placement==='hint'?descriptor.kind==='lives':descriptor.kind!=='lives'))){
        next.helpLedger.unresolved.push(receipt);next.receipts.push(receipt.id);
        return {value:'applied' as const,event:{kind:'state' as const,helpFacts:[{id:`${receipt.id}-unresolved`,phase:'unresolved' as const,entitlement:receipt.id,request:receipt.requestId,sourceAttempt:receipt.attempt,attempt:receipt.attempt,kind:'unknown',variant:'unknown',manual:0,native:0,bonus:0}]}};
      }
      const originalOwner=descriptor?.owner??(target?ownerOf(target,receipt.mode):{attempt:receipt.attempt,mode:receipt.mode,levelId:'legacy-retired',contentVersion:1,contentKey:'legacy-unknown'});
      const board=target?new Board(target.level,target.board.id,target.board):null;
      const legacyRoot=receipt.schema===1&&receipt.placement==='hint'?board?.hint()??null:null;
      const plan=descriptor?.plan??(target&&legacyRoot?{kind:'legacy-single' as const,root:legacyRoot,bonus:[],budget:0,basis:target.board,contentKey:originalOwner.contentKey}:null);
      const right:HelpRight={id:receipt.id,origin:'sdk',receiptId:receipt.id,requestId:descriptor?.requestId??null,originalOwner,owner:null,
        kind:descriptor?.kind??(receipt.placement==='hint'?'legacy-single':'lives'),version:1,amount:descriptor?.amount??(receipt.placement==='hint'?1:3),plan,status:'reserved'};
      // Occupied slots remain untouched, including late schema1 delivery.
      const applied=target&&sameOwner(originalOwner,ownerOf(target,receipt.mode))&&applyRight(next,target,receipt.mode,right);
      next.helpLedger.rights[right.id]=right;
      if(!applied)next.reservedRewards.push(receipt);
      next.receipts.push(receipt.id);return {value:'applied' as const,event:{kind:'state' as const,helpFacts:[fact(applied?'grant':'reserve',right)]}};
    }, true);
    if (!result) throw Error('Reward not committed');
    return result;
  }
  public helpOffer(expected:string,placement:'hint'|'lives'='hint',visible?:ReadonlySet<string>):HelpOffer|null{
    const target=this.findAttempt(expected);return target?makeOffer(this.state,target.saved,target.mode,placement,visible):null;
  }
  public currentHelp(expected:string):HelpRight|null{return activeRight(this.state,expected);}
  public savedHelp(expected:string):HelpRight|null{const target=this.findAttempt(expected);return target?compatibleReserve(this.state,target.saved,target.mode):null;}
  public prepareHelpRequest(offer:HelpOffer):Promise<HelpRequest|undefined>{
    return this.update(next=>{
      const target=this.findAttempt(offer.owner.attempt,next);if(!target||!sameOwner(offer.owner,ownerOf(target.saved,target.mode)))return null;
      const a=target.saved,current=makeOffer(next,a,target.mode,offer.kind==='lives'?'lives':'hint');
      if(!current||current.kind!==offer.kind||current.amount!==offer.amount||
        offer.plan&&JSON.stringify(offer.plan.basis)!==JSON.stringify(a.board))return null;
      if(offer.plan){if(offer.plan.kind==='route-v1')validatePlan(a.level,offer.plan);else predictHelp(new Board(a.level,a.board.id,a.board),offer.plan);}
      const requestId=crypto.randomUUID();
      const request:HelpRequest={...structuredClone(offer),schema:2,intentVersion:1,requestId,assignmentId:assignmentId(next.helpLedger,offer.variant),createdAt:this.now().getTime()};
      next.helpLedger.requests[requestId]=request;next.helpLedger.assignments[a.board.id]=offer.variant;
      deferAds(next.adCadence,next.wins.length+Object.keys(next.dailyWins).length);
      return {value:request,event:{kind:'state',helpFacts:[{id:`${requestId}-request`,phase:'request',entitlement:requestId,request:requestId,sourceAttempt:a.board.id,attempt:a.board.id,kind:offer.kind,variant:offer.variant,manual:0,native:0,bonus:0}]}};
    },true);
  }
  public claimHelp(expected:string,id:string):Promise<boolean|undefined>{
    return this.update(next=>{
      const target=this.findAttempt(expected,next),right=next.helpLedger.rights[id];
      if(!target||!right||right.status!=='reserved'||!applyRight(next,target.saved,target.mode,right,true))return null;
      right.claimId=crypto.randomUUID();next.reservedRewards=next.reservedRewards.filter(r=>r.id!==right.receiptId);
      return {value:true,event:{kind:'state',helpFacts:[fact('claim',right,expected)]}};
    },true);
  }
  /** Native .playtest UI is the only production caller; applies to future attempts. */
  public setNextHelpVariant(value:HelpVariant):Promise<boolean|undefined>{
    if(!['legacy','single-v2','cascade-v1','route-v1'].includes(value))return Promise.resolve(undefined);
    return this.update(next=>{
      for(const a of [next.campaign,...Object.values(next.daily)])next.helpLedger.assignments[a.board.id]??=next.helpLedger.nextVariant;
      next.helpLedger.nextVariant=value;return {value:true};
    },true);
  }
  public setHelpCandidateEnabled(enabled:boolean):Promise<boolean|undefined>{return this.update(next=>{next.helpLedger.candidateEnabled=enabled;return {value:true};},true);}
  public enrollHelp(expected:string,qa:boolean):Promise<boolean|undefined>{return this.update(next=>{
    const target=this.findAttempt(expected,next);if(!target)return null;
    const ledger=next.helpLedger,variant=ledger.assignments[expected]??ledger.nextVariant,id=assignmentId(ledger,variant);
    if(ledger.enrollments[id])return null;ledger.assignments[expected]=variant;ledger.enrollments[id]={variant,qa,at:this.now().getTime()};
    return {value:true,event:{kind:'state',helpFacts:[{id,phase:'assignment',entitlement:'',request:'',sourceAttempt:expected,attempt:expected,kind:'none',variant,manual:0,native:0,bonus:0}]}};
  },true);}
  public recordHelpExit(expected:string):Promise<boolean|undefined>{return this.update(next=>{
    const target=this.findAttempt(expected,next);if(!target)return null;const facts=continueFacts(next.helpLedger,target.saved,'exit');if(!facts.length)return null;
    return {value:true,event:{kind:'state',continueFacts:facts}};
  });}
  public flush(): Promise<unknown> { return this.tail; }
  public destroy(): void { this.alive = false; this.loadEpoch++; this.listeners.clear(); }
}
