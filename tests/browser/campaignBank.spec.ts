import preDense from '../fixtures/campaign-pre-dense.json' with { type: 'json' };
import { expect, test, type Page } from '@playwright/test';
import { campaign } from '../../src/content/campaign';
import { type Level, Board, canExit } from '../../src/domain/board';
import { freshAttempt, freshSave, SAVE_KEY, type GameSave } from '../../src/progression/save';

function at(index: number, complete = false): GameSave {
  const state = freshSave(); state.index = index; state.campaign = freshAttempt(campaign[index]!);
  state.wins = campaign.slice(0, index).map((l, i) => ({ attempt: `bank-past-${i}`, levelId: l.id, activeMs: 1000, completedAt: i * 1000, mistakes: 0 }));
  if (complete) {
    const b = new Board(state.campaign.level, state.campaign.board.id);
    while (!b.complete) b.activate(b.hint()!);
    state.campaign.board = b.snapshot(); state.campaign.started = true;
    state.wins.push({ attempt: b.attemptId, levelId: b.level.id, activeMs: 1000, completedAt: 200000, mistakes: 0 });
  }
  return state;
}
async function load(page: Page, state: GameSave) {
  await page.addInitScript(({ key, state }) => {
    if (!sessionStorage.getItem('campaign-bank-seeded')) { localStorage.setItem(key, JSON.stringify(state)); sessionStorage.setItem('campaign-bank-seeded', '1'); }
  }, { key: SAVE_KEY, state });
  await page.goto('/'); await ready(page);
}
async function ready(page: Page) { await page.locator('#game-shell[data-status=ready][data-progress=ready]').waitFor(); }
async function tap(page: Page, arrow: { path: readonly { x: number; y: number }[] }) {
  const c = JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!), h = arrow.path.at(-1)!;
  await page.mouse.click(c.x + h.x * c.scale, c.y + h.y * c.scale);
}

test('upgrades completed c20 into the larger bank through explicit Continue exactly once', async ({ page }) => {
  const old = at(19, true); old.catalogVersion = 4; old.campaign = freshAttempt(preDense.find(l => l.id === 'c20') as Level);
  const oldBoard = new Board(old.campaign.level, old.campaign.board.id); while (!oldBoard.complete) oldBoard.activate(oldBoard.hint()!); old.campaign.board = oldBoard.snapshot(); old.campaign.started = true; old.wins[19] = { ...old.wins[19]!, attempt: oldBoard.attemptId };
  await load(page, old);
  await expect(page.locator('.home-progress')).toContainText('20 / 120');
  await expect(page.locator('#home-calendar')).toBeEnabled();
  await page.locator('#home-play').dblclick();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'c21');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(saved.catalogVersion).toBe(5); expect(saved.wins).toHaveLength(20); expect(saved.index).toBe(20);
  await page.reload(); await ready(page); await page.locator('#home-play').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt', saved.campaign.board.id);
});

test('plays and restores a new bent field with error marks, guides and the same attempt', async ({ page }) => {
  const state = at(20), level = state.campaign.level;
  await load(page, state); await page.locator('#home-play').click(); await page.waitForTimeout(450);
  const blocked = level.arrows.find(a => !canExit(a, level.arrows))!, free = level.arrows.find(a => canExit(a, level.arrows))!;
  await tap(page, blocked); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '2');
  await tap(page, free); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(level.arrows.length - 1));
  await page.locator('#guides').click(); await expect(page.locator('#guides')).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await ready(page); await page.locator('#home-play').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt', state.campaign.board.id);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '2');
  await expect(page.locator('#guides')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#field-name')).toHaveText('21 / 120');
});

test('ends explicitly at c120 with accurate totals and no silent reroll', async ({ page }) => {
  await load(page, at(119, true));
  await expect(page.locator('.home-progress')).toContainText('120 / 120');
  await page.locator('#home-play').click(); await expect(page.locator('#win')).toBeVisible();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'c120');
  await expect(page.locator('#next')).toBeDisabled();
  await expect(page.locator('#next')).not.toContainText('20 ');
  await page.locator('#choose-field').click(); await page.locator('#home-play').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'c120');
});
