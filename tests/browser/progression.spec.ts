import { openControlReview } from './helpers/controlReview';
import { expect, test, type Page } from '@playwright/test';
import { campaign } from '../../src/content/campaign';
import { canExit } from '../../src/domain/board';
import { freshAttempt, freshSave, SAVE_KEY } from '../../src/progression/save';

async function ready(page: Page, play = true) {
  await expect(page.locator('#game-shell')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-progress', 'ready');
  if (play) { await page.locator('#home-play').click(); await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'game'); }
  await page.waitForTimeout(450);
}
async function clickArrow(page: Page, arrow: { path: readonly { x: number; y: number }[] }) {
  const camera = JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);
  const head = arrow.path.at(-1)!;
  await page.mouse.click(camera.x + head.x * camera.scale, camera.y + head.y * camera.scale);
}
async function persisted(page: Page, revision: number) {
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').revision ?? -1, SAVE_KEY)).toBeGreaterThan(revision);
}
async function seed(page: Page, index: number, review = false) {
  const state = freshSave(); state.index = index; state.campaign = freshAttempt(campaign[index]!);
  state.wins = campaign.slice(0, index).map((l, i) => ({ attempt: `past-${i}`, levelId: l.id, activeMs: 100, completedAt: 1000 + i, mistakes: 0 }));
  await page.addInitScript(({ key, state }) => {
    const marker = `seed-${state.campaign.board.id}`;
    if (!sessionStorage.getItem(marker)) { localStorage.setItem(key, JSON.stringify(state)); sessionStorage.setItem(marker, '1'); }
  }, { key: SAVE_KEY, state });
  if (review) await openControlReview(page); else await page.goto('/'); await ready(page);
}

test('teaches by successful action, saves victory during the last flight and advances only once', async ({ page }) => {
  await page.goto('/'); await ready(page);
  await expect(page.locator('#tutorial-pointer')).toBeVisible();
  const level = campaign[0]!;
  for (const [i, arrow] of level.arrows.entries()) {
    await clickArrow(page, arrow);
    await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(level.arrows.length - i - 1));
  }
  await page.reload(); await ready(page, false);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'home');
  await page.locator('#home-play').dblclick();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'c02');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).wins.length, SAVE_KEY)).toBe(1);
  await page.reload(); await ready(page); await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'c02');
});

test('restores a partial board, marks and guides, while control boards leave campaign progress intact', async ({ page }) => {
  await seed(page, 2, true); const level = campaign[2]!, blocked = level.arrows.find(a => !canExit(a, level.arrows))!, free = level.arrows.find(a => canExit(a, level.arrows))!;
  const attempt = await page.locator('#game-shell').getAttribute('data-attempt');
  await clickArrow(page, blocked); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '2');
  await clickArrow(page, free); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '5');
  await page.locator('#guides').click(); await expect(page.locator('#guides')).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await ready(page);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt', attempt!);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '5');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '2');
  await expect(page.locator('#guides')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#choose-field').click(); await page.locator('#home-controls').click(); await page.locator('[data-action=field-3]').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-mode', 'control');
  await page.locator('#choose-field').click(); await page.locator('#home-play').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt', attempt!);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '5');
});

test('free continuation restores hearts once, preserves marks and never fakes an unavailable rewarded refill', async ({ page }) => {
  await seed(page, 5); const level = campaign[5]!, blocked = level.arrows.filter(a => !canExit(a, level.arrows)).slice(0, 6);
  for (const a of blocked.slice(0, 3)) await clickArrow(page, a);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '0');
  await page.locator('[data-action=free-continue]').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '3');
  await expect(page.locator('#game-dialog')).not.toBeVisible();
  await clickArrow(page, blocked[0]!); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '3');
  for (const a of blocked.slice(3)) await clickArrow(page, a);
  await expect(page.locator('[data-action=free-continue]')).toHaveCount(0);
  await page.locator('[data-action=rewarded-continue]').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '0');
  await expect(page.locator('#dialog-content')).toContainText(/unavailable|недоступно/);
  await page.reload(); await ready(page);
  await expect(page.locator('[data-action=rewarded-continue]')).toBeVisible();
  await page.locator('[data-action=restart]').click(); await page.locator('[data-action=confirm-restart]').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '3');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(level.arrows.length));
});

test('restores zoom across reload/rotation and enables guides tutorial only on the actual control', async ({ page }) => {
  await seed(page, 5);
  const before = JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);
  await page.mouse.move(195, 400); await page.mouse.wheel(0, -400);
  await expect.poll(async () => JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!).scale).toBeGreaterThan(before.scale);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).campaign.view.zoom, SAVE_KEY)).toBeGreaterThan(1);
  const zoomed = JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!);
  await page.reload(); await ready(page);
  const after = JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!); expect(after.scale).toBeCloseTo(zoomed.scale, 0);
  await page.setViewportSize({ width: 780, height: 360 }); await expect(page.locator('#restart')).toBeInViewport();
  await page.reload(); await ready(page); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '3');
  await seed(page, 3); await expect(page.locator('#app-status')).toContainText('#');
  await page.locator('#guides').click(); await expect(page.locator('#app-status')).toHaveText('');
  await page.reload(); await ready(page); await expect(page.locator('#app-status')).toHaveText('');
});

test('does not silently replace an unreadable save', async ({ page }) => {
  await page.goto('/'); await ready(page);
  await page.addInitScript(key => localStorage.setItem(key, '{"schema":999,"history":"preserve"}'), SAVE_KEY);
  await page.reload(); await ready(page);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-save', 'session-only');
  await expect(page.locator('#save-status')).toBeVisible();
  await clickArrow(page, campaign[0]!.arrows[0]!); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '2');
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toContain('preserve');
});

test('keeps hints contextual, excludes pause time and never grants from an unavailable video', async ({ page }) => {
  test.setTimeout(30000);
  await seed(page, 4);
  await page.locator('#choose-field').click(); await page.waitForTimeout(1500);
  await expect(page.locator('#hint')).toBeHidden(); await page.locator('#home-play').click();
  await expect(page.locator('#hint')).toBeVisible({ timeout: 14500 });
  const before = await page.locator('#game-shell').getAttribute('data-remaining');
  await page.locator('#hint').click(); await expect(page.locator('#dialog-content')).toContainText(/highlight|выделим/);
  await page.locator('[data-action=watch-hint]').click();
  await expect(page.locator('#app-status')).toContainText(/unavailable|недоступно/);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', before!);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).campaign.hint, SAVE_KEY)).toBeNull();
});

test('keeps confirmed gameplay unchanged when a write fails and accepts a retry', async ({ page }) => {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Object.defineProperty(window, '__denySave', { value: false, writable: true });
    Storage.prototype.setItem = function(key, value) { if (key === 'arrows.progress.v1' && Reflect.get(window, '__denySave')) throw Error('Denied'); return set.call(this, key, value); };
  });
  await page.goto('/'); await ready(page);
  await page.evaluate(() => Reflect.set(window, '__denySave', true));
  await clickArrow(page, campaign[0]!.arrows[0]!);
  await expect(page.locator('#save-status')).toBeVisible(); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '3');
  await page.evaluate(() => Reflect.set(window, '__denySave', false));
  await clickArrow(page, campaign[0]!.arrows[0]!); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '2');
  await page.reload(); await ready(page); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '2');
});
