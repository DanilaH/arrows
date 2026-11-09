import { expect, test, type Page } from '@playwright/test';
import { freshAttempt, freshSave, SAVE_KEY } from '../../src/progression/save';
import { campaign } from '../../src/content/campaign';
import { dailyCatalog } from '../../src/content/daily';
import { Board, canExit } from '../../src/domain/board';

async function ready(page: Page) {
  await expect(page.locator('#game-shell')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-progress', 'ready');
}
async function unlocked(page: Page) {
  await page.clock.setFixedTime(new Date('2026-11-09T12:00:00Z'));
  const state = freshSave(); state.index = 19; state.campaign = freshAttempt(campaign[19]!);
  state.wins = campaign.slice(0, 19).map((level, i) => ({ attempt: `past-${i}`, levelId: level.id, activeMs: 1000, completedAt: i * 1000, localDate: '1970-01-01', mistakes: 0 }));
  await page.addInitScript(({ key, state }) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, JSON.stringify(state)); sessionStorage.setItem('seeded', '1'); } }, { key: SAVE_KEY, state });
  await page.goto('/'); await ready(page);
}
async function tapArrow(page: Page, arrow: { path: readonly { x: number; y: number }[] }) {
  const c = JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!), p = arrow.path.at(-1)!;
  await page.mouse.click(c.x + p.x * c.scale, c.y + p.y * c.scale);
}
async function openDaily(page: Page, date: string) {
  await page.locator('#home-calendar').click(); await page.locator(`[data-date='${date}']`).click(); await page.locator('#start-daily').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-mode', 'daily'); await page.waitForTimeout(450);
}

test('home owns navigation and restores a partial campaign after reload', async ({ page }, info) => {
  await page.goto('/'); await ready(page);
  await expect(page.locator('#home-collection')).toBeDisabled(); await expect(page.locator('#home-calendar')).toBeDisabled();
  await page.screenshot({ path: info.outputPath('home.png') });
  await page.locator('#home-play').click(); await page.waitForTimeout(450);
  const id = await page.locator('#game-shell').getAttribute('data-attempt');
  await tapArrow(page, campaign[0]!.arrows[0]!); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '2');
  await page.locator('#choose-field').click(); await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'home');
  await page.reload(); await ready(page); await page.locator('#home-play').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt', id!); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '2');
});

test('navigates collection and real calendar months with distinct selected/today/future states', async ({ page }, info) => {
  await unlocked(page); await page.locator('#home-collection').click();
  await expect(page.locator('[data-medal]')).toHaveCount(3); await expect(page.locator('[data-medal=perfect]')).toHaveAttribute('data-earned', 'true');
  await page.screenshot({ path: info.outputPath('collection.png'), fullPage: true });
  await page.locator('[data-month="2026-11"]').click(); await page.locator('[data-nav=back]').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'collection');
  await page.locator('[data-nav=back]').click(); await page.locator('#home-calendar').click();
  await expect(page.locator('[data-date="2026-11-09"]')).toHaveClass(/today/);
  await expect(page.locator('[data-date="2026-11-10"]')).toBeDisabled();
  await page.locator('[data-date="2026-11-08"]').click(); await expect(page.locator('[data-date="2026-11-08"]')).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: info.outputPath('calendar.png'), fullPage: true });
  await page.locator('[data-shift="1"]').click(); await expect(page.locator('[data-date="2026-12-01"]')).toBeDisabled(); await expect(page.locator('#start-daily')).toBeDisabled();
  await page.locator('[data-shift="-1"]').click(); await expect(page.locator('[data-date="2026-11-09"]')).toBeEnabled();
});

test('keeps two daily dates and campaign state independent through mode changes and reload', async ({ page }) => {
  await unlocked(page); await page.locator('#home-play').click(); await page.waitForTimeout(450);
  const campaignId = await page.locator('#game-shell').getAttribute('data-attempt');
  await page.locator('#choose-field').click(); await openDaily(page, '2026-11-09');
  const level = dailyCatalog['2026-11-09']!, blocked = level.arrows.find(a => !canExit(a, level.arrows))!, free = level.arrows.find(a => canExit(a, level.arrows))!;
  const id = await page.locator('#game-shell').getAttribute('data-attempt');
  await tapArrow(page, blocked); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '2');
  await tapArrow(page, free); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(level.arrows.length - 1));
  await page.locator('#guides').click(); await page.locator('#choose-field').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'calendar');
  await page.locator('[data-date="2026-11-08"]').click(); await page.locator('#start-daily').click();
  await expect(page.locator('#game-shell')).not.toHaveAttribute('data-attempt', id!); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '3');
  await page.locator('#choose-field').click(); await page.locator('[data-nav=back]').click(); await page.locator('#home-play').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt', campaignId!); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '182');
  await page.reload(); await ready(page); await openDaily(page, '2026-11-09');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt', id!); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '2');
  await expect(page.locator('#guides')).toHaveAttribute('aria-pressed', 'true');
});

