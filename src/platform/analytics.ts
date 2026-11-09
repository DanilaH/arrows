import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AnalyticsParams } from '@danilah/mini-games-kit/platform';
import contract from './analytics-contract.json';

export type AnalyticsEvent = keyof typeof contract;
export interface AnalyticsBridge {
  report(options: { event: string; params: AnalyticsParams }): Promise<void | { accepted: boolean; disabled: boolean }>;
  flush?(): Promise<void>;
}
export function validEvent(event: string, params: AnalyticsParams): boolean {
  if (!Object.hasOwn(contract, event)) return false;
  const fields = contract[event as AnalyticsEvent] as Record<string, string>;
  return Object.keys(params).length === Object.keys(fields).length && Object.entries(fields).every(([key, type]) => {
    const value = params[key];
    return typeof value === type && (type !== 'number' || Number.isFinite(value)) &&
      (type !== 'string' || (value as string).length <= 160);
  });
}
export function createAnalytics(bridge?: AnalyticsBridge) {
  const native = bridge ?? (Capacitor.isNativePlatform() ? registerPlugin<AnalyticsBridge>('ArrowsAnalytics') : undefined);
  let disposed = false;
  let outstanding = 0;
  const counts = { accepted: 0, disabled: 0, failed: 0, dropped: 0 };
  let flushFlight: Promise<void> | undefined;
  return {
    // SDK acceptance is deliberately distinct from dashboard delivery.
    snapshot() { return { ...counts, outstanding }; },
    flush(): void { if (disposed || !native?.flush || flushFlight) return; flushFlight = native.flush().catch(() => undefined).finally(() => { flushFlight = undefined; }); },
    track(event: AnalyticsEvent, params: AnalyticsParams): void {
      if (disposed || !native) return;
      if (outstanding >= 32 || !validEvent(event, params)) { counts.dropped++; return; }
      outstanding += 1;
      try {
        void native.report({ event, params: { ...params } }).then(result => { if (result?.accepted) counts.accepted++; else if (result?.disabled) counts.disabled++; else if (result) counts.failed++; }).catch(() => { counts.failed++; }).finally(() => { outstanding -= 1; });
      } catch { outstanding -= 1; counts.failed++; }
    },
    destroy(): void { disposed = true; },
  };
}
