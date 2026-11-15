import {it,expect,vi,afterEach} from 'vitest';
import {campaign,CATALOG_VERSION} from '../../src/content/campaign';
import {dailyCatalog,dailyLevel,DAILY_CATALOG_VERSION,prepareDaily} from '../../src/content/daily';
import {denseDailyDifficulty,generateDenseDaily,denseDailyQualified,denseDailyMetrics} from '../../src/content/dailyDense';
import {patternKinds} from '../../src/content/patternsV1';
import selected from '../../docs/verification/CAMPAIGN_SELECTION_V5.json';
import {freshSave,freshAttempt,decodeSave,ProgressStore,SAVE_KEY} from '../../src/progression/save';
import {Board} from '../../src/domain/board';
import {campaign as old} from '../fixtures/campaignV4';
import fallback from '../../src/content/dailyDenseFallbacks.json';
import {prepareDenseDaily} from '../../src/content/dailyClient';
import type {Level} from '../../src/domain/board';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('ships actual varied campaign with close peaks and rare hearts/butterflies, not merely new labels',()=>{
 expect(CATALOG_VERSION).toBe(6);expect(DAILY_CATALOG_VERSION).toBe(4);expect(campaign.slice(0,4)).toEqual(old.slice(0,4));expect(campaign.slice(4).every(l=>l.contentVersion===5)).toBe(true);
 const families=selected.levels.map(r=>r.family);expect(new Set(families).size).toBe(patternKinds.length);
 for(let i=0;i<families.length;i++){expect(families.slice(Math.max(0,i-24),i)).not.toContain(families[i]);expect(selected.levels[i]!.neighborSimilarity).toBeLessThan(.82);}
 for(const kind of['heart','butterfly'])expect(families.filter(f=>f===kind)).toHaveLength(1);
 const peaks=selected.levels.filter(r=>r.number>20&&r.pace==='nightmare').map(r=>r.number);expect(peaks).toHaveLength(20);for(let i=1;i<peaks.length;i++)expect(peaks[i]!-peaks[i-1]!).toBe(5);
 expect(campaign[119]!.arrows.length).toBeGreaterThan(170);
});
it('uses large daily v2 from the explicit boundary, keeps old archive/v1 code and deterministic date identity',()=>{
 expect(dailyCatalog['2026-11-14']!.contentVersion).toBe(1);expect(dailyLevel('2026-01-01')!.contentVersion).toBe(3);
 for(const date of['2026-11-15','2026-11-18']){const l=generateDenseDaily(date);expect(l.id).toBe(`d${date.replaceAll('-','')}`);expect(l.contentVersion).toBe(3);expect(denseDailyQualified(l)).toBe(true);expect(dailyLevel(date)).toEqual(l);expect(denseDailyMetrics(l).arrows).toBeGreaterThanOrEqual(l.difficulty==='nightmare'?170:140);}
 expect(denseDailyDifficulty('2026-11-18')).toBe('nightmare');expect(denseDailyDifficulty('2026-11-21')).toBe('nightmare');
 expect(fallback).toHaveLength(4);for(const l of fallback)expect(denseDailyQualified(l as Level)).toBe(true);
},30000);
it('upgrades0.29 with exact old attempt/error/view/gift/rights, restart keeps old geometry, Next selects v5',async()=>{
 const s=freshSave();s.catalogVersion=5;s.dailyCatalogVersion=3;s.index=39;s.campaign=freshAttempt(old[39]!);s.wins=old.slice(0,39).map((l,i)=>({attempt:`old-${i}`,levelId:l.id,activeMs:1,completedAt:1,mistakes:0}));s.freeContinueUsed=true;
 const before=new Board(s.campaign.level,s.campaign.board.id);before.activate('c40-23');s.campaign.board=before.snapshot();s.campaign.started=true;s.campaign.view={centerX:17,centerY:16,zoom:2};s.receipts=['old-earned'];
 s.daily['2026-11-15']=freshAttempt(dailyCatalog['2026-11-15']!);const original=structuredClone(s.campaign),daily=structuredClone(s.daily);const decoded=decodeSave(s);expect(decoded.campaign).toEqual(original);expect(decoded.daily).toEqual(daily);expect(decoded.freeContinueUsed).toBe(true);expect(decoded.receipts).toEqual(s.receipts);
 let raw=JSON.stringify(s);const disk={getItem:async()=>raw,setItem:async(_k:string,v:string)=>{raw=v;},removeItem:async()=>{}};const store=new ProgressStore(disk,()=>new Date(2026,10,15));await store.load();const same=await store.openDaily('2026-11-15');expect(same).toBe(s.daily['2026-11-15']!.board.id);expect(store.state.daily).toEqual(daily);
 await store.restart(store.board.attemptId);expect(store.board.level).toEqual(original.level);while(!store.board.complete)await store.move(store.board.attemptId,store.board.hint()!);await store.next(store.board.attemptId);expect(store.board.level).toEqual(campaign[40]);expect(store.board.level.contentVersion).toBe(5);expect(SAVE_KEY).toBe('arrows.progress.v1');
});
class FakeWorker{
 static instances:FakeWorker[]=[];onmessage:((e:MessageEvent)=>void)|null=null;onerror:(()=>void)|null=null;onmessageerror:(()=>void)|null=null;terminated=0;posted:unknown;
 constructor(){FakeWorker.instances.push(this);}postMessage(v:unknown){this.posted=v;}terminate(){this.terminated++;}
}
it('terminates a pending worker on cancellation and never turns a deadline into another daily',async()=>{
 FakeWorker.instances=[];vi.stubGlobal('Worker',FakeWorker);const c=new AbortController(),pending=prepareDenseDaily('2026-11-15',c.signal);c.abort();await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(FakeWorker.instances[0]!.terminated).toBe(1);
 vi.useFakeTimers();const deadline=prepareDenseDaily('2026-11-15'),observed=expect(deadline).rejects.toThrow('deadline');await vi.advanceTimersByTimeAsync(15001);await observed;expect(FakeWorker.instances[1]!.terminated).toBe(1);
});
it('validates the worker date/content and ignores a duplicate settlement',async()=>{
 FakeWorker.instances=[];vi.stubGlobal('Worker',FakeWorker);const p=prepareDenseDaily('2026-11-15'),w=FakeWorker.instances[0]!,template=fallback[0] as Level,id='d20261115',level={...template,id,arrows:template.arrows.map((a,i)=>({...a,id:`${id}-${i}`}))};w.onmessage!({data:{date:'2026-11-15',result:{level}}} as MessageEvent);await expect(p).resolves.toEqual(level);expect(w.terminated).toBe(1);expect(w.onmessage).toBeNull();
 const bad=prepareDenseDaily('2026-11-16'),bw=FakeWorker.instances[1]!;bw.onmessage!({data:{date:'2026-11-15',result:{level}}} as MessageEvent);await expect(bad).rejects.toThrow('Invalid');expect(bw.terminated).toBe(1);
});
it('worker creation failure computes the same date cooperatively instead of choosing another board',async()=>{
 vi.stubGlobal('Worker',class{constructor(){throw Error('Transport unavailable');}});expect(await prepareDenseDaily('2026-11-15')).toEqual(generateDenseDaily('2026-11-15'));
},15000);
