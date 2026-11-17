import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {candidateFields,baselineFields} from '../../src/pilot/catalog';
import {canExit,type Level} from '../../src/domain/board';
import {freshSave} from '../../src/progression/save';
const transport=readFileSync('tools/qa/assistance-native-transport.mjs','utf8').replace('export function controlledNative','function controlledNative');
async function boot(page:Page,index=0){const save=freshSave();save.freeContinueUsed=true;
 await page.addInitScript({content:`${transport}\ncontrolledNative(${JSON.stringify({save,preserve:true,settings:{version:1,language:'ru',theme:'dark',sound:true,vibration:true}})});if(location.pathname.includes('content-pilot'))assistanceQA.late({schema:1,id:'main-earned',attempt:'main-attempt',mode:'campaign',placement:'hint'});window.serviceCalls=[];const original=Capacitor.nativePromise;Capacitor.nativePromise=async function(p,m,o){window.serviceCalls.push(p+'.'+m);return original(p,m,o);};`});
 await page.goto(`/content-pilot.html?field=${index}`);await expect(page.locator('#game-shell')).toHaveAttribute('data-mode','control');await expect(page.locator('#game-shell')).toHaveAttribute('data-progress','ready');await page.waitForTimeout(350);return JSON.stringify(save);
}
async function tap(page:Page,level:Level,id:string){const a=level.arrows.find(a=>a.id===id)!,p=a.path.at(-1)!,q=a.path.at(-2)!,c=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);await page.mouse.click(c.x+(p.x*.7+q.x*.3)*c.scale,c.y+(p.y*.7+q.y*.3)*c.scale);}
async function snapshot(page:Page,variant='candidate',index=0){return page.evaluate(({variant,index})=>JSON.parse(localStorage.getItem('arrows.qa.content-pilot.boards.v1')!).boards[`${variant}:${index}`],{variant,index});}
test('pilot resumes errors, compares independent boards and never invokes native ads/analytics or mutates main save',async({page})=>{
 const before=await boot(page),level=candidateFields[0]!,blocked=level.arrows.find(a=>!canExit(a,level.arrows))!;
 await tap(page,level,blocked.id);await expect(page.locator('#game-shell')).toHaveAttribute('data-lives','2');const b=await snapshot(page);
 expect(await page.evaluate(()=>((window as unknown as {serviceCalls:string[]}).serviceCalls).filter(c=>c.startsWith('ArrowsAds.')||c.startsWith('ArrowsAnalytics.')))).toEqual([]);
 expect(await page.evaluate(()=>((window as unknown as {assistanceQA:{snapshot():{pending:unknown[]}}}).assistanceQA.snapshot().pending).length)).toBe(1);
 await page.reload();await expect(page.locator('#game-shell')).toHaveAttribute('data-lives','2');expect(await snapshot(page)).toEqual(b);
 await page.locator('#choose-field').click();await page.locator('[data-action=compare]').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-level',baselineFields[0]!.id);await expect(page.locator('#game-shell')).toHaveAttribute('data-lives','3');
 await page.locator('#choose-field').click();await page.locator('[data-action=compare]').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-lives','2');
 expect(await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('arrows.progress.v1')!)))).toBe(before);
 expect(await page.evaluate(()=>((window as unknown as {serviceCalls:string[]}).serviceCalls).filter(c=>c.startsWith('ArrowsAds.')||c.startsWith('ArrowsAnalytics.')))).toEqual([]);
 await expect(page.locator('#hint')).toBeHidden();await expect(page.locator('#cascade')).toBeHidden();
});
test('playtest settings opens the pilot and returns to the same main attempt',async({page})=>{
 await boot(page);await page.goto('/');await page.locator('#home-settings').click();await page.locator('#settings-testing > summary').click();const before=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('arrows.progress.v1')!)));await page.locator('#content-pilot-open').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-level','pc21');
 expect(await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('arrows.progress.v1')!)))).toBe(before);
 await page.locator('#choose-field').click();await page.locator('[data-action=campaign]').click();await expect(page.locator('#home-play')).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')!).campaign.board.id)).toBe(JSON.parse(before).campaign.board.id);
});
test('narrow light Canvas fallback and reduced motion keep all fields and exit reachable',async({page},info)=>{
 await page.setViewportSize({width:320,height:568});await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,name,...args){if(String(name).includes('webgl'))return null;return Reflect.apply(original,this,[name,...args]);} as typeof original;});
 await boot(page,25);await page.evaluate(()=>localStorage.setItem('arrows.settings.v1',JSON.stringify({version:1,language:'en',theme:'light',sound:false,vibration:false})));await page.reload();await expect(page.locator('#game-shell')).toHaveAttribute('data-level','pd20261121');
 await page.locator('#choose-field').click();await expect(page.locator('[data-action=field-26]')).toBeAttached();await page.locator('[data-action=field-26]').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-level','pd20261122');await page.locator('#choose-field').click();await page.locator('[data-action=campaign]').scrollIntoViewIfNeeded();await expect(page.locator('[data-action=campaign]')).toBeInViewport();await page.screenshot({path:info.outputPath('pilot-narrow-light.png')});
});
test('actual legal clicks complete a breather, Next enters Hard and selector reaches seventh daily',async({page})=>{
 await boot(page,10);const level=candidateFields[10]!,remaining=[...level.arrows];
 while(remaining.length){const a=remaining.find(a=>canExit(a,remaining))!;await tap(page,level,a.id);remaining.splice(remaining.indexOf(a),1);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining',String(remaining.length));}
 await expect(page.locator('#next')).toBeVisible({timeout:10000});await page.locator('#next').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-level','pc32');await expect(page.locator('#difficulty')).toHaveText('Сложный');
 await page.locator('#choose-field').click();await page.locator('[data-action=field-26]').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-level','pd20261122');
 await page.locator('#choose-field').click();await page.locator('[data-action=campaign]').click();await expect(page.locator('#home-play')).toBeVisible();
});
test('three different errors lose the pilot, no free or paid continuation is offered',async({page})=>{
 await boot(page,4);const level=candidateFields[4]!,blocked=level.arrows.filter(a=>!canExit(a,level.arrows)).slice(0,3);for(let i=0;i<3;i++){await tap(page,level,blocked[i]!.id);await expect(page.locator('#game-shell')).toHaveAttribute('data-lives',String(2-i));}
 await expect(page.locator('[data-action=restart]')).toBeVisible();await expect(page.locator('[data-action=free-continue]')).toHaveCount(0);await expect(page.locator('[data-action=rewarded-continue]')).toHaveCount(0);
 await page.locator('[data-action=restart]').click();await page.locator('[data-action=confirm-restart]').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-lives','3');expect((await snapshot(page,'candidate',4)).errors).toEqual([]);
});
