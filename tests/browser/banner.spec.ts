import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {freshSave,freshAttempt,decodeSave,SAVE_KEY} from '../../src/progression/save';
import {campaign} from '../../src/content/campaign';
import {defaultSettings} from '../../src/app/settings';
const transport=readFileSync('tools/qa/assistance-native-transport.mjs','utf8').replace('export function controlledNative','function controlledNative');
function seed(){const s=freshSave();s.index=19;s.campaign=freshAttempt(campaign[19]!);s.wins=campaign.slice(0,19).map((l,i)=>({attempt:`banner-${i}`,levelId:l.id,mistakes:0,completedAt:1,activeMs:1000}));s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=['collection','calendar'];return decodeSave(s);}
async function boot(page:Page,banner:object={scale:3,adHeight:150,safeInsets:{top:72,bottom:84}},save=seed()){
 await page.clock.setFixedTime(new Date('2026-11-18T12:00:00Z'));await page.addInitScript({content:`${transport}\ncontrolledNative(${JSON.stringify({save,settings:defaultSettings('ru'),banner})});`});await page.goto('/');await page.locator('#home-play:enabled').waitFor();
}
const shown=(p:Page)=>p.evaluate(()=>Reflect.get(window,'assistanceQA').snapshot().banner.visible);
async function usable(page:Page,selectors:string[]){for(const key of selectors)await expect.poll(()=>page.locator(key).evaluate(e=>{const r=e.getBoundingClientRect(),slot=document.querySelector('#native-banner-slot')!.getBoundingClientRect();return{height:r.height>=43,inside:r.top>=0&&r.bottom<=slot.top-7&&r.left>=0&&r.right<=innerWidth+1,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};}),{message:key}).toEqual({height:true,inside:true,hit:true});}

test('adaptive reservation and one bottom inset keep menu, board and actions above the native slot',async({page},info)=>{
 await boot(page);await expect.poll(()=>shown(page)).toBe(true);
 for(const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
  await page.setViewportSize(size);await expect.poll(()=>shown(page)).toBe(true);await usable(page,['#home-play','#home-daily','#home-tab','#home-settings']);
  const metrics=await page.locator('#native-banner-slot').evaluate(e=>({slot:e.getBoundingClientRect().toJSON(),navPadding:getComputedStyle(document.querySelector('#meta-nav')!).paddingBottom,viewport:innerHeight}));
  expect(metrics.slot.bottom).toBeLessThanOrEqual(metrics.viewport-28+.01);expect(parseFloat(metrics.navPadding)).toBeLessThanOrEqual(7);
  await page.screenshot({path:info.outputPath(`banner-${size.width}x${size.height}.png`)});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#home-play').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','game');await expect.poll(()=>shown(page)).toBe(true);await page.waitForTimeout(3500);await usable(page,['#guides','#hint']);
 const clear=await page.locator('#game-root').evaluate(e=>({bottom:parseFloat((e as HTMLElement).style.getPropertyValue('--board-clear-bottom')),footer:document.querySelector('#game-footer')!.getBoundingClientRect().top}));expect(clear.bottom).toBeLessThanOrEqual(clear.footer);
 const count=await page.evaluate(()=>Reflect.get(window,'assistanceQA').snapshot().banner.calls.filter((v:{method:string})=>v.method==='measure').length);await page.waitForTimeout(1100);expect(await page.evaluate(()=>Reflect.get(window,'assistanceQA').snapshot().banner.calls.filter((v:{method:string})=>v.method==='measure').length)).toBeLessThanOrEqual(count+1);
});

test('settings and dialogs hide immediately, keep reservation stable and restore without changing the campaign',async({page})=>{
 await boot(page);await expect.poll(()=>shown(page)).toBe(true);const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).campaign,SAVE_KEY),height=await page.locator('#native-banner-slot').evaluate(e=>e.getBoundingClientRect().height);
 await page.locator('#home-settings').click();await expect.poll(()=>shown(page)).toBe(false);expect(await page.locator('#native-banner-slot').evaluate(e=>e.getBoundingClientRect().height)).toBe(height);await page.locator('#close-settings').click();await expect.poll(()=>shown(page)).toBe(true);
 await page.locator('#home-play').click();await page.locator('#restart').click();await expect(page.locator('#game-dialog')).toHaveAttribute('open','');await expect.poll(()=>shown(page)).toBe(false);await page.locator('[data-action=cancel]').click();await expect.poll(()=>shown(page)).toBe(true);
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).campaign.board,SAVE_KEY)).toEqual(before.board);
});

test('new safe geometry arriving under a held pointer waits for release and stale measurements cannot show over settings',async({page})=>{
 await boot(page);await expect.poll(()=>shown(page)).toBe(true);const previous=await page.locator('#native-banner-slot').evaluate(e=>e.getBoundingClientRect().bottom);
 await page.mouse.move(10,120);await page.mouse.down();await page.evaluate(()=>Reflect.get(window,'assistanceQA').bannerResize({safeInsets:{top:72,bottom:150,left:30,right:18}}));await page.waitForTimeout(150);expect(await page.locator('#native-banner-slot').evaluate(e=>e.getBoundingClientRect().bottom)).toBe(previous);expect(await shown(page)).toBe(false);
 await page.mouse.up();await expect.poll(()=>shown(page)).toBe(true);await expect.poll(()=>page.locator('#native-banner-slot').evaluate(e=>e.getBoundingClientRect().bottom)).toBeLessThan(previous);
 await page.evaluate(()=>{const q=Reflect.get(window,'assistanceQA');q.bannerHoldMeasure();q.bannerResize({adHeight:180});});await page.waitForTimeout(100);await page.locator('#home-settings').click();await page.evaluate(()=>Reflect.get(window,'assistanceQA').bannerReleaseMeasure());await page.waitForTimeout(300);expect(await shown(page)).toBe(false);await page.locator('#close-settings').click();await expect.poll(()=>shown(page)).toBe(true);
});

test('no configured native banner has no reservation and pure browser never adds a fake banner',async({page})=>{
 await boot(page,{configured:false});await expect(page.locator('#banner-strip')).toBeHidden();expect((await page.locator('html').getAttribute('class'))??'').not.toContain('has-native-banner');
 await page.goto('/content-pilot.html');await expect(page.locator('#native-banner-slot')).toHaveCount(0);
});
