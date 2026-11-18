import {test,expect,type Page} from '@playwright/test';
import {freshSave,freshAttempt,decodeSave,SAVE_KEY,type GameSave} from '../../src/progression/save';
import {campaign} from '../../src/content/campaign';
import {dailyCatalog} from '../../src/content/daily';
import {Board,canExit} from '../../src/domain/board';
import {defaultSettings,SETTINGS_KEY} from '../../src/app/settings';
import {openDailyEntryReview} from './helpers/dailyEntryReview';
const date='2026-11-17';
function seed(){const s=freshSave();s.index=19;s.campaign=freshAttempt(campaign[19]!);s.wins=campaign.slice(0,19).map((l,i)=>({attempt:`past-${i}`,levelId:l.id,mistakes:0,completedAt:1,activeMs:1}));s.seenUnlocks=['collection','calendar'];return s;}
function nearly(s:GameSave,daily=false){const a=daily?(s.daily[date]=freshAttempt(dailyCatalog[date]!)):s.campaign,b=new Board(a.level,a.board.id);while(b.remaining.length>1)b.activate(b.remaining.find(v=>canExit(v,b.remaining))!.id);a.board=b.snapshot();a.started=true;return a;}
async function boot(page:Page,state=seed(),native=false){decodeSave(state);await page.clock.setFixedTime(new Date(date+'T12:00:00Z'));await page.addInitScript(({state,key,prefs,pkey})=>{if(!sessionStorage.getItem('daily-seeded')){localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(pkey,JSON.stringify(prefs));sessionStorage.setItem('daily-seeded','1');}},{state,key:SAVE_KEY,prefs:defaultSettings('en'),pkey:SETTINGS_KEY});if(native)await openDailyEntryReview(page);else await page.goto('/');await expect(page.locator('#game-shell')).toHaveAttribute('data-progress','ready');}
const saved=(p:Page):Promise<GameSave>=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)!),SAVE_KEY);
async function settle(p:Page){await p.waitForFunction(()=>!document.querySelector('.route-snapshot,.board-transition'));}
// Routing tests await the real final flight/result, not a five-second rendering benchmark.
async function last(p:Page){await expect(p.locator('#game-shell')).toHaveAttribute('data-screen','game');await settle(p);await p.waitForTimeout(450);const a=await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k)!);return document.querySelector('#game-shell')!.getAttribute('data-mode')==='daily'?s.daily['2026-11-17']:s.campaign;},SAVE_KEY),arrow=a.level.arrows.find((v:{id:string})=>!a.board.removed.includes(v.id)),head=arrow.path.at(-1),c=JSON.parse((await p.locator('#game-root').getAttribute('data-camera'))!);await p.mouse.click(c.x+head.x*c.scale,c.y+head.y*c.scale);await expect(p.locator('#win')).toBeVisible({timeout:15000}).catch(async e=>{console.info('LAST_DIAGNOSTIC',JSON.stringify(await p.evaluate(({x,y})=>({reasons:Reflect.get(window,'dailyEntryFixture')?.reasons(),shell:{...document.querySelector<HTMLElement>('#game-shell')!.dataset},camera:document.querySelector('#game-root')!.getAttribute('data-camera'),point:{x,y},elements:document.elementsFromPoint(x,y).map(e=>e.id||e.tagName)}),{x:c.x+head.x*c.scale,y:c.y+head.y*c.scale})));throw e;});}
test('Home enters/resumes today and keeps the exact campaign attempt, view, lives and help ledger',async({page})=>{
 const s=seed();s.campaign.started=true;s.campaign.view={centerX:20,centerY:22,zoom:1.8};s.freeContinueUsed=true;await boot(page,s);const before=(await saved(page)).campaign;
 await expect(page.locator('#home-daily')).toContainText("Today's daily");await page.locator('#home-daily').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-mode','daily');await settle(page);
 expect((await saved(page)).campaign).toEqual(before);expect((await saved(page)).freeContinueUsed).toBe(true);await page.locator('#choose-field').click();await page.locator('[data-nav=back]').click();await page.locator('#home-play').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt',before.board.id);expect((await saved(page)).campaign.board).toEqual(before.board);
});
test('saved campaign result offers today, accepts one transition, and retains that completed attempt until campaign return',async({page})=>{
 const s=seed(),a=nearly(s);await boot(page,s);await page.locator('#home-play').click();await last(page);await expect(page.locator('#result-daily')).toContainText("Today's daily");await page.locator('#result-daily').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-mode','daily');expect((await saved(page)).index).toBe(19);expect((await saved(page)).campaign.board.id).toBe(a.board.id);expect((await saved(page)).wins).toHaveLength(20);
});
test('daily result shows actual month progress, closest unfinished date and a direct campaign return',async({page})=>{
 const s=seed(),a=nearly(s,true),campaignId=s.campaign.board.id;await boot(page,s);await page.locator('#home-daily').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-mode','daily');await last(page);await expect(page.locator('#win-cup-progress')).toContainText('1 / 30');await expect(page.locator('#result-daily')).toContainText('Nov 16');await expect(page.locator('#next')).toHaveText('Back to campaign');await page.locator('#next').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-mode','campaign');await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt',campaignId);expect((await saved(page)).dailyWins[date]!.attempt).toBe(a.board.id);
});
test('notification entry waits for an external activity and preserves campaign; repeated nonce is consumed once',async({page})=>{
 await boot(page,seed(),true);await page.locator('#home-play').click();await settle(page);const id=await page.locator('#game-shell').getAttribute('data-attempt');await page.evaluate(()=>{const f=Reflect.get(window,'dailyEntryFixture');f.block(true);f.tap('tap-1');});await page.waitForTimeout(450);await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt',id!);await page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').block(false));await expect(page.locator('#game-shell')).toHaveAttribute('data-mode','daily');await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').status().pending)).toBe('');expect((await saved(page)).campaign.board.id).toBe(id);await page.waitForTimeout(500);expect(await page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').calls.filter((v:{method:string})=>v.method==='consume').length)).toBe(1);
});
test('automatically requests notification permission once after daily unlock, with no time or opt-in controls',async({page})=>{
 const s=seed();nearly(s,true);await boot(page,s,true);
 await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').status().requested)).toBe(true);
 expect(await page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').calls.filter((v:{method:string})=>v.method==='request').length)).toBe(1);
 await page.locator('#home-settings').click();await expect(page.locator('#reminder-settings')).toContainText('13:00 and 19:00');
 await expect(page.locator('#reminder-settings input,#reminder-toggle')).toHaveCount(0);
 expect(await page.locator('#settings-testing #reminder-settings').count()).toBe(0);
 await page.getByRole('button',{name:'Android settings',exact:true}).click();
 expect(await page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').calls.some((v:{method:string})=>v.method==='settings'))).toBe(true);
 await page.locator('#close-settings').click();await page.locator('#home-daily').click();await last(page);
 await expect(page.locator('#daily-reminder-offer')).toHaveCount(0);await expect(page.locator('#win-cup-progress')).toContainText('1 / 30');
 await page.reload();await page.locator('#home-daily:enabled').waitFor();await page.waitForTimeout(600);
 expect(await page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').calls.filter((v:{method:string})=>v.method==='request').length)).toBe(0);
});

test('denied Android permission is respected across reload without another prompt or game blocking',async({page})=>{
 await page.addInitScript(()=>Reflect.set(window,'reminderPermissionDenied',true));await boot(page,seed(),true);
 await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').status().requested)).toBe(true);
 expect(await page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').status().allowed)).toBe(false);
 await page.locator('#home-settings').click();await expect(page.locator('#reminder-settings')).toContainText('blocked in Android');
 await page.locator('#close-settings').click();await page.locator('#home-play').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','game');
 await page.reload();await page.locator('#home-play:enabled').waitFor();await page.waitForTimeout(600);
 expect(await page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').calls.filter((v:{method:string})=>v.method==='request').length)).toBe(0);
});

test('notification permission waits until dailies unlock and external activity returns',async({page})=>{
 const s=seed();s.index=18;s.campaign=freshAttempt(campaign[18]!);s.wins=s.wins.slice(0,18);nearly(s);await boot(page,s,true);await page.waitForTimeout(600);
 expect(await page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').calls.some((v:{method:string})=>v.method==='request'))).toBe(false);
 await page.locator('#home-play').click();await last(page);await page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').block(true));
 await page.waitForTimeout(400);expect(await page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').calls.some((v:{method:string})=>v.method==='request'))).toBe(false);
 await page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').block(false));await page.locator('#next').click();
 await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'dailyEntryFixture').calls.filter((v:{method:string})=>v.method==='request').length)).toBe(1);
});

test('unmodified production result uses one existing interstitial opportunity and waits for external return before the daily',async({page})=>{
 const {readFileSync}=await import('node:fs');const transport=readFileSync('tools/qa/assistance-native-transport.mjs','utf8').replace('export function controlledNative','function controlledNative');
 const s=seed(),a=nearly(s);s.adCadence={version:1,activeMs:200000,nextRequestMs:150000,progressAtRequest:17};decodeSave(s);
 await page.clock.setFixedTime(new Date(date+'T12:00:00Z'));await page.addInitScript({content:`${transport}\ncontrolledNative(${JSON.stringify({save:s,settings:defaultSettings('en'),reminders:{}})});`});await page.goto('/');await page.locator('#home-play:enabled').click();await last(page);
 await page.evaluate(()=>{const b=document.querySelector<HTMLButtonElement>('#result-daily')!;b.click();b.click();});await page.waitForFunction(()=>Reflect.get(window,'assistanceQA').snapshot().request?.kind==='interstitial');
 const snapshot=await page.evaluate(()=>Reflect.get(window,'assistanceQA').snapshot());expect(snapshot.request.attempt).toBe(a.board.id);expect(snapshot.events.filter((v:{event:string})=>v.event==='ad_opportunity')).toHaveLength(1);expect((await saved(page)).adCadence.progressAtRequest).toBe(20);
 await page.evaluate(()=>{const qa=Reflect.get(window,'assistanceQA');qa.shown();qa.background(true);qa.dismiss();});await page.waitForTimeout(450);expect((await saved(page)).daily[date]).toBeUndefined();await expect(page.locator('#game-shell')).toHaveAttribute('data-mode','campaign');
 await page.evaluate(()=>Reflect.get(window,'assistanceQA').background(false));await expect(page.locator('#game-shell')).toHaveAttribute('data-mode','daily');expect((await saved(page)).campaign.board.id).toBe(a.board.id);expect((await saved(page)).index).toBe(19);
 await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'assistanceQA').snapshot().events.filter((v:{event:string;params:{source:string}})=>v.event==='daily_entry'&&v.params.source==='result').length)).toBe(1);
});

test('a pending cold bridge entry re-resolves a completed today to yesterday without replacing the earned result',async({page})=>{
 const {readFileSync}=await import('node:fs');const transport=readFileSync('tools/qa/assistance-native-transport.mjs','utf8').replace('export function controlledNative','function controlledNative');
 const s=seed(),a=nearly(s,true);a.board={...a.board,removed:[...a.board.removed,...a.level.arrows.filter(v=>!a.board.removed.includes(v.id)).map(v=>v.id)]};s.dailyWins[date]={attempt:a.board.id,levelId:a.level.id,mistakes:0,completedAt:1,activeMs:1,localDate:date};decodeSave(s);
 await page.clock.setFixedTime(new Date(date+'T12:00:00Z'));await page.addInitScript({content:`${transport}\ncontrolledNative(${JSON.stringify({save:s,settings:defaultSettings('en'),reminders:{pending:'c212e831-6332-4a37-9701-498716d433f8'}})});`});await page.goto('/');await expect(page.locator('#game-shell')).toHaveAttribute('data-mode','daily');await expect(page.locator('#app-title')).toHaveText('November 16');await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'assistanceQA').snapshot().reminders.pending)).toBe('');const after=await saved(page);expect(after.dailyWins[date]).toEqual(s.dailyWins[date]);expect(after.daily[date]).toEqual(s.daily[date]);expect(after.campaign).toEqual(s.campaign);
});

