import {test,expect,type Page} from '@playwright/test';
import {campaign} from '../../src/content/campaign';
import {Board,canExit} from '../../src/domain/board';
import {freshSave,freshAttempt,decodeSave,SAVE_KEY} from '../../src/progression/save';
import {SETTINGS_KEY,defaultSettings} from '../../src/app/settings';

async function observe(page:Page){
  await page.addInitScript(()=>{
    const cues:number[]=[];Reflect.set(window,'victoryCues',cues);let frames=0;const raf=requestAnimationFrame.bind(window);
    const strokes:string[][]=[];Reflect.set(window,'victoryStrokes',strokes);const animate=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){const a=animate.call(this,frames,options);if(this.matches('.win-ring,.win-check') && a.effect instanceof KeyframeEffect)strokes.push(a.effect.getKeyframes().flatMap(k=>Object.keys(k)));return a;};
    window.requestAnimationFrame=fn=>raf(t=>{frames++;fn(t);});Object.defineProperty(window,'victoryFrames',{get:()=>frames});
    const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer)cues.push(this.buffer.duration);return start.apply(this,args);};
  });
}
const wins=(page:Page)=>page.evaluate(()=>(Reflect.get(window,'victoryCues') as number[]).filter(n=>n>=.93).length);
async function solve(page:Page,index:number){
  const board=new Board(campaign[index]!,'oracle');
  while(!board.complete){const a=board.remaining.find(a=>canExit(a,board.remaining))!,c=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!),p=a.path.at(-1)!;await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);board.activate(a.id);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining',String(board.remaining.length));}
  await expect(page.locator('#win')).toBeVisible();
}
async function idle(page:Page){
  await expect.poll(async()=>{const before=await page.evaluate(()=>Reflect.get(window,'victoryFrames') as number);await page.waitForTimeout(350);return await page.evaluate(()=>Reflect.get(window,'victoryFrames') as number)-before;},{timeout:5000,intervals:[200]}).toBeLessThan(5);
}

test('unifies finish motion, clears the completed tutorial and announces the result once',async({page},info)=>{
  await observe(page);const state=freshSave();state.index=3;state.campaign=freshAttempt(campaign[3]!);state.wins=campaign.slice(0,3).map((l,i)=>({attempt:`fixture-${i}`,levelId:l.id,activeMs:1000,completedAt:i*1000,localDate:'1970-01-01',mistakes:0}));decodeSave(state);
  await page.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:SAVE_KEY,state});
  await page.goto('/');await page.locator('#home-play:enabled').click();await page.waitForTimeout(450);await expect(page.locator('#guides-label')).toBeVisible();await solve(page,3);
  await expect(page.locator('#guides-label')).toBeHidden();await expect(page.locator('#app-status')).toHaveText('');await expect(page.locator('#restart')).toBeHidden();
  await expect(page.locator('#win-title')).toHaveAttribute('role','status');
  expect(await page.evaluate(()=>Reflect.get(window,'victoryStrokes'))).toEqual(expect.arrayContaining([expect.arrayContaining(['strokeDashoffset'])]));
  await page.locator('#win-title').evaluate(e=>{Reflect.set(window,'resultMutations',0);new MutationObserver(rows=>Reflect.set(window,'resultMutations',Reflect.get(window,'resultMutations')+rows.length)).observe(e,{childList:true,characterData:true,subtree:true});});
  await page.screenshot({path:info.outputPath('finish.png')});await expect.poll(()=>wins(page)).toBe(1);await page.waitForTimeout(2500);
  expect(await page.evaluate(()=>Reflect.get(window,'resultMutations'))).toBe(0);expect(await page.locator('#win').evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);await idle(page);
});

test('settles an interrupted celebration and never replays it after return',async({page})=>{
  await observe(page);await page.goto('/');await page.locator('#home-play:enabled').click();await page.waitForTimeout(450);await solve(page,0);await expect.poll(()=>wins(page)).toBe(1);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  expect(await page.locator('#win').evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(450);expect(await wins(page)).toBe(1);
  const quiet=await page.evaluate(()=>Reflect.get(window,'victoryFrames') as number);await page.waitForTimeout(350);expect(await page.evaluate(()=>Reflect.get(window,'victoryFrames') as number)-quiet).toBeLessThan(5);
  await page.locator('#choose-field').click();await page.locator('#home-play:enabled').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-level','c02');await page.waitForTimeout(600);expect(await wins(page)).toBe(1);
});

test('keeps the light reduced-motion finish usable at 320px',async({page},info)=>{
  await observe(page);await page.setViewportSize({width:320,height:640});await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(({key,settings})=>localStorage.setItem(key,JSON.stringify(settings)),{key:SETTINGS_KEY,settings:{...defaultSettings('ru'),theme:'light'}});
  await page.goto('/');await page.locator('#home-play:enabled').click();await solve(page,0);await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await expect(page.locator('#next')).toBeInViewport();const box=(await page.locator('#next').boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await page.locator('#win').evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);await page.screenshot({path:info.outputPath('light-narrow.png')});await idle(page);
});

test('accepts a quick next action during the short-landscape celebration',async({page},info)=>{
  await observe(page);await page.setViewportSize({width:568,height:320});await page.goto('/');await page.locator('#home-play:enabled').click();await page.waitForTimeout(450);await solve(page,0);
  await expect(page.locator('#next')).toBeInViewport();await page.screenshot({path:info.outputPath('landscape.png')});
  await page.locator('#next').evaluate((e:HTMLButtonElement)=>e.click());await expect(page.locator('#game-shell')).toHaveAttribute('data-level','c02');await expect(page.locator('#win')).toBeHidden();
  await page.waitForTimeout(1100);expect(await page.locator('#win').evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);await idle(page);
});


test('restores a completed final campaign field without restarting its visual celebration',async({page})=>{
  await observe(page);const state=freshSave(),level=campaign.at(-1)!,attempt=freshAttempt(level);state.index=campaign.length-1;attempt.started=true;attempt.board={...attempt.board,removed:level.arrows.map(a=>a.id)};state.campaign=attempt;
  state.wins=campaign.map((l,i)=>({attempt:i===state.index?attempt.board.id:`fixture-${i}`,levelId:l.id,activeMs:1000,completedAt:i*1000,localDate:'1970-01-01',mistakes:0}));decodeSave(state);
  await page.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:SAVE_KEY,state});await page.goto('/');await page.locator('#home-play:enabled').click();await expect(page.locator('#win')).toBeVisible();await expect(page.locator('#next')).toBeDisabled();
  await page.waitForTimeout(500);expect(await wins(page)).toBe(0);expect(await page.locator('#win').evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);
  const quiet=await page.evaluate(()=>Reflect.get(window,'victoryFrames') as number);await page.waitForTimeout(350);expect(await page.evaluate(()=>Reflect.get(window,'victoryFrames') as number)-quiet).toBeLessThan(5);
});
