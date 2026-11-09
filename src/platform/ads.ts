import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { DurableReceiptQueue, type ReceiptCommitResult, type GameplayActivityCoordinator } from '@danilah/mini-games-kit/platform';
import type { createAnalytics } from './analytics';

export interface EarnedReceipt {
  id: string; schema: 1; attempt: string; mode: 'campaign' | 'daily'; placement: 'hint' | 'lives';
}
export interface AdRequest { kind: 'rewarded' | 'interstitial'; placement: 'hint' | 'lives' | 'continue'; attempt: string; mode: 'campaign' | 'daily'; }
export interface AdOutcome { shown: boolean; outcome: 'dismissed' | 'unavailable' | 'error' | 'cancelled'; }
export interface AdEvent { kind: 'rewarded' | 'interstitial'; phase: string; }
export interface AdsBridge {
  prepareInterstitial(): Promise<void>;
  show(options: AdRequest): Promise<AdOutcome>;
  pending(): Promise<{ receipts: unknown[] }>;
  acknowledge(options: { id: string }): Promise<void>;
  cancelPending(): Promise<void>;
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
  let prepareFlight: Promise<void> | undefined, recoveryFlight: Promise<void> | undefined;
  let receiptQueue: DurableReceiptQueue<EarnedReceipt> | undefined;
  let listener: PluginListenerHandle | undefined, retry: ReturnType<typeof setTimeout> | undefined;
  const schedule = (): void => {
    if (!alive || !receiptQueue || !native || retry !== undefined) return;
    retry = setTimeout(() => { retry = undefined; void recover(); }, retryMs);
    retryMs = Math.min(30000, retryMs * 2);
  };
  const recover = (): Promise<void> => {
    if (!alive || !native || !receiptQueue) return Promise.resolve();
    if (recoveryFlight) return recoveryFlight;
    const queue = receiptQueue;
    recoveryFlight = (async () => {
      try {
        const result = await native.pending();
        for (const row of result.receipts) {
          if (!alive) return;
          await queue.deliver(parseReceipt(row));
        }
        retryMs = 30000;
      } catch { if (alive) analytics.track('runtime_error', { operation: 'receipt_recovery', reason: 'service_unavailable' }); }
      finally { recoveryFlight = undefined; schedule(); }
    })();
    return recoveryFlight;
  };
  if (native) void native.addListener('adEvent', (event) => {
    if (!alive) return;
    analytics.track('ad_event', { format: event.kind, phase: event.phase });
    if (event.phase === 'earned' || event.phase === 'receipt_pending' || event.phase === 'dismiss') void recover();
  }).then((handle) => {
    if (!alive) void handle.remove().catch(() => undefined);
    else listener = handle;
  }).catch(() => undefined);
  return {
    // Game code must atomically persist effect+dedup through its coordinated authoritative writer.
    installRewardCommit(commit: (receipt: EarnedReceipt) => Promise<ReceiptCommitResult>): void {
      if (receiptQueue) throw new Error('Reward writer already installed');
      receiptQueue = new DurableReceiptQueue({
        commit: async (receipt) => {
          if (!alive) throw new Error('Disposed reward receiver');
          return commit(receipt);
        },
        acknowledge: async (id) => { if (alive) await native?.acknowledge({ id }); },
      });
      void recover();
    },
    recover,
    prepareInterstitial(): Promise<void> {
      if (!alive || !native || showing) return Promise.resolve();
      if (prepareFlight) return prepareFlight;
      prepareFlight = native.prepareInterstitial().catch(() => undefined).finally(() => { prepareFlight = undefined; });
      return prepareFlight;
    },
    async show(request: AdRequest): Promise<AdOutcome> {
      if (!alive || !native || showing || activity.isBlocked() || (request.kind === 'rewarded' && !receiptQueue)) return unavailable;
      showing = true; activity.setBlocked('ad', true);
      try { return await native.show({ ...request }); }
      catch { return { shown: false, outcome: 'error' }; }
      finally { showing = false; activity.setBlocked('ad', false); if (alive) void recover(); }
    },
    destroy(): void {
      if (!alive) return;
      alive = false;
      if (retry !== undefined) clearTimeout(retry);
      void listener?.remove().catch(() => undefined);
      void native?.cancelPending().catch(() => undefined);
    },
  };
}
