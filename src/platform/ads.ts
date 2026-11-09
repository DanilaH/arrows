import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { DurableReceiptQueue, type ReceiptCommitResult, type GameplayActivityCoordinator } from '@danilah/mini-games-kit/platform';
import type { createAnalytics } from './analytics';

export interface EarnedReceipt {
  id: string; schema: 1; attempt: string; mode: 'campaign' | 'daily'; placement: 'hint' | 'lives';
}
export interface AdRequest { kind: 'rewarded' | 'interstitial'; placement: 'hint' | 'lives' | 'continue'; attempt: string; mode: 'campaign' | 'daily'; }
export interface AdOutcome { shown: boolean; outcome: 'dismissed' | 'unavailable' | 'error' | 'cancelled'; earned?: boolean; requestId?: string; }
export interface AdEvent { kind: 'rewarded' | 'interstitial'; phase: string; requestId?: string; placement?: string; attempt?: string; mode?: string; }
export interface AdState { phase: 'idle' | 'loading' | 'invoked' | 'shown'; requestId?: string; kind?: AdRequest['kind']; }
export interface AdsBridge {
  prepareInterstitial(): Promise<void>;
  show(options: AdRequest & { requestId?: string }): Promise<AdOutcome>;
  pending(): Promise<{ receipts: unknown[] }>;
  acknowledge(options: { id: string }): Promise<void>;
  cancelPending(options?: { requestId: string }): Promise<void>;
  addListener(name: 'adEvent', listener: (event: AdEvent) => void): Promise<PluginListenerHandle>;
}
export function parseReceipt(value: unknown): EarnedReceipt {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid earned receipt');
  const r = value as Record<string, unknown>;
  if (r.schema !== 1 || typeof r.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(r.id) ||
      typeof r.attempt !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(r.attempt) ||
      (r.placement !== 'hint' && r.placement !== 'lives') || (r.mode !== 'campaign' && r.mode !== 'daily')) throw new Error('Invalid earned receipt');
  return { id: r.id, schema: 1, attempt: r.attempt, mode: r.mode, placement: r.placement };
}
const unavailable: AdOutcome = { shown: false, outcome: 'unavailable' };

