import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { campaign } from '../../src/content/campaign';
import { Board, canExit } from '../../src/domain/board';
import { ProgressStore, freshSave, freshAttempt, decodeSave, SAVE_KEY, type GameSave } from '../../src/progression/save';
import { A1_CUE_KEY, A1_CUE_VERSION, type A1CueMode } from '../../src/game/a1ErrorCue';
import type { HelpVariant } from '../../src/domain/assistance';

// Inject only test transport, before the unchanged production bundle. No app fixture.
const transport = readFileSync('tools/qa/assistance-native-transport.mjs', 'utf8').replace('export function controlledNative', 'function controlledNative');
type Notes = { next: A1CueMode; attempts: Record<string, A1CueMode>; trace: {event:string;mode:string;owner:{attempt:string};cancelled?:string}[] };
const saved = (p: Page): Promise<GameSave> => p.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
const notes = (p: Page): Promise<Notes | null> => p.evaluate(key => JSON.parse(localStorage.getItem(key)!), A1_CUE_KEY);
const trace = async (p: Page) => (await notes(p))?.trace ?? [];
const qa = (p: Page, name: string, ...args: unknown[]) => p.evaluate(({name,args}) => Reflect.get(window,'assistanceQA')[name](...args), {name,args});
const ads = (p: Page): Promise<number> => p.evaluate(() => Reflect.get(window,'assistanceQA').snapshot().events.filter((e:{event:string})=>e.event==='ad_session').length);
function seed(variant: HelpVariant = 'single-v2', removed = 21) {
  const s=freshSave(); s.index=39; s.campaign=freshAttempt(campaign[39]!);
  const b=new Board(s.campaign.level,s.campaign.board.id); for(let i=0;i<removed;i++)b.activate(`c40-${i}`);
  s.campaign.board=b.snapshot();s.campaign.started=true;s.freeContinueUsed=true;s.helpLedger.assignments[b.attemptId]=variant;
  s.wins=campaign.slice(0,39).map((l,i)=>({attempt:`before-${i}`,levelId:l.id,activeMs:1000,completedAt:1000+i,mistakes:0}));
  s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=['collection','calendar'];return decodeSave(s);
}
async function boot(page:Page, mode:A1CueMode='cue', options:{variant?:HelpVariant;old?:boolean;removed?:number;errors?:string[];state?:GameSave}={}) {
  const s=options.state??seed(options.variant, options.removed); if(options.errors)s.campaign.board={...s.campaign.board,errors:options.errors,lives:2};
  await page.addInitScript({content:`${transport}\ncontrolledNative(${JSON.stringify({save:s,preserve:true,settings:{version:1,language:'en',theme:'dark',sound:true,vibration:true}})});`});
  await page.addInitScript(({key,id,mode,old,version})=>{
    if(!old&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,next:mode,attempts:{[id]:mode},trace:[]}));
    Reflect.set(window,'cueMotion',[]);
    const animate=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){
      if(this.classList.contains('a1-error-cue'))Reflect.get(window,'cueMotion').push({at:performance.now(),frames,options,hearts:document.querySelector('#hearts')!.getAnimations({subtree:true}).length,version});
      return animate.call(this,frames,options);
    };
  },{key:A1_CUE_KEY,id:s.campaign.board.id,mode,old:options.old??false,version:A1_CUE_VERSION});
  await page.goto('/');await page.locator('#home-play:enabled').click();
  await expect(page.locator('.route-snapshot,.board-transition')).toHaveCount(0);
  return s;
}
async function settled(page:Page){await page.locator('#hint:visible').waitFor();await expect.poll(()=>page.locator('#hint').evaluate(e=>e.getAnimations().length)).toBe(0);}
async function tap(page:Page,id:string){const s=await saved(page),c=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!),p=s.campaign.level.arrows.find(a=>a.id===id)!.path.at(-1)!;await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);}
async function error(page:Page,id='c40-23'){const n=await page.evaluate(()=>Reflect.get(window,'assistanceQA').snapshot().events.filter((e:{event:string})=>e.event==='level_error').length);await tap(page,id);await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'assistanceQA').snapshot().events.filter((e:{event:string})=>e.event==='level_error').length)).toBe(n+1);}
const count = async (p:Page,event:string) => (await trace(p)).filter(t=>t.event===event).length;
async function opportunity(p:Page){await expect.poll(()=>count(p,'opportunity')).toBe(1);}
async function shown(p:Page){await expect.poll(()=>count(p,'shown')).toBe(1);}

