import { test, expect } from '@playwright/test';
import { campaign } from '../../src/content/campaign';

// The narrow gap must remain selectable and an exactly ambiguous tap must be harmless.
test('keeps the opening small, resolves adjacent paths safely and clears it through real input', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-progress', 'ready'); await page.locator('#home-play').click(); await page.waitForTimeout(450);
  const camera = () => page.locator('#game-root').evaluate(el => JSON.parse(el.getAttribute('data-camera')!) as { x: number; y: number; scale: number });
  const c = await camera(); expect(c.scale * 5).toBeCloseTo(95); expect(c.scale).toBeLessThanOrEqual(19);
  const tap = async (x: number, y: number) => { const p = await camera(); await page.mouse.click(p.x + x * p.scale, p.y + y * p.scale); };
  await tap(0, 4.5); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '3'); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '3');
  await tap(0, 4); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '2');
  await page.reload(); await expect(page.locator('#game-shell')).toHaveAttribute('data-progress', 'ready'); await page.locator('#home-play').click(); await page.waitForTimeout(450);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '2'); expect((await camera()).scale).toBeCloseTo(19);
  const first=campaign[0]!.arrows[0]!.path.at(-1)!;await tap(first.x,first.y);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','1');
  const accepted=await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')!).campaign.board);
  expect(accepted).toMatchObject({removed:['c01-0','c01-1'],errors:['c01-1'],lives:2});
  const last=campaign[0]!.arrows[2]!.path.at(-1)!;await tap(last.x,last.y);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','0');
  await expect(page.locator('#win')).toBeVisible();
});
