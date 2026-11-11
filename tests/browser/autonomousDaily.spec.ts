import { expect, test, type Page } from '@playwright/test';
import { campaign } from '../../src/content/campaign';
import { dailyLevel } from '../../src/content/daily';
import { Board } from '../../src/domain/board';
import { freshSave, freshAttempt, SAVE_KEY, type GameSave } from '../../src/progression/save';
import { defaultSettings, SETTINGS_KEY } from '../../src/app/settings';
import { openAssistanceReview } from './helpers/assistanceReview';
test.use({ hasTouch: true });

function unlocked(index = 19): GameSave {
  const state = freshSave(); state.index = index; state.campaign = freshAttempt(campaign[index]!);
  state.wins = campaign.slice(0, index).map((l, i) => ({ attempt: `autonomous-past-${i}`, levelId: l.id, activeMs: 0, completedAt: 0, localDate: '1970-01-01', mistakes: 0 }));
  state.seenUnlocks = ['collection', 'calendar']; return state;
}
async function open(page: Page, date: string, state = unlocked(), review = false): Promise<void> {
  await page.clock.setFixedTime(new Date(`${date}T12:00:00Z`));
  await page.addInitScript(({ state, key, settings, settingsKey }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    if (!localStorage.getItem(settingsKey)) localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, { state, key: SAVE_KEY, settings: defaultSettings('ru'), settingsKey: SETTINGS_KEY });
  if (review) await openAssistanceReview(page); else await page.goto('/');
  await page.locator('#home-play:enabled').waitFor();
}
const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);

test('opens the actual current 2027 task, matches Node output and resumes the same geometry', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  await open(page, '2027-01-05'); await page.locator('#home-calendar').click();
  await expect(page.locator('[data-date="2027-01-05"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-date="2027-01-06"]')).toBeDisabled();
  await page.locator('#start-daily').click(); await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'd20270105');
  await page.waitForTimeout(450); // Route entry owns input until its finite handoff ends.
  const level = dailyLevel('2027-01-05')!, b = new Board(level, 'oracle'), arrow = level.arrows.find(a => a.id === b.hint())!;
  const camera = JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!), h = arrow.path.at(-1)!;
  await page.touchscreen.tap(camera.x + h.x * camera.scale, camera.y + h.y * camera.scale);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(level.arrows.length - 1));
  const before = (await saved(page)).daily['2027-01-05']; expect(before.level).toEqual(level);
  await page.locator('#choose-field').click(); await expect(page.locator('[data-date="2027-01-05"]')).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await page.locator('#home-calendar:enabled').click(); await page.locator('#start-daily').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt', before.board.id);
  expect((await saved(page)).daily['2027-01-05'].board).toEqual(before.board); expect(errors).toEqual([]);
});

test('renders generated Nightmare and post-2045 trophies on a narrow screen without exposing future years', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 568 }); await open(page, '2046-01-08');
  await page.locator('#home-collection').click(); await expect(page.locator('#trophy-year')).toHaveValue('2046');
  expect(await page.locator('#trophy-year option').evaluateAll(options => options.map(o => (o as HTMLOptionElement).value))).not.toContain('2047');
  await expect(page.locator('.month-trophy')).toHaveCount(12);
  await page.locator('[data-month="2046-01"]').click(); await page.locator('#view-trophy').click();
  await expect(page.locator('#trophy-viewer .trophy-rich')).toBeVisible(); await page.keyboard.press('Escape');
  await page.locator('[data-date="2046-01-08"]').click(); await page.locator('#start-daily').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'd20460108');
  expect(await page.locator('#game-header').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('generated-nightmare-320.png') });
  const state = await saved(page); expect(state.cups).toEqual([]); expect(state.dailyWins).toEqual({});
});

test('follows the new local day/year while retaining an explicitly returned daily date', async ({ page }) => {
  await open(page, '2026-12-31'); await page.locator('#home-calendar').click();
  await page.clock.setFixedTime(new Date('2027-01-01T12:00:00Z'));
  await expect(page.locator('[data-date="2027-01-01"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#home-collection').click(); await expect(page.locator('#trophy-year')).toHaveValue('2027');
  await page.locator('#home-calendar').click(); await page.locator('#start-daily').click();
  await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'd20270101');
  await page.clock.setFixedTime(new Date('2027-01-02T12:00:00Z')); await page.locator('#choose-field').click();
  await expect(page.locator('[data-date="2027-01-01"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-date="2027-01-02"]')).toBeEnabled();
});

test('explains a date before the start without allowing a future puzzle', async ({ page }) => {
  await open(page, '2025-12-31'); await page.locator('#home-calendar').click();
  await expect(page.locator('#calendar-notice')).toContainText('с 1 января 2026'); await expect(page.locator('#start-daily')).toBeDisabled();
  await expect(page.locator('[data-date]:enabled')).toHaveCount(0);
  expect(Object.keys((await saved(page)).daily)).toEqual([]);
});

test('records a genuine late pinch, ignores clamped wheel input and retains view across reload', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 }); await open(page, '2026-11-11'); await page.locator('#home-play').click();
  const state = await saved(page); expect(state.tutorials).not.toContain('zoom');
  await page.mouse.move(160, 260); await page.mouse.wheel(0, 120); await page.waitForTimeout(450);
  expect((await saved(page)).tutorials).not.toContain('zoom');
  const client = await page.context().newCDPSession(page);
  const points = (gap: number) => [{ x: 160 - gap, y: 260, id: 1 }, { x: 160 + gap, y: 260, id: 2 }];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(25) });
  for (const gap of [40, 60, 80]) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(gap) });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await client.detach();
  await expect.poll(async () => (await saved(page)).tutorials.includes('zoom')).toBe(true);
  await page.waitForTimeout(500); const after = await saved(page); expect(after.campaign.view.zoom).toBeGreaterThan(1.2);
  expect(after.campaign.board).toEqual(state.campaign.board);
  await page.reload(); await page.locator('#home-play:enabled').click(); expect((await saved(page)).tutorials).toContain('zoom');
});

test('keeps restored zoom and Hint focus separate from learning a manual gesture', async ({ page }) => {
  const state = unlocked(); state.campaign.view = { centerX: 20, centerY: 20, zoom: 2 };
  state.campaign.hint = new Board(state.campaign.level, state.campaign.board.id).hint();
  await open(page, '2026-11-11', state); await page.locator('#home-play').click(); await page.waitForTimeout(600);
  expect((await saved(page)).tutorials).not.toContain('zoom');
});

test('keeps the optional scale context in isolated QA with working three-second Hint and ad time', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 }); await open(page, '2026-11-11', unlocked(), true);
  await page.locator('#home-play').click(); await expect(page.locator('#app-status')).toContainText('Приближай');
  await expect(page.locator('#hint')).toBeVisible({ timeout: 4500 }); await page.locator('#choose-field').click();
  const state = await saved(page); expect(state.adCadence.activeMs).toBeGreaterThanOrEqual(2800); expect(state.tutorials).not.toContain('zoom');
  expect(state.campaign.board.removed).toEqual([]);
});
