import { test, expect, type Page } from '@playwright/test';
import { campaign } from '../../src/content/campaign';
import { Board, canExit } from '../../src/domain/board';
import { freshSave, freshAttempt, decodeSave, SAVE_KEY } from '../../src/progression/save';
import { openAssistanceReview } from './helpers/assistanceReview';

async function observe(page: Page) {
  await page.addInitScript(() => {
    const cues: {duration:number; at:number; modal:boolean}[]=[]; Reflect.set(window,'assistanceCues',cues);
    const start=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args){ if(this.buffer)cues.push({duration:this.buffer.duration,at:performance.now(),modal:!!document.querySelector('dialog[open]')});return start.apply(this,args); };
    const animations: {delay:number; modal:boolean}[]=[]; Reflect.set(window,'heartAnimations',animations);
    const animate=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){ if(this.parentElement?.id==='hearts')animations.push({delay:typeof options==='object'?Number(options.delay??0):0,modal:!!document.querySelector('dialog[open]')});return animate.call(this,frames,options); };
  });
}
async function seed(page: Page, lost: boolean, continued=false) {
  const index=campaign.findIndex((l,i)=>i>=4&&l.arrows.filter(a=>!canExit(a,l.arrows)).length>=6),level=campaign[index]!;
  const state=freshSave(),attempt=freshAttempt(level),board=new Board(level,attempt.board.id);
  if(lost){const errors=level.arrows.filter(a=>!canExit(a,level.arrows)).slice(0,continued?6:3).map(a=>a.id);attempt.board={...board.snapshot(),errors,lives:0};attempt.freeUsed=continued;attempt.continuations=continued?1:0;}
  attempt.started=true;state.index=index;state.campaign=attempt;
  state.wins=campaign.slice(0,index).map((l,i)=>({attempt:`fixture-${i}`,levelId:l.id,activeMs:1000,completedAt:i*1000,localDate:'1970-01-01',mistakes:0}));decodeSave(state);
  await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:SAVE_KEY,state});return state;
}
const cueCount=(page:Page,duration:number)=>page.evaluate(d=>(Reflect.get(window,'assistanceCues') as {duration:number}[]).filter(c=>Math.abs(c.duration-d)<.001).length,duration);
const heartEvents=(page:Page)=>page.evaluate(()=>Reflect.get(window,'heartAnimations') as {delay:number;modal:boolean}[]);
const saved=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),SAVE_KEY);
async function fixture(page:Page,lost:boolean,continued=false){await observe(page);const state=await seed(page,lost,continued);await openAssistanceReview(page);await page.locator('#home-play:enabled').click();return state;}

test('refills three redesigned hearts after the free-continuation dialog closes and never replays on restore',async({page})=>{
  await observe(page);const state=await seed(page,true);await page.goto('/');await page.locator('#home-play:enabled').click();
  await page.locator('[data-action=free-continue]').click();
  await expect(page.locator('#game-dialog')).not.toBeVisible();await expect.poll(()=>cueCount(page,.38)).toBe(1);
  expect(await heartEvents(page)).toEqual([{delay:0,modal:false},{delay:75,modal:false},{delay:150,modal:false}]);
  const after=await saved(page);expect(after.campaign.board.errors).toEqual(state.campaign.board.errors);expect(after.campaign.board.removed).toEqual(state.campaign.board.removed);expect(after.campaign.continuations).toBe(1);
  await expect(page.locator('#hearts svg')).toHaveCount(3);await expect(page.locator('#hearts .empty')).toHaveCount(0);
  await page.reload();await page.locator('#home-play:enabled').click();await page.waitForTimeout(650);expect(await cueCount(page,.38)).toBe(0);expect(await heartEvents(page)).toEqual([]);
});

