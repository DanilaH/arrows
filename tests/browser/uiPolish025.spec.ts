import {test, expect, type Page} from '@playwright/test';
import {campaign} from '../../src/content/campaign';
import {Board} from '../../src/domain/board';
import {freshSave, freshAttempt, SAVE_KEY} from '../../src/progression/save';
import {openAssistanceReview} from './helpers/assistanceReview';

async function ready(page: Page) {
  await page.goto('/'); await expect(page.locator('#home-play')).toBeEnabled();
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(250);
}
for (const input of ['mouse','touch'] as const) test(`${input} holds preserve edge activation and fixed button geometry`, async ({page,context}) => {
  await ready(page);
  const touch = input==='touch' ? await context.newCDPSession(page) : null;
  for (const [edge, hold] of [['left',50],['right',100],['left',400]] as const) {
    const button=page.locator('#home-play'), before=(await button.boundingBox())!;
    const p={x:edge==='left'?before.x+2:before.x+before.width-2,y:before.y+before.height/2};
    if(touch)await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...p}]});
    else {await page.mouse.move(p.x,p.y);await page.mouse.down();}
    await page.waitForTimeout(hold); expect(await button.boundingBox()).toEqual(before);
    if(touch)await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
    await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','game');
    await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','3');
    await page.locator('#choose-field').click(); await expect(page.locator('.route-snapshot,.board-transition')).toHaveCount(0);
  }
  const b=(await page.locator('#home-play').boundingBox())!,p={x:b.x+b.width/2,y:b.y+b.height/2};
  if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...p}]});await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});}
  else {await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(2,2);await page.mouse.up();}
  await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','home');
  await expect(page.locator('[data-pressed=true],.ui-press-feedback')).toHaveCount(0);
});

test('B1 centre hold preserves authored centring and grants exactly its own help',async({page})=>{
  await page.goto('/target-lab.html');await expect(page.locator('#game-shell')).toHaveAttribute('data-status','ready');
  await page.locator('#lab-options summary').click();await page.locator('#lab-help').selectOption('single');await page.locator('#lab-restart').click();
  const button=page.locator('#lab-hint'),before=(await button.boundingBox())!;
  await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();await page.waitForTimeout(150);
  expect(await button.boundingBox()).toEqual(before);await page.mouse.up();await expect(button).toBeHidden();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.target-lab.v1')!).attempts['b1-01'].helpUsed)).toBe(true);
});

test('early modal close starts from its displayed state and leaves focus usable',async({page})=>{
  await ready(page);
  for(const delay of [16,35,65,100]){
    const sample=await page.evaluate(async delay=>{
      const button=document.querySelector<HTMLButtonElement>('#home-settings')!;button.focus({preventScroll:true});button.click();
      const d=document.querySelector<HTMLDialogElement>('#settings-dialog')!;
      await new Promise(r=>setTimeout(r,delay));
      const read=()=>({opacity:Number(getComputedStyle(d).opacity),y:new DOMMatrix(getComputedStyle(d).transform).m42});
      const before=read();d.dispatchEvent(new Event('cancel',{cancelable:true}));return{before,after:read()};
    },delay);
    expect(Math.abs(sample.before.opacity-sample.after.opacity)).toBeLessThan(.02);
    expect(Math.abs(sample.before.y-sample.after.y)).toBeLessThan(.3);
    await expect(page.locator('#settings-dialog')).not.toBeVisible();await expect(page.locator('#home-settings')).toBeFocused();
  }
  await page.locator('#home-play').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','game');
});

for(const variant of ['route-v1','cascade-v1'] as const) test(`${variant} frames its immutable earned group and yields to manual camera`,async({page})=>{
  const s=freshSave();s.index=39;s.campaign=freshAttempt(campaign[39]!);const b=new Board(s.campaign.level,s.campaign.board.id);
  for(let i=0;i<21;i++)b.activate(`c40-${i}`);s.campaign.board=b.snapshot();s.campaign.started=true;s.campaign.view={centerX:32,centerY:10,zoom:3};
  s.helpLedger.assignments[b.attemptId]=variant;s.wins=campaign.slice(0,39).map((l,i)=>({attempt:`overview-${i}`,levelId:l.id,activeMs:1000,completedAt:i+1,mistakes:0}));
  s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=['collection','calendar'];
  await page.addInitScript(({s,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(s));},{s,key:SAVE_KEY});
  await openAssistanceReview(page);await page.locator('#home-play').click();await page.locator('#hint:visible').click();
  await expect.poll(()=>page.evaluate(()=>!!Reflect.get(window,'assistanceFixture').snapshot().request)).toBe(true);
  await page.evaluate(()=>{const f=Reflect.get(window,'assistanceFixture');f.shown();f.earn();f.dismiss();});
  await expect.poll(()=>page.locator('#game-root').getAttribute(variant==='route-v1'?'data-help-route':'data-help-group')).not.toBe('[]');
  await page.waitForTimeout(400);
  const view=await page.locator('#game-root').evaluate((e,variant)=>{
    const s=JSON.parse(localStorage.getItem('arrows.progress.v1')!),a=s.campaign,c=JSON.parse((e as HTMLElement).dataset.camera!),top=parseFloat((e as HTMLElement).style.getPropertyValue('--board-clear-top')),bottom=parseFloat((e as HTMLElement).style.getPropertyValue('--board-clear-bottom'));
    const ids=[a.hint,...JSON.parse(e.getAttribute(variant==='route-v1'?'data-help-route':'data-help-group')!)];
    const head=a.level.arrows.find((v:{id:string})=>v.id===a.hint).path.at(-1);
    return{root:a.hint as string,head:{x:c.x+head.x*c.scale,y:c.y+head.y*c.scale},width:innerWidth,top,bottom,points:[...new Set(ids)].flatMap(id=>a.level.arrows.find((v:{id:string})=>v.id===id).path.map((p:{x:number;y:number})=>({x:c.x+p.x*c.scale,y:c.y+p.y*c.scale}))),plan:JSON.stringify(Object.values(s.helpLedger.requests).map((r:unknown)=>(r as {plan:unknown}).plan))};
  },variant);
  for(const p of view.points){expect(p.x).toBeGreaterThanOrEqual(12);expect(p.x).toBeLessThanOrEqual(view.width-12);expect(p.y).toBeGreaterThanOrEqual(view.top+12);expect(p.y).toBeLessThanOrEqual(view.bottom-12);}
  // The 320ms overview has settled; the subsequent >=360ms path-light effect
  // need not finish before accepting a real manual move.
  await page.mouse.click(view.head.x,view.head.y);
  await expect.poll(()=>page.evaluate(id=>JSON.parse(localStorage.getItem('arrows.progress.v1')!).campaign.board.removed.includes(id),view.root)).toBe(true);
  await page.mouse.move(190,420);await page.mouse.down();await page.mouse.move(245,455,{steps:3});await page.mouse.up();
  const camera=await page.locator('#game-root').getAttribute('data-camera');await page.waitForTimeout(650);expect(await page.locator('#game-root').getAttribute('data-camera')).toBe(camera);
  expect(await page.evaluate(()=>JSON.stringify(Object.values(JSON.parse(localStorage.getItem('arrows.progress.v1')!).helpLedger.requests).map((r:unknown)=>(r as {plan:unknown}).plan)))).toBe(view.plan);
  await page.reload();await page.locator('#home-play').click();await expect(page.locator('.board-transition,.route-snapshot')).toHaveCount(0);expect(await page.locator('#game-root').getAttribute('data-camera')).toBe(camera);
});