/** Construct synchronously; optional native RPCs never gate first paint. Browser never earns fake rewards. */
export function createAds(
  activity: Pick<GameplayActivityCoordinator, 'setBlocked' | 'isBlocked'>,
  analytics: Pick<ReturnType<typeof createAnalytics>, 'track'>,
  bridge?: AdsBridge,
) {
  const native = bridge ?? (Capacitor.isNativePlatform() ? registerPlugin<AdsBridge>('ArrowsAds') : undefined);
  let alive = true, showing = false, retryMs = 1000;
  let state: AdState = { phase: 'idle' }, recoveryWait: Promise<void> | undefined, cancelFlight: Promise<void> | undefined;
  const observers = new Set<(state: Readonly<AdState>) => void>(), acknowledgements = new Map<string, Promise<void>>();
  const update = (next: AdState): void => { state = Object.freeze(next); if (alive) for (const listener of observers) { try { listener(state); } catch { analytics.track('runtime_error', { operation: 'ad_ui', reason: 'observer_failed' }); } } };
  const deadlineCancels = new Set<() => void>();
  const bounded = <T>(task: Promise<T>, label: string): Promise<T> => new Promise((resolve, reject) => {
    const cancel = (): void => { clearTimeout(timer); deadlineCancels.delete(cancel); reject(Error('Service deadline')); };
    const timer = setTimeout(() => { if (alive) analytics.track('runtime_error', { operation: label, reason: 'service_timeout' }); cancel(); }, 2000);
    deadlineCancels.add(cancel);
    void task.then(resolve, reject).finally(() => { clearTimeout(timer); deadlineCancels.delete(cancel); });
  });
  let prepareFlight: Promise<void> | undefined, prepareWait: Promise<void> | undefined, recoveryFlight: Promise<void> | undefined;
  let receiptQueue: DurableReceiptQueue<EarnedReceipt> | undefined;
  let listener: PluginListenerHandle | undefined, retry: ReturnType<typeof setTimeout> | undefined;
  const schedule = (): void => {
    if (!alive || !receiptQueue || !native || retry !== undefined) return;
    retry = setTimeout(() => { retry = undefined; void recover(); }, retryMs);
    retryMs = Math.min(30000, retryMs * 2);
  };
  const recover = (): Promise<void> => {
    if (!alive || !native || !receiptQueue) return Promise.resolve();
    if (recoveryFlight) return recoveryWait ?? Promise.resolve();
    const queue = receiptQueue;
    recoveryFlight = (async () => {
      try {
        const result = await native.pending();
        for (const row of result.receipts) {
          if (!alive) return;
          try { await queue.deliver(parseReceipt(row)); }
          catch { if (alive) analytics.track('runtime_error', { operation: 'receipt_recovery', reason: 'service_unavailable' }); }
        }
        retryMs = 30000;
      } catch { if (alive) analytics.track('runtime_error', { operation: 'receipt_recovery', reason: 'service_unavailable' }); }
      finally { recoveryFlight = undefined; schedule(); }
    })();
    recoveryWait = bounded(recoveryFlight, 'receipt_recovery').catch(() => undefined);
    return recoveryWait;
  };
  if (native) void native.addListener('adEvent', (event) => {
    if (!alive) return;
    analytics.track('ad_event', { format: event.kind, phase: event.phase, request_id: event.requestId ?? '', placement: event.placement ?? 'continue', attempt: event.attempt ?? '', mode: event.mode ?? '' });
    if (showing && event.requestId === state.requestId && ['invoke', 'show'].includes(event.phase)) update({ ...state, phase: event.phase === 'show' ? 'shown' : 'invoked' });
    if (event.phase === 'earned' || event.phase === 'receipt_pending' || event.phase === 'dismiss') void recover();
  }).then((handle) => {
    if (!alive) void handle.remove().catch(() => undefined);
    else listener = handle;
  }).catch(() => undefined);
  return {
    get state(): Readonly<AdState> { return state; },
    subscribe(listener: (state: Readonly<AdState>) => void): () => void { observers.add(listener); listener(state); return () => observers.delete(listener); },
    cancel(): void {
      if (!native || !alive || state.phase !== 'loading' || !state.requestId || cancelFlight) return;
      cancelFlight = native.cancelPending({ requestId: state.requestId }).catch(() => undefined).finally(() => { cancelFlight = undefined; });
    },
    // Game code must atomically persist effect+dedup through its coordinated authoritative writer.
    installRewardCommit(commit: (receipt: EarnedReceipt) => Promise<ReceiptCommitResult>): void {
      if (receiptQueue) throw new Error('Reward writer already installed');
      receiptQueue = new DurableReceiptQueue({
        commit: async (receipt) => {
          if (!alive) throw new Error('Disposed reward receiver');
          return commit(receipt);
        },
        acknowledge: async (id) => {
          if (!alive || !native) throw Error('Disposed acknowledgement');
          let flight = acknowledgements.get(id);
          if (!flight) {
            if (acknowledgements.size >= 4) throw Error('Acknowledgement budget');
            flight = native.acknowledge({ id }); acknowledgements.set(id, flight);
            void flight.finally(() => acknowledgements.delete(id)).catch(() => undefined);
          }
          await bounded(flight, 'receipt_ack');
        },
      });
      void recover();
    },
    recover,
    prepareInterstitial(): Promise<void> {
      if (!alive || !native || showing) return Promise.resolve();
      if (prepareFlight) return prepareWait ?? Promise.resolve();
      prepareFlight = native.prepareInterstitial().catch(() => undefined).finally(() => { prepareFlight = undefined; });
      prepareWait = bounded(prepareFlight, 'ad_preload').catch(() => undefined); return prepareWait;
    },
    async show(request: AdRequest): Promise<AdOutcome> {
      if (!alive || !native || showing || activity.isBlocked() || (request.kind === 'rewarded' && !receiptQueue)) return unavailable;
      const requestId = crypto.randomUUID();
      showing = true; activity.setBlocked('ad', true); update({ phase: 'loading', requestId, kind: request.kind });
      try {
        const result = await native.show({ ...request, requestId });
        analytics.track('ad_result', { format: request.kind, placement: request.placement, attempt: request.attempt, mode: request.mode, request_id: requestId, shown: result.shown, outcome: result.outcome, earned: result.earned === true });
        return { ...result, requestId };
      }
      catch { analytics.track('ad_result', { format: request.kind, placement: request.placement, attempt: request.attempt, mode: request.mode, request_id: requestId, shown: false, outcome: 'error', earned: false }); return { shown: false, outcome: 'error', requestId }; }
      finally { showing = false; update({ phase: 'idle' }); activity.setBlocked('ad', false); if (alive) void recover(); }
    },
    destroy(): void {
      if (!alive) return;
      alive = false;
      if (retry !== undefined) clearTimeout(retry);
      observers.clear();
      for (const cancel of [...deadlineCancels]) cancel();
      void listener?.remove().catch(() => undefined);
      void native?.cancelPending(state.requestId ? { requestId: state.requestId } : undefined).catch(() => undefined);
    },
  };
}