for(const foregroundFirst of [true,false])test(`presents earned lives once after ${foregroundFirst?'foreground then dismissal':'dismissal then foreground'}`,async({page})=>{
  const before=await fixture(page,true,true);await page.locator('[data-action=rewarded-continue]').click();
  await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'assistanceFixture').snapshot().shows)).toBe(1);
  expect(await page.evaluate(()=>Reflect.get(window,'assistanceFixture').snapshot().blocked)).toEqual(['ad']);
  await page.evaluate(()=>{const f=Reflect.get(window,'assistanceFixture');f.shown();f.background(true);f.earn();});
  await expect.poll(async()=>(await saved(page)).campaign.board.lives).toBe(3);expect(await cueCount(page,.38)).toBe(0);expect(await heartEvents(page)).toEqual([]);
  await page.evaluate(first=>{const f=Reflect.get(window,'assistanceFixture');if(first)f.background(false);else f.dismiss();},foregroundFirst);
  await page.waitForTimeout(350);expect(await cueCount(page,.38)).toBe(0);
  await page.evaluate(first=>{const f=Reflect.get(window,'assistanceFixture');if(first)f.dismiss();else f.background(false);},foregroundFirst);
  await expect.poll(()=>cueCount(page,.38)).toBe(1);expect(await heartEvents(page)).toHaveLength(3);
  await page.evaluate(()=>Reflect.get(window,'assistanceFixture').duplicate());await page.waitForTimeout(650);expect(await cueCount(page,.38)).toBe(1);expect(await heartEvents(page)).toHaveLength(3);
  const after=await saved(page);expect(after.campaign.continuations).toBe(2);expect(after.campaign.board.errors).toEqual(before.campaign.board.errors);
});

test('traces an earned hint after return without making a move or replaying the cue',async({page})=>{
  const before=await fixture(page,false);await page.locator('#hint:visible').click();
  await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'assistanceFixture').snapshot().shows)).toBe(1);
  await page.evaluate(()=>{const f=Reflect.get(window,'assistanceFixture');f.shown();f.earn();});
  await expect.poll(async()=>!!(await saved(page)).campaign.hint).toBe(true);expect(await cueCount(page,.32)).toBe(0);
  const dismissed=await page.evaluate(()=>{Reflect.get(window,'assistanceFixture').dismiss();return performance.now();});
  await expect.poll(()=>cueCount(page,.32)).toBe(1);
  const cue=await page.evaluate(()=>(Reflect.get(window,'assistanceCues') as {duration:number;at:number;modal:boolean}[]).find(c=>Math.abs(c.duration-.32)<.001)!);expect(cue.at-dismissed).toBeGreaterThanOrEqual(300);expect(cue.modal).toBe(false);
  expect((await saved(page)).campaign.board).toEqual(before.campaign.board);
  await page.evaluate(()=>Reflect.get(window,'assistanceFixture').duplicate());await page.waitForTimeout(900);expect(await cueCount(page,.32)).toBe(1);
});

test('settles heart motion on background without stale replay',async({page})=>{
  await fixture(page,true);await page.locator('[data-action=free-continue]').click();await expect.poll(()=>cueCount(page,.38)).toBe(1);
  await page.evaluate(()=>Reflect.get(window,'assistanceFixture').background(true));
  expect(await page.locator('#hearts').evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);
  await page.evaluate(()=>Reflect.get(window,'assistanceFixture').background(false));await page.waitForTimeout(600);expect(await cueCount(page,.38)).toBe(1);expect(await heartEvents(page)).toHaveLength(3);
});

test('keeps recovery correct with reduced motion and narrow light UI',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'light'});await page.setViewportSize({width:320,height:640});await fixture(page,true);
  await page.locator('[data-action=free-continue]').click();await expect.poll(()=>cueCount(page,.38)).toBe(1);expect(await heartEvents(page)).toEqual([]);
  expect(await page.locator('#game-header').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await expect(page.locator('#hearts .empty')).toHaveCount(0);
});

test('advances the completed field once, animates the label and returns to idle',async({page})=>{
  await page.goto('/');await page.locator('#home-play:enabled').click();await page.waitForTimeout(450);
  const board=new Board(campaign[0]!,'oracle');while(!board.complete){const a=board.remaining.find(a=>canExit(a,board.remaining))!,c=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!),p=a.path.at(-1)!;await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);board.activate(a.id);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining',String(board.remaining.length));}
  await expect(page.locator('#win')).toBeVisible();await page.locator('#next').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-level','c02');
  expect((await saved(page)).index).toBe(1);await page.waitForTimeout(900);expect(await page.evaluate(()=>document.getAnimations().length)).toBe(0);
});
