import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {freshSave,freshAttempt,SAVE_KEY} from '../../src/progression/save';
import {campaign} from '../../src/content/campaign';
const transport=readFileSync('tools/qa/assistance-native-transport.mjs','utf8').replace('export function controlledNative','function controlledNative');
const saved=(p:Page)=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)!),SAVE_KEY);
const moving=(p:Page)=>p.locator('#meta-screen .home-emblem').evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length);
async function boot(p:Page,index=0){
 const s=freshSave();s.index=index;s.campaign=freshAttempt(campaign[index]!);s.tutorials=['tap','turns','blockers','guides','zoom','hint'];
 s.wins=campaign.slice(0,index).map((l,i)=>({attempt:'emblem-past-'+i,levelId:l.id,activeMs:43000,completedAt:1000+i,localDate:'2026-11-01',mistakes:0}));
 await p.addInitScript({content:transport+'\ncontrolledNative('+JSON.stringify({save:s,preserve:true,settings:{version:1,theme:'dark',language:'ru',sound:true,vibration:true}})+');'});
 await p.goto('/');await p.locator('#home-play:enabled').waitFor();await expect(p.locator('.route-snapshot,.board-transition')).toHaveCount(0);
}
test('authored emblem twitches in bounded bursts without changing progress, revealing a field or moving Play',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);
 const before=await saved(page),button=await page.locator('#home-play').boundingBox();
 await expect(page.locator('.home-emblem-arrow')).toHaveCount(3);await expect(page.locator('.home-board')).toHaveAttribute('data-selected','false');await expect(page.locator('.home-board')).toBeHidden();
 await expect.poll(()=>moving(page)).toBeGreaterThan(0);
 await expect.poll(()=>moving(page)).toBe(0);
 await expect.poll(()=>moving(page)).toBeGreaterThan(0);
 expect(await page.locator('#home-play').boundingBox()).toEqual(button);expect(await saved(page)).toEqual(before);
 expect(await page.locator('.home-emblem').getAttribute('aria-hidden')).toBe('true');expect(errors).toEqual([]);
});
test('Play accepts input during a twitch and selected Home replaces the emblem with its original preview',async({page})=>{
 await boot(page);await expect.poll(()=>moving(page)).toBeGreaterThan(0);
 await page.evaluate(()=>{
  const root=document.querySelector('#meta-screen')!,observed:{pose:string[];frozen:string[]}|null={pose:[],frozen:[]};
  root.addEventListener('click',()=>{observed!.pose=[...root.querySelectorAll('.home-emblem-arrow')].map(e=>getComputedStyle(e).transform);},{capture:true,once:true});
  const observer=new MutationObserver(()=>{const copy=document.querySelector('.route-snapshot .home-emblem');if(!copy)return;observed!.frozen=[...copy.querySelectorAll<SVGElement>('.home-emblem-arrow')].map(e=>e.style.transform);observer.disconnect();});
  observer.observe(document.body,{childList:true,subtree:true});(window as unknown as {emblemObserved:unknown}).emblemObserved=observed;
 });
 await page.locator('#home-play').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','game',{timeout:1500});
 await expect(page.locator('.route-snapshot,.board-transition')).toHaveCount(0);
 const shifts=await page.evaluate(()=>{const s=(window as unknown as {emblemObserved:{pose:string[];frozen:string[]}}).emblemObserved;return s.frozen.map((v,i)=>{const a=new DOMMatrix(s.pose[i]==='none'?undefined:s.pose[i]),b=new DOMMatrix(v==='none'?undefined:v);return[Math.abs(a.e-b.e),Math.abs(a.f-b.f)];});});
 expect(shifts).toHaveLength(3);for(const shift of shifts){expect(shift[0]).toBeLessThan(.75);expect(shift[1]).toBeLessThan(.75);}
 await page.locator('#choose-field').click();await expect(page.locator('#home-play')).toBeVisible();
 await expect(page.locator('#meta-screen .home-emblem')).toHaveCount(0);await expect(page.locator('.home-board')).toBeVisible();
 expect((await saved(page)).campaign.board.removed).toEqual([]);expect((await saved(page)).campaign.started).toBe(false);
});
test('Settings and native background stop owned motion, with one quiet restart after returning',async({page})=>{
 await boot(page);await expect.poll(()=>moving(page)).toBeGreaterThan(0);await page.locator('#home-settings').click();await expect(page.locator('#settings-dialog')).toBeVisible();await expect.poll(()=>moving(page)).toBe(0);
 const pose=await page.locator('.home-emblem-arrow').evaluateAll(es=>es.map(e=>getComputedStyle(e).transform));await page.waitForTimeout(1200);expect(await page.locator('.home-emblem-arrow').evaluateAll(es=>es.map(e=>getComputedStyle(e).transform))).toEqual(pose);
 await page.locator('#close-settings').click();await expect(page.locator('#settings-dialog')).not.toBeVisible();await expect.poll(()=>moving(page)).toBeGreaterThan(0);
 await page.evaluate(()=>(window as unknown as {assistanceQA:{background(value:boolean):void}}).assistanceQA.background(true));await expect.poll(()=>moving(page)).toBe(0);await page.waitForTimeout(1000);expect(await moving(page)).toBe(0);
 await page.evaluate(()=>(window as unknown as {assistanceQA:{background(value:boolean):void}}).assistanceQA.background(false));await expect.poll(()=>moving(page)).toBeGreaterThan(0);expect(await moving(page)).toBeLessThanOrEqual(2);
});
test('changing menus releases the old SVG and the generic mark never uses future level geometry',async({page})=>{
 await boot(page,39);const geometry=()=>page.locator('.home-emblem polyline:not(.home-emblem-glint)').evaluateAll(es=>es.map(e=>e.getAttribute('points')));const shape=await geometry();const before=await saved(page);await expect.poll(()=>moving(page)).toBeGreaterThan(0);
 await page.evaluate(()=>{(window as unknown as {oldEmblem:Element}).oldEmblem=document.querySelector('.home-emblem')!;});
 await page.locator('#home-collection').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','collection');await expect(page.locator('.route-snapshot')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as unknown as {oldEmblem:Element}).oldEmblem.getAnimations({subtree:true}).length)).toBe(0);
 await page.locator('#home-tab').click();await expect(page.locator('.home-emblem')).toBeVisible();expect(await geometry()).toEqual(shape);expect((await saved(page)).campaign).toEqual(before.campaign);
});
test('reduced motion stays static and live preference changes stop and resume the emblem',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await boot(page);await page.waitForTimeout(1500);expect(await moving(page)).toBe(0);
 await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(()=>moving(page)).toBeGreaterThan(0);await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>moving(page)).toBe(0);await page.waitForTimeout(1000);expect(await moving(page)).toBe(0);
});
test('small portrait with enlarged copy keeps emblem and initial Play clear of navigation',async({page})=>{
 await page.setViewportSize({width:320,height:568});await boot(page);
 await page.evaluate(()=>{const es=[...document.querySelectorAll<HTMLElement>('#meta-screen h1,#meta-screen h2,#home-play,.home-progress')],sizes=es.map(e=>parseFloat(getComputedStyle(e).fontSize));es.forEach((e,i)=>e.style.fontSize=sizes[i]!*1.5+'px');});
 const layout=await page.evaluate(()=>{const b=document.querySelector('#home-play')!,a=document.querySelector('.home-emblem')!.getBoundingClientRect(),t=document.querySelector('.campaign-heading')!.getBoundingClientRect(),r=b.getBoundingClientRect(),n=document.querySelector('#meta-nav')!.getBoundingClientRect();return{artTop:a.top,artBottom:a.bottom,titleTop:t.top,playBottom:r.bottom,navTop:n.top,hit:b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),w:r.width,h:r.height,overflow:document.documentElement.scrollWidth>innerWidth};});
 expect(layout.artTop).toBeGreaterThan(0);expect(layout.artBottom).toBeLessThanOrEqual(layout.titleTop);expect(layout.playBottom).toBeLessThan(layout.navTop);expect(layout.hit).toBe(true);expect(layout.w).toBeGreaterThanOrEqual(44);expect(layout.h).toBeGreaterThanOrEqual(44);expect(layout.overflow).toBe(false);
});
