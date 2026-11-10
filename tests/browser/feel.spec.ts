import { test, expect, type Page } from '@playwright/test';
import { campaign } from '../../src/content/campaign';
import { Board, canExit } from '../../src/domain/board';
import { freshSave, freshAttempt, decodeSave, SAVE_KEY } from '../../src/progression/save';

async function observe(page: Page) {
  await page.addInitScript(() => {
    const cues: { duration: number; at: number }[] = []; Reflect.set(window, '__feelCues', cues);
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) { if (this.buffer) cues.push({ duration: this.buffer.duration, at: performance.now() }); return start.apply(this, args); };
    let frames = 0; const raf = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = fn => raf(t => { frames++; fn(t); });
    Object.defineProperty(window, '__feelFrames', { get: () => frames });
  });
}
async function tap(page: Page, path: readonly { x: number; y: number }[]) {
  const c = JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!), p = path.at(-1)!;
  await page.mouse.click(c.x+p.x*c.scale, c.y+p.y*c.scale);
}
const cues = (page: Page) => page.evaluate(() => Reflect.get(window, '__feelCues') as { duration: number; at: number }[]);

test('times collision feedback at contact, accepts an unblock during return, celebrates once and sleeps', async ({ page }, info) => {
  await observe(page); await page.goto('/'); await page.locator('#home-play:enabled').click(); await page.waitForTimeout(450);
  const level=campaign[0]!, free=level.arrows.find(a=>canExit(a,level.arrows))!, blocked=level.arrows.find(a=>!canExit(a,level.arrows))!;
  await tap(page,blocked.path);
  await expect.poll(async()=> (await cues(page)).some(c=>Math.abs(c.duration-.23)<.001)).toBe(true);
  const sounds=await cues(page), slide=sounds.find(c=>Math.abs(c.duration-.12)<.001)!, impact=sounds.find(c=>Math.abs(c.duration-.23)<.001)!;
  expect(impact.at-slide.at).toBeGreaterThanOrEqual(75);
  await tap(page,blocked.path); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives','2');
  await tap(page,free.path); await tap(page,blocked.path);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','1');
  const remaining=level.arrows.find(a=>a!==free&&a!==blocked)!; await tap(page,remaining.path);
  await expect(page.locator('#win')).toBeVisible(); await page.screenshot({path:info.outputPath('victory.png')});
  await expect.poll(async()=> (await cues(page)).filter(c=>c.duration>=.93).length).toBe(1);
  await page.waitForTimeout(2400);
  expect(await page.evaluate(()=>document.getAnimations().length)).toBe(0);
  const before=await page.evaluate(()=>Reflect.get(window,'__feelFrames') as number); await page.waitForTimeout(350);
  expect(await page.evaluate(()=>Reflect.get(window,'__feelFrames') as number)-before).toBeLessThan(5);
  await page.reload(); await page.locator('#home-play:enabled').click(); await expect(page.locator('#game-shell')).toHaveAttribute('data-level','c02');
  await page.waitForTimeout(650); expect((await cues(page)).filter(c=>c.duration>=.93)).toHaveLength(0);
});

test('finishes the last collision before opening the loss modal', async ({ page }) => {
  const state=freshSave(), level=campaign[4]!, attempt=freshAttempt(level), board=new Board(level,attempt.board.id);
  const blocked=level.arrows.filter(a=>!canExit(a,level.arrows)); expect(blocked.length).toBeGreaterThanOrEqual(3);
  board.activate(blocked[0]!.id); board.activate(blocked[1]!.id); attempt.board=board.snapshot(); attempt.started=true; state.index=4; state.campaign=attempt; state.wins=campaign.slice(0,4).map((l,i)=>({attempt:`fixture-${i}`,levelId:l.id,activeMs:1000,completedAt:i*1000,localDate:'1970-01-01',mistakes:0}));
  decodeSave(state);
  await page.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:SAVE_KEY,state});
  await page.goto('/'); await page.locator('#home-play:enabled').click(); await page.waitForTimeout(450);
  await tap(page,blocked[2]!.path); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives','0');
  await expect(page.locator('#game-dialog')).not.toBeVisible(); await expect(page.locator('#restart')).toBeDisabled();
  await expect(page.locator('#game-dialog')).toBeVisible(); await expect(page.locator('#dialog-content')).toContainText(/lives|жизн/i);
});

test('keeps shared art connected through asynchronous collection refresh and clears all transition layers', async ({ page }) => {
  const state=freshSave(); state.index=19; state.campaign=freshAttempt(campaign[19]!);
  state.wins=campaign.slice(0,19).map((l,i)=>({attempt:`fixture-${i}`,levelId:l.id,activeMs:1000,completedAt:i*1000,localDate:'1970-01-01',mistakes:0}));
  decodeSave(state);
  await page.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:SAVE_KEY,state});
  await page.goto('/'); await page.locator('#home-collection:enabled').click();
  const image=await page.locator('img.menu-emblem').elementHandle(); expect(image).not.toBeNull();
  await expect(page.locator('.shared-menu-art')).toHaveCount(1); await page.waitForTimeout(250);
  expect(await image!.evaluate(e=>e.isConnected)).toBe(true);
  await page.waitForTimeout(450); await expect(page.locator('.shared-menu-art,.route-snapshot')).toHaveCount(0);
  expect(await page.evaluate(()=>document.getAnimations().length)).toBe(0);
  await page.locator('[data-month="2026-01"]').click(); await page.locator('[data-nav=back]').evaluate((e:HTMLButtonElement)=>e.click());
  await page.waitForTimeout(650); await expect(page.locator('.shared-menu-art,.route-snapshot')).toHaveCount(0);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','collection');
});
