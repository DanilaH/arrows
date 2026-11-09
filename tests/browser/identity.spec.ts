import { expect, test } from '@playwright/test';

test('shows the real launch mark before JavaScript and removes it at usable readiness', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/index-*.js', async route => { await gate; await route.continue(); });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('.startup-mark')).toBeVisible();
  await expect.poll(() => page.locator('.startup-mark').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-status', 'starting');
  release();
  await page.locator('#game-shell[data-status=ready][data-progress=ready]').waitFor();
  await expect(page.locator('#startup-preload')).toBeHidden();
  await expect(page.locator('#home-play')).toBeEnabled();
  await expect(page.locator('#home-controls')).toHaveCount(0);
  await page.locator('#home-play').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'c01');
  await expect(page.locator('[data-action=controls]')).toHaveCount(0);
});

test('keeps the launch screen inside short landscape and works on reload without review controls', async ({ page }) => {
  await page.setViewportSize({ width: 780, height: 360 });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/index-*.js', async route => { await gate; await route.continue(); });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('.startup-mark')).toBeInViewport();
  await expect(page.locator('#startup-preload-heading')).toBeInViewport();
  expect(await page.locator('.startup-card').evaluate(el => el.getBoundingClientRect().bottom <= window.innerHeight)).toBe(true);
  release(); await page.locator('#game-shell[data-status=ready][data-progress=ready]').waitFor();
  await page.reload(); await page.locator('#game-shell[data-status=ready][data-progress=ready]').waitFor();
  await expect(page.locator('#home-controls')).toHaveCount(0);
  await expect(page.locator('.home-progress')).toContainText('0 / 120');
});
