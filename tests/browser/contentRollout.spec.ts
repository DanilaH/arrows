import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {campaign} from '../../src/content/campaign';
import {dailyCatalog,dailyLevel} from '../../src/content/daily';
import {freshSave,freshAttempt,SAVE_KEY,type GameSave} from '../../src/progression/save';
import {Board} from '../../src/domain/board';
const transport=readFileSync('tools/qa/assistance-native-transport.mjs','utf8').replace('export function controlledNative','function controlledNative');
function unlocked(){const s=freshSave();s.index=19;s.campaign=freshAttempt(campaign[19]!);s.wins=campaign.slice(0,19).map((l,i)=>({attempt:`past-${i}`,levelId:l.id,activeMs:1000,completedAt:i+1,mistakes:0}));s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=['collection','calendar'];s.freeContinueUsed=true;return s;}
async function boot(page:Page,s=unlocked()){
 await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));await page.addInitScript({content:`${transport}\ncontrolledNative(${JSON.stringify({save:s,preserve:true,settings:{version:1,language:'ru',theme:'dark',sound:true,vibration:true}})});`});
 await page.goto('/');await page.locator('#home-calendar:enabled').click();
}
async function choose(page:Page,date:string){await page.locator(`[data-date="${date}"]`).click();await page.locator('#start-daily').click();}
const saved=(page:Page)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),SAVE_KEY);
async function tap(page:Page,level:NonNullable<ReturnType<typeof dailyLevel>>,id:string){const c=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!),a=level.arrows.find(a=>a.id===id)!,p=a.path.at(-1)!;await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);}
test('real worker opens a large normal-calendar daily shared with Node, accepts input and resumes without regeneration',async({page})=>{
 await boot(page);await choose(page,'2026-11-15');await expect(page.locator('#game-shell')).toHaveAttribute('data-mode','daily');await expect(page.locator('#game-shell')).toHaveAttribute('data-level','d20261115');
 const s=await saved(page),a=s.daily['2026-11-15'],level=dailyLevel('2026-11-15')!;expect(a.level).toEqual(level);expect(level.arrows.length).toBeGreaterThanOrEqual(140);expect(a.level.contentVersion).toBe(3);
 await page.waitForTimeout(400);const b=new Board(level,a.board.id);await tap(page,level,b.hint()!);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining',String(level.arrows.length-1));
 const after=await saved(page);await page.reload();await page.locator('#home-calendar:enabled').click();await choose(page,'2026-11-15');await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt',a.board.id);expect((await saved(page)).daily['2026-11-15'].board).toEqual(after.daily['2026-11-15'].board);expect((await saved(page)).freeContinueUsed).toBe(true);
});
test('large Nightmare supports zoom/pan and the primary earned cascade through the unchanged reward path',async({page})=>{
 await boot(page);await choose(page,'2026-11-18');await expect(page.locator('#difficulty')).toHaveText('Кошмар');await expect(page.locator('#game-shell')).toHaveAttribute('data-level','d20261118');
 const before=await saved(page),level=before.daily['2026-11-18'].level;expect(level.arrows.length).toBeGreaterThanOrEqual(170);await page.waitForTimeout(400);
 const camera=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);const box=(await page.locator('#game-root').boundingBox())!,cx=box.x+box.width/2,cy=box.y+box.height/2;await page.mouse.move(cx,cy);await page.mouse.wheel(0,-600);await expect.poll(async()=>JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!).scale).toBeGreaterThan(camera.scale*1.25);
 const zoomed=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+60,cy+50,{steps:6});await page.mouse.up();await expect.poll(async()=>JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!).x).not.toBe(zoomed.x);
 await page.locator('#hint:visible').waitFor();await expect(page.locator('#hint')).toHaveAttribute('data-help-effect','cascade-v1');await expect(page.locator('#cascade')).toHaveCount(0);await page.locator('#hint').click();await page.locator('[data-action=rewarded-cascade]').click();await page.waitForFunction(()=>!!(window as any).assistanceQA.snapshot().request);await page.evaluate(()=>{const qa=(window as any).assistanceQA;qa.shown();qa.earned();qa.dismiss();});
 await expect.poll(async()=>(await saved(page)).daily['2026-11-18'].hint).not.toBeNull();const after=await saved(page),a=after.daily['2026-11-18'];expect(a.board.errors).toEqual([]);expect(a.board.lives).toBe(3);const right=Object.values(after.helpLedger.rights).find((r:any)=>r.kind==='cascade-v1') as any;expect(right.plan.bonus.length).toBeGreaterThanOrEqual(2);expect(right.plan.bonus.length).toBeLessThanOrEqual(4);await expect(page.locator('#game-root')).toHaveAttribute('data-help-group',JSON.stringify(right.plan.bonus));expect(after.freeContinueUsed).toBe(true);
});
test('old started daily and campaign are retained, while another unopened archive date gets the large v2 board',async({page})=>{
 const s=unlocked(),date='2026-11-15',a=freshAttempt(dailyCatalog[date]!),b=new Board(a.level,a.board.id);b.activate(b.hint()!);a.started=true;a.board=b.snapshot();a.view={centerX:8,centerY:9,zoom:2};s.daily[date]=a;
 await boot(page,s);await choose(page,date);await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt',a.board.id);expect((await saved(page)).daily[date]).toEqual(a);
 await page.locator('#choose-field').click();await choose(page,'2026-11-14');await expect(page.locator('#game-shell')).toHaveAttribute('data-level','d20261114');const after=await saved(page);expect(after.daily['2026-11-14'].level.contentVersion).toBe(3);expect(after.daily['2026-11-14'].level.arrows.length).toBeGreaterThanOrEqual(140);expect(after.daily[date].board).toEqual(a.board);expect(after.campaign).toEqual(s.campaign);
});
async function fakeWorker(page:Page){await page.addInitScript(()=>{const workers:any[]=[];(window as any).qaWorkers=workers;(window as any).Worker=class{onmessage:any=null;onerror:any=null;onmessageerror:any=null;late:any;terminated=0;request:any;constructor(){workers.push(this);}postMessage(v:any){this.request=v;this.late=this.onmessage;}terminate(){this.terminated++;}};});}
test('leaving calendar cancels pending construction; late worker output creates no attempt or reward',async({page})=>{
 await fakeWorker(page);await boot(page);await choose(page,'2026-11-15');await expect(page.locator('#start-daily')).toHaveAttribute('aria-busy','true');await page.locator('#home-tab').click();await expect(page.locator('#home-play')).toBeVisible();expect(await page.evaluate(()=>(window as any).qaWorkers[0].terminated)).toBe(1);
 const level=dailyLevel('2026-11-15')!;await page.evaluate(level=>(window as any).qaWorkers[0].late({data:{date:'2026-11-15',result:{level}}}),level);expect((await saved(page)).daily).toEqual({});expect((await saved(page)).receipts).toEqual([]);
});
test('worker failure offers a retry on the same date, without substituting an easy board',async({page})=>{
 await fakeWorker(page);await boot(page);await choose(page,'2026-11-15');await page.evaluate(()=>(window as any).qaWorkers[0].onmessage({data:{date:'2026-11-15',error:true}}));await expect(page.locator('#start-daily')).toBeEnabled();await expect(page.locator('#calendar-notice')).not.toHaveText('');expect((await saved(page)).daily).toEqual({});
 await page.locator('#start-daily').click();expect(await page.evaluate(()=>(window as any).qaWorkers[1].request.date)).toBe('2026-11-15');const level=dailyLevel('2026-11-15')!;await page.evaluate(level=>(window as any).qaWorkers[1].onmessage({data:{date:'2026-11-15',result:{level}}}),level);await expect(page.locator('#game-shell')).toHaveAttribute('data-level','d20261115');expect((await saved(page)).daily['2026-11-15'].level).toEqual(level);
});

