import {test,expect,type Page} from '@playwright/test';
import {campaign} from '../../src/content/campaign';
import {Board,canExit} from '../../src/domain/board';
import {freshSave,freshAttempt,decodeSave,SAVE_KEY,type GameSave} from '../../src/progression/save';
import {defaultSettings,SETTINGS_KEY} from '../../src/app/settings';
function base(index:number){const s=freshSave();s.index=index;s.campaign=freshAttempt(campaign[index]!);s.wins=campaign.slice(0,index).map((l,i)=>({attempt:`past-${i}`,levelId:l.id,activeMs:1000,completedAt:i*1000,localDate:'2026-11-01',mistakes:0}));s.tutorials=['tap','turns','blockers','guides','zoom','hint'];return s;}
async function seed(page:Page,s:GameSave){decodeSave(s);await page.addInitScript(({key,s})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(s));},{key:SAVE_KEY,s});await page.goto('/');await page.locator('#home-play:enabled').click();await expect(page.locator('.route-snapshot,.board-transition')).toHaveCount(0);await expect.poll(()=>page.locator('#game-root,#game-header,#game-footer').evaluateAll(elements=>elements.reduce((sum,e)=>sum+e.getAnimations({subtree:true}).length,0))).toBe(0);}
const saved=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!) as GameSave,SAVE_KEY);
async function tap(page:Page,path:readonly{x:number;y:number}[]){const c=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!),p=path.at(-1)!;await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);}
async function pressCancel(page:Page,selector:string){const button=page.locator(selector).first();const box=(await button.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await expect(button).toHaveAttribute('data-pressed','true');expect(await button.evaluate(e=>Number(getComputedStyle(e,'::after').opacity))).toBeGreaterThan(.1);await page.mouse.move(2,2);await page.mouse.up();await expect(button).not.toHaveAttribute('data-pressed','true');}

test('automatically flies the screenshot c03 red arrow after its blocker, without another tap or life refund',async({page},info)=>{
 const s=base(2);await seed(page,s);await tap(page,campaign[2]!.arrows[1]!.path);await expect(page.locator('#game-shell')).toHaveAttribute('data-lives','2');await page.waitForTimeout(600);
 await tap(page,campaign[2]!.arrows[0]!.path);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','4');const after=await saved(page);expect(after.campaign.board).toMatchObject({removed:['c03-0','c03-1'],errors:['c03-1'],lives:2});await page.waitForTimeout(700);await page.screenshot({path:info.outputPath('auto-release.png')});
 await page.reload();await page.locator('#home-play:enabled').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','4');expect((await saved(page)).campaign.board).toEqual(after.campaign.board);
});

test('spends its one lifetime gift durably and offers video after restarting and losing again',async({page})=>{
 const s=base(4),b=new Board(s.campaign.level,s.campaign.board.id),blocked=b.remaining.filter(a=>!canExit(a,b.remaining)).slice(0,3);for(const a of blocked)b.activate(a.id);s.campaign.board=b.snapshot();s.campaign.started=true;await seed(page,s);
 await page.locator('[data-action=free-continue]').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-lives','3');expect((await saved(page)).freeContinueUsed).toBe(true);
 await page.locator('#restart').click();await page.locator('[data-action=confirm-restart]').click();await expect(page.locator('#game-dialog')).not.toBeVisible();await page.waitForTimeout(400);
 for(const a of blocked)await tap(page,a.path);await expect(page.locator('[data-action=rewarded-continue]')).toBeVisible();await expect(page.locator('[data-action=free-continue]')).toHaveCount(0);
 await page.reload();await page.locator('#home-play:enabled').click();await expect(page.locator('[data-action=rewarded-continue]')).toBeVisible();expect((await saved(page)).freeContinueUsed).toBe(true);
});

test('fits the whole completed zoomed diagram before its finish cue and never replays on restore',async({page},info)=>{
 await page.addInitScript(()=>{const cues:unknown[]=[];Reflect.set(window,'finishViews',cues);const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer&&this.buffer.duration>=.55)cues.push({duration:this.buffer.duration,camera:JSON.parse(document.querySelector('#game-root')!.getAttribute('data-camera')!)});return start.apply(this,args);};});
 const s=base(19),b=new Board(s.campaign.level,s.campaign.board.id);while(b.remaining.length>1)b.activate(b.hint()!);s.campaign.board=b.snapshot();s.campaign.started=true;const last=b.remaining[0]!,head=last.path.at(-1)!;s.campaign.view={centerX:head.x,centerY:head.y,zoom:2.6};await seed(page,s);
 const before=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);await tap(page,last.path);await expect(page.locator('#game-shell')).toHaveAttribute('data-state','complete');await expect(page.locator('#win')).not.toBeVisible();await expect(page.locator('#win')).toBeVisible();await expect(page.locator('#win')).toHaveAttribute('data-flawless','true');
 const final=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);expect(final.scale).toBeLessThan(before.scale*.5);
 const header=(await page.locator('#game-header').boundingBox())!,footer=(await page.locator('#game-footer').boundingBox())!;for(const p of s.campaign.level.mask){expect(final.x+p.x*final.scale).toBeGreaterThanOrEqual(12);expect(final.x+p.x*final.scale).toBeLessThanOrEqual(page.viewportSize()!.width-12);expect(final.y+p.y*final.scale).toBeGreaterThanOrEqual(header.y+header.height+12);expect(final.y+p.y*final.scale).toBeLessThanOrEqual(footer.y-12);}
 const cues=await page.evaluate(()=>Reflect.get(window,'finishViews') as {duration:number;camera:{scale:number}}[]);expect(cues).toHaveLength(1);expect(cues[0]!.duration).toBeCloseTo(.8,2);expect(cues[0]!.camera.scale).toBeCloseTo(final.scale,3);await page.screenshot({path:info.outputPath('fitted-perfect.png')});await page.waitForTimeout(2500);const result=await saved(page);expect(result.campaign.view!.zoom).toBeCloseTo(1,5);
 const point=s.campaign.level.mask[Math.floor(s.campaign.level.mask.length/2)]!;
 const clip={x:Math.floor(final.x+point.x*final.scale)-2,y:Math.floor(final.y+point.y*final.scale)-2,width:5,height:5};
 const png=await page.screenshot({clip});
 const contrast=await page.evaluate(async encoded=>{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d')!;ctx.drawImage(bitmap,0,0);const pixels=ctx.getImageData(0,0,bitmap.width,bitmap.height).data;let max=0;for(let i=0;i<pixels.length;i+=4)max=Math.max(max,pixels[i]!-30,pixels[i+1]!-30,pixels[i+2]!-44);return max;},png.toString('base64'));
 expect(contrast).toBeGreaterThan(12);await page.screenshot({path:info.outputPath('settled-dot-silhouette.png')});

 await page.reload();await page.locator('#home-play:enabled').click();expect(await page.evaluate(()=>Reflect.get(window,'finishViews'))).toEqual([]);
});

