import {it,expect,vi} from 'vitest';
import {createAds,parseReceipt,type AdsBridge,type AdEvent,type RewardedReadiness} from '../../src/platform/ads';
import {validEvent} from '../../src/platform/analytics';
const ready:RewardedReadiness={configured:true,phase:'ready',ready:true,preloadId:'p',loadedAt:1,expiresInMs:300000,retryInMs:0,playtest:true};
const tick=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
it('does not preload at construction; coalesces demand, rejects stale status, expires readiness without gameplay blockers',async()=>{
  vi.useFakeTimers();let event!:(e:AdEvent)=>void,resolve!:(v:{rewardedState:RewardedReadiness})=>void;
  const prepare=vi.fn(async()=>ready),block=vi.fn();
  const bridge:AdsBridge={prepareRewarded:prepare,status:()=>new Promise(r=>resolve=r),prepareInterstitial:async()=>{},show:async()=>({shown:false,outcome:'unavailable'}),pending:async()=>({receipts:[]}),acknowledge:async()=>{},cancelPending:async()=>{},addListener:async(_,f)=>{event=f;return{remove:async()=>{}};}};
  const ads=createAds({setBlocked:block,isBlocked:()=>false},{track:vi.fn()},bridge);await tick();expect(prepare).not.toHaveBeenCalled();
  ads.setRewardedDemand(true);ads.setRewardedDemand(true);await tick();expect(prepare).toHaveBeenCalledTimes(1);
  event({kind:'rewarded',phase:'preload_ready',readiness:ready});resolve({rewardedState:{...ready,phase:'loading',ready:false}});await tick();expect(ads.rewardedState.ready).toBe(true);
  await vi.advanceTimersByTimeAsync(300001);expect(ads.rewardedState.phase).toBe('expired');expect(prepare).toHaveBeenCalledTimes(1);expect(block).not.toHaveBeenCalled();ads.destroy();vi.useRealTimers();
});
it('preserves new receipt version and impression value/precision, deduplicates only once',async()=>{
  let event!:(e:AdEvent)=>void;const calls:{event:string;params:Record<string,unknown>}[]=[];
  const ads=createAds({setBlocked:()=>{},isBlocked:()=>false},{track:(event,params)=>{expect(validEvent(event,params)).toBe(true);calls.push({event,params});}},{prepareInterstitial:async()=>{},show:async()=>({shown:false,outcome:'unavailable'}),pending:async()=>({receipts:[]}),acknowledge:async()=>{},cancelPending:async()=>{},addListener:async(_,f)=>{event=f;return{remove:async()=>{}};}});await tick();
  const e:AdEvent={kind:'rewarded',phase:'impression',requestId:'r',value:{known:true,amount:'0.001',currency:'RUB',precision:'estimated'}};event(e);event(e);
  expect(calls.filter(c=>c.event==='ad_impression_value')).toHaveLength(1);expect(calls.find(c=>c.event==='ad_impression_value')!.params).toMatchObject({amount:'0.001',currency:'RUB',precision:'estimated'});
  expect(parseReceipt({schema:2,id:'r',requestId:'r',intentVersion:1,attempt:'a',mode:'campaign',placement:'hint'}).schema).toBe(2);
  expect(()=>parseReceipt({schema:2,id:'r',attempt:'a',mode:'campaign',placement:'hint'})).toThrow();ads.destroy();
});
