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
  const counts = { accepted: 0, disabled: 0, failed: 0, dropped: 0,unconfirmed:0,overflow:0,invalid:0,sync_failure:0,async_failure:0,native_rejected:0,flush_failure:0 };
  const transportId=crypto.randomUUID(),health={sent:0,accepted:0,disabled:0,failed:0,unconfirmed:0,deferred:0};
  let healthPending=false,healthFlight=false,healthAt=-Infinity,lastHealth='',boundary='flush';
  let flushFlight: Promise<void> | undefined;
  // One aggregate slot, at most once/minute while counts change. A failed health
  // event never schedules itself; no payloads or per-event delivery queue survive.
  const drainHealth=():void=>{
    if(disposed||!native||!healthPending||healthFlight||performance.now()-healthAt<60000)return;
    if(outstanding>=32)return;
    const signature=JSON.stringify([counts,health.failed,health.deferred,health.unconfirmed]);
    healthPending=false;if(signature===lastHealth)return;
    healthFlight=true;healthAt=performance.now();lastHealth=signature;health.sent++;outstanding++;
    const params={...counts,transport_id:transportId,sequence:health.sent,boundary,delivery:'sdk-acceptance-only',outstanding:outstanding-1,diagnostics_failed:health.failed,diagnostics_deferred:health.deferred};
    const failed=():void=>{health.failed++;};
    try{void native.report({event:'analytics_health',params}).then(r=>{if(r?.accepted)health.accepted++;else if(r?.disabled)health.disabled++;else if(r)failed();else health.unconfirmed++;},failed).finally(()=>{outstanding--;healthFlight=false;});}
    catch{outstanding--;healthFlight=false;failed();}
  };
  return {
    // SDK acceptance is deliberately distinct from dashboard delivery.
    snapshot() { return { ...counts, outstanding,transportId,health:{...health,pending:healthPending} }; },
    flush(reason='flush'): void {
      if(disposed||!native)return;
      boundary=['flush','background','interval','pagehide'].includes(reason)?reason:'flush';
      if(!healthPending&&outstanding>=32)health.deferred++;
      healthPending=true;drainHealth();
      if(!native.flush||flushFlight)return;
      try{flushFlight=native.flush().catch(()=>{counts.flush_failure++;}).finally(()=>{flushFlight=undefined;});}catch{counts.flush_failure++;}
    },
    track(event: AnalyticsEvent, params: AnalyticsParams): void {
      if (disposed || !native) return;
      if (!validEvent(event,params)) {counts.dropped++;counts.invalid++;return;}
      if (outstanding >= 32) { counts.dropped++;counts.overflow++;return; }
      outstanding += 1;
      try {
        void native.report({ event, params: { ...params } }).then(result => { if (result?.accepted) counts.accepted++; else if (result?.disabled) counts.disabled++; else if (result) {counts.failed++;counts.native_rejected++;}else counts.unconfirmed++; }).catch(() => { counts.failed++;counts.async_failure++; }).finally(() => { outstanding -= 1;drainHealth(); });
      } catch { outstanding -= 1; counts.failed++;counts.sync_failure++;drainHealth(); }
    },
    destroy(): void { disposed = true; },
  };
}
