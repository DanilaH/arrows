import {test,expect,type Page} from '@playwright/test';
import {campaign} from '../../src/content/campaign';
import {dailyCatalog} from '../../src/content/daily';
import {Board} from '../../src/domain/board';
import {freshSave,freshAttempt,decodeSave,SAVE_KEY,type GameSave,type SavedAttempt} from '../../src/progression/save';
import {monthDates} from '../../src/progression/calendar';
import {defaultSettings,SETTINGS_KEY} from '../../src/app/settings';
function nearlyDone(attempt:SavedAttempt){const board=new Board(attempt.level,attempt.board.id);while(board.remaining.length>1)board.activate(board.hint()!);attempt.board=board.snapshot();attempt.started=true;return board.remaining[0]!;}
function base(index:number){const s=freshSave();s.index=index;s.campaign=freshAttempt(campaign[index]!);s.wins=campaign.slice(0,index).map((l,i)=>({attempt:`past-${i}`,levelId:l.id,activeMs:1000,completedAt:i*1000,localDate:'2026-11-01',mistakes:0}));return s;}
async function seed(page:Page,state:GameSave){decodeSave(state);await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:SAVE_KEY,state});await page.goto('/');await page.locator('#home-play:enabled').waitFor();}
async function lastTap(page:Page,path:readonly{x:number;y:number}[]){await page.waitForTimeout(450);const c=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!),p=path.at(-1)!;await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);await expect(page.locator('#win')).toBeVisible();}
const saved=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),SAVE_KEY);
async function daily(page:Page,date='2026-11-02'){
  await page.clock.setFixedTime(new Date('2026-12-01T12:00:00Z'));const s=base(19);s.seenUnlocks=['collection','calendar'];s.daily[date]=freshAttempt(dailyCatalog[date]!);const arrow=nearlyDone(s.daily[date]!);
  await seed(page,s);await page.locator('#home-calendar').click();
  const month=date.slice(0,7);for(let i=0;i<12;i++){if((await page.locator('[data-date]').first().getAttribute('data-date'))?.startsWith(month))break;await page.locator('[data-shift="-1"]').click();}
  await page.locator(`[data-date="${date}"]`).click();await page.locator('#start-daily').click();await lastTap(page,arrow.path);return {state:s,date};
}

