import { openControlReview } from './helpers/controlReview';
import { test, expect } from '@playwright/test';
import { controlScenes } from '../../src/content/controlScenes';
import { canExit } from '../../src/domain/board';

test('settles after animation and repeated scene changes without a permanent frame loop', async ({ page }) => {
  await page.addInitScript(() => {
    let count = 0;
    const original = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => original(time => { count++; callback(time); });
    Object.defineProperty(window, '__boardFrameCount', { get: () => count });
  });
  await openControlReview(page);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-status', 'ready');
  await page.locator('#home-play').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'game');
  for (let index = 0; index < 8; index++) {
    await page.locator('#choose-field').click();
    await page.locator('#home-controls').click();
    await page.locator('#dialog-content button').nth(index % 4).click();
  }
  const level = controlScenes[3]!;
  const arrow = level.arrows.find(a => canExit(a, level.arrows))!;
  const camera = JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);
  const head = arrow.path.at(-1)!;
  await page.waitForTimeout(450);
  await page.mouse.click(camera.x + head.x * camera.scale, camera.y + head.y * camera.scale);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '187');
  await page.waitForTimeout(1800);
  await expect.poll(async () => {
    const before = await page.evaluate(() => Reflect.get(window, '__boardFrameCount') as number);
    await page.waitForTimeout(400);
    return await page.evaluate(() => Reflect.get(window, '__boardFrameCount') as number) - before;
  }, { timeout: 5000, intervals: [200] }).toBeLessThan(5);
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('#game-dialog')).not.toBeVisible();
});
