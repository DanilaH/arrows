import {existingPreferences} from './helpers/existingPreferences';
import { test, expect } from '@playwright/test';
import { SETTINGS_KEY, defaultSettings } from '../../src/app/settings';
import { SAVE_KEY, freshSave, freshAttempt } from '../../src/progression/save';
import { campaign } from '../../src/content/campaign';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'language', { configurable: true, value: 'ru-RU' }));
});

test('acknowledges an icon click even when navigation replaces its original parent contents',async({page})=>{
  const state=freshSave();state.index=19;state.campaign=freshAttempt(campaign[19]!);state.wins=campaign.slice(0,19).map((l,i)=>({attempt:`nav-${i}`,levelId:l.id,activeMs:1,completedAt:1,mistakes:0}));state.seenUnlocks=['collection','calendar'];
  await page.addInitScript(({key,state})=>{localStorage.setItem(key,JSON.stringify(state));Reflect.set(window,'navStarts',0);const original=AudioContext.prototype.createBufferSource;AudioContext.prototype.createBufferSource=function(){const source=original.call(this),start=source.start.bind(source);source.start=(...args:Parameters<typeof start>)=>{Reflect.set(window,'navStarts',Reflect.get(window,'navStarts')+1);return start(...args);};return source;};},{key:SAVE_KEY,state});
  await page.goto('/');await expect(page.locator('#game-shell')).toHaveAttribute('data-status','ready');await page.locator('#home-calendar svg').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','calendar');await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'navStarts'))).toBe(1);
});

test('changes theme and language live, retaining a partial board and independent preferences across reload', async ({ page }, info) => {
  await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(value));},{key:SETTINGS_KEY,value:{...defaultSettings('ru'),theme:'dark'}});
  await page.goto('/'); await expect(page.locator('#game-shell')).toHaveAttribute('data-progress', 'ready');
  await page.locator('#home-play').click(); await page.waitForTimeout(450);
  const id = await page.locator('#game-shell').getAttribute('data-attempt'), camera = JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);
  const head = campaign[0]!.arrows[0]!.path.at(-1)!;
  await page.mouse.click(camera.x + head.x * camera.scale, camera.y + head.y * camera.scale);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '2');
  await page.locator('#game-settings').click(); await page.locator('#theme-light').click(); await page.locator('#setting-sound').click();
  await expect(page.locator('#setting-sound')).toHaveAttribute('aria-checked', 'false'); await expect(page.locator('#setting-vibration')).toHaveAttribute('aria-checked', 'true');
  await page.locator('#setting-language').selectOption('en'); await expect(page.locator('#settings-title')).toHaveText('Settings');
  await page.screenshot({ path: info.outputPath('light-settings.png') });
  await page.keyboard.press('Escape'); await expect(page.locator('#game-settings')).toBeFocused();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt', id!); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '2');
  await expect(page.locator('#app-title')).toHaveText('Level 1');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light'); await page.waitForTimeout(500);
  await page.screenshot({ path: info.outputPath('light-board.png') });
  await page.reload(); await expect(page.locator('#game-shell')).toHaveAttribute('data-progress', 'ready');
  await page.locator('#home-settings').click(); await expect(page.locator('#theme-light')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#setting-sound')).toHaveAttribute('aria-checked', 'false'); await expect(page.locator('#setting-vibration')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#setting-language')).toHaveValue('en'); await page.locator('#close-settings').click();
  await page.locator('#home-play').click(); await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt', id!); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '2');
  const save = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY); expect(save.campaign.board.removed).toHaveLength(1);
});