for(const mode of ['off','control','cue'] as const)test(`Q01–03 ${mode}: one eligible first error, finite independent layer`,async({page})=>{
  await boot(page,mode);await settled(page);const before=await saved(page),rect=await page.locator('#hint').boundingBox();
  await error(page);
  if(mode==='cue'){
    await opportunity(page);await shown(page);expect(await page.locator('#hint').boundingBox()).toEqual(rect);
    const frames=await page.evaluate(()=>Reflect.get(window,'cueMotion'));expect(frames).toHaveLength(1);expect(frames[0].options.duration).toBe(1200);expect(frames[0].hearts).toBe(0);
    expect(frames[0].frames.map((f:Keyframe)=>f.transform).filter(Boolean)).toEqual([]);
    await expect(page.locator('.a1-error-cue')).toHaveCount(0);
  }else{await page.waitForTimeout(1900);expect(await count(page,'opportunity')).toBe(mode==='control'?1:0);expect(await count(page,'shown')).toBe(0);expect(await page.locator('.a1-error-cue').count()).toBe(0);}
  const after=await saved(page);expect(after.campaign.board.errors).toEqual(['c40-23']);expect(after.campaign.board.lives).toBe(2);expect(after.campaign.board.removed).toEqual(before.campaign.board.removed);
  expect(after.helpLedger.rights).toEqual(before.helpLedger.rights);expect(await ads(page)).toBe(0);
  expect((await trace(page)).every(t=>!('board'in t)&&!('plan'in t))).toBe(true);
});
test('Q04–05 repeat/new arrow preserve lives/history and never add a second opportunity',async({page})=>{
  await boot(page);await settled(page);await error(page);await shown(page);await error(page);expect((await saved(page)).campaign.board.lives).toBe(2);
  await page.waitForTimeout(1000);await error(page,'c40-24');await page.waitForTimeout(1500);
  expect((await saved(page)).campaign.board.errors).toEqual(['c40-23','c40-24']);expect((await saved(page)).campaign.board.lives).toBe(1);expect(await count(page,'opportunity')).toBe(1);
});
for(const when of ['early','arrival','same-action-sample'] as const)test(`Q06–07 ${when}: no cue from new Hint appearance`,async({page})=>{
  await boot(page);
  if(when==='arrival')await page.waitForFunction(()=>document.querySelector('#hint')!.getAnimations().length>0);
  if(when==='same-action-sample'){
    await page.waitForTimeout(2100);await expect(page.locator('#hint')).toBeHidden();
    // Only this test advances the performance clock; the app gate is unchanged.
    await page.evaluate(()=>{const now=performance.now.bind(performance);performance.now=()=>now()+950;});
  }
  await error(page);await settled(page);await page.waitForTimeout(1000);expect(await trace(page)).toEqual([]);expect(await page.locator('.a1-error-cue').count()).toBe(0);
});
for(const phase of ['idle','loading','backoff','unavailable','disabled'])test(`Q08 visible ${phase} is not ready`,async({page})=>{
  await boot(page);await settled(page);await qa(page,'readinessPhase',phase);await expect(page.locator('#hint')).toHaveAttribute('data-readiness',phase);
  await expect(page.locator('#hint')).toBeEnabled();await error(page);await qa(page,'lateReady');await page.waitForTimeout(1800);expect(await trace(page)).toEqual([]);
});
for(const during of [false,true])test(`Q09 readiness expires ${during?'during visible cue':'before paint'}`,async({page})=>{
  await boot(page);await settled(page);await error(page);await opportunity(page);
  if(during)await shown(page);
  await qa(page,'readinessPhase','ready',1);await page.waitForTimeout(100);await expect(page.locator('.a1-error-cue')).toHaveCount(0);await page.waitForTimeout(1500);
  expect(await count(page,'opportunity')).toBe(1);expect(await count(page,'shown')).toBe(during?1:0);await expect(page.locator('#hint')).toHaveAttribute('data-readiness','expired');
});
for(const variant of ['legacy','cascade-v1','route-v1','continue-single-v1'] as const)test(`Q10 excludes assigned ${variant} including single fallback`,async({page})=>{
  await boot(page,'cue',{variant,removed:variant==='cascade-v1'?32:variant==='route-v1'?25:21});await settled(page);
  const s=await saved(page),b=new Board(s.campaign.level,s.campaign.board.id,s.campaign.board),blocked=b.remaining.find(a=>!canExit(a,b.remaining))!;
  await error(page,blocked.id);await page.waitForTimeout(1800);expect(await trace(page)).toEqual([]);expect(await ads(page)).toBe(0);
});
test('Q11 quick accepted correct move cancels pending signal without waiting for error motion',async({page})=>{
  await boot(page);await settled(page);await error(page);await opportunity(page);const s=await saved(page),b=new Board(s.campaign.level,s.campaign.board.id,s.campaign.board),id=b.hint()!;await tap(page,id);
  await expect.poll(async()=>(await saved(page)).campaign.board.removed.includes(id)).toBe(true);await page.waitForTimeout(1800);
  expect(await count(page,'opportunity')).toBe(1);expect(await count(page,'shown')).toBe(0);expect(await page.locator('.a1-error-cue').count()).toBe(0);
});
for(const during of [false,true])test(`Q12 Hint activation ${during?'during':'before'} paint requests exactly once`,async({page})=>{
  await boot(page);await settled(page);await error(page);await opportunity(page);if(during)await shown(page);
  await page.locator('#hint').click();await expect.poll(()=>ads(page)).toBe(1);await expect(page.locator('.a1-error-cue')).toHaveCount(0);
  await qa(page,'shown');await qa(page,'earned');await qa(page,'dismiss');await expect.poll(async()=>(await saved(page)).campaign.hint).not.toBeNull();
  expect(Object.keys((await saved(page)).helpLedger.requests)).toHaveLength(1);expect(await ads(page)).toBe(1);expect(await count(page,'shown')).toBe(during?1:0);
});
for(const action of ['menu','modal','settings','background','resize','language'] as const)test(`Q14 ${action} cancels pending/visible cue without replay`,async({page})=>{
  await boot(page);await settled(page);await error(page);await shown(page);
  if(action==='menu')await page.locator('#choose-field').click();
  if(action==='modal')await page.locator('#restart').click();
  if(action==='settings'||action==='language')await page.locator('#game-settings').click();
  if(action==='language')await page.locator('#setting-language').selectOption('ru');
  if(action==='background')await qa(page,'background',true);
  if(action==='resize')await page.setViewportSize({width:360,height:760});
  await expect(page.locator('.a1-error-cue')).toHaveCount(0);
  if(action==='menu')await page.locator('#home-play').click();
  if(action==='modal')await page.locator('[data-action=cancel]').click();
  if(action==='settings'||action==='language')await page.locator('#close-settings').click();
  if(action==='background')await qa(page,'background',false);
  await page.waitForTimeout(1700);expect(await count(page,'shown')).toBe(1);expect(await page.locator('.a1-error-cue').count()).toBe(0);
});
for(const input of ['centre','left','right','cancel','keyboard'] as const)test(`Q15 ${input} Hint hold keeps its actual hit rectangle`,async({page,context})=>{
  await boot(page);await settled(page);await error(page);await shown(page);const h=page.locator('#hint'),r=(await h.boundingBox())!,x=input==='left'?r.x+2:input==='right'?r.x+r.width-2:r.x+r.width/2,y=r.y+r.height/2;
  if(input==='keyboard'){await h.focus();await page.keyboard.press('Enter');}
  else {
    const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await page.waitForTimeout(180);
    expect(await h.boundingBox()).toEqual(r);await expect(page.locator('.a1-error-cue')).toHaveCount(0);await expect(h.locator('.ui-press-feedback')).toHaveCount(1);
    await session.send('Input.dispatchTouchEvent',{type:input==='cancel'?'touchCancel':'touchEnd',touchPoints:[]});
  }
  await expect.poll(()=>ads(page)).toBe(input==='cancel'?0:1);await expect(page.locator('.a1-error-cue')).toHaveCount(0);
});
for(const theme of ['light','dark'])test(`Q16 reduced motion ${theme}, narrow layout, finite opacity only`,async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:700});await boot(page);
  await page.locator('#game-settings').click();await page.locator(`#theme-${theme}`).click();await page.locator('#close-settings').click();await settled(page);
  const before=await page.locator('#hint').boundingBox();await error(page);await shown(page);expect(await page.locator('#hint').boundingBox()).toEqual(before);
  const animations=await page.evaluate(()=>Reflect.get(window,'cueMotion'));expect(animations[0].options.duration).toBe(400);expect(animations[0].frames).toEqual([{opacity:1},{opacity:1}]);
  await expect(page.locator('.a1-error-cue')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('#hint [data-help-label]')).toBeVisible();await expect(page.locator('#hint [data-help-readiness]')).toBeVisible();await expect(page.locator('#hint .video-mark')).toBeVisible();
});
test('Q18 reload after error does not replay and retains exact board/camera',async({page})=>{
  await boot(page);await settled(page);await error(page);await shown(page);await page.waitForTimeout(550);const before=await saved(page),camera=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);
  await page.reload();await page.locator('#home-play').click();await settled(page);await page.waitForTimeout(1200);const after=await saved(page);
  expect(after.campaign.board).toEqual(before.campaign.board);expect(after.campaign.hint).toBe(before.campaign.hint);expect(after.helpLedger.rights).toEqual(before.helpLedger.rights);
  const restored=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);for(const k of ['x','y','scale'])expect(restored[k]).toBeCloseTo(camera[k],9);
  expect(await count(page,'shown')).toBe(1);expect(await page.evaluate(()=>Reflect.get(window,'cueMotion').length)).toBe(0);
});
for(const old of [false,true])test(`Q19 future choice never reassigns ${old?'old missing metadata':'bound control'} attempt across reload`,async({page})=>{
  const initial=await boot(page,'control',{old});await page.locator('#game-settings').click();await page.locator('#a1-cue-qa-mode:enabled').selectOption('cue');await page.locator('#help-qa-variant').selectOption('single-v2');await expect.poll(async()=>(await notes(page))?.next).toBe('cue');
  await page.reload();await page.locator('#home-play').click();await settled(page);await error(page);await page.waitForTimeout(1700);
  expect(await count(page,'opportunity')).toBe(old?0:1);expect(await count(page,'shown')).toBe(0);
  await page.locator('#restart').click();await page.locator('[data-action=confirm-restart]').click();
  await expect.poll(async()=>(await saved(page)).campaign.board.id).not.toBe(initial.campaign.board.id);const fresh=await saved(page);
  await expect.poll(async()=>(await notes(page))?.attempts[fresh.campaign.board.id]).toBe('cue');expect(fresh.helpLedger.assignments[initial.campaign.board.id]).toBe('single-v2');
  // The A1 assignment is an independent choice and remains whatever it was.
  expect(fresh.helpLedger.nextVariant).toBe('single-v2');expect(fresh.schema).toBe(initial.schema);
  await settled(page);const b=new Board(fresh.campaign.level,fresh.campaign.board.id,fresh.campaign.board),blocked=b.remaining.find(a=>!canExit(a,b.remaining))!;await error(page,blocked.id);await expect.poll(()=>count(page,'shown')).toBe(1);
});