test('inspecting a trophy cancels pending daily construction and restores Play after closing',async({page})=>{
 await fakeWorker(page);await boot(page);await choose(page,'2026-11-15');await expect(page.locator('#start-daily')).toHaveAttribute('aria-busy','true');
 await page.locator('#view-trophy').click();await expect(page.locator('#trophy-viewer')).toBeVisible();
 expect(await page.evaluate(()=>(window as any).qaWorkers[0].terminated)).toBe(1);
 await page.locator('[data-close-trophy]').click();await expect(page.locator('#trophy-viewer')).not.toBeVisible();
 await expect(page.locator('#start-daily')).toBeEnabled();await expect(page.locator('#start-daily')).toHaveAttribute('aria-busy','false');
 const level=dailyLevel('2026-11-15')!;await page.evaluate(level=>(window as any).qaWorkers[0].late({data:{date:'2026-11-15',result:{level}}}),level);
 expect((await saved(page)).daily).toEqual({});expect((await saved(page)).receipts).toEqual([]);
 await page.locator('#start-daily').click();expect(await page.evaluate(()=>(window as any).qaWorkers[1].request.date)).toBe('2026-11-15');
 await page.evaluate(level=>(window as any).qaWorkers[1].onmessage({data:{date:'2026-11-15',result:{level}}}),level);
 await expect(page.locator('#game-shell')).toHaveAttribute('data-level','d20261115');expect((await saved(page)).daily['2026-11-15'].level).toEqual(level);
});

test('without Worker the same large dated board is prepared cooperatively while the calendar keeps painting',async({page})=>{
 await page.addInitScript(()=>{(window as any).Worker=undefined;let frames=0;const frame=()=>{frames++;(window as any).qaPaints=frames;requestAnimationFrame(frame);};requestAnimationFrame(frame);});
 await boot(page);const before=await page.evaluate(()=>(window as any).qaPaints);await choose(page,'2026-11-15');await expect(page.locator('#game-shell')).toHaveAttribute('data-level','d20261115');expect((await saved(page)).daily['2026-11-15'].level).toEqual(dailyLevel('2026-11-15'));expect(await page.evaluate(()=>(window as any).qaPaints)).toBeGreaterThan(before+1);
});
