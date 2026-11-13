import {it,expect} from 'vitest';
import {campaign} from '../../src/content/campaign';
import {Board,type Level} from '../../src/domain/board';
import {routePlan,validatePlan,routeCurrent} from '../../src/domain/assistance';
import {freshSave,freshAttempt,SAVE_KEY,ProgressStore,decodeSave} from '../../src/progression/save';
import type {HelpRequest} from '../../src/progression/helpLedger';
import {occupiedCells} from '../../src/domain/geometry';
const earned=(r:HelpRequest)=>({schema:2 as const,intentVersion:1 as const,id:r.requestId,requestId:r.requestId,attempt:r.owner.attempt,mode:r.owner.mode,placement:'hint' as const});
async function setup(level=campaign[19]!){const s=freshSave();s.index=19;s.campaign=freshAttempt({...level,id:'c20'});s.campaign.started=true;s.wins=campaign.slice(0,19).map((l,i)=>({attempt:`past-${i}`,levelId:l.id,activeMs:1000,completedAt:1000+i,mistakes:0}));s.helpLedger.assignments[s.campaign.board.id]='route-v1';let raw=JSON.stringify(s);const disk={async getItem(k:string){return k===SAVE_KEY?raw:null;},async setItem(_k:string,v:string){raw=v;},async removeItem(){}};const store=new ProgressStore(disk);await store.load();const request=(await store.prepareHelpRequest(store.helpOffer(store.board.attemptId)!))!;await store.commitReward(earned(request));return{store,disk,request};}
it('constructs the promised initial c20 route with actual Board legality and a blocked target',()=>{
  const b=new Board(campaign[19]!,'route'),p=routePlan(b)!;expect(p.route).toEqual(['c20-9','c20-12','c20-15']);expect(p.target).toBe('c20-15');validatePlan(b.level,p);
  expect(b.snapshot().removed).toEqual([]);expect(routeCurrent(b,p)).toBe('c20-9');
});
it('keeps semantic progress across offpath play, reload, long pauses and only retires at the target',async()=>{
  const {store,disk,request}=await setup(),id=store.board.attemptId;await store.move(id,'c20-0');expect(store.state.campaign.hint).toBe('c20-9');await store.move(id,'c20-9');expect(store.state.campaign.hint).toBe('c20-12');expect(store.currentHelp(id)!.status).toBe('active');
  await store.presentation(id,{},120000,0);const loaded=new ProgressStore(disk);await loaded.load();expect(loaded.state.campaign.hint).toBe('c20-12');
  const second=await loaded.move(id,'c20-12');expect(second?.kind==='removed'&&second.help?.route).toEqual({manualStep:true,completed:2,total:3,targetReached:false});
  const last=await loaded.move(id,'c20-15');expect(last?.kind==='removed'&&last.help?.route).toMatchObject({completed:3,targetReached:true});expect(loaded.currentHelp(id)).toBeNull();expect(loaded.state.helpLedger.rights[request.requestId]!.status).toBe('used');expect(loaded.board.remaining.length).toBeGreaterThan(0);decodeSave(loaded.state);
});
it.each([{marks:['c20-12']},{marks:['c20-12','c20-15']}])('skips actual native members $marks without synthetic manual actions',async({marks})=>{
  const {store,request}=await setup(),id=store.board.attemptId;for(const mark of marks)await store.move(id,mark);const result=await store.move(id,'c20-9');
  expect(result?.kind==='removed'&&result.help?.route).toMatchObject({manualStep:true,completed:marks.length+1,targetReached:marks.length===2});
  expect(store.board.hearts).toBe(3-marks.length);expect(store.state.campaign.hint).toBe(marks.length===2?null:'c20-15');if(marks.length===2){expect(store.state.helpLedger.rights[request.requestId]!.status).toBe('used');expect(Object.values(store.state.helpLedger.rights)).toHaveLength(1);}
});
for(const steps of [1,2])it(`reserves only ${3-steps} remaining confirmed steps after partial restart`,async()=>{
  const {store,request}=await setup(),old=store.board.attemptId;for(const id of ['c20-9','c20-12'].slice(0,steps))await store.move(old,id);await store.restart(old);const right=store.state.helpLedger.rights[request.requestId]!;expect(right.status).toBe('reserved');expect(right.amount).toBe(3-steps);
  const current=store.board.attemptId;await store.claimHelp(current,right.id);expect(store.currentHelp(current)!.id).toBe(right.id);expect(store.currentHelp(current)!.plan!.route!.length).toBeLessThanOrEqual(3-steps);expect(await store.claimHelp(current,right.id)).toBeUndefined();decodeSave(store.state);
});
it('allows a useful initially free future blocker to be removed first',async()=>{
  const arrows=[{id:'a',path:[{x:3,y:3},{x:3,y:1}]},{id:'b',path:[{x:5,y:3},{x:5,y:1}]},{id:'goal',path:[{x:0,y:2},{x:1,y:2}]}],level:Level={id:'c20',contentVersion:99,width:8,height:6,difficulty:'normal',arrows,mask:arrows.flatMap(a=>occupiedCells(a.path))};
  const {store}=await setup(level),id=store.board.attemptId;expect(store.currentHelp(id)!.plan!.route).toEqual(['a','b','goal']);await store.move(id,'b');expect(store.state.campaign.hint).toBe('a');await store.move(id,'a');expect(store.state.campaign.hint).toBe('goal');await store.move(id,'goal');expect(store.currentHelp(id)).toBeNull();
});
