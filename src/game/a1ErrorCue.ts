import type { StorageAdapter } from '@danilah/mini-games-kit/platform';
import type { Attempt, MoveResult } from '../domain/board';
import type { HelpOwner } from '../progression/helpLedger';
import { sameOwner } from '../progression/helpLedger';
import type { UiMotion } from './uiMotion';

export const A1_CUE_KEY = 'arrows.qa.a1-error-cue.v1';
export const A1_CUE_VERSION = 'a1-first-error-v1';
export type A1CueMode = 'off' | 'control' | 'cue';
export interface A1CueMoment {
  owner: HelpOwner; activeMs: number; board: string; errors: number;
  effect: 'single-v2'; source: 'advertisement'; readiness: 'ready';
  offerId: string; episodeId?: string;
}
interface Trace extends Omit<A1CueMoment, 'board' | 'errors'> {
  event: 'opportunity' | 'shown'; version: typeof A1_CUE_VERSION;
  mode: Exclude<A1CueMode, 'off'>; id: string; cancelled?: string;
}
interface Metadata { version: 1; next: A1CueMode; attempts: Record<string, A1CueMode>; trace: Trace[]; }
const isMode = (v: unknown): v is A1CueMode => v === 'off' || v === 'control' || v === 'cue';

/** Playtest-only, bounded local notes. Never writes the progression/earned ledger. */
export function createA1CueQA(storage: StorageAdapter, playtest: () => boolean) {
  let data: Metadata = { version: 1, next: 'off', attempts: {}, trace: [] };
  let read: Promise<void> | undefined, available = false, alive = true, tail = Promise.resolve();
  const load = (): Promise<void> => {
    if (!playtest()) return Promise.resolve();
    return read ??= storage.getItem(A1_CUE_KEY).then(raw => {
      if (!alive) return;
      if (raw !== null) {
        if (raw.length > 100000) throw Error('Oversized QA notes');
        const value = JSON.parse(raw) as Metadata;
        if (value.version !== 1 || !isMode(value.next) || !value.attempts || !Array.isArray(value.trace)) throw Error('Invalid QA notes');
        const entries = Object.entries(value.attempts);
        if (entries.some(([id, mode]) => !/^[\w-]{1,100}$/.test(id) || !isMode(mode))) throw Error('Invalid QA binding');
        data = { version: 1, next: value.next, attempts: Object.fromEntries(entries.slice(-64)), trace: value.trace.filter(t => t && t.owner && typeof t.owner.attempt === 'string' && t.version === A1_CUE_VERSION && (t.event === 'opportunity' || t.event === 'shown')).slice(-128) };
      }
      available = true;
    }).catch(() => { available = false; });
  };
  const save = (): Promise<void> => {
    const raw = JSON.stringify(data);
    tail = tail.then(() => storage.setItem(A1_CUE_KEY, raw)).catch(() => { available = false; });
    return tail;
  };
  const mode = (attempt: string): A1CueMode => playtest() && available ? data.attempts[attempt] ?? 'off' : 'off';
  return {
    load, mode,
    flush: (): Promise<void> => tail,
    get next(): A1CueMode { return playtest() && available ? data.next : 'off'; },
    bindNew(attempt: string, selected: A1CueMode): void {
      if (!playtest() || !available || !alive || data.attempts[attempt] !== undefined) return;
      data.attempts = Object.fromEntries([...Object.entries(data.attempts), [attempt, selected]].slice(-64));
      void save();
    },
    record(event: Trace['event'], moment: A1CueMoment, selected: Exclude<A1CueMode, 'off'>): void {
      if (!playtest() || !available || !alive) return;
      const { board: _board, errors: _errors, ...fields } = moment;
      data.trace.push({ ...fields, event, version: A1_CUE_VERSION, mode: selected, id: `${A1_CUE_VERSION}:${moment.owner.attempt}` });
      data.trace = data.trace.slice(-128); void save();
    },
    cancelled(attempt: string, reason: string): void {
      if (!playtest() || !available || !alive) return;
      const note = [...data.trace].reverse().find(t => t.owner.attempt === attempt && t.event === 'opportunity');
      if (note && !note.cancelled) { note.cancelled = reason; void save(); }
    },
    render(language: string, current: string): HTMLElement | null {
      if (!playtest()) return null;
      const ru = language === 'ru', box = document.createElement('div'), label = document.createElement('label'), select = document.createElement('select'), detail = document.createElement('p');
      label.className = 'language-setting'; label.htmlFor = select.id = 'a1-cue-qa-mode';
      label.textContent = ru ? 'A1 · акцент после ошибки' : 'A1 · first-error accent';
      for (const [value, name] of [['off', ru ? 'Выключен' : 'Off'], ['control', ru ? 'Контроль' : 'Control'], ['cue', ru ? 'Акцент' : 'Accent']]) {
        const option = document.createElement('option'); option.value = value!; option.textContent = name!; select.append(option);
      }
      const refresh = (): void => {
        select.value = data.next; select.disabled = !available;
        detail.textContent = ru ? `Текущая попытка: ${mode(current)}. Выбор — только после «Заново» или на новой попытке. Локальная QA-запись, без аналитики.` : `Current attempt: ${mode(current)}. Applies only after Restart or to a new attempt. Local QA notes; no analytics.`;
      };
      select.disabled = true; void load().then(refresh);
      select.addEventListener('change', () => { if (!available || !isMode(select.value)) return; data.next = select.value; select.disabled = true; void save().then(refresh); });
      label.append(select); box.append(label, detail); return box;
    },
    destroy(): void { alive = false; },
  };
}

