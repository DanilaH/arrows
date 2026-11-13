import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { DurableReceiptQueue, type ReceiptCommitResult, type GameplayActivityCoordinator } from '@danilah/mini-games-kit/platform';
import type { createAnalytics } from './analytics';

export type EarnedReceipt = {
  id: string; attempt: string; mode: 'campaign' | 'daily'; placement: 'hint' | 'lives';
} & ({schema:1}|{schema:2;intentVersion:1;requestId:string});
export interface AdContext {assignmentId:string;variant:string;experimentId:string;installId:string;qa:boolean;}
export interface AdRequest { kind: 'rewarded' | 'interstitial'; placement: 'hint' | 'lives' | 'continue'; attempt: string; mode: 'campaign' | 'daily'; requestId?: string; intentVersion?: 1; context?:AdContext; }
export interface AdOutcome { shown: boolean; outcome: 'dismissed' | 'unavailable' | 'error' | 'cancelled'; earned?: boolean; requestId?: string; }
export interface RewardedReadiness {configured:boolean;phase:'disabled'|'initializing'|'idle'|'loading'|'ready'|'showing'|'backoff'|'expired'|'unavailable';ready:boolean;preloadId:string;loadedAt:number;expiresInMs:number;retryInMs:number;playtest:boolean;}
export interface AdEvent { kind: 'rewarded' | 'interstitial'; phase: string; requestId?: string; placement?: string; attempt?: string; mode?: string; readiness?:RewardedReadiness;preloadId?:string;elapsedMs?:number;value?:{known:boolean;amount:string;currency:string;precision:string}; }
export interface AdState { phase: 'idle' | 'loading' | 'invoked' | 'shown'; requestId?: string; kind?: AdRequest['kind']; }
export interface AdsBridge {
  prepareInterstitial(): Promise<void>;
  prepareRewarded?(options:{active:boolean}):Promise<RewardedReadiness|void>;
  status?():Promise<{rewardedState?:RewardedReadiness}>;
  show(options: AdRequest & { requestId?: string }): Promise<AdOutcome>;
  pending(): Promise<{ receipts: unknown[] }>;
  acknowledge(options: { id: string }): Promise<void>;
  cancelPending(options?: { requestId: string }): Promise<void>;
  addListener(name: 'adEvent', listener: (event: AdEvent) => void): Promise<PluginListenerHandle>;
}
export function parseReceipt(value: unknown): EarnedReceipt {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid earned receipt');
  const r = value as Record<string, unknown>;
  if ((r.schema !== 1 && r.schema !== 2) || typeof r.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(r.id) ||
      typeof r.attempt !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(r.attempt) ||
      (r.placement !== 'hint' && r.placement !== 'lives') || (r.mode !== 'campaign' && r.mode !== 'daily')) throw new Error('Invalid earned receipt');
  if(r.schema===2&&(r.intentVersion!==1||r.requestId!==r.id))throw Error('Invalid earned intent');
  const base={id:r.id,attempt:r.attempt,mode:r.mode,placement:r.placement} as const;
  return r.schema===1?{...base,schema:1}:{...base,schema:2,intentVersion:1,requestId:r.id};
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
  let demand=false,demandSent=false,readinessEpoch=0,readinessAt=performance.now(),demandFlight:Promise<RewardedReadiness|void>|undefined;
  let readiness:RewardedReadiness={configured:false,phase:'unavailable',ready:false,preloadId:'',loadedAt:0,expiresInMs:0,retryInMs:0,playtest:false};
  const readinessObservers=new Set<()=>void>(),seenImpressions=new Set<string>();
  // Expiry removes only the stale prohibition. No ready object or retry is invented.
  const currentReadiness=():Readonly<RewardedReadiness>=>{
    const elapsed=Math.max(0,performance.now()-readinessAt);
    const phase=readiness.ready&&elapsed>=readiness.expiresInMs?'expired':readiness.phase==='backoff'&&elapsed>=readiness.retryInMs?'idle':readiness.phase;
    return {...readiness,phase,ready:phase==='ready'&&readiness.ready,expiresInMs:Math.max(0,readiness.expiresInMs-elapsed),retryInMs:Math.max(0,readiness.retryInMs-elapsed)};
  };
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
  const updateReadiness=(value:RewardedReadiness|undefined):void=>{
    if(!alive||!value||typeof value.configured!=='boolean'||!['disabled','initializing','idle','loading','ready','showing','backoff','expired','unavailable'].includes(value.phase))return;
    const ready=value.phase==='ready'&&value.ready===true&&Number.isFinite(value.expiresInMs)&&value.expiresInMs>0;
    readiness={configured:value.configured,phase:value.phase==='ready'&&!ready?'expired':value.phase,ready,preloadId:typeof value.preloadId==='string'?value.preloadId:'',loadedAt:Number.isFinite(value.loadedAt)?value.loadedAt:0,expiresInMs:Math.max(0,value.expiresInMs||0),retryInMs:Math.max(0,value.retryInMs||0),playtest:value.playtest===true};
    readinessAt=performance.now();readinessEpoch++;for(const observer of readinessObservers)observer();
  };
  const refreshReadiness=async():Promise<void>=>{if(!native?.status||!alive)return;const epoch=readinessEpoch;try{const result=await bounded(native.status(),'rewarded_status');if(epoch===readinessEpoch)updateReadiness(result.rewardedState);}catch{/* Optional service never gates paint or input. */}};
  const sendDemand=():void=>{
    if(!alive||!native?.prepareRewarded||demandFlight)return;
    demandSent=demand;const sent=demandSent,epoch=readinessEpoch;
    demandFlight=native.prepareRewarded({active:sent});
    void bounded(demandFlight,'rewarded_preload').then(value=>{if(epoch===readinessEpoch&&value)updateReadiness(value);},()=>undefined);
    void demandFlight.finally(()=>{demandFlight=undefined;if(alive&&demand!==sent)sendDemand();}).catch(()=>undefined);
  };
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
    if(event.readiness)updateReadiness(event.readiness);
    if(event.kind==='rewarded'&&!event.requestId&&['preload_start','preload_ready','preload_expired','load_timeout','load_error'].includes(event.phase))analytics.track('ad_preload',{preload_id:event.preloadId??'',phase:event.phase,elapsed_ms:event.elapsedMs??0,ready:event.readiness?.ready===true});
    analytics.track('ad_event', { format: event.kind, phase: event.phase, request_id: event.requestId ?? '', placement: event.placement ?? 'continue', attempt: event.attempt ?? '', mode: event.mode ?? '' });
    if(event.phase==='impression'&&event.requestId&&!seenImpressions.has(event.requestId)){
      if(seenImpressions.size>=32)seenImpressions.delete(seenImpressions.values().next().value!);seenImpressions.add(event.requestId);
      const value=event.value;analytics.track('ad_impression_value',{event_id:`${event.requestId}-impression`,request_id:event.requestId,format:event.kind,known:value?.known===true,amount:value?.known?value.amount:'',currency:value?.known?value.currency:'',precision:value?.precision??'unknown',source:'sdk-ilrd'});
    }
    if (showing && event.requestId === state.requestId && ['invoke', 'show'].includes(event.phase)) update({ ...state, phase: event.phase === 'show' ? 'shown' : 'invoked' });
    if (event.phase === 'earned' || event.phase === 'receipt_pending' || event.phase === 'dismiss') void recover();
  }).then((handle) => {
    if (!alive) void handle.remove().catch(() => undefined);
    else listener = handle;
  }).catch(() => undefined);
  void refreshReadiness();
  return {
    get state(): Readonly<AdState> { return state; },
    subscribe(listener: (state: Readonly<AdState>) => void): () => void { observers.add(listener); listener(state); return () => observers.delete(listener); },
    get rewardedState():Readonly<RewardedReadiness>{return currentReadiness();},
    subscribeRewarded(observer:()=>void):()=>void{readinessObservers.add(observer);return()=>readinessObservers.delete(observer);},
    setRewardedDemand(active:boolean):void{if(demand===active)return;demand=active;sendDemand();},
    refreshReadiness,
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
      const requestId = request.requestId ?? crypto.randomUUID();
      if(request.context){const c=request.context;analytics.track('ad_session',{request_id:requestId,format:request.kind,placement:request.placement,attempt:request.attempt,mode:request.mode,assignment_id:c.assignmentId,variant:c.variant,experiment_id:c.experimentId,install_id:c.installId,qa:c.qa,cache_state:currentReadiness().phase});}
      showing = true; activity.setBlocked('ad', true); update({ phase: 'loading', requestId, kind: request.kind });
      try {
        const result = await native.show({ ...request, requestId });
        analytics.track('ad_result', { format: request.kind, placement: request.placement, attempt: request.attempt, mode: request.mode, request_id: requestId, shown: result.shown, outcome: result.outcome, earned: result.earned === true });
        return { ...result, requestId };
      }
      catch { analytics.track('ad_result', { format: request.kind, placement: request.placement, attempt: request.attempt, mode: request.mode, request_id: requestId, shown: false, outcome: 'error', earned: false }); return { shown: false, outcome: 'error', requestId }; }
      finally { showing = false; update({ phase: 'idle' }); activity.setBlocked('ad', false); if (alive) {void recover();void refreshReadiness();} }
    },
    destroy(): void {
      if (!alive) return;
      alive = false;
      if (retry !== undefined) clearTimeout(retry);
      observers.clear();
      readinessObservers.clear();
      void native?.prepareRewarded?.({active:false}).catch(()=>undefined);
      for (const cancel of [...deadlineCancels]) cancel();
      void listener?.remove().catch(() => undefined);
      void native?.cancelPending(state.requestId ? { requestId: state.requestId } : undefined).catch(() => undefined);
    },
  };
}
