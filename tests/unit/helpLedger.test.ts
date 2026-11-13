import {describe,it,expect} from 'vitest';
import type {StorageAdapter} from '@danilah/mini-games-kit/platform';
import {campaign} from '../../src/content/campaign';
import {Board,canExit} from '../../src/domain/board';
import {ProgressStore,freshSave,freshAttempt,decodeSave,SAVE_KEY} from '../../src/progression/save';
import type {HelpRequest} from '../../src/progression/helpLedger';
import type {EarnedReceipt} from '../../src/platform/ads';

const earned=(r:HelpRequest):EarnedReceipt=>({schema:2,intentVersion:1,id:r.requestId,requestId:r.requestId,attempt:r.owner.attempt,mode:r.owner.mode,placement:r.kind==='lives'?'lives':'hint'});
function seed(variant:'single-v2'|'cascade-v1'='cascade-v1'){
  const s=freshSave();s.index=39;s.campaign=freshAttempt(campaign[39]!);s.wins=campaign.slice(0,39).map((l,i)=>({attempt:`past-${i}`,levelId:l.id,activeMs:1000,completedAt:i*1000,mistakes:0}));
  const b=new Board(s.campaign.level,s.campaign.board.id);for(let i=0;i<21;i++)b.activate(`c40-${i}`);s.campaign.board=b.snapshot();s.campaign.started=true;s.helpLedger.assignments[b.attemptId]=variant;
  return s;
}
async function setup(variant:'single-v2'|'cascade-v1'='cascade-v1'){
  const rows=new Map([[SAVE_KEY,JSON.stringify(seed(variant))]]);let rejectWrite=false,readFailure=false,writeThenFail=false,writes=0;
  const storage:StorageAdapter={async getItem(k){if(readFailure)throw Error('read unavailable');return rows.get(k)??null;},async setItem(k,v){writes++;if(rejectWrite)throw Error('write failed');rows.set(k,v);if(writeThenFail){readFailure=true;throw Error('unknown write');}},async removeItem(k){rows.delete(k);}};
  const store=new ProgressStore(storage);await store.load();
  return {store,rows,storage,writes:()=>writes,failWrite(v:boolean){rejectWrite=v;},uncertain(){writeThenFail=true;},repair(){readFailure=false;writeThenFail=false;}};
}
async function request(store:ProgressStore){const offer=store.helpOffer(store.board.attemptId)!;expect(offer).not.toBeNull();return (await store.prepareHelpRequest(offer))!;}
describe('durable immutable assistance rights',()=>{
  for(const marks of [[],['c40-23'],['c40-23','c40-24']])it(`atomically applies the exact cascade once after errors ${marks.join(',')}`,async()=>{
    const {store,rows}=await setup(),r=await request(store);expect(r.kind).toBe('cascade-v1');expect(r.plan!.bonus).toEqual(['c40-23','c40-24','c40-27']);
    await store.commitReward(earned(r));for(const id of marks)await store.move(store.board.attemptId,id);
    const before=store.state.revision,result=await store.move(store.board.attemptId,'c40-22');
    expect(store.state.revision).toBe(before+1);expect(store.board.remaining).toHaveLength(15);expect(store.board.hearts).toBe(3-marks.length);
    expect(result?.kind==='removed'&&result.help).toMatchObject({entitlement:r.requestId,manual:['c40-22'],native:marks,bonus:r.plan!.bonus.filter(id=>!marks.includes(id))});
    const accepted=store.board.snapshot();await store.move(store.board.attemptId,'c40-22');await store.commitReward(earned(r));expect(store.board.snapshot()).toEqual(accepted);
    expect(store.currentHelp(store.board.attemptId)).toBeNull();expect(store.state.helpLedger.rights[r.requestId]!.status).toBe('used');
    expect(decodeSave(JSON.parse(rows.get(SAVE_KEY)!)).campaign.board).toEqual(accepted);
  });
  it('keeps off-path actions ordinary and persists the paid group until its trigger',async()=>{
    const {store}=await setup(),r=await request(store);await store.commitReward(earned(r));
    const ordinary=await store.move(store.board.attemptId,'c40-21');expect(ordinary?.kind==='removed'&&ordinary.help?.kind).toBe('ordinary');
    expect(store.currentHelp(store.board.attemptId)!.plan!.bonus).toEqual(r.plan!.bonus);await store.move(store.board.attemptId,'c40-22');expect(store.board.remaining).toHaveLength(14);
  });
  it('reserves a late standalone reward instead of overwriting the occupied slot',async()=>{
    const {store}=await setup('single-v2'),first=await request(store),second=await request(store);
    await store.commitReward(earned(first));const target=store.state.campaign.hint;
    await store.commitReward(earned(second));expect(store.state.campaign.hint).toBe(target);expect(store.state.helpLedger.rights[second.requestId]!.status).toBe('reserved');
    const legacy:EarnedReceipt={schema:1,id:'late-old-single',placement:'hint',attempt:store.board.attemptId,mode:'campaign'};await store.commitReward(legacy);
    expect(store.state.campaign.hint).toBe(target);expect(store.state.helpLedger.rights[legacy.id]!.kind).toBe('legacy-single');expect(store.state.helpLedger.rights[legacy.id]!.status).toBe('reserved');
  });
  it('distinguishes a missing new descriptor from a genuine schema1 reward',async()=>{
    const {store}=await setup(),missing:EarnedReceipt={schema:2,intentVersion:1,id:'missing-new',requestId:'missing-new',attempt:store.board.attemptId,mode:'campaign',placement:'hint'};
    await store.commitReward(missing);expect(store.state.campaign.hint).toBeNull();expect(store.state.helpLedger.unresolved).toEqual([missing]);expect(store.state.receipts).toContain(missing.id);
    await store.commitReward({schema:1,id:'old-real',attempt:store.board.attemptId,mode:'campaign',placement:'hint'});
    expect(store.currentHelp(store.board.attemptId)!.kind).toBe('legacy-single');expect(store.state.campaign.hint).toBe('c40-21');
  });
  it('retains type/amount/identity across retirement and a double explicit reserve claim',async()=>{
    const {store}=await setup(),old=store.board.attemptId,r=await request(store);await store.commitReward(earned(r));await store.restart(old);
    const right=store.state.helpLedger.rights[r.requestId]!;expect(right.status).toBe('reserved');expect(right.amount).toBe(3);expect(right.originalOwner.attempt).toBe(old);
    const next=store.board.attemptId;
    // The fresh field has no eligible three-bonus group yet. Preserve the
    // complete paid reserve rather than silently substituting weaker help.
    expect(await store.claimHelp(next,right.id)).toBeUndefined();
    for(let i=0;i<21;i++)await store.move(next,`c40-${i}`);
    expect(await store.claimHelp(next,right.id)).toBe(true);expect(await store.claimHelp(next,right.id)).toBeUndefined();
    expect(store.currentHelp(next)!.id).toBe(right.id);expect(store.currentHelp(next)!.plan!.bonus).toHaveLength(3);expect(store.state.reservedRewards).not.toContainEqual(earned(r));
    await store.commitReward(earned(r));expect(store.currentHelp(next)!.owner!.attempt).toBe(next);expect(store.state.receipts.filter(id=>id===r.requestId)).toHaveLength(1);
  });
  it('does not show or bind a new intent when its durable request save fails',async()=>{
    const {store,failWrite}=await setup();const offer=store.helpOffer(store.board.attemptId)!;failWrite(true);
    await expect(store.prepareHelpRequest(offer)).rejects.toThrow();expect(Object.keys(store.state.helpLedger.requests)).toHaveLength(0);expect(store.state.receipts).toHaveLength(0);
  });
  it('preserves a grant on confirmed failed writes and settles an uncertain atomic cascade by readback',async()=>{
    const {store,rows,storage,failWrite,uncertain,repair}=await setup(),r=await request(store);failWrite(true);
    await expect(store.commitReward(earned(r))).rejects.toThrow();expect(store.state.receipts).not.toContain(r.requestId);failWrite(false);await store.commitReward(earned(r));
    uncertain();await expect(store.move(store.board.attemptId,'c40-22')).rejects.toThrow();expect(store.uncertain).toBe(true);expect(store.currentHelp(store.board.attemptId)!.status).toBe('active');
    await expect(store.move(store.board.attemptId,'c40-22')).rejects.toThrow();repair();await store.recover();
    expect(store.board.remaining).toHaveLength(15);expect(store.state.helpLedger.rights[r.requestId]!.status).toBe('used');
    const reloaded=new ProgressStore(storage);await reloaded.load();await reloaded.commitReward(earned(r));expect(reloaded.board.snapshot()).toEqual(store.board.snapshot());expect(rows.get(SAVE_KEY)).toBeTruthy();
  });
  it('migrates an old lives0 hint without inventing an SDK join or restoring the lifetime gift',()=>{
    const raw=seed('single-v2');Reflect.deleteProperty(raw,'helpLedger');const a=raw.campaign,b=new Board(a.level,a.board.id,a.board);a.hint=b.hint();
    for(const id of ['c40-23','c40-24','c40-27'])b.activate(id);a.board=b.snapshot();raw.freeContinueUsed=true;
    const decoded=decodeSave(raw),r=Object.values(decoded.helpLedger.rights)[0]!;expect(decoded.campaign).toEqual(a);expect(r.origin).toBe('legacy-save');expect(r.requestId).toBeNull();expect(r.receiptId).toBeNull();expect(r.kind).toBe('legacy-single');
    expect(decodeSave(decoded).helpLedger.rights[r.id]).toEqual(r);expect(decoded.freeContinueUsed).toBe(true);
  });
  it('keeps assignments fixed for current attempts and honors an earned cascade after its kill switch',async()=>{
    const {store}=await setup(),attempt=store.board.attemptId,r=await request(store);await store.commitReward(earned(r));
    await store.setNextHelpVariant('single-v2');await store.setHelpCandidateEnabled(false);
    expect(store.state.helpLedger.assignments[attempt]).toBe('cascade-v1');await store.move(attempt,'c40-22');expect(store.board.remaining).toHaveLength(15);
  });
  it('keeps an explicit reserve through failed claim and recovers an uncertain claim exactly once',async()=>{
    const {store,failWrite,uncertain,repair}=await setup(),r=await request(store),old=store.board.attemptId;await store.commitReward(earned(r));await store.restart(old);
    const attempt=store.board.attemptId;for(let i=0;i<21;i++)await store.move(attempt,`c40-${i}`);
    failWrite(true);await expect(store.claimHelp(attempt,r.requestId)).rejects.toThrow();expect(store.state.helpLedger.rights[r.requestId]!.status).toBe('reserved');failWrite(false);
    uncertain();await expect(store.claimHelp(attempt,r.requestId)).rejects.toThrow();expect(store.uncertain).toBe(true);repair();await store.recover();expect(store.currentHelp(attempt)!.id).toBe(r.requestId);expect(await store.claimHelp(attempt,r.requestId)).toBeUndefined();
    await store.commitReward(earned(r));expect(store.currentHelp(attempt)!.id).toBe(r.requestId);
  });

  it('attributes explicit entry release of an old free marked hint to native use, not a paid manual tap',async()=>{
    const {rows,storage}=await setup(),raw=seed('single-v2'),b=new Board(raw.campaign.level,raw.campaign.board.id,raw.campaign.board);b.activate('c40-22');raw.campaign.board={...b.snapshot(),errors:['c40-23'],lives:2};raw.campaign.hint='c40-23';Reflect.deleteProperty(raw,'helpLedger');rows.set(SAVE_KEY,JSON.stringify(raw));
    const restored=new ProgressStore(storage);await restored.load();const id=restored.currentHelp(restored.board.attemptId)!.id,result=await restored.releaseReadyErrors(restored.board.attemptId);
    expect(result?.kind==='removed'&&result.help).toMatchObject({entitlement:id,manual:[],native:['c40-23'],bonus:[]});expect(restored.state.helpLedger.rights[id]!.status).toBe('used');expect(restored.state.helpLedger.rights[id]!.requestId).toBeNull();
  });
  it.each(['first_move','repeat_loss','exit_before_move'])('records actual post-continue outcome %s without prematurely retiring the attempt',async(outcome)=>{
    const {rows,storage}=await setup(),raw=seed('single-v2');raw.campaign.board={...raw.campaign.board,errors:['c40-23','c40-24','c40-27'],lives:0};rows.set(SAVE_KEY,JSON.stringify(raw));const store=new ProgressStore(storage);await store.load();const id=store.board.attemptId,events:string[]=[];store.subscribe(e=>events.push(...(e.continueFacts??[]).map(f=>f.outcome)));
    const r=(await store.prepareHelpRequest(store.helpOffer(id,'lives')!))!;await store.commitReward(earned(r));expect(store.board.hearts).toBe(3);
    if(outcome==='first_move')await store.move(id,'c40-22');
    if(outcome==='repeat_loss'){const errors=new Set(store.board.snapshot().errors),targets=store.board.remaining.filter(a=>!errors.has(a.id)&&!canExit(a,store.board.remaining)).slice(0,3);expect(targets).toHaveLength(3);for(const a of targets)await store.move(id,a.id);}
    if(outcome==='exit_before_move')await store.recordHelpExit(id);
    expect(events).toEqual([outcome]);expect(store.findAttempt(id)).not.toBeNull();expect(store.board.complete).toBe(false);expect(store.state.wins).toHaveLength(39);
  });

});
