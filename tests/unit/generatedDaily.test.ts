import { expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import fingerprints from '../fixtures/daily-generated-v1-hashes.json';
import * as construction from '../../src/domain/silhouette';
import * as dailies from '../../src/content/daily';
import { Board, validateLevel } from '../../src/domain/board';
import { dailyFallback, generateDaily } from '../../src/content/dailyGenerated';
import { availableDailyMonths, dailyLevel, supportsDailyDate, DAILY_CATALOG_VERSION } from '../../src/content/daily';
import { trophyBinding } from '../../src/content/trophies';
import { campaign } from '../../src/content/campaign';
import { freshSave, freshAttempt, decodeSave, ProgressStore, SAVE_KEY } from '../../src/progression/save';
import { monthDates } from '../../src/progression/calendar';

function unlocked() {
  const s = freshSave(); s.index = 19; s.campaign = freshAttempt(campaign[19]!);
  s.wins = campaign.slice(0, 19).map((l, i) => ({ attempt: `generated-past-${i}`, levelId: l.id, activeMs: 0, completedAt: 0, localDate: '1970-01-01', mistakes: 0 }));
  return s;
}
it('reproduces dated tasks beyond the installed archive, including leap days and century limits', () => {
  expect(createHash('sha256').update(JSON.stringify(dailies.dailyCatalog)).digest('hex')).toBe(fingerprints.archive2026);
  for (const [date, digest] of Object.entries(fingerprints.generated)) expect(createHash('sha256').update(JSON.stringify(generateDaily(date))).digest('hex'), date).toBe(digest);
  for (const date of ['2027-01-01', '2027-01-08', '2027-01-14', '2028-02-29', '2046-01-28', '2100-02-28', '2200-12-31']) {
    const a = generateDaily(date); validateLevel(a);
    expect(a.id).toBe(`d${date.replaceAll('-', '')}`); expect(a.contentVersion).toBe(2);
    expect(generateDaily(date)).toEqual(a); expect(dailyLevel(date)).toEqual(a);
  }
  for (const date of ['2025-12-31', '2100-02-29', '2201-01-01', '2027-13-01']) expect(supportsDailyDate(date)).toBe(false);
  expect(availableDailyMonths('2027-01-01')).toHaveLength(24);
  expect(availableDailyMonths('2046-06-01').at(-1)).toBe('2046-12');
  expect(availableDailyMonths('2026-11-11').some(m => m.startsWith('2027'))).toBe(false);
});
it('bounds unsuccessful construction and uses a validated deterministic safety layout', () => {
  const date = '2028-02-28', fallback = dailyFallback(date); validateLevel(fallback);
  const spy = vi.spyOn(construction, 'silhouette').mockImplementation(() => ({ ...fallback, arrows: [] }));
  try {
    expect(generateDaily(date)).toEqual(fallback); expect(spy).toHaveBeenCalledTimes(3);
    spy.mockClear().mockImplementation(() => { throw Error('Construction unavailable'); });
    expect(generateDaily(date)).toEqual(fallback); expect(spy).toHaveBeenCalledTimes(3);
  }
  finally { spy.mockRestore(); }
});
it('migrates v2, preserves embedded generated geometry/rights and never rerolls when reopening or restarting', async () => {
  const state = unlocked(); state.dailyCatalogVersion = 2;
  const rows = new Map([[SAVE_KEY, JSON.stringify(state)]]), storage = { async getItem(k: string) { return rows.get(k) ?? null; }, async setItem(k: string, v: string) { rows.set(k, v); }, async removeItem(k: string) { rows.delete(k); } };
  const store = new ProgressStore(storage, () => new Date(2046, 0, 5)); await store.load();
  expect(store.available).toBe(true); expect(store.state.dailyCatalogVersion).toBe(DAILY_CATALOG_VERSION);
  expect(await store.openDaily('2046-01-06')).toBeUndefined();
  const id = (await store.openDaily('2046-01-05'))!, original = structuredClone(store.state.daily['2046-01-05']!.level);
  const board = new Board(original, id); await store.move(id, board.hint()!);
  await store.presentation(id, { view: { centerX: 7, centerY: 9, zoom: 2 }, guides: true });
  await store.commitReward({ id: 'generated-earned', schema: 1, attempt: id, mode: 'daily', placement: 'hint' });
  const restored = new ProgressStore(storage, () => new Date(2046, 0, 5)); await restored.load();
  expect(restored.available).toBe(true); expect(restored.state).toEqual(store.state);
  const noRegeneration = vi.spyOn(dailies, 'dailyLevel').mockImplementation(() => { throw Error('Decoder must not generate'); });
  try { expect(decodeSave(restored.state).daily).toEqual(restored.state.daily); } finally { noRegeneration.mockRestore(); }
  expect(await restored.openDaily('2046-01-05')).toBe(id);
  const newId = (await restored.restart(id))!; expect(newId).not.toBe(id);
  expect(restored.state.daily['2046-01-05']!.level).toEqual(original);
  expect(await restored.commitReward({ id: 'late-generated-earned', schema: 1, attempt: id, mode: 'daily', placement: 'hint' })).toBe('applied');
  expect(restored.state.reservedRewards.at(-1)?.attempt).toBe(id);
  expect(restored.state.daily['2046-01-05']!.hint).toBeNull();
  expect(decodeSave(restored.state).campaign).toEqual(state.campaign);
});
it('awards and restores a post-reserve leap-month trophy exactly once through the ordinary writer', async () => {
  const state = unlocked(), dates = monthDates('2048-02');
  for (const date of dates.slice(0, -1)) {
    const a = freshAttempt(dailyLevel(date)!), b = new Board(a.level, a.board.id);
    while (!b.complete) b.activate(b.hint()!);
    a.board = b.snapshot(); a.started = true; state.daily[date] = a;
    state.dailyWins[date] = { attempt: a.board.id, levelId: a.level.id, activeMs: 0, completedAt: 0, localDate: '2048-02-29', mistakes: 0 };
  }
  decodeSave(state);
  const rows = new Map([[SAVE_KEY, JSON.stringify(state)]]), storage = { async getItem(k: string) { return rows.get(k) ?? null; }, async setItem(k: string, v: string) { rows.set(k, v); }, async removeItem(k: string) { rows.delete(k); } };
  const store = new ProgressStore(storage, () => new Date(2048, 1, 29)); await store.load();
  const id = (await store.openDaily('2048-02-29'))!;
  while (true) { const a = store.findAttempt(id)!.saved, b = new Board(a.level, id, a.board); if (b.complete) break; await store.move(id, b.hint()!); }
  expect(store.state.cups).toEqual(['2048-02']); expect(store.state.trophyDesigns['2048-02']).toEqual(trophyBinding('2048-02'));
  const restored = new ProgressStore(storage, () => new Date(2026, 0, 1)); await restored.load();
  expect(restored.available).toBe(true); expect(restored.state.cups).toEqual(['2048-02']);
  expect(await restored.restart(id)).toBeUndefined(); expect(decodeSave(restored.state).daily['2048-02-29']!.board).toEqual(store.state.daily['2048-02-29']!.board);
});