async function promisedState() {
  const initial=seed(), memory=new Map([[SAVE_KEY,JSON.stringify(initial)]]),store=new ProgressStore({async getItem(k){return memory.get(k)??null;},async setItem(k,v){memory.set(k,v);},async removeItem(k){memory.delete(k);}});
  await store.load();const offer=store.helpOffer(initial.campaign.board.id)!,request=(await store.prepareHelpRequest(offer))!;
  return {store,request,receipt:{schema:2 as const,intentVersion:1 as const,id:request.requestId,requestId:request.requestId,attempt:request.owner.attempt,mode:request.owner.mode,placement:'hint' as const}};
}
for(const during of [false,true])test(`Q13 late earned receipt ${during?'during':'before'} cue owns its frozen plan`,async({page})=>{
  const {store,request,receipt}=await promisedState();await boot(page,'cue',{state:store.state});await settled(page);await error(page);await opportunity(page);if(during)await shown(page);
  await qa(page,'late',receipt);await expect.poll(async()=>(await saved(page)).campaign.hint).not.toBeNull();await expect(page.locator('.a1-error-cue')).toHaveCount(0);
  const after=await saved(page);expect(after.helpLedger.rights[receipt.id]!.plan).toEqual(request.plan);expect(after.campaign.board.errors).toEqual(['c40-23']);expect(after.campaign.board.lives).toBe(2);expect(await ads(page)).toBe(0);
  await page.waitForTimeout(1600);expect(await count(page,'shown')).toBe(during?1:0);store.destroy();
});
for(const reserved of [false,true])test(`Q10/Q18 ${reserved?'reserved':'active'} earned A1 is not an advertisement cue and survives reload`,async({page})=>{
  const {store,receipt}=await promisedState();await store.commitReward(receipt);
  if(reserved){await store.setNextHelpVariant('single-v2');await store.restart(store.state.campaign.board.id);}
  const initial=store.state, plan=JSON.stringify(initial.helpLedger.rights);await boot(page,'cue',{state:initial});if(reserved)await settled(page);else await expect(page.locator('#hint')).toBeHidden();
  const board=new Board(initial.campaign.level,initial.campaign.board.id,initial.campaign.board),blocked=board.remaining.find(a=>!canExit(a,board.remaining))!;await error(page,blocked.id);expect(await trace(page)).toEqual([]);
  if(reserved){await qa(page,'backoff');await page.locator('#hint').click();await expect.poll(async()=>(await saved(page)).campaign.hint).not.toBeNull();expect(await ads(page)).toBe(0);}
  const current=await saved(page);await page.reload();await page.locator('#home-play').click();await page.waitForTimeout(1500);
  expect((await saved(page)).campaign.board).toEqual(current.campaign.board);expect((await saved(page)).helpLedger.rights).toEqual(current.helpLedger.rights);expect(await trace(page)).toEqual([]);
  expect(plan).toContain('single-v2');store.destroy();
});
test('Q14 restart cancels its cue and the new attempt binds the future preference',async({page})=>{
  await boot(page);await settled(page);await error(page);await shown(page);const before=(await saved(page)).campaign.board.id;
  await page.locator('#restart').click();await page.locator('[data-action=confirm-restart]').click();await expect.poll(async()=>(await saved(page)).campaign.board.id).not.toBe(before);
  await expect(page.locator('.a1-error-cue')).toHaveCount(0);await page.waitForTimeout(1500);expect(await count(page,'shown')).toBe(1);
});
test('Q17 real calendar unlock keeps its presentation while first-error cue is skipped',async({page})=>{
  const s=seed();s.index=18;s.campaign=freshAttempt(campaign[18]!);s.campaign.started=true;s.campaign.board={...s.campaign.board,removed:s.campaign.level.arrows.slice(0,-1).map(a=>a.id)};
  s.helpLedger.assignments[s.campaign.board.id]='single-v2';s.helpLedger.nextVariant='single-v2';s.wins=s.wins.slice(0,18);s.seenUnlocks=['collection'];
  await boot(page,'cue',{state:decodeSave(s)});await tap(page,s.campaign.level.arrows.at(-1)!.id);await page.locator('#next:visible').click();await page.locator('.game-unlock').waitFor();
  // Speed only the existing idle sampler; the real finite unlock/WAAPI keeps its clock.
  await page.evaluate(()=>{const now=performance.now.bind(performance),start=now();performance.now=()=>start+(now()-start)*6;});
  await settled(page);await expect(page.locator('.game-unlock')).toBeVisible();
  const a=(await saved(page)).campaign,b=new Board(a.level,a.board.id,a.board),blocked=b.remaining.find(v=>!canExit(v,b.remaining))!;
  await error(page,blocked.id);await expect(page.locator('.game-unlock')).toBeVisible();expect(await trace(page)).toEqual([]);
  await expect(page.locator('.game-unlock')).toHaveCount(0);expect(await page.locator('.a1-error-cue').count()).toBe(0);
});
test('Q01/Q10 production browser and isolated B1 have no candidate or trace',async({page})=>{
  await page.goto('/');await page.locator('#home-settings').click();await expect(page.locator('#a1-cue-qa-mode')).toHaveCount(0);expect(await notes(page)).toBeNull();
  await page.goto('/target-lab.html');await page.locator('#lab-options summary').click();await page.locator('#lab-help').selectOption('single');await page.locator('#lab-restart').click();await page.locator('#lab-hint').click();await page.waitForTimeout(700);expect(await notes(page)).toBeNull();expect(await page.locator('.a1-error-cue').count()).toBe(0);
});
test('Q14 foreground roundtrip while the first-error writer is pending cannot revive a stale cue',async({page})=>{
  await boot(page);await settled(page);await qa(page,'deferProgressWrite',700);await tap(page,'c40-23');await qa(page,'background',true);await qa(page,'background',false);
  await expect.poll(async()=>(await saved(page)).campaign.board.errors).toEqual(['c40-23']);await page.waitForTimeout(1800);expect(await trace(page)).toEqual([]);expect((await saved(page)).campaign.board.lives).toBe(2);
});
for(const variant of ['cascade-v1','route-v1'] as const)test(`Q10 disabled ${variant} offers actual single-v2 fallback without cue`,async({page})=>{
  const s=seed(variant);s.helpLedger.candidateEnabled=false;await boot(page,'cue',{state:s});await settled(page);await expect(page.locator('#hint')).toHaveAttribute('data-help-effect','single-v2');await error(page);await page.waitForTimeout(1700);expect(await trace(page)).toEqual([]);
});
test('Q14 native Back clears visible cue; returning cannot replay it',async({page})=>{
  await boot(page);await settled(page);await error(page);await shown(page);await qa(page,'back');await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','home');await expect(page.locator('.a1-error-cue')).toHaveCount(0);
  await page.locator('#home-play').click();await settled(page);await page.waitForTimeout(1000);expect(await count(page,'shown')).toBe(1);
});
