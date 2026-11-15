import {it,expect} from 'vitest';
import {campaign} from '../fixtures/campaignV4';
import {Board,canExit} from '../../src/domain/board';
import {freshSave,freshAttempt,decodeSave,ProgressStore,SAVE_KEY} from '../../src/progression/save';
import {lifeEffect,type HelpRequest} from '../../src/progression/helpLedger';
const earned=(r:HelpRequest)=>({schema:2 as const,intentVersion:1 as const,id:r.requestId,requestId:r.requestId,attempt:r.owner.attempt,mode:r.owner.mode,placement:lifeEffect(r.kind)?'lives' as const:'hint' as const});
function seed(){const s=freshSave();s.index=39;s.campaign=freshAttempt(campaign[39]!);s.wins=campaign.slice(0,39).map((l,i)=>({attempt:`before-${i}`,levelId:l.id,activeMs:1000,completedAt:i+1,mistakes:0}));const b=new Board(s.campaign.level,s.campaign.board.id);for(let i=0;i<21;i++)b.activate(`c40-${i}`);s.campaign.board=b.snapshot();s.campaign.started=true;s.freeContinueUsed=true;return s;}
async function setup(s=seed()){let raw=JSON.stringify(s);const disk={async getItem(k:string){return k===SAVE_KEY?raw:null;},async setItem(_k:string,v:string){raw=v;},async removeItem(){}};const store=new ProgressStore(disk);await store.load();return{store,disk,raw:()=>JSON.parse(raw)};}
async function lose(s:ProgressStore){const id=s.board.attemptId;for(const a of s.board.remaining.filter(a=>!s.board.isError(a.id)&&!canExit(a,s.board.remaining)).slice(0,3))await s.move(id,a.id);expect(s.board.hearts).toBe(0);}
it('ordinary A1 and explicit A2 are distinct offers on ONE new profile; exact cascade spends once',async()=>{
 const{store,raw}=await setup(),id=store.board.attemptId;
 const single=store.helpOffer(id)!,cascade=store.helpOffer(id,'cascade')!;expect(single.variant).toBe('combined-v1');expect(single.kind).toBe('single-v2');expect(cascade.kind).toBe('cascade-v1');expect(cascade.id).not.toBe(single.id);expect(cascade.amount).toBeGreaterThanOrEqual(2);expect(cascade.amount).toBeLessThanOrEqual(4);
 const r=(await store.prepareHelpRequest(cascade))!;await store.commitReward(earned(r));expect(store.helpOffer(id)).toBeNull();expect(store.helpOffer(id,'cascade')).toBeNull();
 const before=store.state.revision,m=await store.move(id,r.plan!.root);expect(store.state.revision).toBe(before+1);expect(m?.kind==='removed'&&m.help?.bonus).toEqual(r.plan!.bonus);const snap=store.board.snapshot();await store.commitReward(earned(r));expect(store.board.snapshot()).toEqual(snap);decodeSave(raw());
});
it('does not escalate ordinary Hint into a cascade or advertise an impossible group',async()=>{
 const{store}=await setup(),id=store.board.attemptId,r=(await store.prepareHelpRequest(store.helpOffer(id)!))!;expect(r.kind).toBe('single-v2');await store.commitReward(earned(r));const m=await store.move(id,r.plan!.root);expect(m?.kind==='removed'&&m.help?.bonus).toEqual([]);
 const fresh=await setup(freshSave());await fresh.store.move(fresh.store.board.attemptId,'c01-0');expect(fresh.store.helpOffer(fresh.store.board.attemptId,'cascade')).toBeNull();
});
it('A4 refills three and grants A1 on the combined profile; gift and historic errors remain authoritative',async()=>{
 const{store}=await setup();await lose(store);const before=store.board.snapshot(),id=store.board.attemptId,r=(await store.prepareHelpRequest(store.helpOffer(id,'lives')!))!;
 expect(r.kind).toBe('continue-single-v1');expect(r.plan?.kind).toBe('single-v2');await store.commitReward(earned(r));expect(store.board.hearts).toBe(3);expect(store.board.snapshot().errors).toEqual(before.errors);expect(store.state.campaign.hint).toBe(r.plan!.root);expect(store.state.freeContinueUsed).toBe(true);await store.commitReward(earned(r));expect(store.state.campaign.continuations).toBe(1);
});
it('late A2 cannot overwrite A1, and the reserve prevents a new cascade sale',async()=>{
 const{store}=await setup(),id=store.board.attemptId,a1=(await store.prepareHelpRequest(store.helpOffer(id)!))!,a2=(await store.prepareHelpRequest(store.helpOffer(id,'cascade')!))!;
 await store.commitReward(earned(a1));await store.commitReward(earned(a2));expect(store.currentHelp(id)!.id).toBe(a1.requestId);expect(store.state.helpLedger.rights[a2.requestId]!.status).toBe('reserved');await store.move(id,a1.plan!.root);await store.restart(id);const next=store.board.attemptId;for(let i=0;i<21;i++)await store.move(next,`c40-${i}`);expect(store.savedHelp(next)?.id).toBe(a2.requestId);expect(store.helpOffer(next,'cascade')).toBeNull();
});
it('A4 retains an active cascade rather than replacing it with a single',async()=>{
 const{store}=await setup(),id=store.board.attemptId,c=(await store.prepareHelpRequest(store.helpOffer(id,'cascade')!))!;await store.commitReward(earned(c));await lose(store);const r=(await store.prepareHelpRequest(store.helpOffer(id,'lives')!))!;expect(r.bundle?.hint).toBe('retain');await store.commitReward(earned(r));expect(store.currentHelp(id)!.id).toBe(c.requestId);expect(store.state.helpLedger.rights[r.requestId]!.bundle?.single).toBe('none');
});
it('cascade switch leaves ordinary A1 and normal A4 available, without reinterpreting legacy receipts',async()=>{
 const{store}=await setup(),id=store.board.attemptId;await store.setHelpCandidateEnabled(false);expect(store.helpOffer(id,'cascade')).toBeNull();expect(store.helpOffer(id)?.kind).toBe('single-v2');await lose(store);expect(store.helpOffer(id,'lives')?.kind).toBe('continue-single-v1');await store.commitReward({schema:1,id:'legacy-lives',attempt:id,mode:'campaign',placement:'lives'});expect(store.board.hearts).toBe(3);expect(store.state.campaign.hint).toBeNull();expect(store.state.helpLedger.rights['legacy-lives']!.kind).toBe('lives');
});
it('one-time upgrade preserves old attempt, route entitlement and request; only NEXT attempts use combined',async()=>{
 const old=seed();old.helpLedger.assignments[old.campaign.board.id]='route-v1';old.helpLedger.nextVariant='route-v1';const{store}=await setup(old),r=(await store.prepareHelpRequest(store.helpOffer(store.board.attemptId)!))!;await store.commitReward(earned(r));const before=structuredClone(store.state);delete before.helpLedger.policyVersion;
 const migrated=decodeSave(before);expect(migrated.campaign).toEqual(before.campaign);expect(migrated.helpLedger.requests).toEqual(before.helpLedger.requests);expect(migrated.helpLedger.rights).toEqual(before.helpLedger.rights);expect(migrated.helpLedger.assignments).toEqual(before.helpLedger.assignments);expect(migrated.helpLedger.nextVariant).toBe('combined-v1');expect(migrated.freeContinueUsed).toBe(before.freeContinueUsed);expect(decodeSave(migrated)).toEqual(migrated);
 const updated=await setup(migrated);await updated.store.restart(updated.store.board.attemptId);expect(updated.store.helpOffer(updated.store.board.attemptId)?.variant).toBe('combined-v1');expect(updated.store.state.helpLedger.rights[r.requestId]!.kind).toBe('route-v1');expect(updated.store.state.helpLedger.rights[r.requestId]!.status).toBe('reserved');
});
it('rejects a forged combined cascade offer on an ordinary A1 attempt',async()=>{
 const{store}=await setup(),id=store.board.attemptId,offer=store.helpOffer(id,'cascade')!;store.state.helpLedger.assignments[id]='single-v2';expect(await store.prepareHelpRequest(offer)).toBeUndefined();expect(Object.keys(store.state.helpLedger.requests)).toHaveLength(0);
});
