import {test,expect,type Page} from '@playwright/test';
import {campaign} from '../../src/content/campaign';
import {dailyCatalog} from '../../src/content/daily';
import {freshSave,freshAttempt,SAVE_KEY} from '../../src/progression/save';
import {defaultSettings,SETTINGS_KEY} from '../../src/app/settings';

async function boot(page:Page,language:'ru'|'en'='ru',theme:'dark'|'light'='dark') {
 const save=freshSave();save.index=19;save.campaign=freshAttempt(campaign[19]!);
 save.wins=campaign.slice(0,19).map((l,i)=>({attempt:`layout-${i}`,levelId:l.id,activeMs:1000,completedAt:i+1,mistakes:0}));
 save.seenUnlocks=['collection','calendar'];save.tutorials=['tap','turns','blockers','guides','zoom','hint'];
 // An embedded old attempt makes the coordinate Play check deterministic and
 // also proves that a layout edit does not replace existing daily content.
 save.daily['2026-08-31']=freshAttempt(dailyCatalog['2026-08-31']!);
 await page.clock.setFixedTime(new Date('2026-11-16T12:00:00Z'));
 await page.addInitScript(({save,language,key,settingsKey,settings})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));
  localStorage.setItem(settingsKey,JSON.stringify({...settings,language}));
 },{save,language,key:SAVE_KEY,settingsKey:SETTINGS_KEY,settings:{...defaultSettings(language),theme}});
 await page.goto('/');await page.locator('#home-calendar:enabled').waitFor();
}
async function settled(page:Page){await expect(page.locator('.route-snapshot,.board-transition')).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);}
// Inspect FIRST, then tap raw coordinates. No scrollIntoView/focus/locator click
// is allowed to make a measured critical action pass this check.
async function action(page:Page,selector:string,min=44){
 const result=await page.locator(selector).evaluate(e=>{
  const r=e.getBoundingClientRect(),points=[[.5,.5],[.2,.2],[.8,.2],[.2,.8],[.8,.8]];
  return{x:r.x,y:r.y,w:r.width,h:r.height,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,hit:points.every(([x,y])=>e.contains(document.elementFromPoint(r.x+r.width*x!,r.y+r.height*y!)))};
 });
 // Fractional compositor translations can report44px as43.99997; tolerate
 // numerical rounding, while still rejecting the former38px target.
 expect(result.inside,selector).toBe(true);expect(result.hit,selector).toBe(true);expect(result.w+.01,selector).toBeGreaterThanOrEqual(min);expect(result.h+.01,selector).toBeGreaterThanOrEqual(min);return result;
}
const cases=[
 {width:320,height:568,language:'ru',theme:'dark',scale:1},
 {width:360,height:640,language:'en',theme:'light',scale:1},
 {width:390,height:844,language:'ru',theme:'dark',scale:1},
 {width:412,height:760,language:'en',theme:'light',scale:1},
 {width:568,height:320,language:'ru',theme:'light',scale:1},
 {width:780,height:360,language:'en',theme:'dark',scale:1.5},
 {width:320,height:568,language:'ru',theme:'dark',scale:1.5},
 {width:800,height:1280,language:'en',theme:'light',scale:1.5},
] as const;
for(const c of cases)test(`calendar keeps its initial action/date and trophy actions exposed ${c.width}x${c.height}/${c.language}/${c.scale}`,async({page},info)=>{
 await page.setViewportSize({width:c.width,height:c.height});await page.emulateMedia({reducedMotion:c.scale===1.5?'reduce':'no-preference'});await boot(page,c.language,c.theme);
 await page.addStyleTag({content:`
  #meta-screen .meta-header h1,#trophy-viewer h2{font-size:${20*c.scale}px}
  #meta-screen .month-heading h2{font-size:${17*c.scale}px}
  #meta-screen .selected-day h3{font-size:${16*c.scale}px}
  #meta-screen :is(.calendar-day,#start-daily),#trophy-viewer > .primary{font-size:${14*c.scale}px}
  #meta-screen .month-count{font-size:${12*c.scale}px}
  #meta-screen .month-award > small{font-size:${10*c.scale}px}
  #meta-screen .selected-day > span,#trophy-viewer :is(p,.trophy-preview-label){font-size:${11*c.scale}px}
 `});
 // Simulate asymmetric safe areas through the existing constrained surfaces;
 // this is browser CSS geometry, not proof of Android system font scaling.
 await page.addStyleTag({content:`#meta-screen{top:24px;left:12px;right:18px;bottom:calc(${c.height<=500?56:76}px + 20px)} #trophy-viewer{--trophy-top:28px;--trophy-bottom:20px;--trophy-left:12px;--trophy-right:18px}`});
 await page.locator('#home-calendar').click();await settled(page);
 await action(page,'#start-daily');await action(page,'[data-nav="back"]');await action(page,'#home-tab');
 expect(await page.locator('#meta-screen').evaluate(e=>e.scrollTop)).toBe(0);
 while(!(await page.locator('[data-date]').first().getAttribute('data-date'))!.startsWith('2026-08'))await page.locator('[data-shift="-1"]').click();
 await page.locator('[data-date="2026-08-31"]').click();await settled(page);
 const before=await action(page,'#start-daily');await action(page,'[data-nav="back"]');
 const scroll=await page.locator('.calendar-scroll').evaluate(e=>({top:e.scrollTop,range:e.scrollHeight-e.clientHeight}));
 // Date selection and language refresh must keep the player's month position.
 await page.locator('#home-settings').click();await page.locator('#setting-language').selectOption(c.language==='ru'?'en':'ru');await page.keyboard.press('Escape');await settled(page);
 const restored=await page.locator('.calendar-scroll').evaluate(e=>({top:e.scrollTop,range:e.scrollHeight-e.clientHeight}));
 expect(restored.top).toBeCloseTo(Math.min(scroll.top,restored.range),0);
 await action(page,'#start-daily');expect(await page.locator('#meta-screen').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('calendar-initial-actions.png')});
 const play=await action(page,'#start-daily');await page.mouse.click(play.x+play.w/2,play.y+play.h/2);
 await expect(page.locator('#game-shell')).toHaveAttribute('data-level',dailyCatalog['2026-08-31']!.id);
 await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','game');
 const guide=await action(page,'#guides');await page.mouse.click(guide.x+guide.w/2,guide.y+guide.h/2);await expect(page.locator('#guides')).toHaveAttribute('aria-pressed','true');
 await page.locator('#choose-field').click();await settled(page);await action(page,'#start-daily');
 await page.locator('#view-trophy').click();await settled(page);
 await action(page,'[data-close-trophy]');const open=await action(page,'[data-open-month]');
 const dialog=await page.locator('#trophy-viewer').boundingBox();expect(dialog!.y).toBeGreaterThanOrEqual(28);expect(dialog!.y+dialog!.height).toBeLessThanOrEqual(c.height-20);
 await page.screenshot({path:info.outputPath('trophy-actions.png')});
 await page.mouse.click(open.x+open.w/2,open.y+open.h/2);await expect(page.locator('#trophy-viewer')).not.toBeVisible();await action(page,'#start-daily');
 expect(before.h).toBeGreaterThanOrEqual(44);
});