test('themes collection, calendar and trophy viewer while retaining the future-year boundary', async ({ page }, info) => {
  const state = freshSave(); state.index = 19; state.campaign = freshAttempt(campaign[19]!);
  state.wins = campaign.slice(0, 19).map((level, i) => ({ attempt: `settings-past-${i}`, levelId: level.id, activeMs: 1000, completedAt: i * 1000, localDate: '1970-01-01', mistakes: 0 }));
  await page.addInitScript(({ key, state, settingsKey, settings }) => { localStorage.setItem(key, JSON.stringify(state)); localStorage.setItem(settingsKey, JSON.stringify(settings)); }, { key: SAVE_KEY, state, settingsKey: SETTINGS_KEY, settings: { ...defaultSettings('ru'), theme: 'light' } });
  await page.goto('/'); await expect(page.locator('#game-shell')).toHaveAttribute('data-progress', 'ready'); await page.locator('#home-collection').click();
  await expect(page.locator('.month-trophy')).toHaveCount(12); await expect(page.locator('#trophy-year')).toHaveCount(0);
  expect(await page.locator('#meta-screen').evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(243, 244, 250)');
  await page.screenshot({ path: info.outputPath('light-collection.png') });
  await page.locator('[data-month="2026-11"]').click(); await page.locator('#view-trophy').click(); await expect(page.locator('#trophy-viewer')).toBeVisible();
  expect(await page.locator('#trophy-viewer').evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(255, 255, 255)');
  await page.screenshot({ path: info.outputPath('light-trophy.png') }); await page.keyboard.press('Escape');
});

test('keeps choices usable on failed preference writes, exposes retry, and leaves game saves independent', async ({ page }) => {
  await page.addInitScript(({key,settings}) => {
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(settings));
    const original = Storage.prototype.setItem; let reject = true;
    Storage.prototype.setItem = function(k, value) { if (k === key && reject) { reject = false; throw Error('settings storage unavailable'); } return original.call(this, k, value); };
  }, {key:SETTINGS_KEY,settings:defaultSettings('ru')});
  await page.goto('/'); await expect(page.locator('#game-shell')).toHaveAttribute('data-progress', 'ready');
  await page.locator('#home-settings').click(); await page.locator('#theme-light').click(); await expect(page.locator('#retry-settings')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light'); await page.locator('#retry-settings').click(); await expect(page.locator('#retry-settings')).not.toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).theme, SETTINGS_KEY)).toBe('light');
  await page.locator('#close-settings').click(); await page.locator('#home-play').click(); await expect(page.locator('#game-shell')).toHaveAttribute('data-save', 'available');
});

test('cancels real WebAudio on mute and overlapping lifecycle blockers without replaying stale feedback', async ({ page }) => {
  await existingPreferences(page,'ru');
  await page.addInitScript(() => {
    const metrics = { starts: 0, active: new Set<number>(), peak: 0 }; Reflect.set(window, '__soundMetrics', metrics);
    const original = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function() {
      const source = original.call(this), start = source.start.bind(source), stop = source.stop.bind(source); let id = 0;
      source.start = (...args: Parameters<typeof start>) => { id = ++metrics.starts; metrics.active.add(id); metrics.peak = Math.max(metrics.peak, metrics.active.size); return start(...args); };
      source.stop = (...args: Parameters<typeof stop>) => { metrics.active.delete(id); return stop(...args); };
      source.addEventListener('ended', () => metrics.active.delete(id)); return source;
    };
  });
  const metrics = () => page.evaluate(() => { const m = Reflect.get(window, '__soundMetrics'); return { starts: m.starts as number, active: m.active.size as number, peak: m.peak as number }; });
  await page.goto('/'); await expect(page.locator('#game-shell')).toHaveAttribute('data-progress', 'ready'); await page.locator('#home-settings').click();
  await expect.poll(async () => (await metrics()).starts).toBeGreaterThan(0); await page.waitForTimeout(150);
  await page.locator('#preview-sound').click(); await expect.poll(async () => (await metrics()).active).toBeGreaterThan(0);
  await page.locator('#setting-sound').click(); await expect.poll(async () => (await metrics()).active).toBe(0); const muted = (await metrics()).starts;
  await page.locator('#theme-light').click(); expect((await metrics()).starts).toBe(muted); await expect(page.locator('#setting-vibration')).toHaveAttribute('aria-checked', 'true');
  await page.locator('#setting-sound').click(); await page.locator('#setting-vibration').click(); await expect(page.locator('#setting-vibration')).toHaveAttribute('aria-checked', 'false');
  await page.waitForTimeout(750); await page.locator('#preview-sound').click(); await expect.poll(async () => (await metrics()).active).toBeGreaterThan(0);
  await page.evaluate(() => { window.dispatchEvent(new Event('blur')); Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(async () => (await metrics()).active).toBe(0); const blocked = (await metrics()).starts;
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await page.locator('#preview-sound').click(); expect((await metrics()).starts).toBe(blocked);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(750); expect((await metrics()).starts).toBe(blocked); await page.locator('#preview-sound').click();
  await expect.poll(async () => (await metrics()).starts).toBeGreaterThan(blocked); expect((await metrics()).peak).toBeLessThanOrEqual(6);
});

test('keeps settings scrollable at narrow widths, short landscape and enlarged text', async ({ page }) => {
  await existingPreferences(page,'ru');
  await page.goto('/'); await expect(page.locator('#game-shell')).toHaveAttribute('data-progress', 'ready'); await page.locator('#home-settings').click();
  for (const size of [{ width: 320, height: 640 }, { width: 780, height: 360 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size); await page.locator('#theme-light').click(); await page.locator('#setting-language').selectOption('en');
    expect(await page.locator('#settings-dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.locator('#setting-language').scrollIntoViewIfNeeded(); await expect(page.locator('#setting-language')).toBeInViewport();
  }
  await page.locator('#settings-dialog').evaluate(root => { for (const el of root.querySelectorAll<HTMLElement>('h2, h3, span, small, strong, select')) el.style.fontSize = `${parseFloat(getComputedStyle(el).fontSize) * 1.25}px`; });
  expect(await page.locator('#settings-dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.keyboard.press('Escape'); await expect(page.locator('#home-settings')).toBeFocused();
});
test('fresh launch paints light, then preserves an explicit dark choice across reload',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});await page.goto('/');await expect(page.locator('#game-shell')).toHaveAttribute('data-status','ready');await expect(page.locator('html')).toHaveAttribute('data-theme','light');expect(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(243, 244, 250)');
 await page.locator('#home-play').click();await page.locator('#game-settings').click();await expect(page.locator('#theme-light')).toHaveAttribute('aria-pressed','true');await page.locator('#theme-dark').click();await expect(page.locator('#settings-save-status')).toContainText('сохран');await page.reload();await expect(page.locator('#game-shell')).toHaveAttribute('data-status','ready');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');expect(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(30, 30, 44)');
});
