import {test,expect,type Page} from '@playwright/test';
import {SETTINGS_KEY,defaultSettings} from '../../src/app/settings';
import {SAVE_KEY,freshSave} from '../../src/progression/save';
const ready=async(p:Page)=>{await p.goto('/');await expect(p.locator('#game-shell')).toHaveAttribute('data-status','ready');await p.locator('#home-play:enabled').waitFor();};
const color=(p:Page)=>p.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor);
test.beforeEach(async({page})=>{await page.addInitScript(()=>Object.defineProperty(navigator,'language',{configurable:true,value:'ru-RU'}));});
test('fresh Home previews the whole palette, retargets from the displayed color and saves its choice',async({page})=>{
 await ready(page);await expect(page.locator('#welcome-light')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#welcome-dark')).toBeInViewport();expect(await color(page)).toBe('rgb(243, 244, 250)');
 await page.locator('#welcome-dark').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 const mid=await page.evaluate(()=>{const a=document.documentElement.getAnimations().find(a=>a instanceof CSSTransition&&a.transitionProperty==='--bg')!;a.pause();a.currentTime=140;return getComputedStyle(document.body).backgroundColor;});expect(mid).not.toBe('rgb(243, 244, 250)');expect(mid).not.toBe('rgb(30, 30, 44)');
 await page.locator('#welcome-light').click();await expect(page.locator('#welcome-light')).toHaveAttribute('aria-pressed','true');await expect.poll(()=>color(page)).toBe('rgb(243, 244, 250)');await expect(page.locator('html')).not.toHaveAttribute('data-theme-preview','true');
 await page.locator('#welcome-dark').click();await page.locator('#home-play').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','game');await expect.poll(()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).theme,SETTINGS_KEY)).toBe('dark');await page.reload();await page.locator('#home-play:enabled').waitFor();await expect(page.locator('#welcome-dark')).toHaveCount(0);await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});
test('Play accepts the default during preview and does not wait for a failing preference write',async({page})=>{
 await page.addInitScript(k=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===k)throw Error('prefs denied');return set.call(this,key,value);};},SETTINGS_KEY);await ready(page);await page.locator('#welcome-dark').click();await page.locator('#home-play').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','game');await expect(page.locator('#game-shell')).toHaveAttribute('data-save','available');await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','3');
});
test('Play remembers the untouched light default and the welcome does not return',async({page})=>{
 await ready(page);await expect(page.locator('#welcome-light')).toBeVisible();await page.locator('#home-play').click();await expect.poll(()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)??'{}').theme,SETTINGS_KEY)).toBe('light');await page.reload();await page.locator('#home-play:enabled').waitFor();await expect(page.locator('#welcome-light')).toHaveCount(0);
});
test('preserves an existing preference or a played profile with no preferences',async({page})=>{
 await page.addInitScript(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:SETTINGS_KEY,s:{...defaultSettings('ru'),theme:'dark'}});await ready(page);await expect(page.locator('#welcome-light')).toHaveCount(0);await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 const context=await page.context().browser()!.newContext(),other=await context.newPage(),save=freshSave();save.campaign.started=true;save.revision=1;await other.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key:SAVE_KEY,save});await other.goto('http://127.0.0.1:4173/');await other.locator('#home-play:enabled').waitFor();await expect(other.locator('#welcome-light')).toHaveCount(0);expect(await other.evaluate(k=>JSON.parse(localStorage.getItem(k)!).campaign.board.id,SAVE_KEY)).toBe(save.campaign.board.id);await context.close();
});
test('reduced motion is immediate and choices plus Play fit compact portrait and short windows',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:568});await ready(page);for(const id of ['welcome-light','welcome-dark','home-play'])await expect(page.locator('#'+id)).toBeInViewport();await page.locator('#welcome-dark').click();expect(await color(page)).toBe('rgb(30, 30, 44)');expect(await page.evaluate(()=>document.documentElement.getAnimations().length)).toBe(0);await page.setViewportSize({width:568,height:320});await expect(page.locator('#home-play')).toBeInViewport();await expect(page.locator('#welcome-dark')).toBeInViewport();
});
