import { test, expect, type Page } from '@playwright/test';
import { campaign } from '../../src/content/campaign';
import { Board, canExit } from '../../src/domain/board';
import { freshSave, freshAttempt, decodeSave, SAVE_KEY } from '../../src/progression/save';
async function fixture(page: Page,index: number) {
  const state=freshSave();state.index=index;state.campaign=freshAttempt(campaign[index]!);
  state.wins=campaign.slice(0,index).map((level,i)=>({attempt:`fixture-${i}`,levelId:level.id,activeMs:1000,completedAt:i*1000,localDate:'1970-01-01',mistakes:0}));decodeSave(state);
  await page.addInitScript(({key,state})=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(key,JSON.stringify(state));sessionStorage.setItem('seeded','1');}},{key:SAVE_KEY,state});
  await page.goto('/');await expect(page.locator('#game-shell')).toHaveAttribute('data-progress','ready');
}

test('keeps a compact HUD with usable buttons and one stable navigation across screens',async({page})=>{
  await fixture(page,19);
  const calendar=await page.locator('#home-calendar').elementHandle();
  await page.locator('#home-collection').click();await page.locator('#home-calendar').click();
  expect(await calendar!.evaluate(el=>el.isConnected)).toBe(true);
  await expect(page.locator('#home-calendar')).toHaveAttribute('aria-current','page');
  await page.locator('#home-settings').click();await expect(page.locator('#home-settings')).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape');await expect(page.locator('#home-settings')).toHaveAttribute('aria-expanded','false');
  await page.locator('#home-tab').click();await page.locator('#home-play').click();await page.waitForTimeout(400);
  const header=await page.locator('#game-header').boundingBox();expect(header!.height).toBeLessThanOrEqual(76);
  for(const id of['choose-field','restart','game-settings']){const box=await page.locator('#'+id).boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);}
  await expect(page.locator('#meta-nav')).toBeHidden();await expect(page.locator('#field-name')).toBeHidden();
});

test('reveals medal conditions by keyboard and preserves the expanded item on language refresh',async({page})=>{
  await fixture(page,19);await page.locator('#home-collection').click();
  const medal=page.locator('[data-medal=perfect]');await expect(medal.locator('p')).toBeHidden();
  await medal.locator('summary').focus();await page.keyboard.press('Enter');await expect(medal.locator('p')).toBeVisible();
  await page.locator('#home-settings').click();await page.locator('#setting-language').selectOption('ru');await page.keyboard.press('Escape');await expect(page.locator('#settings-dialog')).not.toBeVisible();
  await expect(medal.locator('p')).toBeVisible();await expect(medal.locator('p')).toContainText('Заверши');
  await medal.locator('summary').focus();await page.keyboard.press('Enter');await expect(medal.locator('p')).toBeHidden();
});

test('flies only a newly earned award to Collection and never replays it after restore',async({page})=>{
  await fixture(page,9);await page.locator('#home-play').click();await page.waitForTimeout(400);
  const level=campaign[9]!,board=new Board(level,'oracle');
  while(!board.complete){const arrow=board.remaining.find(a=>canExit(a,board.remaining))!,c=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!),p=arrow.path.at(-1)!;await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);board.activate(arrow.id);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining',String(board.remaining.length));}
  await expect(page.locator('#win')).toBeVisible();await page.locator('#choose-field').click();
  await expect(page.locator('.award-flight')).toHaveCount(1);await expect(page.locator('.award-flight')).toHaveCount(0,{timeout:1500});
  const wins=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).wins.length,SAVE_KEY);expect(wins).toBe(10);
  await page.reload();await page.locator('#home-play:enabled').waitFor();await page.waitForTimeout(750);await expect(page.locator('.award-flight')).toHaveCount(0);
});
