import { test, expect, type Page } from '@playwright/test';
import { campaign } from '../../src/content/campaign';
import { Board } from '../../src/domain/board';
import { freshSave, freshAttempt, SAVE_KEY } from '../../src/progression/save';
import { defaultSettings, SETTINGS_KEY } from '../../src/app/settings';
import { openAssistanceReview } from './helpers/assistanceReview';
test.use({hasTouch:true});
const current=(page:Page)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).campaign,SAVE_KEY);
async function opened(page:Page,index=2,review=false){
 const state=freshSave();state.index=index;state.campaign=freshAttempt(campaign[index]!);state.campaign.view={centerX:(state.campaign.level.width-1)/2,centerY:(state.campaign.level.height-1)/2,zoom:index===19?2:1};
 if(index===19)state.campaign.hint=new Board(state.campaign.level,state.campaign.board.id).hint();
 state.wins=campaign.slice(0,index).map((l,i)=>({attempt:`entry-${i}`,levelId:l.id,activeMs:0,completedAt:0,localDate:'1970-01-01',mistakes:0}));state.seenUnlocks=['collection','calendar'];
 await page.addInitScript(({key,state,sk,settings})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(sk,JSON.stringify(settings));},{key:SAVE_KEY,state,sk:SETTINGS_KEY,settings:defaultSettings('ru')});
 if(review)await openAssistanceReview(page);else await page.goto('/');await page.locator('#home-play:enabled').waitFor();return state.campaign;
}
async function settled(page:Page){await expect(page.locator('.board-transition,.route-snapshot')).toHaveCount(0);}

test('hides an unopened field, then retains its selected state without starting a move',async({page})=>{
 await page.goto('/');await page.locator('#home-play:enabled').waitFor();await expect(page.locator('.home-board')).toBeHidden();await expect(page.locator('.home-board polyline')).toHaveCount(0);
 await page.locator('#home-play').click();const attempt=await page.locator('#game-shell').getAttribute('data-attempt');await settled(page);await page.waitForTimeout(450);
 expect((await current(page)).started).toBe(false);expect((await current(page)).board.id).toBe(attempt);expect((await current(page)).board.removed).toEqual([]);expect((await current(page)).board.errors).toEqual([]);
 await page.locator('#choose-field').click();await settled(page);await expect(page.locator('.home-board')).toBeVisible();await expect(page.locator('.home-board polyline')).toHaveCount(campaign[0]!.arrows.length);
 await page.reload();await page.locator('#home-play:enabled').waitFor();await expect(page.locator('.home-board')).toBeVisible();expect((await current(page)).started).toBe(false);
});

for(const index of [2,19])test(`bridges the same selected c${index+1} preview to the actual view and returns without camera drift`,async({page},info)=>{
 const before=await opened(page,index);
 const buttonStyle=await page.locator('#home-play').evaluate(e=>({width:(e as HTMLElement).offsetWidth,height:(e as HTMLElement).offsetHeight,font:getComputedStyle(e).fontSize}));
 await page.evaluate(()=>{const snapshots:unknown[]=[],presence:boolean[]=[];Reflect.set(window,'__entrySnapshots',snapshots);Reflect.set(window,'__entryFades',presence);new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n instanceof HTMLElement && n.classList.contains('route-snapshot')){const b=n.querySelector<HTMLElement>('.home-play');if(b)snapshots.push({width:b.offsetWidth,height:b.offsetHeight,font:getComputedStyle(b).fontSize});const a=n.getAnimations()[0];if(a){const record=()=>queueMicrotask(()=>presence.push(n.isConnected));void a.finished.then(record,record);}}}).observe(document.body,{childList:true,subtree:true});});
 const expected=await page.locator('.home-board').evaluate(e=>{const m=(e as SVGSVGElement).getScreenCTM()!;return [m.a,m.b,m.c,m.d,m.e,m.f];});
 await page.locator('#home-play').click();const bridge=page.locator('.board-transition');await expect(bridge).toHaveCount(1);
 expect(await page.evaluate(()=>Reflect.get(window,'__entrySnapshots')[0])).toEqual(buttonStyle);
 const frames=await bridge.locator('g').evaluate(e=>(e.getAnimations()[0]!.effect as KeyframeEffect).getKeyframes().map(f=>f.transform));
 const actual=String(frames[0]).match(/-?[\d.]+(?:e[-+]?\d+)?/g)!.map(Number);actual.forEach((n,i)=>expect(n).toBeCloseTo(expected[i]!,1));
 const camera=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);
 const end=String(frames.at(-1)).match(/-?[\d.]+(?:e[-+]?\d+)?/g)!.map(Number);// CSS matrix serialization rounds decimal places; still require subpixel agreement.
 end.forEach((n,i)=>expect(n).toBeCloseTo([camera.scale,0,0,camera.scale,camera.x,camera.y][i]!,3));
 await settled(page);await page.waitForTimeout(300);expect(JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!)).toEqual(camera);
 await page.screenshot({path:info.outputPath(`settled-c${index+1}.png`)});
 await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'__entryFades').length)).toBeGreaterThan(0);expect(await page.evaluate(()=>Reflect.get(window,'__entryFades').every((v:boolean)=>!v))).toBe(true);
 expect((await current(page)).board).toEqual(before.board);expect((await current(page)).started).toBe(false);
 await page.locator('#choose-field').click();await settled(page);await expect(page.locator('.home-board')).toBeVisible();
 await page.locator('#home-play').click();await settled(page);expect(JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!)).toEqual(camera);
 expect((await current(page)).board).toEqual(before.board);
});

