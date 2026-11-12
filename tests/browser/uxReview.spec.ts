import { test, expect, type Page, type Locator } from '@playwright/test';
import { campaign } from '../../src/content/campaign';
import { dailyCatalog } from '../../src/content/daily';
import { Board, canExit } from '../../src/domain/board';
import { freshSave, freshAttempt, decodeSave, SAVE_KEY, type GameSave, type SavedAttempt } from '../../src/progression/save';
import { defaultSettings, SETTINGS_KEY } from '../../src/app/settings';
import { openAssistanceReview } from './helpers/assistanceReview';

function unlocked(index = 19): GameSave {
  const state = freshSave();
  state.index = index; state.campaign = freshAttempt(campaign[index]!);
  state.wins = campaign.slice(0, index).map((level, i) => ({ attempt: `ux-past-${i}`, levelId: level.id, activeMs: 1000, completedAt: i * 1000, localDate: '2026-11-10', mistakes: i % 3 }));
  state.seenUnlocks = index >= 19 ? ['collection', 'calendar'] : ['collection'];
  return state;
}
function lose(attempt: SavedAttempt, freeUsed = false): void {
  const board = new Board(attempt.level, attempt.board.id);
  for (let round = 0; round < (freeUsed ? 2 : 1); round++) {
    if (round) board.refill();
    while (board.hearts) {
      const arrow = board.remaining.find(a => !board.isError(a.id) && !canExit(a, board.remaining));
      if (!arrow) throw Error('Fixture needs distinct blocked arrows');
      board.activate(arrow.id);
    }
  }
  attempt.board = board.snapshot(); attempt.started = true;
  attempt.freeUsed = freeUsed; attempt.continuations = freeUsed ? 1 : 0;
}
async function seed(page: Page, state = unlocked(), isolated = false): Promise<void> {
  decodeSave(state);
  await page.clock.setFixedTime(new Date('2026-11-11T12:00:00Z'));
  await page.addInitScript(({ state, key, settings, settingsKey }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    if (!localStorage.getItem(settingsKey)) localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, { state, key: SAVE_KEY, settings: defaultSettings('ru'), settingsKey: SETTINGS_KEY });
  if (isolated) await openAssistanceReview(page); else await page.goto('/');
  await page.locator('#home-play:enabled').waitFor();
}
const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
async function unobscured(control: Locator): Promise<void> {
  await control.scrollIntoViewIfNeeded();
  await expect.poll(() => control.evaluate(el => {
    const box = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  })).toBe(true);
}

test('keeps a six-row month and its action reachable without a covering footer across phone layouts', async ({ page }, info) => {
  test.setTimeout(60000);
  await seed(page);
  for (const size of [{ width: 320, height: 568 }, { width: 568, height: 320 }, { width: 780, height: 360 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size); await page.locator('#home-calendar').click();
    while (!(await page.locator('[data-date]').first().getAttribute('data-date'))!.startsWith('2026-08')) await page.locator('[data-shift="-1"]').click();
    await page.waitForTimeout(400);
    await expect(page.locator('[data-date="2026-08-01"]')).toBeInViewport();
    expect(await page.locator('#meta-screen').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    for (const date of ['2026-08-01', '2026-08-15', '2026-08-31']) {
      const day = page.locator(`[data-date="${date}"]`); await unobscured(day); await day.click(); await expect(day).toHaveAttribute('aria-pressed', 'true');
    }
    await unobscured(page.locator('#start-daily'));
    await page.screenshot({ path: info.outputPath(`calendar-action-${size.width}.png`) });
    await page.locator('#start-daily').click();
    await expect(page.locator('#game-shell')).toHaveAttribute('data-level', dailyCatalog['2026-08-31']!.id);
    await expect(page.locator('#app-title')).toHaveText('31 августа');
    expect((await page.locator('#game-header').boundingBox())!.height).toBeLessThanOrEqual(64);
    await expect(page.locator('#field-name')).toBeHidden();
    await page.locator('#choose-field').click(); await page.locator('#home-tab').click();
  }
});

test('shows medal progress while closed, explains the locked cup shelf and keeps keyboard disclosure', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await seed(page, unlocked(9)); await page.locator('#home-collection').click();
  const medal = page.locator('[data-medal=legend]');
  await expect(medal.locator('p')).toBeHidden(); await expect(medal.locator('progress')).toBeVisible();
  await expect(medal.locator('small')).toContainText('9 / 20');
  await expect(page.locator('.trophy-availability')).toHaveText('Откроется на уровне 20');
  await expect(page.locator('[data-month="2026-01"]')).toBeDisabled();
  await medal.locator('summary').focus(); await page.keyboard.press('Enter'); await expect(medal.locator('p')).toBeVisible();
  await page.locator('#home-settings').click(); await page.locator('#setting-language').selectOption('en'); await page.keyboard.press('Escape');
  await expect(page.locator('#settings-dialog')).not.toBeVisible();
  await expect(medal.locator('p')).toContainText('Complete 20'); await expect(medal.locator('progress')).toBeVisible();
  await medal.locator('summary').focus(); await page.keyboard.press('Enter'); await expect(medal.locator('p')).toBeHidden();
  await expect(medal.locator('small')).toContainText('9 / 20');
});

test('keeps route-heading focus quiet while keyboard controls retain a visible focus indicator', async ({ page }) => {
  await seed(page); await expect(page.locator('#menu-title')).toBeFocused();
  expect(await page.locator('#menu-title').evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none');
  await page.keyboard.press('Tab'); await expect(page.locator('#home-play')).toBeFocused();
  expect(await page.locator('#home-play').evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  await page.locator('#home-calendar').click(); await page.locator('[data-date="2026-11-02"]').click(); await page.locator('#start-daily').click();
  await expect(page.locator('#app-title')).toHaveText('2 ноября'); await expect(page.locator('#choose-field')).toHaveAttribute('aria-label', 'К календарю');
  await page.locator('#game-settings').click(); await page.locator('#setting-language').selectOption('en'); await page.keyboard.press('Escape');
  await expect(page.locator('#app-title')).toHaveText('November 2'); await expect(page.locator('#choose-field')).toHaveAttribute('aria-label', 'Back to calendar');
});

test('leaves a campaign loss directly with Escape or Home and restores the same free chance', async ({ page }) => {
  const state = unlocked(); lose(state.campaign); await seed(page, state);
  for (const exit of ['escape', 'button']) {
    await page.locator('#home-play').click(); await expect(page.locator('[data-action=free-continue]')).toBeVisible();
    await expect(page.locator('[data-action=pause]')).toHaveCount(0);
    if (exit === 'escape') await page.keyboard.press('Escape'); else await page.locator('[data-action=home]').click();
    await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'home'); await expect(page.locator('#game-dialog')).not.toBeVisible();
    const after = await saved(page); expect(after.campaign.board).toEqual(state.campaign.board); expect(after.campaign.freeUsed).toBe(false); expect(after.wins).toEqual(state.wins);
  }
  await page.reload(); await page.locator('#home-play:enabled').click(); await expect(page.locator('[data-action=free-continue]')).toBeVisible();
});

test('retains an exhausted daily attempt through unavailable video and direct calendar return', async ({ page }) => {
  const state = unlocked(), date = '2026-11-03'; state.daily[date] = freshAttempt(dailyCatalog[date]!); lose(state.daily[date]!, true);
  await seed(page, state); await page.locator('#home-calendar').click(); await page.locator(`[data-date="${date}"]`).click(); await page.locator('#start-daily').click();
  await page.locator('[data-action=rewarded-continue]').click(); await expect(page.locator('#dialog-content')).toContainText('недоступно');
  await expect(page.locator('[data-action=home]')).toHaveText('К календарю'); await page.locator('[data-action=home]').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'calendar'); await expect(page.locator('#game-dialog')).not.toBeVisible();
  await expect(page.locator(`[data-date="${date}"]`)).toHaveAttribute('aria-pressed', 'true');
  const after = await saved(page); expect(after.daily[date].board).toEqual(state.daily[date]!.board); expect(after.daily[date].continuations).toBe(1); expect(after.receipts).toEqual([]); expect(after.dailyWins).toEqual({});
  await page.locator('#start-daily').click(); await expect(page.locator('[data-action=rewarded-continue]')).toBeVisible();
});

test('settles a lost-result native Back without reopening it, including synchronous reduced motion', async ({ page }) => {
  test.setTimeout(60000);
  const state = unlocked(); lose(state.campaign); await seed(page, state, true);
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await page.emulateMedia({ reducedMotion }); await page.locator('#home-play').click(); await expect(page.locator('[data-action=free-continue]')).toBeVisible();
    expect(await page.evaluate(() => Reflect.get(window, 'assistanceFixture').back())).toBe(true);
    await expect(page.locator('#game-shell')).toHaveAttribute('data-screen', 'home'); await expect(page.locator('#game-dialog')).not.toBeVisible();
    await page.waitForTimeout(400); await expect(page.locator('#game-dialog')).not.toBeVisible();
    expect((await saved(page)).campaign.board).toEqual(state.campaign.board);
    expect(await page.evaluate(() => Reflect.get(window, 'assistanceFixture').snapshot().shows)).toBe(0);
  }
});

test('keeps the next board hidden until opened and gives the exhausted campaign an honest result entry', async ({ page }) => {
  const state = freshSave(), board = new Board(state.campaign.level, state.campaign.board.id);
  while (!board.complete) board.activate(board.hint()!);
  state.campaign.board = board.snapshot(); state.campaign.started = true;
  state.wins.push({ attempt: board.attemptId, levelId: board.level.id, activeMs: 1000, completedAt: 1000, localDate: '2026-11-10', mistakes: 0 });
  await seed(page, state);
  await expect(page.locator('.campaign-heading h2')).toHaveText('Уровень 2'); await expect(page.locator('#home-play')).toHaveText('Дальше');
  await expect(page.locator('.home-board')).toBeHidden();await expect(page.locator('.home-board polyline')).toHaveCount(0);
  expect((await saved(page)).index).toBe(0); expect((await saved(page)).campaign.board).toEqual(state.campaign.board);
  await page.locator('#home-play').click(); await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'c02');
  expect((await saved(page)).wins).toHaveLength(1);
  const final = unlocked(campaign.length - 1), end = new Board(final.campaign.level, final.campaign.board.id);
  while (!end.complete) end.activate(end.hint()!);
  final.campaign.board = end.snapshot(); final.campaign.started = true;
  final.wins.push({ attempt: end.attemptId, levelId: end.level.id, activeMs: 1000, completedAt: 2000, localDate: '2026-11-10', mistakes: 0 });
  decodeSave(final);
  await page.addInitScript(({ key, final }) => { if (!sessionStorage.getItem('ux-final-seeded')) { localStorage.setItem(key, JSON.stringify(final)); sessionStorage.setItem('ux-final-seeded', '1'); } }, { key: SAVE_KEY, final });
  await page.reload();
  await expect(page.locator('.campaign-heading h2')).toHaveText('Кампания пройдена!'); await expect(page.locator('.home-finish')).toBeVisible(); await expect(page.locator('#home-play')).toHaveText('Посмотреть результат');
  await page.locator('#home-play').click(); await expect(page.locator('#win')).toBeVisible(); await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'c120');
  expect((await saved(page)).campaign.board.id).toBe(final.campaign.board.id); expect((await saved(page)).wins).toHaveLength(120);
});

test('keeps both theme labels inside their buttons at 320px with 125 percent text in RU and EN', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 }); await seed(page); await page.locator('#home-settings').click();
  for (const language of ['ru', 'en']) {
    await page.locator('#setting-language').selectOption(language);
    await expect(page.locator('#settings-title')).toHaveText(language === 'ru' ? 'Настройки' : 'Settings');
    await page.locator('#settings-dialog').evaluate(root => {
      const elements = [...root.querySelectorAll<HTMLElement>('h2,h3,p,span,small,strong,button,select')];
      const sizes = elements.map(el => parseFloat(getComputedStyle(el).fontSize));
      elements.forEach((el, i) => { el.style.fontSize = `${sizes[i]! * 1.25}px`; });
    });
    for (const id of ['theme-light', 'theme-dark']) {
      expect(await page.locator('#' + id).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.locator('#' + id).click(); await expect(page.locator('#' + id)).toHaveAttribute('aria-pressed', 'true');
    }
    expect(await page.locator('#settings-dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
});