test('daily victory turns only its own calendar cell green and survives reload without duplicate awards', async ({ page }) => {
  await unlocked(page); await openDaily(page, '2026-11-09'); const level = dailyCatalog['2026-11-09']!, board = new Board(level, 'oracle');
  while (!board.complete) {
    const arrow = board.remaining.find(a => canExit(a, board.remaining))!; await tapArrow(page, arrow); board.activate(arrow.id);
    await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(board.remaining.length));
  }
  await expect(page.locator('#win')).toBeVisible(); await page.locator('#next').click();
  await expect(page.locator('[data-date="2026-11-09"]')).toHaveClass(/done/); await expect(page.locator('[data-date="2026-11-08"]')).not.toHaveClass(/done/);
  await page.reload(); await ready(page); await page.locator('#home-calendar').click(); await expect(page.locator('[data-date="2026-11-09"]')).toHaveClass(/done/);
  const wins = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).dailyWins, SAVE_KEY); expect(Object.keys(wins)).toEqual(['2026-11-09']);
});

test('adapts home and calendar to short landscape, enlarged text and return navigation', async ({ page }) => {
  await unlocked(page);
  for (const size of [{ width: 360, height: 780 }, { width: 780, height: 360 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(size); await expect(page.locator('#home-play')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('#home-calendar').click(); await page.locator('[data-date="2026-11-09"]').click(); await expect(page.locator('#start-daily')).toBeEnabled();
    await page.locator('[data-nav=back]').click();
  }
  await page.evaluate(() => { for (const el of document.querySelectorAll<HTMLElement>('#meta-screen h1, #meta-screen h2, #meta-screen h3, #meta-screen p, #meta-screen small, #meta-screen button, #meta-screen span')) el.style.fontSize = `${parseFloat(getComputedStyle(el).fontSize) * 1.25}px`; });
  expect(await page.locator('#meta-screen').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(page.locator('#home-play')).toBeInViewport();
});

test('shows all twelve monthly rewards and lets the player resume a January archive puzzle', async ({ page }, info) => {
  await unlocked(page); await page.locator('#home-collection').click();
  await expect(page.locator('.month-trophy')).toHaveCount(12);
  await expect(page.locator('[data-month="2026-02"]')).toContainText('0 / 28');
  await page.locator('[data-month="2026-01"]').click();
  await expect(page.locator('[data-date="2026-01-01"]')).toBeEnabled();
  await expect(page.locator('[data-shift="-1"]')).toBeDisabled();
  await page.locator('[data-date="2026-01-01"]').click(); await page.locator('#start-daily').click(); await page.waitForTimeout(450);
  const id = await page.locator('#game-shell').getAttribute('data-attempt');
  const level = dailyCatalog['2026-01-01']!, board = new Board(level, 'oracle');
  await tapArrow(page, board.remaining.find(a => canExit(a, board.remaining))!);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(level.arrows.length - 1));
  await page.locator('#choose-field').click(); await page.locator('[data-nav=back]').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'collection');
  await page.screenshot({ path: info.outputPath('year-rewards.png') });
  await page.locator('[data-month="2026-01"]').click(); await page.locator('#start-daily').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt', id!);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(level.arrows.length - 1));
});

test('keeps future trophy collections hidden while current calendar trophies remain inspectable', async ({ page }, info) => {
  await unlocked(page); await page.locator('#home-collection').click();
  await expect(page.locator('#trophy-year')).toHaveCount(0);
  await expect(page.locator('.trophy-year')).toHaveText('2026');
  expect(await page.locator('.month-trophy').evaluateAll(cards => cards.map(card => card.getAttribute('data-month')))).toEqual(Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`));
  await page.screenshot({ path: info.outputPath('current-year-trophies.png') });
  await page.reload(); await ready(page); await page.locator('#home-collection').click();
  await expect(page.locator('#trophy-year')).toHaveCount(0); await expect(page.locator('[data-month^="2027"], [data-month^="2045"]')).toHaveCount(0);
  await page.locator('[data-month="2026-11"]').click();
  await page.locator('#view-trophy').click(); await expect(page.locator('[data-open-month="2026-11"]')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#trophy-viewer')).not.toBeVisible(); await expect(page.locator('#view-trophy')).toBeFocused();
  await page.locator('#view-trophy').click();
  await page.locator('[data-open-month]').click(); await expect(page.locator('#trophy-viewer')).not.toBeVisible();
  const save = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(save.cups).toEqual([]); expect(save.dailyWins).toEqual({}); expect(save.trophyDesigns).toEqual({});
});
