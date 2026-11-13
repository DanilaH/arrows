import {test,expect,type Page} from '@playwright/test';
import {campaign} from '../../src/content/campaign';
import {Board} from '../../src/domain/board';
import {freshSave,freshAttempt,SAVE_KEY,decodeSave} from '../../src/progression/save';
import {openAssistanceReview} from './helpers/assistanceReview';
async function seed(page:Page){
  await page.addInitScript(()=>{let count=0;const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>raf(time=>{count++;callback(time);});Object.defineProperty(window,'assistanceFrameCount',{get:()=>count});});
  const s=freshSave();s.index=39;s.campaign=freshAttempt(campaign[39]!);const b=new Board(s.campaign.level,s.campaign.board.id);
  for(let i=0;i<=20;i++)b.activate(`c40-${i}`);s.campaign.board=b.snapshot();s.campaign.started=true;s.helpLedger.assignments[b.attemptId]='cascade-v1';s.tutorials=['tap','error','hint','zoom'];
  s.wins=campaign.slice(0,39).map((l,i)=>({attempt:`seed-${i}`,levelId:l.id,activeMs:1000,completedAt:1000+i,mistakes:0}));decodeSave(s);
  await page.addInitScript(({s,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(s));},{s,key:SAVE_KEY});
  await openAssistanceReview(page);await page.locator('#home-play').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','19');
}
async function tap(page:Page,id:string){const p=campaign[39]!.arrows.find(a=>a.id===id)!.path.at(-1)!;const c=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);}
const saved=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),SAVE_KEY);
for(const marked of [false,true])test(`fixed cascade actual writer/input ${marked?'with two native marked members':'with ordinary members'}`,async({page})=>{
  await seed(page);await expect(page.locator('#hint')).toContainText('Cascade +3');await page.locator('#hint').click();
  await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'assistanceFixture').snapshot().shows)).toBe(1);
  const request=await page.evaluate(()=>Reflect.get(window,'assistanceFixture').snapshot().request);expect(request.intentVersion).toBe(1);
  expect((await saved(page)).helpLedger.requests[request.requestId].plan.bonus).toEqual(['c40-23','c40-24','c40-27']);
  await page.evaluate(()=>{const f=Reflect.get(window,'assistanceFixture');f.shown();f.earn();f.dismiss();});
  await expect(page.locator('#game-root')).toHaveAttribute('data-help-group',JSON.stringify(['c40-23','c40-24','c40-27']));
  if(marked){await tap(page,'c40-23');await expect(page.locator('#hearts .empty')).toHaveCount(1);await tap(page,'c40-24');await expect(page.locator('#hearts .empty')).toHaveCount(2);}
  await tap(page,'c40-22');await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','15');
  const after=await saved(page),right=after.helpLedger.rights[request.requestId];expect(right.status).toBe('used');expect(right.operation.manual).toEqual(['c40-22']);
  expect(right.operation.native).toEqual(marked?['c40-23','c40-24']:[]);expect(right.operation.bonus).toEqual(marked?['c40-27']:['c40-23','c40-24','c40-27']);expect(after.campaign.board.lives).toBe(marked?1:3);
  await page.evaluate(()=>Reflect.get(window,'assistanceFixture').duplicate());expect((await saved(page)).campaign.board).toEqual(after.campaign.board);
  await page.waitForTimeout(3000);const first=await page.evaluate(()=>Reflect.get(window,'assistanceFrameCount') as number);expect(first).toBeGreaterThan(0);await page.waitForTimeout(500);expect(await page.evaluate(()=>Reflect.get(window,'assistanceFrameCount') as number)-first).toBeLessThanOrEqual(2);
});

test('restores the exact earned group quietly, then uses it without another show',async({page})=>{
  await seed(page);await page.locator('#hint:visible').click();await expect.poll(()=>page.evaluate(()=>!!Reflect.get(window,'assistanceFixture').snapshot().request)).toBe(true);
  await page.evaluate(()=>{const f=Reflect.get(window,'assistanceFixture');f.shown();f.earn();f.dismiss();});
  await expect(page.locator('#game-root')).toHaveAttribute('data-help-group',JSON.stringify(['c40-23','c40-24','c40-27']));
  const before=await saved(page);await page.reload();await page.locator('#home-play').click();await expect(page.locator('.board-transition,.route-snapshot')).toHaveCount(0);
  await expect(page.locator('#game-root')).toHaveAttribute('data-help-group',JSON.stringify(['c40-23','c40-24','c40-27']));
  expect((await saved(page)).campaign.board).toEqual(before.campaign.board);expect(await page.evaluate(()=>Reflect.get(window,'assistanceFixture').snapshot().shows)).toBe(0);
  await tap(page,'c40-22');await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','15');
});