/** One live accepted-error opportunity. No replay on hydration and no result authority. */
export function createA1ErrorCue(qa: ReturnType<typeof createA1CueQA>, motion: UiMotion, button: HTMLButtonElement, eligible: () => A1CueMoment | null, feedbackBusy: () => boolean) {
  let pending: { moment: A1CueMoment; mode: 'cue' } | null = null, stop: (() => void) | undefined;
  const seen = new Set<string>(); let epoch = 0;
  const cancel = (reason = 'cancelled', invalidateInput = true): void => {
    if (invalidateInput) epoch++;
    const previous = pending; pending = null; const end = stop; stop = undefined;
    if (previous) qa.cancelled(previous.moment.owner.attempt, reason);
    end?.();
  };
  const valid = (): boolean => {
    if (!pending) return false;
    const now = eligible(), before = pending.moment;
    if (!now || !sameOwner(now.owner, before.owner) || now.board !== before.board || now.offerId !== before.offerId) { cancel('eligibility-changed'); return false; }
    return true;
  };
  return {
    cancel,
    beforeMove(): { moment: A1CueMoment; epoch: number } | null {
      // In particular, do not sample a clock or inspect newly rendered UI here.
      const moment = eligible(); return moment ? { moment, epoch } : null;
    },
    accepted(input: { moment: A1CueMoment; epoch: number } | null, result: MoveResult | undefined): void {
      if (!input || input.epoch !== epoch) return;
      const before = input.moment;
      if ( result?.kind !== 'error' || !result.first || seen.has(before.owner.attempt)) return;
      const now = eligible(), selected = qa.mode(before.owner.attempt);
      if (selected === 'off' || !now || now.errors !== 1 || !sameOwner(before.owner, now.owner) || before.errors !== 0) return;
      const previous = JSON.parse(before.board) as Attempt, committed = JSON.parse(now.board) as Attempt;
      if (JSON.stringify(previous.removed) !== JSON.stringify(committed.removed) || committed.errors[0] !== result.arrow.id || committed.lives !== previous.lives - 1) return;
      seen.add(before.owner.attempt); if (seen.size > 64) seen.delete(seen.values().next().value!);
      qa.record('opportunity', now, selected);
      if (selected === 'cue') { pending = { moment: now, mode: selected }; this.refresh(); }
    },
    refresh(): void {
      if (!pending || !valid() || stop || feedbackBusy()) return;
      const current = pending;
      const end = motion.hintCue(button, valid, () => {
        if (pending === current) qa.record('shown', current.moment, current.mode);
      }, () => { if (pending === current) { pending = null; stop = undefined; } });
      if (pending === current) stop = end; else end();
    },
  };
}
