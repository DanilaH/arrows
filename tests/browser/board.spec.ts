import { expect, test, type Page } from '@playwright/test';
import { controlScenes } from '../../src/content/controlScenes';
import { Board, canExit } from '../../src/domain/board';
import type { Point } from '../../src/domain/geometry';

async function screenPoint(page: Page, point: Point) {
  const camera = JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!) as { x: number; y: number; scale: number };
  return { x: camera.x + point.x * camera.scale, y: camera.y + point.y * camera.scale };
}
async function tap(page: Page, p: Point, phone: boolean) {
  if (phone) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
async function choose(page: Page, index: number) {
  await page.locator('#choose-field').click();
  await page.locator('[data-action=controls]').click();
  await expect(page.locator('#game-dialog')).toBeVisible();
  await page.locator('#dialog-content button').nth(index).click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-level', controlScenes[index]!.id);
  await page.waitForTimeout(450);
}

test('keeps red-arrow errors stable and accepts newly unblocked arrows during flight', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-status', 'ready');
  await page.waitForTimeout(450);
  await choose(page, 0);
  const error = await screenPoint(page, { x: 2.5, y: 2 });
  const phone = testInfo.project.name === 'phone';
  for (let i = 0; i < 4; i++) await tap(page, error, phone);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '2');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '6');
  await tap(page, await screenPoint(page, { x: 6, y: 3 }), phone);
  await tap(page, await screenPoint(page, { x: 3, y: 2 }), phone);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '4');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '2');
  await page.screenshot({ path: testInfo.outputPath('marked-arrow.png') });
});

test('cancels held and dragged selections, then keeps the first UI tap functional', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-status', 'ready');
  await page.waitForTimeout(450);
  await choose(page, 0);
  const p = await screenPoint(page, { x: 2.5, y: 2 });
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  await page.waitForTimeout(350);
  await page.mouse.move(p.x + 35, p.y + 35); await page.mouse.move(p.x, p.y); await page.mouse.up();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '3');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '6');
  await page.locator('#restart').click();
  await expect(page.locator('#game-dialog')).toBeVisible();
  await page.locator('#dialog-content button').last().click();
  await expect(page.locator('#game-dialog')).not.toBeVisible();
  await page.locator('#guides').click();
  await expect(page.locator('#guides')).toHaveAttribute('aria-pressed', 'true');
});

test('zooms without a phantom tap and repaints after a sleeping-board resize', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-status', 'ready');
  await choose(page, 3);
  const before = JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);
  const center = await screenPoint(page, { x: 23, y: 27 });
  if (testInfo.project.name === 'phone') {
    const client = await page.context().newCDPSession(page);
    const points = (distance: number) => [{ id: 1, x: center.x - distance, y: center.y }, { id: 2, x: center.x + distance, y: center.y }];
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(35) });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(80) });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.detach();
  } else {
    await page.mouse.move(center.x, center.y); await page.mouse.wheel(0, -550);
  }
  await expect.poll(async () => JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!).scale).toBeGreaterThan(before.scale);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '188');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '3');
  await page.setViewportSize({ width: 780, height: 360 });
  await expect.poll(async () => page.locator('canvas').evaluate(c => Math.round(c.getBoundingClientRect().width))).toBe(780);
  await expect(page.locator('#restart')).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('nightmare-resized.png') });
});

test('clears every control board through actual pointer input and leaves one idle renderer', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-status', 'ready');
  for (let index = 0; index < controlScenes.length; index++) {
    await choose(page, index);
    const level = controlScenes[index]!, board = new Board(level, 'oracle-ui');
    await page.screenshot({ path: testInfo.outputPath(`board-${index}.png`) });
    while (!board.complete) {
      const arrow = board.remaining.find(a => canExit(a, board.remaining))!;
      const p = await screenPoint(page, arrow.path.at(-1)!);
      await tap(page, p, testInfo.project.name === 'phone');
      board.activate(arrow.id);
      await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(board.remaining.length));
    }
    await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '3');
    await expect(page.locator('#win')).toBeVisible();
  }
  expect(errors).toEqual([]);
  await expect(page.locator('canvas')).toHaveCount(1);
});