test('gives Hint a contrasting solid accent and a finite arrival, with thicker held/grid guides',async({page},info)=>{
 if(info.project.name==='desktop')await page.addInitScript(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:SETTINGS_KEY,s:{...defaultSettings('ru'),theme:'light'}});
 await seed(page,base(4));await page.locator('#hint:visible').waitFor();const colors=await page.locator('#hint').evaluate(e=>{const s=getComputedStyle(e);return {bg:s.backgroundColor,ink:s.color,opacity:s.opacity};});expect(colors.bg).not.toBe('rgba(0, 0, 0, 0)');expect(colors.opacity).toBe('1');
 await page.waitForTimeout(1050);expect(await page.locator('#hint').evaluate(e=>e.getAnimations().length)).toBe(0);await pressCancel(page,'#hint');
 await page.locator('#guides').click();await expect(page.locator('#guides')).toHaveAttribute('aria-pressed','true');await page.screenshot({path:info.outputPath('hint-and-guides.png')});const snapshot=(await saved(page)).campaign.board;
 await page.locator('#guides').click();const a=campaign[4]!.arrows[0]!,c=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!),p=a.path.at(-1)!;await page.mouse.move(c.x+p.x*c.scale,c.y+p.y*c.scale);await page.mouse.down();await page.waitForTimeout(450);await page.screenshot({path:info.outputPath('held-guide.png')});await page.mouse.move(2,2);await page.mouse.up();expect((await saved(page)).campaign.board).toEqual(snapshot);
});

test('acknowledges icon, nav, calendar, disclosure and settings presses, including reduced motion and cancel',async({page})=>{
 await seed(page,base(19));await pressCancel(page,'#game-settings');await pressCancel(page,'#choose-field');await page.locator('#choose-field').click();await pressCancel(page,'#home-collection');await page.locator('#home-collection').click();await pressCancel(page,'[data-medal] summary');await page.locator('#home-calendar').click();await pressCancel(page,'[data-date]:not(:disabled)');
 await page.locator('#home-settings').click();for(const selector of ['#theme-light','#setting-sound','#preview-vibration','#close-settings'])await pressCancel(page,selector);await page.emulateMedia({reducedMotion:'reduce'});await pressCancel(page,'#setting-vibration');await page.keyboard.press('Escape');await expect(page.locator('[data-pressed=true]')).toHaveCount(0);
});

test('resumes the already unblocked red arrow from the old screenshot save through the durable move path',async({page})=>{
 const s=base(2);s.campaign.started=true;s.campaign.board={...s.campaign.board,removed:['c03-0'],errors:['c03-1'],lives:2};decodeSave(s);await seed(page,s);
 await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','4');const a=(await saved(page)).campaign.board;expect(a).toMatchObject({removed:['c03-0','c03-1'],errors:['c03-1'],lives:2});
});

test('keeps the complete Graphics path working when WebGL is unavailable',async({page},info)=>{
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:unknown[]){if(type.includes('webgl'))return null;return Reflect.apply(get,this,[type,...args]);} as typeof get;});
 if(info.project.name==='desktop')await page.addInitScript(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:SETTINGS_KEY,s:{...defaultSettings('en'),theme:'light'}});
 await seed(page,base(2));await tap(page,campaign[2]!.arrows[0]!.path);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','5');await page.waitForTimeout(650);await page.screenshot({path:info.outputPath('canvas-fallback.png')});
 const camera=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!),bg=info.project.name==='desktop'?[243,244,250]:[30,30,44];
 for(const point of [{x:0,y:0},{x:9,y:0},{x:9,y:11}]){
  const png=await page.screenshot({clip:{x:Math.floor(camera.x+point.x*camera.scale)-2,y:Math.floor(camera.y+point.y*camera.scale)-2,width:5,height:5}});
  const difference=await page.evaluate(async({encoded,bg})=>{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),image=await createImageBitmap(new Blob([bytes],{type:'image/png'})),canvas=new OffscreenCanvas(image.width,image.height),ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,image.width,image.height).data;let difference=0;for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++)difference=Math.max(difference,Math.abs(data[i+c]!-bg[c]!));return difference;},{encoded:png.toString('base64'),bg});expect(difference).toBeGreaterThan(10);
 }
 expect((await saved(page)).campaign.board.removed).toEqual(['c03-0']);
});
