import { expect, test } from '@playwright/test';

test('renders without external services and idles after its first frame', async ({ page }, testInfo) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url());
  });
  await page.addInitScript(() => {
    let count = 0;
    const original = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => original((time) => { count += 1; callback(time); });
    Object.defineProperty(window, '__rafCount', { get: () => count });
  });
  await page.goto('/');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-scene', 'board');
  await expect(page.locator('#startup-preload')).toBeHidden();
  await expect(page.locator('#debug-root')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
  const geometry = await page.locator('canvas').evaluate((canvas) => ({
    physical: (canvas as HTMLCanvasElement).width, css: canvas.getBoundingClientRect().width, dpr: window.devicePixelRatio,
  }));
  expect(geometry.physical / geometry.css).toBeCloseTo(Math.min(2, geometry.dpr), 1);
  // Let the bounded viewport-settle sequence finish before measuring idle RAF.
  await page.waitForTimeout(2300);
  const before = await page.evaluate(() => Reflect.get(window, '__rafCount') as number);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => Reflect.get(window, '__rafCount') as number);
  expect(after - before).toBeLessThan(5);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('bootstrap.png') });
});

test('repaints a sleeping renderer after portrait and short-landscape resize', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-status', 'ready');
  for (const viewport of [{ width: 360, height: 780 }, { width: 780, height: 360 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => page.locator('canvas').evaluate((canvas) => Math.round(canvas.getBoundingClientRect().width))).toBe(viewport.width);
    await expect.poll(async () => page.locator('canvas').evaluate((canvas) => Math.round(canvas.getBoundingClientRect().height))).toBe(viewport.height);
    await expect(page.locator('#app-title')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('uses Russian copy and survives reload', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'ru-RU', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('#app-title')).toHaveText('Стрелки');
  await page.reload();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('canvas')).toHaveCount(1);
  await context.close();
});

test('does not let unavailable browser storage block the first visible frame', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', {
    get() { throw new DOMException('Storage unavailable', 'SecurityError'); },
  }));
  await page.goto('/');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('canvas')).toBeVisible();
});
