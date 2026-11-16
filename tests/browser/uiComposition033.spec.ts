import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {campaign} from '../../src/content/campaign';
import {dailyCatalog} from '../../src/content/daily';
import {Board} from '../../src/domain/board';
import {trophyBinding} from '../../src/content/trophies';
import {freshSave,freshAttempt,decodeSave,SAVE_KEY,type GameSave} from '../../src/progression/save';
import {monthDates} from '../../src/progression/calendar';
const transport=readFileSync('tools/qa/assistance-native-transport.mjs','utf8').replace('export function controlledNative','function controlledNative');
function seed(index=39,left?:number):GameSave{
 const s=freshSave();s.index=index;s.campaign=freshAttempt(campaign[index]!);
 s.wins=campaign.slice(0,index).map((l,i)=>({attempt:`composition033-${i}`,levelId:l.id,activeMs:1000,completedAt:1000+i,localDate:'2026-11-15',mistakes:0}));
 s.seenUnlocks=index>=19?['collection','calendar']:index>=9?['collection']:[];s.tutorials=['tap','turns','blockers','guides','zoom','hint'];
 if(left!==undefined){const b=new Board(s.campaign.level,s.campaign.board.id);while(b.remaining.length>left)b.activate(b.hint()!);s.campaign.board=b.snapshot();s.campaign.started=true;s.campaign.activeMs=38000;}
 return s;
}
function earned(){const s=seed();for(const date of monthDates('2026-08')){const a=freshAttempt(dailyCatalog[date]!),b=new Board(a.level,a.board.id);while(!b.complete)b.activate(b.hint()!);a.board=b.snapshot();a.started=true;s.daily[date]=a;s.dailyWins[date]={attempt:b.attemptId,levelId:b.level.id,completedAt:Date.parse(date+'T12:00:00Z'),localDate:date,activeMs:1000,mistakes:0};}s.cups=['2026-08'];s.trophyDesigns['2026-08']=trophyBinding('2026-08');return decodeSave(s);}
async function boot(p:Page,s=seed(),language='ru',theme='dark',date='2026-11-16'){
 decodeSave(s);await p.clock.setFixedTime(new Date(date+'T12:00:00Z'));await p.addInitScript({content:`${transport}\ncontrolledNative(${JSON.stringify({save:s,preserve:true,settings:{version:1,language,theme,sound:true,vibration:true}})});`});
 await p.goto('/');await p.locator('#home-play:enabled').waitFor();await p.evaluate(()=>document.querySelector('#qa-recording-source')?.remove());
}
const saved=(p:Page):Promise<GameSave>=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)!),SAVE_KEY);
const camera=async(p:Page)=>JSON.parse((await p.locator('#game-root').getAttribute('data-camera'))!) as{x:number;y:number;scale:number};
function sameCamera(a:{x:number;y:number;scale:number},b:typeof a){for(const k of['x','y','scale']as const)expect(a[k]).toBeCloseTo(b[k],6);}
async function settled(p:Page){await expect(p.locator('.route-snapshot,.board-transition')).toHaveCount(0);await p.waitForFunction(()=>document.querySelector('#meta-screen')!.getAnimations({subtree:true}).every(a=>a.playState!=='running'||a.effect?.getComputedTiming().iterations===Infinity));}
async function box(p:Page,key:string){return p.locator(key).evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});}
async function zoom(p:Page){const c=await camera(p),v=p.viewportSize()!;await p.mouse.move(v.width/2,v.height/2);for(let i=0;i<6&&(await camera(p)).scale<c.scale*1.6;i++){await p.mouse.wheel(0,-1000);await expect.poll(async()=>(await camera(p)).scale).toBeGreaterThan(c.scale);}await expect(p.locator('#board-overview')).toBeVisible();return c;}
async function main(p:Page){await p.locator('#home-play').click();await settled(p);}
test('unopened Home groups the action without a hidden hero, then restores the selected field without phantom moves',async({page},info)=>{
 const s=seed();await boot(page,s);
 for(const v of[{width:320,height:568},{width:390,height:844},{width:780,height:360}]){await page.setViewportSize(v);const b=await box(page,'.home-board'),h=await box(page,'.campaign-heading'),play=await box(page,'#home-play');expect(b.h).toBe(0);expect(play.y-h.y-h.h).toBeGreaterThanOrEqual(12);expect(play.y-h.y-h.h).toBeLessThan(50);expect(play.hit).toBe(true);await expect(page.locator('.home-board polyline')).toHaveCount(0);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:info.outputPath('home-upcoming.png')});const playBefore=await box(page,'#home-play');
 await page.evaluate(()=>{Reflect.set(window,'compositionSnapshot',null);new MutationObserver(rs=>{for(const r of rs)for(const n of r.addedNodes)if(n instanceof HTMLElement&&n.classList.contains('route-snapshot')){const b=n.querySelector<HTMLElement>('.home-play')!,r=b.getBoundingClientRect();Reflect.set(window,'compositionSnapshot',{field:n.querySelector<HTMLElement>('.home-layout')!.dataset.field,x:r.x,y:r.y,w:r.width,h:r.height});}}).observe(document.body,{childList:true,subtree:true});});
 await main(page);const outgoing=await page.evaluate(()=>Reflect.get(window,'compositionSnapshot'));expect(outgoing.field).toBe('upcoming');for(const k of['x','y','w','h']as const)expect(outgoing[k]).toBeCloseTo(playBefore[k],1);
 await page.locator('#choose-field').click();await settled(page);
 await expect(page.locator('.home-board')).toBeVisible();expect((await box(page,'.home-board')).h).toBeGreaterThan(150);const a=(await saved(page)).campaign;expect(a.board).toEqual(s.campaign.board);expect(a.started).toBe(false);
 await page.reload();await page.locator('#home-play:enabled').waitFor();await expect(page.locator('.home-board')).toBeVisible();expect((await saved(page)).campaign.board).toEqual(s.campaign.board);
});
test('near-finish Home explains the last arrow and retains the original field instead of reframing the remainder',async({page})=>{
 await page.setViewportSize({width:320,height:568});const s=seed(2,1);await boot(page,s);await expect(page.locator('.home-remaining')).toHaveText('Осталась 1 стрелка');await expect(page.locator('.home-board polyline')).toHaveCount(1);
 const viewBox=await page.locator('.home-board').getAttribute('viewBox');expect(Number(viewBox!.split(' ')[2])).toBeGreaterThan(8);const before=await saved(page);await main(page);await page.locator('#choose-field').click();await settled(page);expect(await page.locator('.home-board').getAttribute('viewBox')).toBe(viewBox);
 await page.locator('#home-settings').click();await page.locator('#setting-language').selectOption('en');await page.keyboard.press('Escape');await expect(page.locator('#settings-dialog')).toBeHidden();await expect(page.locator('.home-remaining')).toHaveText('1 arrow left');expect((await saved(page)).campaign.board).toEqual(before.campaign.board);expect((await box(page,'#home-play')).hit).toBe(true);
});
test('overview returns c120 to its original bounds without moving existing controls or changing the board, and survives reload',async({page})=>{
 await page.setViewportSize({width:320,height:568});await boot(page,seed(119));await main(page);await page.locator('#hint:visible').waitFor();await page.waitForFunction(()=>document.querySelector('#hint')!.getAnimations().length===0);await expect(page.locator('#board-overview')).toBeHidden();
 const positions=await Promise.all(['#game-settings','#hint','#guides'].map(k=>box(page,k))),before=await saved(page),fit=await zoom(page);
 const control=await box(page,'#board-overview');expect(control.w).toBeGreaterThanOrEqual(44);expect(control.h).toBeGreaterThanOrEqual(44);expect(control.hit).toBe(true);
 expect(await Promise.all(['#game-settings','#hint','#guides'].map(k=>box(page,k)))).toEqual(positions);await page.locator('#board-overview').click();await expect(page.locator('#board-overview')).toBeHidden();const after=await camera(page);expect(after.scale).toBeCloseTo(fit.scale,6);expect(after.x).toBeCloseTo(fit.x,6);expect(after.y).toBeCloseTo(fit.y,6);
 await expect.poll(async()=>(await saved(page)).campaign.view?.zoom).toBe(1);const s=await saved(page);expect(s.campaign.board).toEqual(before.campaign.board);expect(s.campaign.hint).toBe(before.campaign.hint);expect(s.helpLedger.rights).toEqual(before.helpLedger.rights);expect(s.helpLedger.requests).toEqual(before.helpLedger.requests);expect(s.freeContinueUsed).toBe(before.freeContinueUsed);
 await page.reload();await page.locator('#home-play:enabled').waitFor();await main(page);await expect(page.locator('#board-overview')).toBeHidden();expect((await camera(page)).scale).toBeCloseTo(fit.scale,6);expect((await saved(page)).campaign.board).toEqual(before.campaign.board);
});
test('manual input interrupts overview immediately and a quick Home round-trip retains the displayed view',async({page})=>{
 await boot(page,seed(119));await main(page);const fit=await zoom(page);await page.locator('#board-overview').click();const v=page.viewportSize()!;await page.mouse.move(v.width/2,v.height/2);await page.mouse.wheel(0,-700);await expect.poll(async()=>(await camera(page)).scale).toBeGreaterThan(fit.scale*1.3);
 const interrupted=await camera(page);await page.waitForTimeout(420);sameCamera(await camera(page),interrupted);
 // Same-turn activation isolates the ownership race from automation/network
 // latency; the preceding interruption is an actual wheel input.
 await page.evaluate(()=>{document.querySelector<HTMLButtonElement>('#board-overview')!.click();document.querySelector<HTMLButtonElement>('#choose-field')!.click();});await settled(page);const snapshot=(await saved(page)).campaign.view!;expect(snapshot.zoom).toBeGreaterThan(1);
 await main(page);const returned=await camera(page);await page.waitForTimeout(420);sameCamera(await camera(page),returned);expect((await saved(page)).campaign.board.removed).toEqual([]);
});
test('reduced-motion overview is immediate and persists the original normalized view',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await boot(page);await main(page);const fit=await zoom(page);await page.locator('#board-overview').click();await expect(page.locator('#board-overview')).toBeHidden();expect((await camera(page)).scale).toBeCloseTo(fit.scale,6);await expect.poll(async()=>(await saved(page)).campaign.view?.zoom).toBe(1);
});
test('resize interrupts a running overview and does not replay its old target',async({page})=>{
 await boot(page,seed(119));await main(page);await zoom(page);await page.locator('#board-overview').click();await page.setViewportSize({width:320,height:640});await page.waitForTimeout(450);const resized=await camera(page);await page.waitForTimeout(400);sameCamera(await camera(page),resized);
 const before=(await saved(page)).campaign.board;if(await page.locator('#board-overview').isVisible())await page.locator('#board-overview').click();await expect(page.locator('#board-overview')).toBeHidden();expect((await saved(page)).campaign.board).toEqual(before);
});
test('overview after earned A2 keeps the exact right and highlighted group, and does not focus the help again',async({page})=>{
 await boot(page,seed(119));await main(page);const fit=await camera(page);await page.locator('#hint:visible').waitFor();await page.locator('#hint').click();await page.locator('[data-action="rewarded-cascade"]').click();await page.waitForFunction(()=>!!Reflect.get(window,'assistanceQA').snapshot().request);
 await page.evaluate(()=>{const qa=Reflect.get(window,'assistanceQA');qa.shown();qa.earned();qa.dismiss();});await expect.poll(async()=>(await saved(page)).campaign.hint).toBeTruthy();await page.waitForFunction(()=>Reflect.get(window,'assistanceQA').snapshot().events.some((e:{event:string;params:{phase:string}})=>e.event==='assistance_fact'&&e.params.phase==='reveal_ready'));
 const before=await saved(page),group=await page.locator('#game-root').getAttribute('data-help-group');await page.locator('#board-overview').click();await expect(page.locator('#board-overview')).toBeHidden();await page.waitForTimeout(650);expect((await camera(page)).scale).toBeCloseTo(fit.scale,6);
 const after=await saved(page);expect(after.campaign.board).toEqual(before.campaign.board);expect(after.campaign.hint).toBe(before.campaign.hint);expect(after.helpLedger.rights).toEqual(before.helpLedger.rights);expect(await page.locator('#game-root').getAttribute('data-help-group')).toBe(group);
});
test('Collection opens on its current reward with usable actions before any scroll, and returns to the same place',async({page},info)=>{
 await page.setViewportSize({width:320,height:568});const s=earned();await boot(page,s);await page.locator('#home-collection').click();await settled(page);
 const goal=await box(page,'.collection-current'),art=await box(page,'#collection-current-trophy'),open=await box(page,'#collection-open-month'),nav=await box(page,'#meta-nav');expect(goal.y).toBeGreaterThan(0);expect(open.y+open.h).toBeLessThan(nav.y);expect(art.hit&&open.hit,JSON.stringify({art,open,top:await page.evaluate(({art,open})=>[art,open].map(r=>document.elementFromPoint(r.x+r.w/2,r.y+r.h/2)?.outerHTML.slice(0,300)),{art,open})})).toBe(true);expect(open.h).toBeGreaterThanOrEqual(44);expect((await box(page,'.record-grid')).y).toBeGreaterThan(goal.y+goal.h);
 await expect(page.locator('#collection-month-title')).toContainText('ноябрь');await expect(page.locator('.month-trophy')).toHaveCount(12);await page.screenshot({path:info.outputPath('collection-initial.png')});
 await page.locator('#collection-current-trophy').click();await expect(page.locator('#trophy-viewer')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#collection-current-trophy')).toBeFocused();await page.locator('#collection-open-month').click();await settled(page);await expect(page.locator('#start-daily')).toBeInViewport({ratio:1});await page.locator('[data-nav="back"]').click();await settled(page);expect((await box(page,'#collection-open-month')).hit).toBe(true);
 const after=await saved(page);for(const key of['campaign','daily','dailyWins','cups','trophyDesigns','helpLedger','freeContinueUsed']as const)expect(after[key]).toEqual(s[key]);
});
test('earned trophies have an explicit ownership mark and completed copy without changing their binding',async({page})=>{
 const s=earned();await boot(page,s);await page.locator('#home-collection').click();await settled(page);const card=page.locator('[data-month="2026-08"]');await expect(card.locator('b')).toBeVisible();await expect(card).toHaveAccessibleName(/Кубок получен/);await card.click();await page.locator('#view-trophy').click();await expect(page.locator('.trophy-rule')).toHaveText('Все дни месяца пройдены');await expect(page.locator('.trophy-preview-label')).toHaveText('Кубок получен');expect((await saved(page)).trophyDesigns).toEqual(s.trophyDesigns);
});
test('Collection respects the unlock and past-year archive without exposing future-year rewards',async({page})=>{
 await boot(page,seed(9));await page.locator('#home-collection').click();await settled(page);expect((await box(page,'.medal-grid')).y).toBeLessThan((await box(page,'.collection-current')).y);await expect(page.locator('#collection-open-month')).toBeDisabled();await expect(page.locator('#collection-current-trophy')).toBeDisabled();await expect(page.locator('.collection-goal-note')).toHaveText('Откроется на уровне 20');await page.locator('#collection-open-month').dispatchEvent('click');await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','collection');expect((await saved(page)).daily).toEqual({});
});
test('past years keep the complete shelf while the current year has the featured month, including enlarged calendar labels',async({page})=>{
 await page.setViewportSize({width:360,height:640});await boot(page,seed(),'en','light','2027-01-02');await page.locator('#home-collection').click();await expect(page.locator('.collection-current')).toHaveAttribute('data-collection-month','2027-01');await page.locator('#trophy-year').selectOption('2026');await expect(page.locator('.collection-current')).toHaveCount(0);await expect(page.locator('.month-trophy')).toHaveCount(12);await expect(page.locator('[data-month^="2028"]')).toHaveCount(0);await page.locator('#trophy-year').selectOption('2027');await expect(page.locator('.collection-current')).toBeVisible();await page.locator('#collection-open-month').click();await settled(page);
 await page.locator('#view-trophy > span').evaluate(e=>(e as HTMLElement).style.fontSize=`${parseFloat(getComputedStyle(e).fontSize)*1.5}px`);expect(await page.locator('#view-trophy > span').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);expect((await box(page,'#start-daily')).hit).toBe(true);
});
