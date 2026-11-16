import {it,expect} from 'vitest';
import {campaign} from '../fixtures/campaignV4';
import {Board} from '../../src/domain/board';
import {freshSave,freshAttempt,ProgressStore,SAVE_KEY} from '../../src/progression/save';
import {lifeEffect,type HelpRequest} from '../../src/progression/helpLedger';
import {createHelpOffers} from '../../src/game/helpOffers';
import type {HelpVariant} from '../../src/domain/assistance';

function seed(){
 const s=freshSave();s.index=39;s.campaign=freshAttempt(campaign[39]!);
 s.wins=campaign.slice(0,39).map((l,i)=>({attempt:`before-${i}`,levelId:l.id,activeMs:1000,completedAt:i+1,mistakes:0}));
 const b=new Board(s.campaign.level,s.campaign.board.id);for(let i=0;i<21;i++)b.activate(`c40-${i}`);
 s.campaign.board=b.snapshot();s.campaign.started=true;s.freeContinueUsed=true;return s;
}
async function setup(s=seed()){
 let raw=JSON.stringify(s);const store=new ProgressStore({async getItem(k){return k===SAVE_KEY?raw:null;},async setItem(_k,v){raw=v;},async removeItem(){}});await store.load();
 const events:Array<{name:string;params:Record<string,unknown>}>=[];
 const ads={rewardedState:{phase:'ready',playtest:true}} as Parameters<typeof createHelpOffers>[1];
 const analytics={track(name:string,params:Record<string,unknown>){events.push({name,params});}} as Parameters<typeof createHelpOffers>[2];
 const offers=createHelpOffers(store,ads,analytics,()=> 'ru');
 return {store,offers,events};
}
const earned=(r:HelpRequest)=>({schema:2 as const,intentVersion:1 as const,id:r.requestId,requestId:r.requestId,attempt:r.owner.attempt,mode:r.owner.mode,placement:lifeEffect(r.kind)?'lives' as const:'hint' as const});

it('normal primary selects the existing exact cascade without changing durable state or ordinary descriptors',async()=>{
 const {store,offers}=await setup(),id=store.board.attemptId,before=structuredClone(store.state);
 const primary=offers.primary(id);expect(primary.placement).toBe('cascade');expect(primary.offer).toEqual(store.helpOffer(id,'cascade'));expect(offers.label(id)).toMatchObject({kind:'cascade-v1',reserved:false});
 expect(store.helpOffer(id)!.kind).toBe('single-v2');expect(store.state).toEqual(before);
});
it('falls back to ordinary A1 only when a causal group no longer exists',async()=>{
 const s=seed(),b=new Board(s.campaign.level,s.campaign.board.id,s.campaign.board);
 while(b.remaining.length>1)b.activate(b.hint()!);s.campaign.board=b.snapshot();
 const {store,offers}=await setup(s),id=store.board.attemptId;
 expect(store.helpOffer(id,'cascade')).toBeNull();expect(offers.primary(id)).toMatchObject({placement:'hint',offer:{kind:'single-v2'}});
 const r=(await store.prepareHelpRequest(offers.primary(id).offer!))!;await store.commitReward(earned(r));
 const result=await store.move(id,r.plan!.root);expect(result?.kind==='removed'&&result.help?.bonus).toEqual([]);expect(store.board.complete).toBe(true);
});
it('claims a saved ordinary right before selling a cascade, with no conversion or extra removal',async()=>{
 const {store,offers}=await setup(),old=store.board.attemptId,r=(await store.prepareHelpRequest(store.helpOffer(old)!))!;
 await store.commitReward(earned(r));await store.restart(old);const id=store.board.attemptId;
 for(let i=0;i<21;i++)await store.move(id,`c40-${i}`);
 const before=store.state.campaign.board.removed.length,primary=offers.primary(id);
 expect(primary.placement).toBe('hint');expect(primary.reserve).toMatchObject({id:r.requestId,kind:'single-v2'});expect(offers.label(id).reserved).toBe(true);
 expect(store.helpOffer(id,'cascade')).toBeNull();await store.claimHelp(id,r.requestId);
 const result=await store.move(id,store.state.campaign.hint!);expect(result?.kind==='removed'&&result.help?.bonus).toEqual([]);
 expect(store.state.campaign.board.removed).toHaveLength(before+1);expect(store.state.helpLedger.rights[r.requestId]!.kind).toBe('single-v2');expect(Object.keys(store.state.helpLedger.requests)).toEqual([r.requestId]);
});
it('late old Hint receipt keeps its promised single and occupies the slot ahead of a displayed cascade',async()=>{
 const {store,offers}=await setup(),id=store.board.attemptId,r=(await store.prepareHelpRequest(store.helpOffer(id)!))!,descriptor=structuredClone(r);
 expect(offers.primary(id).offer?.kind).toBe('cascade-v1');await store.commitReward(earned(r));
 expect(offers.primary(id).offer).toBeNull();expect(store.currentHelp(id)).toMatchObject({kind:'single-v2',plan:descriptor.plan});expect(store.state.helpLedger.requests[r.requestId]).toEqual(descriptor);
 const result=await store.move(id,descriptor.plan!.root);expect(result?.kind==='removed'&&result.help?.bonus).toEqual([]);
});
it('disabled candidate uses the existing A1 fallback without changing the QA preference',async()=>{
 const {store,offers}=await setup();await store.setHelpCandidateEnabled(false);
 expect(offers.primary(store.board.attemptId)).toMatchObject({placement:'hint',offer:{kind:'single-v2'}});expect(store.state.helpLedger.candidateEnabled).toBe(false);
});
for(const variant of ['legacy','single-v2','cascade-v1','route-v1','continue-single-v1'] as HelpVariant[])it(`keeps the ${variant} historical QA offer separate from normal selection`,async()=>{
 const s=seed();s.helpLedger.assignments[s.campaign.board.id]=variant;const {store,offers}=await setup(s),id=store.board.attemptId;
 expect(offers.primary(id)).toMatchObject({placement:'hint',offer:store.helpOffer(id)});expect(store.state.helpLedger.assignments[id]).toBe(variant);
});
it('observes only the actual primary episode and joins its choice to the cascade offer',async()=>{
 const {store,offers,events}=await setup(),id=store.board.attemptId;
 offers.visiblePrimary(true,id);await store.flush();offers.visiblePrimary(true,id);
 expect(events.filter(e=>e.name==='assistance_offer')).toHaveLength(1);
 expect(events.find(e=>e.name==='assistance_offer')!.params.effect).toBe('cascade-v1');
 expect(offers.captureChoice()!.offerId).toBe(offers.primary(id).offer!.id);
 offers.choice('accept');expect(events.find(e=>e.name==='assistance_choice')!.params.offer_id).toBe(offers.primary(id).offer!.id);
 offers.visiblePrimary(false,id);expect(offers.captureChoice()).toBeNull();
});
