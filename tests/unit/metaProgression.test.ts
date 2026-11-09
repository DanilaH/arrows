import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import previousFields from '../fixtures/daily-v1-hashes.json';
import type { StorageAdapter } from '@danilah/mini-games-kit/platform';
import { campaign } from '../../src/content/campaign';
import { dailyCatalog, dailyDates, dailyMonths } from '../../src/content/daily';
import { Board, canExit, validateLevel } from '../../src/domain/board';
import { decodeSave, freshAttempt, freshSave, ProgressStore, SAVE_KEY } from '../../src/progression/save';
import { localDate, validDate, daysInMonth, monthDates } from '../../src/progression/calendar';
import { challengeOpen, collectionOpen, collectionStats, medals } from '../../src/progression/collection';

function memory() {
  const rows = new Map<string, string>();
  const storage: StorageAdapter = { async getItem(k) { return rows.get(k) ?? null; }, async setItem(k, v) { rows.set(k, v); }, async removeItem(k) { rows.delete(k); } };
  return { rows, storage };
}
function unlocked() {
  const state = freshSave(); state.index = 19; state.campaign = freshAttempt(campaign[19]!);
  state.wins = campaign.slice(0, 19).map((l, i) => ({ attempt: `past-${i}`, levelId: l.id, activeMs: 100, completedAt: 1000, localDate: '1970-01-01', mistakes: 0 }));
  return state;
}
async function solve(store: ProgressStore, expected: string) {
  for (;;) {
    const a = store.findAttempt(expected)!.saved, board = new Board(a.level, a.board.id, a.board);
    if (board.complete) return;
    await store.move(expected, board.hint()!);
  }
}
it('validates the entire fixed daily catalog and its full promised months', () => {
  expect(dailyDates).toHaveLength(365); expect(dailyMonths).toEqual(Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`));
  expect(dailyDates[0]).toBe('2026-01-01'); expect(dailyDates.at(-1)).toBe('2026-12-31');
  for (const month of dailyMonths) expect(monthDates(month).every(date => dailyCatalog[date]?.id === 'd' + date.replaceAll('-', ''))).toBe(true);
  for (const level of Object.values(dailyCatalog)) {
    validateLevel(level);
    // Independent integer-cell dependency oracle, without the runtime/generator ray helper.
    const cells = new Map<string, string>();
    for (const arrow of level.arrows) for (let i = 1; i < arrow.path.length; i++) {
      const a = arrow.path[i - 1]!, b = arrow.path[i]!, length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      for (let j = 0; j <= length; j++) cells.set(`${a.x + Math.sign(b.x - a.x) * j},${a.y + Math.sign(b.y - a.y) * j}`, arrow.id);
    }
    const dependencies = new Map(level.arrows.map(arrow => {
      const h = arrow.path.at(-1)!, before = arrow.path.at(-2)!, dx = Math.sign(h.x - before.x), dy = Math.sign(h.y - before.y), blockers = new Set<string>();
      for (let x = h.x + dx, y = h.y + dy; x >= 0 && y >= 0 && x < level.width && y < level.height; x += dx, y += dy) {
        const owner = cells.get(`${x},${y}`); if (owner && owner !== arrow.id) blockers.add(owner);
      }
      return [arrow.id, blockers];
    }));
    while (dependencies.size) {
      const free = [...dependencies].filter(([, blockers]) => [...blockers].every(id => !dependencies.has(id)));
      expect(free.length, level.id).toBeGreaterThan(0); for (const [id] of free) dependencies.delete(id);
    }
  }
});
it('uses real calendar lengths including leap centuries and local rather than UTC identity', () => {
  expect(daysInMonth(2024, 2)).toBe(29); expect(daysInMonth(2100, 2)).toBe(28); expect(daysInMonth(2000, 2)).toBe(29);
  for (const date of ['2026-02-29', '2026-11-31', '2026-13-01', '2026-00-00', '2026-2-02']) expect(validDate(date)).toBe(false);
  expect(validDate('2024-02-29')).toBe(true); expect(localDate(new Date(2026, 10, 9, 23, 59))).toBe('2026-11-09');
});
it('migrates a shipped v1 attempt without changing its identity, moves, receipts or geometry', async () => {
  const { storage, rows } = memory(), store = new ProgressStore(storage); await store.load(); await store.move(store.board.attemptId, store.board.hint()!);
  const current = structuredClone(store.state), v1 = { ...current, schema: 1 } as Record<string, unknown>;
  for (const key of ['dailyCatalogVersion', 'dailyWins', 'facts', 'cups', 'seenAwards', 'collectionSeen']) delete v1[key];
  rows.set(SAVE_KEY, JSON.stringify(v1)); const restored = new ProgressStore(storage); await restored.load();
  expect(restored.available).toBe(true); expect(restored.state.schema).toBe(2); expect(restored.state.campaign).toEqual(current.campaign);
  expect(restored.state.receipts).toEqual(current.receipts); expect(restored.state.facts).toEqual([]);
  await restored.presentation(restored.board.attemptId, { guides: true }); expect(JSON.parse(rows.get(SAVE_KEY)!).schema).toBe(2);
});
it('keeps campaign, two daily attempts, exact reward ownership and view states separate across reload', async () => {
  const { storage, rows } = memory(), state = unlocked(); rows.set(SAVE_KEY, JSON.stringify(state));
  const store = new ProgressStore(storage, () => new Date(2026, 10, 9)); await store.load();
  const one = (await store.openDaily('2026-11-08'))!, two = (await store.openDaily('2026-11-09'))!;
  expect(one).not.toBe(two); const a = store.findAttempt(one)!.saved, board = new Board(a.level, one, a.board);
  await Promise.all([store.move(one, board.hint()!), store.presentation(one, { view: { centerX: 12, centerY: 15, zoom: 2 }, guides: true }),
    store.commitReward({ id: 'daily-help', schema: 1, attempt: two, mode: 'daily', placement: 'hint' })]);
  expect(store.state.campaign).toEqual(state.campaign); expect(store.state.daily['2026-11-08']!.board.removed).toHaveLength(1);
  expect(store.state.daily['2026-11-09']!.hint).toBeTruthy(); expect(store.state.daily['2026-11-08']!.hint).toBeNull();
  expect(await store.openDaily('2026-11-08')).toBe(one); const restored = new ProgressStore(storage); await restored.load(); expect(restored.state).toEqual(store.state);
});
it('unlocks at current levels 10/20 and rejects future or out-of-catalog dates', async () => {
  const { storage, rows } = memory(), store = new ProgressStore(storage, () => new Date(2026, 10, 9)); await store.load();
  expect(collectionOpen(store.state)).toBe(false); expect(challengeOpen(store.state)).toBe(false); expect(await store.openDaily('2026-11-01')).toBeUndefined();
  rows.set(SAVE_KEY, JSON.stringify(unlocked())); await store.recover();
  expect(collectionOpen(store.state)).toBe(true); expect(challengeOpen(store.state)).toBe(true);
  expect(await store.openDaily('2026-11-10')).toBeUndefined(); expect(await store.openDaily('2025-12-31')).toBeUndefined(); expect(await store.openDaily('2026-01-01')).toBeTruthy(); expect(await store.openDaily('2026-11-09')).toBeTruthy();
});
it('commits a daily win once on its selected date across midnight, restarts and a month rollover', async () => {
  const { storage, rows } = memory(); rows.set(SAVE_KEY, JSON.stringify(unlocked()));
  let now = new Date(2026, 10, 30, 23, 59); const store = new ProgressStore(storage, () => now); await store.load();
  const expected = (await store.openDaily('2026-11-01'))!; now = new Date(2026, 11, 1, 0, 1); await solve(store, expected);
  expect(Object.keys(store.state.dailyWins)).toEqual(['2026-11-01']); expect(store.state.dailyWins['2026-11-01']!.localDate).toBe('2026-12-01');
  expect(await store.restart(expected)).toBeUndefined(); await solve(store, expected);
  expect(store.state.facts.filter(f => f.kind === 'win')).toHaveLength(1); expect(store.state.cups).toEqual([]);
  const restored = new ProgressStore(storage); await restored.load(); expect(restored.state.dailyWins).toEqual(store.state.dailyWins);
});
it('awards a full-month cup exactly once and retains it when the clock moves backwards', async () => {
  const { storage, rows } = memory(); rows.set(SAVE_KEY, JSON.stringify(unlocked())); let now = new Date(2026, 11, 31);
  const store = new ProgressStore(storage, () => now); await store.load();
  for (const date of monthDates('2026-11')) { const expected = (await store.openDaily(date))!; await solve(store, expected); }
  expect(store.state.cups).toEqual(['2026-11']); now = new Date(2026, 10, 1);
  const expected = (await store.openDaily('2026-11-01'))!; await solve(store, expected); expect(store.state.cups).toEqual(['2026-11']);
  const restored = new ProgressStore(storage); await restored.load(); expect(restored.state.cups).toEqual(['2026-11']);
}, 15000);
it('computes explicit records and medals from real wins and resets only the consecutive-win run on restart', () => {
  const save = freshSave(); save.wins = [];
  for (let i = 0; i < 10; i++) {
    const date = `2026-11-${String(1 + Math.floor(i / 4)).padStart(2, '0')}`;
    save.wins.push({ attempt: `a${i}`, levelId: `c${i}`, activeMs: 1, completedAt: i, localDate: date, mistakes: 0 });
    save.facts.push({ kind: 'win', attempt: `a${i}`, mode: 'campaign', localDate: date, at: i });
  }
  save.facts.push({ kind: 'restart', attempt: 'abandoned', mode: 'daily', localDate: '2026-11-03', at: 12 });
  expect(collectionStats(save, '2026-11-04')).toMatchObject({ current: 3, longest: 3, highest: 10, most: 4, perfect: 10 });
  expect(collectionStats(save, '2026-11-05').current).toBe(0);
  expect(medals(save).filter(m => m.earned).map(m => m.id)).toEqual(['perfect', 'unstoppable']);
});
it('rejects forged cups or duplicate facts rather than manufacturing achievements', () => {
  const save = freshSave(); save.cups.push('2026-11'); expect(() => decodeSave(save)).toThrow('trophy'); save.cups = [];
  save.facts.push({ kind: 'win', attempt: 'none', mode: 'campaign', localDate: '2026-11-09', at: 1 }); expect(() => decodeSave(save)).toThrow('Unconfirmed');
});

it('preserves every shipped November/December field exactly while adding the rest of 2026', () => {
  expect(Object.keys(previousFields)).toHaveLength(61);
  for (const [date, hash] of Object.entries(previousFields)) expect(createHash('sha256').update(JSON.stringify(dailyCatalog[date])).digest('hex'), date).toBe(hash);
});
it('upgrades the 0.3 daily catalog without losing attempts, views, completed days or earned rights', async () => {
  const { storage, rows } = memory(); rows.set(SAVE_KEY, JSON.stringify(unlocked()));
  const store = new ProgressStore(storage, () => new Date(2026, 10, 9)); await store.load();
  const completed = (await store.openDaily('2026-11-01'))!; await solve(store, completed);
  const pending = (await store.openDaily('2026-11-09'))!, a = store.findAttempt(pending)!.saved;
  const free = new Board(a.level, pending, a.board).hint()!;
  await store.move(pending, free); await store.presentation(pending, { guides: true, view: { centerX: 4, centerY: 5, zoom: 2 } });
  await store.commitReward({ id: 'old-catalog-reward', schema: 1, attempt: pending, mode: 'daily', placement: 'hint' });
  const old = { ...store.state, dailyCatalogVersion: 1 }; rows.set(SAVE_KEY, JSON.stringify(old));
  const restored = new ProgressStore(storage); await restored.load();
  expect(restored.available).toBe(true); expect(restored.state).toEqual({ ...old, dailyCatalogVersion: 2 });
  expect(await restored.openDaily('2026-11-09')).toBe(pending);
  expect(await restored.commitReward({ id: 'old-catalog-reward', schema: 1, attempt: pending, mode: 'daily', placement: 'hint' })).toBe('already-applied');
});