test('daily shortcuts and the largest result remain visible and hittable in compact portrait and short browser windows',async({page},info)=>{
 const s=seed();nearly(s,true);await boot(page,s,true);
 const sizes=[{width:320,height:568},{width:390,height:844},{width:844,height:390}];
 // The viewport watcher and the first font/layout paint settle asynchronously.
 // Observe the real bounds and hit target together; persistent clipping still fails.
 const check=async(selectors:string[])=>{for(const key of selectors){
  await expect.poll(()=>page.locator(key).evaluate(e=>{
   const r=e.getBoundingClientRect();return {
    usable:r.width>0&&r.height>=43,
    inBounds:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,
    hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),
   };
  }),{message:key+' at '+JSON.stringify(page.viewportSize())}).toEqual({usable:true,inBounds:true,hit:true});
 }};
 for(const size of sizes){await page.setViewportSize(size);await check(['#home-play','#home-daily']);}
 await page.setViewportSize(sizes[1]!);await page.locator('#home-daily').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-mode','daily');await last(page);await expect(page.locator('#daily-reminder-offer')).toHaveCount(0);await page.waitForTimeout(750);
 for(const size of sizes){await page.setViewportSize(size);await page.waitForTimeout(120);await check(['#next','#result-daily']);await page.screenshot({path:info.outputPath('daily-result-'+size.width+'x'+size.height+'.png')});}
});
