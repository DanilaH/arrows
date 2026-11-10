import { test, expect } from '@playwright/test';

const ready = async (page: import('@playwright/test').Page) => {
  await page.goto('/'); await expect(page.locator('#game-shell')).toHaveAttribute('data-progress', 'ready');
};

test('shows finite button and route motion, accepts a quick return and settles', async ({ page }) => {
  await ready(page);
  const button = page.locator('#home-play'), box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await expect.poll(() => button.evaluate(e => getComputedStyle(e).transform)).not.toBe('none');
  await page.mouse.up(); await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'game');
  // Exercise navigation before the incoming motion finishes, without Playwright's stability wait.
  await page.locator('#choose-field').evaluate((e: HTMLButtonElement) => e.click());
  await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'home');
  expect(await page.locator('.route-snapshot').count()).toBeLessThanOrEqual(1);
  await page.locator('#home-play').evaluate((e: HTMLButtonElement) => e.click());
  await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'game');
  await page.locator('#choose-field').evaluate((e: HTMLButtonElement) => e.click());
  await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'home');
  await page.waitForTimeout(650);
  await expect(page.locator('.route-snapshot')).toHaveCount(0);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '3');
});

test('keeps modal ownership through close motion and settles when hidden', async ({ page }) => {
  await ready(page); await page.locator('#home-settings').click();
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.locator('#close-settings').evaluate((e: HTMLButtonElement) => e.click());
  expect(await page.locator('#settings-dialog').evaluate((e: HTMLDialogElement) => e.open)).toBe(true);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#settings-dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.locator('#home-settings').click(); await page.keyboard.press('Escape');
  await expect(page.locator('#settings-dialog')).not.toBeVisible(); await expect(page.locator('#home-settings')).toBeFocused();
  await page.locator('#home-play').click(); await page.waitForTimeout(400);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '3');
});

test('respects reduced motion without leaving visual snapshots or locks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await ready(page);
  await page.locator('#home-play').click(); await page.locator('#choose-field').click();
  await page.locator('#home-settings').click(); await page.keyboard.press('Escape');
  await expect(page.locator('#settings-dialog')).not.toBeVisible(); await expect(page.locator('.route-snapshot')).toHaveCount(0);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await page.locator('#home-play').click(); await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'game');
});
