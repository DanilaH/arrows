import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {campaign} from '../../src/content/campaign';
import {freshSave,freshAttempt,SAVE_KEY} from '../../src/progression/save';
const transport=readFileSync('tools/qa/assistance-native-transport.mjs','utf8').replace('export function controlledNative','function controlledNative');
async function boot(page:Page,level=2){const s=freshSave();s.index=level;s.campaign=freshAttempt(campaign[level]!);s.wins=campaign.slice(0,level).map((l,i)=>({attempt:`past-${i}`,levelId:l.id,activeMs:1000,completedAt:i+1,mistakes:0}));s.tutorials=['tap','turns','blockers','guides','zoom','hint'];await page.addInitScript({content:`${transport}\ncontrolledNative(${JSON.stringify({save:s,settings:{version:1,language:'ru',theme:'dark',sound:true,vibration:true}})});`});await page.goto('/');await expect(page.locator('#game-shell')).toHaveAttribute('data-progress','ready');}
async function exposed(page:Page,selector:string){return page.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,hit:[[.5,.5],[.25,.25],[.75,.75]].every(([x,y])=>e.contains(document.elementFromPoint(r.x+r.width*x!,r.y+r.height*y!)))};});}
for(const size of[{width:320,height:568},{width:390,height:844},{width:780,height:360}])test(`settings keep pinned close/recovery inside safe area and scroll QA independently ${size.width}`,async({page},info)=>{
 await page.setViewportSize(size);await boot(page);await page.locator('#home-settings').click();await page.waitForTimeout(250);
 // Controlled asymmetric WebView insets, via the actual CSS custom-property seam.
 await page.addStyleTag({content:'#settings-dialog{--settings-top:32px;--settings-bottom:24px;--settings-left:18px;--settings-right:26px}'});
 await expect(page.locator('#settings-testing')).not.toHaveAttribute('open');
 const rect=await page.locator('#settings-dialog').boundingBox();expect(rect!.y).toBeGreaterThanOrEqual(32);expect(rect!.y+rect!.height).toBeLessThanOrEqual(size.height-24);expect(rect!.x).toBeGreaterThanOrEqual(18);expect(rect!.x+rect!.width).toBeLessThanOrEqual(size.width-26);
 if(size.width===390)expect(rect!.height).toBeLessThan(590);
 expect((await exposed(page,'#close-settings')).hit).toBe(true);
 const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),SAVE_KEY);
 await page.locator('#settings-testing > summary').click();await page.locator('#help-qa-variant').selectOption('single-v2');
 await page.locator('.settings-body').evaluate(e=>e.scrollTop=e.scrollHeight);
 expect((await exposed(page,'#close-settings')).hit).toBe(true);expect((await exposed(page,'#settings-save-status')).hit).toBe(true);
 await page.locator('#settings-dialog').evaluate(root=>{for(const e of root.querySelectorAll<HTMLElement>('h2,h3,span,strong,small,summary,select,p'))e.style.fontSize=`${parseFloat(getComputedStyle(e).fontSize)*1.5}px`;});
 expect(await page.locator('.settings-body').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);expect((await exposed(page,'#close-settings')).hit).toBe(true);
 await page.screenshot({path:info.outputPath(`settings-${size.width}.png`)});
 const c=await exposed(page,'#close-settings');await page.mouse.click(c.x+c.w/2,c.y+c.h/2);await expect(page.locator('#settings-dialog')).toBeHidden();
 const after=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),SAVE_KEY);expect(after.campaign).toEqual(before.campaign);expect(after.freeContinueUsed).toBe(before.freeContinueUsed);expect(after.helpLedger.rights).toEqual(before.helpLedger.rights);
});
const camera=async(p:Page)=>JSON.parse((await p.locator('#game-root').getAttribute('data-camera'))!) as{x:number;y:number;scale:number};
test('zoomed compact board pans on its short axis and retains the chosen view through Home',async({page})=>{
 await boot(page);await page.locator('#home-play').click();await expect(page.locator('.board-transition,.route-snapshot')).toHaveCount(0);await page.waitForTimeout(350);
 const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).campaign.board,SAVE_KEY),fit=await camera(page);const size=page.viewportSize()!,x=size.width/2,y=size.height/2;
 await page.mouse.move(x,y);for(let i=0;i<10&&(await camera(page)).scale<fit.scale*1.9;i++){const prev=await camera(page);await page.mouse.wheel(0,-1000);await expect.poll(async()=>(await camera(page)).scale).toBeGreaterThan(prev.scale);}
 const zoomed=await camera(page);await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+70,y+90,{steps:8});await page.mouse.up();
 const moved=await camera(page);expect(moved.x-zoomed.x).toBeCloseTo(70,0);expect(moved.y-zoomed.y).toBeCloseTo(90,0);
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).campaign.board,SAVE_KEY)).toEqual(before);
 await page.locator('#choose-field').click();await page.locator('#home-play').click();await expect(page.locator('.board-transition,.route-snapshot')).toHaveCount(0);// Restoring world centre/relative zoom may round a screen coordinate by <1e-12px.
 await expect.poll(async()=>{const restored=await camera(page);return Math.max(...(['x','y','scale'] as const).map(k=>Math.abs(restored[k]-moved[k])));}).toBeLessThan(1e-6);
});
