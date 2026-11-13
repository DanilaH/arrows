import {it,expect,vi} from 'vitest';
import {createAnalytics,validEvent} from '../../src/platform/analytics';
import {createAds,type AdEvent,type RewardedReadiness} from '../../src/platform/ads';
import {ProgressStore,freshSave,freshAttempt,SAVE_KEY,decodeSave,type SaveChange} from '../../src/progression/save';
import {campaign} from '../../src/content/campaign';
import {Board,canExit} from '../../src/domain/board';
import {createHelpOffers} from '../../src/game/helpOffers';
// @ts-expect-error Executable offline export reader.
import {revenueCohorts,exportEnvironment} from '../../tools/assistance-revenue.mjs';
const tick=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
function seed(index=39,variant='single-v2'){
 const s=freshSave();s.index=index;s.wins=campaign.slice(0,index).map((l,i)=>({attempt:`before-${i}`,levelId:l.id,completedAt:1000+i,activeMs:1000,mistakes:0}));s.campaign=freshAttempt(campaign[index]!);const b=new Board(s.campaign.level,s.campaign.board.id);if(index===39)for(let i=0;i<21;i++)b.activate(`c40-${i}`);s.campaign.board=b.snapshot();s.campaign.started=true;s.helpLedger.assignments[b.attemptId]=variant as 'single-v2';return s;
}
async function setup(index=39,variant='single-v2'){
 const rows=new Map([[SAVE_KEY,JSON.stringify(decodeSave(seed(index,variant)))]]);let fail=false;
 const storage={async getItem(k:string){return rows.get(k)??null;},async setItem(k:string,v:string){if(fail)throw Error('disk full');rows.set(k,v);},async removeItem(){throw Error('No destructive recovery');}};
 const store=new ProgressStore(storage);await store.load();const events:SaveChange[]=[];store.subscribe(e=>events.push(e));
 const earn=async()=>{const request=(await store.prepareHelpRequest(store.helpOffer(store.board.attemptId)!))!;await store.commitReward({schema:2,intentVersion:1,id:request.requestId,requestId:request.requestId,attempt:request.owner.attempt,mode:'campaign',placement:'hint'});return request.requestId;};
 return{store,rows,storage,events,earn,fail(v:boolean){fail=v;}};
}
it('F1 retains only a captured source episode across a dialog and deduplicates confirmed choice',async()=>{
 const{store}=await setup();const calls:unknown[]=[];const offers=createHelpOffers(store,{rewardedState:{phase:'idle',playtest:true}} as never,{track:(...args:unknown[])=>calls.push(args)} as never,()=> 'en');
 const id=store.board.attemptId;offers.visible(true,id);await store.flush();const captured=offers.captureChoice();offers.visible(false,id);expect(captured).toBeTruthy();
 expect(calls.filter((x:any)=>x[0]==='assistance_choice')).toHaveLength(0);offers.choice('restart','',captured,'wrong');expect(calls.filter((x:any)=>x[0]==='assistance_choice')).toHaveLength(0);
 await store.restart(id);offers.choice('restart','',captured,id);offers.choice('restart','',captured,id);expect(calls.filter((x:any)=>x[0]==='assistance_choice')).toHaveLength(1);offers.destroy();
});
it('F2 expires the prohibition without loading, fake ready, cadence or an old status overwriting ready',async()=>{
 vi.useFakeTimers();let event!:(e:AdEvent)=>void,resolveStatus!:(v:{rewardedState:RewardedReadiness})=>void;const idle:RewardedReadiness={configured:true,phase:'idle',ready:false,preloadId:'p',loadedAt:0,expiresInMs:0,retryInMs:0,playtest:true};const prepare=vi.fn(async()=>idle);
 const ads=createAds({setBlocked:vi.fn(),isBlocked:()=>false},{track:vi.fn()},{prepareRewarded:prepare,status:()=>new Promise(r=>resolveStatus=r),prepareInterstitial:async()=>{},show:async()=>({shown:false,outcome:'unavailable'}),pending:async()=>({receipts:[]}),acknowledge:async()=>{},cancelPending:async()=>{},addListener:async(_,f)=>{event=f;return{remove:async()=>{}};}});await tick();ads.setRewardedDemand(true);await tick();
 event({kind:'rewarded',phase:'load_error',readiness:{...idle,phase:'backoff',retryInMs:30000}});await vi.advanceTimersByTimeAsync(30001);expect(ads.rewardedState).toMatchObject({phase:'idle',retryInMs:0,ready:false});ads.setRewardedDemand(true);expect(prepare).toHaveBeenCalledTimes(1);
 event({kind:'rewarded',phase:'preload_ready',readiness:{...idle,phase:'ready',ready:true,expiresInMs:300000}});resolveStatus({rewardedState:idle});await tick();expect(ads.rewardedState.ready).toBe(true);ads.destroy();vi.useRealTimers();
});
it('F3 updates the unaccepted A1 on actual candidate membership, not every snapshot, without demoting useful offscreen',async()=>{
 const{store}=await setup(19);let visible:ReadonlySet<string>=new Set(['c20-1']);const spy=vi.spyOn(store,'helpOffer'),offers=createHelpOffers(store,{rewardedState:{phase:'idle',playtest:true}} as never,{track:vi.fn()} as never,()=> 'en',()=>visible),id=store.board.attemptId;
 expect(offers.snapshot(id).offer!.plan!.root).toBe('c20-1');for(let i=0;i<60;i++)offers.snapshot(id);expect(spy).toHaveBeenCalledTimes(1);visible=new Set(['c20-3']);expect(offers.snapshot(id).offer!.plan!.root).toBe('c20-3');expect(spy).toHaveBeenCalledTimes(2);
 const selected=offers.snapshot(id).offer!,request=(await store.prepareHelpRequest(selected))!;visible=new Set(['c20-1']);await store.commitReward({schema:2,intentVersion:1,id:request.requestId,requestId:request.requestId,attempt:id,mode:'campaign',placement:'hint'});expect(store.state.campaign.hint).toBe('c20-3');offers.snapshot(id);expect(store.currentHelp(id)!.plan!.root).toBe('c20-3');
 const other=await setup();expect(other.store.helpOffer(other.store.board.attemptId,'hint',new Set(['c40-21']))!.plan!.root).toBe('c40-22');offers.destroy();
});
it('F4 exports saturation once capacity exists, reports reasons, and does not recurse on diagnostic failure',async()=>{
 vi.useFakeTimers();const sent:{event:string;params:any}[]=[],resolve:((v:any)=>void)[]=[];
 const a=createAnalytics({report:o=>{expect(validEvent(o.event,o.params)).toBe(true);sent.push(o);if(o.event==='analytics_health')return Promise.reject(Error('health unavailable'));return new Promise(r=>resolve.push(r));}});
 for(let i=0;i<33;i++)a.track('app_ready',{language:'ru'});a.track('app_ready',{language:42});a.flush();expect(sent).toHaveLength(32);for(const r of resolve)r({accepted:true,disabled:false});await tick();
 const h=sent.find(x=>x.event==='analytics_health')!;expect(h.params).toMatchObject({overflow:1,invalid:1,dropped:2,delivery:'sdk-acceptance-only'});expect(a.snapshot().health.failed).toBe(1);for(let i=0;i<100;i++)a.flush();await tick();expect(sent.filter(x=>x.event==='analytics_health')).toHaveLength(1);
 await vi.advanceTimersByTimeAsync(60000);a.flush();await tick();expect(sent.filter(x=>x.event==='analytics_health')).toHaveLength(2);expect(sent.at(-1)!.params.diagnostics_failed).toBe(1);a.destroy();vi.useRealTimers();
});
it('F4 reports healthy zero loss and distinguishes sync, async, native rejection and unconfirmed acceptance',async()=>{
 const rows:any[]=[],report=vi.fn().mockImplementationOnce(()=>{throw Error('sync');}).mockRejectedValueOnce(Error('async')).mockResolvedValueOnce({accepted:false,disabled:false}).mockResolvedValueOnce(undefined).mockImplementation(async(o)=>{rows.push(o);return{accepted:true,disabled:false};});
 const a=createAnalytics({report});for(let i=0;i<4;i++)a.track('app_ready',{language:'ru'});await tick();a.flush();await tick();expect(rows[0].params).toMatchObject({sync_failure:1,async_failure:1,native_rejected:1,unconfirmed:1,failed:3});a.destroy();
 const healthy:any[]=[],b=createAnalytics({report:async o=>{healthy.push(o);return{accepted:true,disabled:false};}});b.track('app_ready',{language:'en'});await tick();b.flush();await tick();expect(healthy.at(-1).params).toMatchObject({dropped:0,failed:0});b.destroy();
});
it('F4 a failed flush is counted for the next bounded diagnostic and never retried in a loop',async()=>{
 vi.useFakeTimers();const rows:any[]=[],flush=vi.fn(async()=>{throw Error('flush');}),a=createAnalytics({report:async o=>{rows.push(o);return{accepted:true,disabled:false};},flush});a.flush();await tick();expect(a.snapshot().flush_failure).toBe(1);expect(flush).toHaveBeenCalledTimes(1);await vi.advanceTimersByTimeAsync(60000);expect(flush).toHaveBeenCalledTimes(1);a.flush();await tick();expect(rows.at(-1).params.flush_failure).toBe(1);a.destroy();vi.useRealTimers();
});
const live={environment_version:1,build_environment:'release',ad_environment:'live',analytics_environment:'production'};
it('F5 requires explicit live provenance, even when qa=false',()=>{
 expect(exportEnvironment({qa:false})).toBe('unknown');expect(exportEnvironment({...live,build_environment:'debug',qa:false})).toBe('test');expect(exportEnvironment({...live,build_environment:'playtest',ad_environment:'test',analytics_environment:'off'})).toBe('test');expect(exportEnvironment({...live,qa:false})).toBe('live');expect(exportEnvironment({...live,ad_environment:'unknown'})).toBe('unknown');
 const rows=[{event:'assistance_assignment',at:1,params:{assignment_id:'a',install_id:'i',variant:'single-v2',eligible_at:1,qa:false}},{event:'ad_session',at:2,params:{request_id:'r',assignment_id:'a',qa:false}},{event:'ad_impression_value',at:3,params:{event_id:'v',request_id:'r',known:true,amount:'3',currency:'RUB',precision:'estimated'}}];expect(revenueCohorts(rows,8*86400000).cohorts).toEqual([]);expect(revenueCohorts(rows.map(r=>({...r,params:{...r.params,...live,build_environment:'debug'}})),8*86400000).cohorts).toEqual([]);
});
it('F4/F5 shows callback→money→join coverage, cumulative diagnostics once, absent diagnostics unknown',()=>{
 const row=(event:string,params:object)=>({event,at:3000,params:{...live,...params}});const rows=[row('assistance_assignment',{assignment_id:'a',install_id:'i',variant:'single-v2',eligible_at:1,qa:false}),row('ad_session',{request_id:'one',assignment_id:'a',qa:false}),row('ad_event',{request_id:'one',phase:'impression'}),row('ad_event',{request_id:'missing',phase:'impression'}),row('ad_impression_value',{event_id:'v',request_id:'one',known:true,amount:'1.5',currency:'RUB',precision:'estimated'}),row('analytics_health',{transport_id:'t',sequence:1,dropped:1,overflow:1}),row('analytics_health',{transport_id:'t',sequence:2,dropped:2,overflow:2})];
 const result=revenueCohorts(rows,8*86400000);expect(result.coverage).toMatchObject({joinedMatureLive:1,completeness:'unknown',observed:{live:{sdkImpressions:2,monetaryFacts:1,missingMonetary:1}},reportedLosses:{live:{transports:1,dropped:2,overflow:2}}});expect(revenueCohorts([],1).coverage.reportedLosses.live.dropped).toBeNull();
});
for(const variant of ['single-v2','cascade-v1','route-v1'])it(`M1 ${variant} starts only after full use and accepts one later ordinary manual move`,async()=>{
 const q=await setup(39,variant),{store}=q,id=store.board.attemptId,rightId=await q.earn(),right=store.currentHelp(id)!;
 if(variant==='route-v1'){await store.move(id,right.plan!.route![0]!,10);expect(store.state.helpLedger.rights[rightId]!.followUp).toBeUndefined();}
 while(store.currentHelp(id))await store.move(id,store.state.campaign.hint!,100);
 expect(store.state.helpLedger.rights[rightId]!.followUp).toMatchObject({outcome:'pending',startedAt:store.state.campaign.activeMs});
 const start=store.state.campaign.activeMs;await store.presentation(id,{},700);const restored=new ProgressStore(q.storage);await restored.load();const events:SaveChange[]=[];restored.subscribe(e=>events.push(e));const free=restored.board.remaining.find(a=>canExit(a,restored.board.remaining))!;await restored.move(id,free.id,90);expect(restored.state.helpLedger.rights[rightId]!.followUp).toMatchObject({outcome:'first_move',activeMs:790,startedAt:start});
 const next=restored.board.remaining.find(a=>canExit(a,restored.board.remaining))!;await restored.move(id,next.id,20);expect(events.flatMap(e=>e.followupFacts??[])).toHaveLength(1);decodeSave(restored.state);
});
it('M1 new helper closes the previous observation; its execution is never an independent move',async()=>{
 const q=await setup(),id=q.store.board.attemptId,one=await q.earn();await q.store.move(id,q.store.state.campaign.hint!,100);const two=await q.earn();expect(q.store.state.helpLedger.rights[one]!.followUp?.outcome).toBe('new_help');await q.store.move(id,q.store.state.campaign.hint!,100);expect(q.store.state.helpLedger.rights[two]!.followUp?.outcome).toBe('pending');expect(q.events.flatMap(e=>e.followupFacts??[]).some(f=>f.entitlement===one&&f.outcome==='first_move')).toBe(false);
});
it('M1 restored native error release is not the next independent manual move',async()=>{
 const q=await setup(),id=q.store.board.attemptId,r=await q.earn();await q.store.move(id,q.store.state.campaign.hint!,100);const snapshot=structuredClone(q.store.state),free=q.store.board.remaining.find(a=>canExit(a,q.store.board.remaining))!;snapshot.campaign.board={...snapshot.campaign.board,errors:[...snapshot.campaign.board.errors,free.id],lives:snapshot.campaign.board.lives-1};q.rows.set(SAVE_KEY,JSON.stringify(decodeSave(snapshot)));const restored=new ProgressStore(q.storage);await restored.load();await restored.releaseReadyErrors(id);expect(restored.state.helpLedger.rights[r]!.followUp?.outcome).toBe('pending');const next=restored.board.remaining.find(a=>canExit(a,restored.board.remaining))!;await restored.move(id,next.id,30);expect(restored.state.helpLedger.rights[r]!.followUp).toMatchObject({outcome:'first_move',activeMs:30});expect(restored.state.campaign.board.errors).toContain(free.id);expect(restored.board.hearts).toBe(2);
});
it('M1 has no observation for an unfinished route, treats help-win separately and preserves error/flawless history',async()=>{
 const q=await setup(0,'cascade-v1'),id=q.store.board.attemptId,right=await q.earn();await q.store.move(id,q.store.state.campaign.hint!,20);expect(q.store.state.helpLedger.rights[right]!.followUp).toMatchObject({outcome:'completed_by_help',activeMs:0});expect(q.store.state.wins.at(-1)!.mistakes).toBe(0);expect(q.events.flatMap(e=>e.followupFacts??[])).toHaveLength(1);
});
it('M1 write failure emits nothing; restart/exit persist one terminal outcome and legacy used rights are not backfilled',async()=>{
 const q=await setup(),id=q.store.board.attemptId,r=await q.earn();await q.store.move(id,q.store.state.campaign.hint!,100);const free=q.store.board.remaining.find(a=>canExit(a,q.store.board.remaining))!;q.fail(true);await expect(q.store.move(id,free.id,40)).rejects.toThrow();expect(q.store.state.helpLedger.rights[r]!.followUp?.outcome).toBe('pending');expect(q.events.flatMap(e=>e.followupFacts??[])).toHaveLength(0);q.fail(false);await q.store.presentation(id,{},25);await q.store.recordHelpExit(id);await q.store.recordHelpExit(id);expect(q.store.state.helpLedger.rights[r]!.followUp).toMatchObject({outcome:'exit',activeMs:25});expect(q.events.flatMap(e=>e.followupFacts??[])).toHaveLength(1);
 const other=await setup(),old=other.store.board.attemptId,key=await other.earn();await other.store.move(old,other.store.state.campaign.hint!,10);await other.store.restart(old);expect(other.store.state.helpLedger.rights[key]!.followUp?.outcome).toBe('restart');const s=structuredClone(other.store.state);delete s.helpLedger.rights[key]!.followUp;expect(decodeSave(s).helpLedger.rights[key]!.followUp).toBeUndefined();
});
it('M1 an unknown accepted write restores the terminal milestone without replaying it on reload/next move',async()=>{
 const q=await setup(),id=q.store.board.attemptId,r=await q.earn();await q.store.move(id,q.store.state.campaign.hint!,100);const next=q.store.board.remaining.find(a=>canExit(a,q.store.board.remaining))!;
 const write=vi.spyOn(q.storage,'setItem').mockImplementation(async(k,v)=>{q.rows.set(k,v);throw Error('ack lost');}),read=vi.spyOn(q.storage,'getItem').mockRejectedValue(Error('read unavailable'));await expect(q.store.move(id,next.id,70)).rejects.toThrow();expect(q.store.uncertain).toBe(true);write.mockRestore();read.mockRestore();
 const restored=new ProgressStore(q.storage);await restored.load();expect(restored.state.helpLedger.rights[r]!.followUp).toMatchObject({outcome:'first_move',activeMs:70});const events:SaveChange[]=[];restored.subscribe(e=>events.push(e));await restored.move(id,restored.board.remaining.find(a=>canExit(a,restored.board.remaining))!.id,30);expect(events.flatMap(e=>e.followupFacts??[])).toHaveLength(0);
});
