import { test, expect, type Page } from '@playwright/test';
import { campaign } from '../../src/content/campaign';
import { freshSave, freshAttempt, SAVE_KEY } from '../../src/progression/save';
import { defaultSettings, SETTINGS_KEY } from '../../src/app/settings';
import { dailyDifficulty } from '../../src/content/daily';
import { openAssistanceReview } from './helpers/assistanceReview';

test.use({ hasTouch: true });
async function observe(page: Page) {
  await page.addInitScript(() => {
    const sounds: number[] = [], taps: {x:number;y:number}[] = [];
    Reflect.set(window, '__emptyTapQA', { sounds, taps });
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) { if (this.buffer) sounds.push(this.buffer.duration); return start.apply(this,args); };
    new MutationObserver(records => { for (const r of records) for (const n of r.addedNodes) if(n instanceof HTMLElement && n.classList.contains('empty-tap'))taps.push({x:parseFloat(n.style.left),y:parseFloat(n.style.top)}); }).observe(document,{childList:true,subtree:true});
  });
}
const observed = (page: Page) => page.evaluate(() => Reflect.get(window,'__emptyTapQA') as { sounds:number[];taps:{x:number;y:number}[] });
const board = (page: Page) => page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).campaign, SAVE_KEY);
async function enter(page:Page, review=false) {
  await observe(page); if(review)await openAssistanceReview(page);else await page.goto('/');
  await page.locator('#home-play:enabled').click(); await page.waitForTimeout(500);
  const header=await page.locator('#game-header').boundingBox();return {x:30,y:header!.y+header!.height+50};
}

test('acknowledges empty touches once with bounded visual/audio feedback and no gameplay mutation',async({page})=>{
  const p=await enter(page),before=await board(page),seen=await observed(page);
  await page.touchscreen.tap(p.x,p.y);
  await expect.poll(async()=>(await observed(page)).taps.length).toBe(seen.taps.length+1);
  const added=(await observed(page)).taps.at(-1)!;expect(added.x).toBeCloseTo(p.x);expect(added.y).toBeCloseTo(p.y);
  await expect.poll(async()=>(await observed(page)).sounds.filter(d=>Math.abs(d-.055)<.001).length).toBeGreaterThan(seen.sounds.filter(d=>Math.abs(d-.055)<.001).length);
  expect((await board(page)).board).toEqual(before.board);expect((await board(page)).started).toBe(before.started);
  // Actual completed touches stress the budget; synthetic click must not duplicate them.
  for(let i=0;i<8;i++){await page.touchscreen.tap(p.x+i,p.y);expect(await page.locator('.empty-tap').count()).toBeLessThanOrEqual(4);}
  await page.waitForTimeout(450);await expect(page.locator('.empty-tap')).toHaveCount(0);
  expect((await observed(page)).taps.length).toBe(seen.taps.length+9);expect((await board(page)).board).toEqual(before.board);
});

test('suppresses pan, pinch, long press, cancellation and controls; cancels active feedback on a blocker',async({page})=>{
  const p=await enter(page,true),before=await observed(page);
  await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+25,p.y);await page.mouse.move(p.x,p.y);await page.mouse.up();
  await page.mouse.move(p.x,p.y);await page.mouse.down();await page.waitForTimeout(350);await page.mouse.up();
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:80,y:p.y,id:1},{x:180,y:p.y,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:65,y:p.y,id:1},{x:195,y:p.y,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:65,y:p.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  expect((await observed(page)).taps).toEqual(before.taps);
  await page.touchscreen.tap(p.x,p.y);await expect.poll(async()=>(await observed(page)).taps.length).toBe(before.taps.length+1);
  await page.evaluate(()=>Reflect.get(window,'assistanceFixture').background(true));await expect(page.locator('.empty-tap')).toHaveCount(0);
  await page.touchscreen.tap(p.x,p.y);expect((await observed(page)).taps.length).toBe(before.taps.length+1);
  await page.evaluate(()=>Reflect.get(window,'assistanceFixture').background(false));
  await page.locator('#game-settings').click();await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.mouse.click(p.x,p.y);await expect(page.locator('.empty-tap')).toHaveCount(0);
});

test('retains a finite non-expanding acknowledgement with reduced motion and sound muted',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SETTINGS_KEY,value:{...defaultSettings('ru'),sound:false}});
  const p=await enter(page),before=await observed(page);await page.touchscreen.tap(p.x,p.y);
  await expect.poll(async()=>(await observed(page)).taps.length).toBe(before.taps.length+1);
  expect((await observed(page)).sounds).toEqual(before.sounds);
  await page.waitForTimeout(250);await expect(page.locator('.empty-tap')).toHaveCount(0);
});

for(const theme of ['dark','light'] as const)test(`uses readable distinct Hard/Nightmare labels consistently in ${theme} Home, board and calendar`,async({page},info)=>{
  const colors:string[]=[];
  await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SETTINGS_KEY,value:{...defaultSettings('ru'),theme}});
  for(const difficulty of ['hard','nightmare'] as const){
    const index=campaign.findIndex(l=>l.difficulty===difficulty),state=freshSave();state.index=index;state.campaign=freshAttempt(campaign[index]!);
    state.wins=campaign.slice(0,index).map((l,i)=>({attempt:`color-${i}`,levelId:l.id,activeMs:0,completedAt:0,localDate:'1970-01-01',mistakes:0}));state.seenUnlocks=['collection','calendar'];
    await page.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:SAVE_KEY,state});
    await page.goto('/');await page.locator('#home-play:enabled').waitFor();
    const label=page.locator('.home-difficulty');await expect(label).toHaveAttribute('data-difficulty',difficulty);
    const color=await label.evaluate(e=>getComputedStyle(e).color);colors.push(color);
    const ratio=await label.evaluate(el=>{const lum=(value:string)=>{const c=value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return c[0]!*.2126+c[1]!*.7152+c[2]!*.0722;};const a=lum(getComputedStyle(el).color),b=lum(getComputedStyle(document.body).backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});expect(ratio).toBeGreaterThanOrEqual(4.5);
    await page.locator('#home-play').click();await expect(page.locator('#difficulty')).toHaveAttribute('data-difficulty',difficulty);expect(await page.locator('#difficulty').evaluate(e=>getComputedStyle(e).color)).toBe(color);
    await page.waitForTimeout(500);await page.screenshot({path:info.outputPath(`${theme}-${difficulty}.png`)});
  }
  expect(colors[0]).not.toBe(colors[1]);
  // Internal unlock fixture only, not earned progress and not delivery media.
  const state=freshSave();state.index=19;state.campaign=freshAttempt(campaign[19]!);state.wins=campaign.slice(0,19).map((l,i)=>({attempt:`calendar-${i}`,levelId:l.id,activeMs:0,completedAt:0,localDate:'1970-01-01',mistakes:0}));state.seenUnlocks=['collection','calendar'];
  await page.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:SAVE_KEY,state});await page.clock.setFixedTime(new Date('2026-11-12T12:00:00Z'));await page.goto('/');await page.locator('#home-calendar:enabled').click();
  for(const [i,difficulty] of ['hard','nightmare'].entries()){
    const day=Array.from({length:12},(_,j)=>`2026-11-${String(j+1).padStart(2,'0')}`).find(d=>dailyDifficulty(d)===difficulty)!;
    await page.locator(`[data-date="${day}"]`).click();const label=page.locator('.selected-day > span');await expect(label).toHaveText(difficulty==='hard'?'Hard':'Nightmare');expect(await label.evaluate(e=>getComputedStyle(e).color)).toBe(colors[i]);
  }
});