test('cancels a transition on Back, background and resize without stale overlays or phantom moves',async({page})=>{
 const before=await opened(page,2,true);await page.locator('#home-play').click();await expect(page.locator('.board-transition')).toHaveCount(1);
 await page.evaluate(()=>Reflect.get(window,'assistanceFixture').back());await settled(page);await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','home');
 await page.locator('#home-play').click();await expect(page.locator('.board-transition')).toHaveCount(1);
 await page.evaluate(()=>Reflect.get(window,'assistanceFixture').background(true));await settled(page);
 await page.evaluate(()=>Reflect.get(window,'assistanceFixture').background(false));await page.waitForTimeout(350);
 await page.locator('#choose-field').click();await settled(page);await page.locator('#home-play').click();
 await page.setViewportSize({width:320,height:568});await settled(page);await page.waitForTimeout(450);
 expect((await current(page)).board).toEqual(before.board);expect((await current(page)).started).toBe(false);
 await expect(page.locator('#game-root')).toBeVisible();expect(await page.locator('.board-transition').count()).toBe(0);
});

test('uses a direct settled frame with reduced motion, keeping the same board and no bridge',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});const before=await opened(page,2);await page.locator('#home-play').click();await settled(page);await expect(page.locator('#game-root')).toBeVisible();
 const camera=await page.locator('#game-root').getAttribute('data-camera');await page.waitForTimeout(350);expect(await page.locator('#game-root').getAttribute('data-camera')).toBe(camera);expect((await current(page)).board).toEqual(before.board);
});

test('gives Hard and Nightmare the main compact heading above lives and retains the daily date',async({page})=>{
 await page.setViewportSize({width:320,height:568});await opened(page,19);await expect(page.locator('.home-difficulty')).toHaveCSS('font-size','15px');await page.locator('#home-play').click();await settled(page);
 const difficulty=page.locator('#difficulty'),hearts=page.locator('#hearts');await expect(difficulty).toHaveText('Nightmare');await expect(difficulty).toHaveCSS('font-size','15px');
 const d=(await difficulty.boundingBox())!,h=(await hearts.boundingBox())!;expect(d.y+d.height).toBeLessThanOrEqual(h.y+1);expect((await page.locator('#game-header').boundingBox())!.height).toBeLessThanOrEqual(64);
 await page.locator('#choose-field').click();await settled(page);await page.locator('#home-calendar').click();await page.locator('[data-date="2026-11-08"]').click();await page.locator('#start-daily').click();await settled(page);
 await expect(page.locator('#app-title')).toHaveText('8 ноября');await expect(page.locator('#app-title')).toBeVisible();expect((await page.locator('#game-header').boundingBox())!.height).toBeLessThanOrEqual(64);
});