test('introduces the newly unlocked collection once on menu return and cancels cleanly on navigation',async({page},info)=>{
  const s=base(8),arrow=nearlyDone(s.campaign);await seed(page,s);await page.locator('#home-play').click();await lastTap(page,arrow.path);await page.locator('#next').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-level','c10');await page.locator('#choose-field').click();
  await expect(page.locator('.arrival-notice')).toContainText(/Collection|Коллекция/);expect((await saved(page)).seenUnlocks).toEqual(['collection']);await page.waitForTimeout(250);await page.screenshot({path:info.outputPath('collection-unlock.png')});
  await page.locator('#home-collection').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','collection');await expect(page.locator('.arrival-notice,.arrival-halo')).toHaveCount(0);
  await page.reload();await page.locator('#home-play:enabled').waitFor();await page.waitForTimeout(800);await expect(page.locator('.arrival-notice')).toHaveCount(0);
});
test('settles the newly unlocked daily cue on background without replay',async({page})=>{
  const s=base(18);s.seenUnlocks=['collection'];const arrow=nearlyDone(s.campaign);await seed(page,s);await page.locator('#home-play').click();await lastTap(page,arrow.path);await page.locator('#next').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-level','c20');await page.locator('#choose-field').click();await expect(page.locator('.arrival-notice')).toContainText(/Daily|Ежедневные/);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('.arrival-notice,.arrival-halo')).toHaveCount(0);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(800);await expect(page.locator('.arrival-notice')).toHaveCount(0);expect((await saved(page)).seenUnlocks).toEqual(['collection','calendar']);
});
test('shows canonical daily progress before its transfer and never replays a viewed result',async({page},info)=>{
  const {date}=await daily(page);expect(Object.keys((await saved(page)).dailyWins)).toEqual([date]);await page.locator('#next').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','calendar');
  await expect(page.locator(`[data-date="${date}"]`)).toHaveClass(/done/);await expect(page.locator('.month-progress')).toHaveAttribute('aria-valuenow','1');await expect(page.locator('.month-count > span')).toHaveText('1');await expect(page.locator('.day-progress-token')).toHaveCount(1);await page.waitForTimeout(450);await page.screenshot({path:info.outputPath('day-to-cup.png')});
  await page.waitForTimeout(1600);await expect(page.locator('.day-progress-token,.arrival-halo')).toHaveCount(0);await page.locator('#start-daily').click();await expect(page.locator('#win')).toBeVisible();await page.locator('#next').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','calendar');await page.waitForTimeout(850);await expect(page.locator('.day-progress-token')).toHaveCount(0);expect(Object.keys((await saved(page)).dailyWins)).toEqual([date]);
});
test('allows leaving the calendar during the arrival without a late token or changed progress',async({page})=>{
  const {date}=await daily(page);await page.locator('#next').click();await expect(page.locator('.day-progress-token')).toHaveCount(1);await page.locator('#home-tab').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','home');await expect(page.locator('.day-progress-token,.arrival-halo,.arrival-notice')).toHaveCount(0);await page.locator('#home-calendar').click();await page.waitForTimeout(800);await expect(page.locator('.day-progress-token')).toHaveCount(0);expect((await saved(page)).dailyWins[date]).toBeTruthy();
});
test('does not replay a daily arrival after backgrounding the result',async({page})=>{
  await daily(page);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.locator('#next').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','calendar');await page.waitForTimeout(850);await expect(page.locator('.day-progress-token,.arrival-notice')).toHaveCount(0);await expect(page.locator('.month-progress')).toHaveAttribute('aria-valuenow','1');
});
test('lands the final day in its actual monthly cup with no overlapping collection flight',async({page},info)=>{
  test.setTimeout(60000);await page.clock.setFixedTime(new Date('2026-12-01T12:00:00Z'));const s=base(19),dates=monthDates('2026-11'),date=dates.at(-1)!;s.seenUnlocks=['collection','calendar'];
  for(const d of dates.slice(0,-1)){const a=freshAttempt(dailyCatalog[d]!),b=new Board(a.level,a.board.id);while(!b.complete)b.activate(b.hint()!);a.board=b.snapshot();a.started=true;s.daily[d]=a;s.dailyWins[d]={attempt:a.board.id,levelId:a.level.id,completedAt:Date.parse(d+'T12:00:00Z'),activeMs:1000,localDate:d,mistakes:0};}
  s.daily[date]=freshAttempt(dailyCatalog[date]!);const arrow=nearlyDone(s.daily[date]!);await seed(page,s);await page.locator('#home-calendar').click();await page.locator('[data-shift="-1"]').click();await page.locator(`[data-date="${date}"]`).click();await page.locator('#start-daily').click();await lastTap(page,arrow.path);expect((await saved(page)).cups).toContain('2026-11');await page.locator('#next').click();await expect(page.locator('.month-progress')).toHaveAttribute('aria-valuenow','30');await expect(page.locator('.cup-arrival-halo')).toHaveCount(1);await expect(page.locator('.award-flight')).toHaveCount(0);await page.waitForTimeout(900);await page.screenshot({path:info.outputPath('monthly-cup.png')});await page.waitForTimeout(1600);await expect(page.locator('.day-progress-token,.arrival-halo,.award-flight')).toHaveCount(0);expect((await saved(page)).cups).toEqual(['2026-11']);
});
test('routes the final campaign result to daily tasks without creating a campaign attempt or spending cadence',async({page})=>{
  const s=base(campaign.length-1),b=new Board(s.campaign.level,s.campaign.board.id);while(!b.complete)b.activate(b.hint()!);s.campaign.board=b.snapshot();s.campaign.started=true;s.wins.push({attempt:b.attemptId,levelId:b.level.id,completedAt:1000000,activeMs:1000,localDate:'2026-11-01',mistakes:0});s.seenUnlocks=['collection','calendar'];
  await seed(page,s);await page.locator('#home-play').click();await expect(page.locator('#next')).toBeEnabled();await expect(page.locator('#next')).toHaveText(/calendar|календар/i);await page.locator('#next').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','calendar');const after=await saved(page);expect(after.index).toBe(119);expect(after.campaign.board.id).toBe(s.campaign.board.id);expect(after.wins).toHaveLength(120);expect(after.adCadence).toEqual(s.adCadence);await expect(page.locator('.day-progress-token,.award-flight')).toHaveCount(0);
});
test('keeps narrow light reduced-motion progress immediate and the notice finite',async({page})=>{
  await page.setViewportSize({width:320,height:640});await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(({key,settings})=>localStorage.setItem(key,JSON.stringify(settings)),{key:SETTINGS_KEY,settings:{...defaultSettings('ru'),theme:'light'}});await daily(page);await page.locator('#next').click();await expect(page.locator('.month-progress')).toHaveAttribute('aria-valuenow','1');await expect(page.locator('.day-progress-token')).toHaveCount(0);await expect(page.locator('.arrival-notice')).toContainText('1 / 30');expect(await page.evaluate(()=>document.getAnimations().length)).toBe(0);await expect(page.locator('.arrival-notice')).toHaveCount(0,{timeout:2500});
});
