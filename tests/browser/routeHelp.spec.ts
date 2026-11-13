import {test,expect,type Page} from '@playwright/test';
import {campaign} from '../../src/content/campaign';
import {freshSave,freshAttempt,SAVE_KEY} from '../../src/progression/save';
import {openAssistanceReview} from './helpers/assistanceReview';
const current=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),SAVE_KEY);
async function open(page:Page){
  const s=freshSave();s.index=19;s.campaign=freshAttempt(campaign[19]!);s.campaign.started=true;s.campaign.view={centerX:33,centerY:45,zoom:2.5};s.helpLedger.assignments[s.campaign.board.id]='route-v1';s.tutorials=['tap','turns','blockers','hint','zoom'];s.seenUnlocks=['collection','calendar'];s.wins=campaign.slice(0,19).map((l,i)=>({attempt:`past-${i}`,levelId:l.id,activeMs:1000,completedAt:1000+i,mistakes:0}));
  await page.addInitScript(({s,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(s));const rates:number[]=[],reveals:number[]=[];Reflect.set(window,'routeRates',rates);Reflect.set(window,'routeRevealCues',reveals);const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer&&Math.abs(this.buffer.duration-.115)<.001)rates.push(Math.round(this.playbackRate.value*1000)/1000);if(this.buffer&&Math.abs(this.buffer.duration-.24)<.001)reveals.push(performance.now());return start.apply(this,args);};},{s,key:SAVE_KEY});
  await openAssistanceReview(page);await page.locator('#home-play').click();await page.locator('#hint:visible').waitFor();await expect(page.locator('#hint')).toContainText('Route · 3 steps');await page.locator('#hint').click();await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'assistanceFixture').snapshot().shows)).toBe(1);await page.evaluate(()=>{const f=Reflect.get(window,'assistanceFixture');f.shown();f.earn();f.dismiss();});await expect(page.locator('#game-root')).toHaveAttribute('data-help-route',JSON.stringify(['c20-9','c20-12','c20-15']));
}
async function tap(page:Page,id:string){const c=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!),p=campaign[19]!.arrows.find(a=>a.id===id)!.path.at(-1)!;await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);}
test('progress is manual and persistent; a long pause does not reset the musical stage',async({page})=>{
  await open(page);await tap(page,'c20-9');await expect.poll(async()=>(await current(page)).campaign.hint).toBe('c20-12');const reveals=await page.evaluate(()=>Reflect.get(window,'routeRevealCues').length);await page.waitForTimeout(1300);expect(await page.evaluate(()=>Reflect.get(window,'routeRevealCues').length)).toBe(reveals);expect((await current(page)).campaign.board.removed).toEqual(['c20-9']);
  await tap(page,'c20-12');await expect.poll(async()=>(await current(page)).campaign.hint).toBe('c20-15');await page.waitForTimeout(65);await tap(page,'c20-15');await expect.poll(async()=>(await current(page)).campaign.hint).toBeNull();
  await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'routeRates'))).toEqual([1,1.06,1.12]);expect((await current(page)).campaign.board.removed).toEqual(['c20-9','c20-12','c20-15']);await expect(page.locator('#win')).not.toBeVisible();
});
test('restores the remaining route and skips native target fulfilment without new manual notes',async({page})=>{
  await open(page);await tap(page,'c20-9');await expect.poll(async()=>(await current(page)).campaign.hint).toBe('c20-12');await page.reload();await page.locator('#home-play').click();await expect(page.locator('.board-transition,.route-snapshot')).toHaveCount(0);
  await expect(page.locator('#game-root')).toHaveAttribute('data-help-route',JSON.stringify(['c20-12','c20-15']));expect(await page.evaluate(()=>Reflect.get(window,'routeRates'))).toEqual([]);
  await tap(page,'c20-15');await expect(page.locator('#hearts .empty')).toHaveCount(1);await tap(page,'c20-12');await expect.poll(async()=>(await current(page)).campaign.hint).toBeNull();
  expect((await current(page)).campaign.board.errors).toEqual(['c20-15']);await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'routeRates'))).toEqual([1.12]);
});