test('date changes keep Play still and accept it during the details reveal',async({page})=>{
 await page.setViewportSize({width:360,height:640});await boot(page);await page.locator('#home-calendar').click();await settled(page);
 const before=await action(page,'#start-daily');const day=page.locator('[data-date="2026-11-02"]');await day.click();
 const during=await action(page,'#start-daily');expect(during).toEqual(before);
 await page.mouse.click(during.x+during.w/2,during.y+during.h/2);
 await expect(page.locator('#game-shell')).toHaveAttribute('data-level','d20261102');
});

test('scrolled calendar route snapshot retains its displayed month and does not intercept return',async({page})=>{
 await page.setViewportSize({width:320,height:568});await boot(page);await page.locator('#home-calendar').click();await settled(page);
 await page.locator('.calendar-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);const top=await page.locator('.calendar-scroll').evaluate(e=>e.scrollTop);expect(top).toBeGreaterThan(0);
 await page.locator('#home-collection').click();
 const snapshot=page.locator('.route-snapshot .calendar-scroll');await expect(snapshot).toHaveCount(1);expect(await snapshot.evaluate(e=>e.scrollTop)).toBeCloseTo(top,0);
 await page.locator('#home-calendar').click();await settled(page);expect(await page.locator('.calendar-scroll').evaluate(e=>e.scrollTop)).toBeCloseTo(top,0);await action(page,'#start-daily');
 await expect(page.locator('.route-snapshot,[data-pressed]')).toHaveCount(0);
});
