import { test, expect } from '@playwright/test';
import { freshSave, freshAttempt, SAVE_KEY } from '../../src/progression/save';
import { campaign } from '../../src/content/campaign';
import { defaultSettings, SETTINGS_KEY } from '../../src/app/settings';

// Internal fixtures verify the exact unlock boundary, not human-earned progress.
for (const index of [0, 8, 9, 18, 19]) test(`shows full locks and readable thresholds at campaign index ${index}`, async ({page}) => {
  const state=freshSave();state.index=index;state.campaign=freshAttempt(campaign[index]!);
  state.wins=campaign.slice(0,index).map((level,i)=>({attempt:`phone-past-${i}`,levelId:level.id,activeMs:1000,completedAt:i*1000,localDate:'2026-11-12',mistakes:0}));
  state.seenUnlocks=['collection','calendar'];
  await page.addInitScript(({state,key,settings,settingsKey})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(settingsKey,JSON.stringify(settings));},{state,key:SAVE_KEY,settings:defaultSettings('ru'),settingsKey:SETTINGS_KEY});
  await page.setViewportSize({width:320,height:568});await page.goto('/');await page.locator('#home-play:enabled').waitFor();
  for(const [id,threshold] of [['collection',10],['calendar',20]] as const){
    const button=page.locator('#home-'+id),locked=index+1<threshold;
    await expect(button).toHaveAttribute('data-locked',String(locked));
    if(locked){await expect(button).toBeDisabled();await expect(button.locator('.nav-label')).toHaveText(`Уровень ${threshold}`);await expect(button.locator('rect')).toHaveCount(1);await expect(button).toHaveAccessibleName(new RegExp(`Откроется на уровне ${threshold}`));}
    else await expect(button).toBeEnabled();
  }
  const box=await page.locator('.home-board').boundingBox(),nav=await page.locator('#meta-nav').boundingBox();
  expect(box!.height).toBeGreaterThan(170);expect(box!.width).toBeGreaterThan(245);
  expect((await page.locator('#home-play').boundingBox())!.y+52).toBeLessThan(nav!.y);
  expect(await page.locator('#meta-screen').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
});

test('offers independent feedback previews without turning off the other channel',async({page})=>{
  await page.goto('/');await page.locator('#home-settings:enabled').click();
  await expect(page.locator('#preview-vibration')).toBeEnabled();
  await page.locator('#setting-vibration').click();await expect(page.locator('#preview-vibration')).toBeDisabled();await expect(page.locator('#preview-sound')).toBeEnabled();
  await page.locator('#setting-sound').click();await expect(page.locator('#preview-sound')).toBeDisabled();
  await page.locator('#setting-vibration').click();await expect(page.locator('#preview-vibration')).toBeEnabled();
  await page.locator('#preview-vibration').click();await expect(page.locator('#setting-sound')).toHaveAttribute('aria-checked','false');
});
