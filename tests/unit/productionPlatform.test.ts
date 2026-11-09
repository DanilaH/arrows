import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameplayActivityCoordinator } from '@danilah/mini-games-kit/platform';
import { createAds, parseReceipt, type AdsBridge, type AdEvent, type EarnedReceipt, type AdOutcome } from '../../src/platform/ads';
import { createAnalytics, validEvent } from '../../src/platform/analytics';
import { createStorage } from '../../src/platform/storage';

const receipt: EarnedReceipt = { schema: 1, id: 'earned-1', attempt: 'original-attempt', mode: 'daily', placement: 'lives' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function setup() {
  vi.useFakeTimers();
  const show = deferred<AdOutcome>();
  const registration = deferred<{ remove(): Promise<void> }>();
  let onEvent!: (event: AdEvent) => void;
  const bridge = {
    show: vi.fn(() => show.promise),
    prepareInterstitial: vi.fn(async () => undefined),
    pending: vi.fn(async () => ({ receipts: [] as unknown[] })),
    acknowledge: vi.fn(async (_options: { id: string }): Promise<void> => undefined),
    cancelPending: vi.fn(async () => undefined),
    addListener: vi.fn((_name, listener) => { onEvent = listener; return registration.promise; }),
  } satisfies AdsBridge;
  const activity = new GameplayActivityCoordinator(vi.fn(), vi.fn());
  const track = vi.fn();
  const ads = createAds(activity, { track }, bridge);
  return { bridge, activity, track, ads, show, registration, event: (event: AdEvent) => onEvent(event) };
}
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('earned receipt and native service boundaries', () => {
  it('preserves original attempt/mode and rejects foreign or malformed reward payloads', () => {
    expect(parseReceipt(receipt)).toEqual(receipt);
    for (const wrong of [null, {}, { ...receipt, schema: 2 }, { ...receipt, attempt: '' }, { ...receipt, placement: 'coins' }, { ...receipt, mode: 'current' }]) {
      expect(() => parseReceipt(wrong)).toThrow();
    }
  });
  it('requires a durable game writer before offering rewarded ads', async () => {
    const s = setup();
    expect(await s.ads.show({ kind: 'rewarded', placement: 'lives', attempt: 'a', mode: 'campaign' })).toEqual({ shown: false, outcome: 'unavailable' });
    expect(s.bridge.show).not.toHaveBeenCalled();
    s.ads.destroy();
  });
  it('retains background blocking after SDK dismissal and excludes a concurrent show', async () => {
    const s = setup();
    const request = { kind: 'interstitial', placement: 'continue', attempt: 'a', mode: 'campaign' } as const;
    const pending = s.ads.show(request);
    expect(s.activity.getBlockReasons()).toEqual(['ad']);
    expect((await s.ads.show(request)).outcome).toBe('unavailable');
    s.activity.setBlocked('native-background', true);
    s.show.resolve({ shown: true, outcome: 'dismissed' });
    await pending;
    expect(s.activity.getBlockReasons()).toEqual(['native-background']);
    expect(s.bridge.show).toHaveBeenCalledOnce();
    s.ads.destroy();
  });
  it('does not acknowledge a failed durable reward commit or freeze normal gameplay', async () => {
    const s = setup();
    s.bridge.pending.mockResolvedValue({ receipts: [receipt] });
    s.ads.installRewardCommit(async () => { throw new Error('Disk unavailable'); });
    await s.ads.recover();
    expect(s.bridge.acknowledge).not.toHaveBeenCalled();
    expect(s.activity.isBlocked()).toBe(false);
    expect(s.track).toHaveBeenCalledWith('runtime_error', { operation: 'receipt_recovery', reason: 'service_unavailable' });
    s.ads.destroy();
  });
  it('retries exact acknowledgement after a committed reward without applying it twice', async () => {
    const s = setup();
    let grants = 0;
    const applied = new Set<string>();
    const order: string[] = [];
    s.bridge.pending.mockResolvedValue({ receipts: [receipt] });
    s.bridge.acknowledge.mockImplementationOnce(async () => { order.push('ack-failed'); throw new Error('Bridge lost'); });
    s.bridge.acknowledge.mockImplementation(async ({ id }) => { order.push('ack:' + id); });
    s.ads.installRewardCommit(async (r) => {
      if (applied.has(r.id)) { order.push('dedup'); return 'already-applied'; }
      expect(r.attempt).toBe('original-attempt');
      applied.add(r.id); grants += 1; order.push('durable-commit'); return 'applied';
    });
    await s.ads.recover();
    await s.ads.recover();
    expect(grants).toBe(1);
    expect(order).toEqual(['durable-commit', 'ack-failed', 'dedup', 'ack:earned-1']);
    s.ads.destroy();
  });
  it('bounds outstanding recovery calls when pending never settles, and ignores a late result after disposal', async () => {
    const s = setup();
    const query = deferred<{ receipts: unknown[] }>();
    s.bridge.pending.mockReturnValue(query.promise);
    const commit = vi.fn(async () => 'applied' as const);
    s.ads.installRewardCommit(commit);
    for (let i = 0; i < 20; i++) { void s.ads.recover(); s.event({ kind: 'rewarded', phase: 'earned' }); }
    expect(s.bridge.pending).toHaveBeenCalledOnce();
    expect(s.activity.isBlocked()).toBe(false);
    s.ads.destroy();
    query.resolve({ receipts: [receipt] });
    await s.ads.recover();
    await Promise.resolve();
    expect(commit).not.toHaveBeenCalled();
    expect(s.bridge.acknowledge).not.toHaveBeenCalled();
  });
  it('removes a late listener handle and never treats dismissal as earned', async () => {
    const s = setup();
    const remove = vi.fn(async () => undefined);
    s.ads.destroy();
    s.registration.resolve({ remove });
    await Promise.resolve();
    s.event({ kind: 'rewarded', phase: 'dismiss' });
    expect(remove).toHaveBeenCalledOnce();
    expect(s.bridge.pending).not.toHaveBeenCalled();
    expect(s.track).not.toHaveBeenCalled();
  });
});

describe('analytics and native storage', () => {
  it('distinguishes SDK acceptance from disabled or failed transport without claiming delivery', async () => {
    const report = vi.fn().mockResolvedValueOnce({ accepted: true, disabled: false }).mockResolvedValueOnce({ accepted: false, disabled: true }).mockRejectedValueOnce(Error('SDK error'));
    const analytics = createAnalytics({ report });
    for (let i = 0; i < 3; i++) analytics.track('app_ready', { language: 'ru' });
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(analytics.snapshot()).toMatchObject({ accepted: 1, disabled: 1, failed: 1, outstanding: 0 }); analytics.destroy();
  });
  it('rejects event/parameter drift, oversized strings, non-finite numbers and raw save fields', () => {
    expect(validEvent('app_ready', { language: 'ru' })).toBe(true);
    expect(validEvent('app_ready', { language: 'ru', save: '{}' })).toBe(false);
    expect(validEvent('app_ready', { language: true })).toBe(false);
    expect(validEvent('app_ready', { language: 'a'.repeat(161) })).toBe(false);
    expect(validEvent('missing_event', {})).toBe(false);
    expect(validEvent('level_complete', { mode: 'daily', level_id: '1', attempt: 'a', active_ms: Infinity, mistakes: 0, first_clear: true })).toBe(false);
  });
  it('caps unresolved telemetry and consumes errors without blocking callers', async () => {
    const deferredReport = deferred<void>();
    const report = vi.fn(() => deferredReport.promise);
    const analytics = createAnalytics({ report });
    for (let i = 0; i < 100; i++) analytics.track('app_ready', { language: 'ru' });
    expect(report).toHaveBeenCalledTimes(32);
    deferredReport.resolve();
    await deferredReport.promise;
    await Promise.resolve(); await Promise.resolve();
    report.mockImplementationOnce(async () => { throw new Error('No telemetry'); });
    analytics.track('app_ready', { language: 'en' });
    await Promise.resolve();
    analytics.destroy();
    analytics.track('app_ready', { language: 'ru' });
    expect(report).toHaveBeenCalledTimes(33);
  });
  it('propagates native disk errors instead of falling back to a fresh fake save', async () => {
    const get = vi.fn(async () => ({ value: '{"revision":4}' }));
    const set = vi.fn(async () => { throw new Error('Write failed'); });
    const storage = createStorage({ get, set, remove: vi.fn(async () => undefined) });
    expect(await storage.getItem('campaign')).toBe('{"revision":4}');
    await expect(storage.setItem('campaign', '{"revision":5}')).rejects.toThrow('Write failed');
    expect(await storage.getItem('campaign')).toBe('{"revision":4}');
  });
});

describe('late and unavailable advertising services', () => {
  it('processes a receipt arriving after the observation deadline without issuing a second pending RPC', async () => {
    const s = setup(), query = deferred<{ receipts: unknown[] }>(), commit = vi.fn(async () => 'applied' as const);
    s.bridge.pending.mockReturnValue(query.promise); s.ads.installRewardCommit(commit);
    await vi.advanceTimersByTimeAsync(2100); await s.ads.recover(); expect(s.bridge.pending).toHaveBeenCalledOnce();
    expect(s.activity.isBlocked()).toBe(false); query.resolve({ receipts: [receipt] });
    for (let i = 0; i < 15; i++) await Promise.resolve();
    expect(commit).toHaveBeenCalledOnce(); expect(s.bridge.acknowledge).toHaveBeenCalledWith({ id: receipt.id }); s.ads.destroy();
  });
  it('continues to commit later receipts when one acknowledgement never returns, keeping one RPC per id', async () => {
    const s = setup(), ack = deferred<void>(), applied = new Set<string>();
    const second = { ...receipt, id: 'earned-2' };
    s.bridge.pending.mockResolvedValue({ receipts: [receipt, second] }); s.bridge.acknowledge.mockImplementation(({ id }) => id === receipt.id ? ack.promise : Promise.resolve());
    s.ads.installRewardCommit(async r => { const duplicate = applied.has(r.id); applied.add(r.id); return duplicate ? 'already-applied' : 'applied'; });
    await vi.advanceTimersByTimeAsync(2200); expect([...applied]).toEqual([receipt.id, second.id]);
    void s.ads.recover(); await vi.advanceTimersByTimeAsync(2200);
    expect(s.bridge.acknowledge.mock.calls.filter(([r]) => r.id === receipt.id)).toHaveLength(1); expect(applied.size).toBe(2); expect(s.activity.isBlocked()).toBe(false); s.ads.destroy();
  });
  it('scopes loading cancellation and ignores stale show callbacks from another request', async () => {
    const s = setup(); const pending = s.ads.show({ kind: 'interstitial', placement: 'continue', attempt: 'a', mode: 'campaign' });
    const requestId = s.ads.state.requestId!;
    s.event({ kind: 'interstitial', phase: 'invoke', requestId: 'old-request' }); expect(s.ads.state.phase).toBe('loading');
    s.ads.cancel(); expect(s.bridge.cancelPending).toHaveBeenCalledWith({ requestId }); await Promise.resolve(); await Promise.resolve();
    s.event({ kind: 'interstitial', phase: 'invoke', requestId }); expect(s.ads.state.phase).toBe('invoked');
    s.ads.cancel(); expect(s.bridge.cancelPending).toHaveBeenCalledOnce();
    s.show.resolve({ shown: true, outcome: 'dismissed' }); await pending; expect(s.ads.state.phase).toBe('idle'); s.ads.destroy();
  });
});
