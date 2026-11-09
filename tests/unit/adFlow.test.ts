import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameplayActivityCoordinator } from '@danilah/mini-games-kit/platform';
import { Board, canExit } from '../../src/domain/board';
import { ProgressStore, SAVE_KEY } from '../../src/progression/save';
import { freshAdCadence, interstitialReason } from '../../src/progression/adCadence';
import { createAdTransition } from '../../src/platform/adTransition';

function disk() {
  const rows = new Map<string, string>(); let failing = false;
  return { rows, fail(value: boolean) { failing = value; }, storage: { async getItem(key: string) { return rows.get(key) ?? null; }, async setItem(key: string, value: string) { if (failing) throw Error('disk full'); rows.set(key, value); }, async removeItem(key: string) { rows.delete(key); } } };
}
async function win(store: ProgressStore) {
  const board = store.board;
  while (!board.complete) { const arrow = board.remaining.find(a => canExit(a, board.remaining))!; board.activate(arrow.id); await store.move(board.attemptId, arrow.id); }
}
async function sixWins() {
  const d = disk(), store = new ProgressStore(d.storage); await store.load();
  await store.presentation(store.board.attemptId, {}, 150000, 150000);
  for (let i = 0; i < 6; i++) { await win(store); if (i < 5) { expect(interstitialReason(store.state.adCadence, store.confirmedWins)).toBe('protected'); await store.next(store.board.attemptId); } }
  return { d, store };
}
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; }
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
describe('durable interstitial opportunities', () => {
  it('protects six tasks, consumes once per opportunity, survives reload and defers after rewarded', async () => {
    const { d, store } = await sixWins(); const attempt = store.board.attemptId;
    expect(interstitialReason(store.state.adCadence, store.confirmedWins)).toBe('eligible');
    expect(await store.consumeInterstitial(attempt)).toBe(true); expect(await store.consumeInterstitial(attempt)).toBeUndefined();
    const restored = new ProgressStore(d.storage); await restored.load(); expect(restored.state.adCadence).toEqual(store.state.adCadence);
    await restored.next(attempt); await restored.presentation(restored.board.attemptId, {}, 160000, 160000); await win(restored);
    expect(interstitialReason(restored.state.adCadence, restored.confirmedWins)).toBe('progress');
    await restored.next(restored.board.attemptId); await win(restored); expect(interstitialReason(restored.state.adCadence, restored.confirmedWins)).toBe('eligible');
    await restored.postponeAds(); expect(interstitialReason(restored.state.adCadence, restored.confirmedWins)).toBe('cooldown');
  });
  it('migrates a shipped save conservatively without rerolling its current attempt or counting wall time', async () => {
    const { d, store } = await sixWins(); const original = JSON.parse(d.rows.get(SAVE_KEY)!); delete original.adCadence; d.rows.set(SAVE_KEY, JSON.stringify(original));
    const migrated = new ProgressStore(d.storage, () => new Date('2045-01-01')); await migrated.load();
    expect(migrated.state.campaign).toEqual(store.state.campaign); expect(migrated.state.adCadence).toEqual(freshAdCadence(6));
    expect(interstitialReason(migrated.state.adCadence, migrated.confirmedWins)).toBe('cooldown');
  });
  it('does not consume an opportunity on a failed disk write and separates attempt time from ad time', async () => {
    const { d, store } = await sixWins(); const before = structuredClone(store.state.adCadence); d.fail(true);
    await expect(store.consumeInterstitial(store.board.attemptId)).rejects.toThrow(); expect(store.state.adCadence).toEqual(before);
    d.fail(false); await store.presentation(store.board.attemptId, {}, 5000, 0); expect(store.state.adCadence.activeMs).toBe(before.activeMs);
    expect(await store.consumeInterstitial(store.board.attemptId)).toBe(true);
  });
});
describe('dismissal / foreground continuation', () => {
  it.each(['dismiss-first', 'foreground-first'])('advances once after both conditions, in order %s', async order => {
    const activity = new GameplayActivityCoordinator(() => {}, () => {}), sdk = deferred(), advance = vi.fn(async () => {});
    const flow = createAdTransition(activity, () => {}, () => {});
    flow.start(async () => true, () => { activity.setBlocked('ad', true); return sdk.promise.finally(() => activity.setBlocked('ad', false)); }, advance); await tick();
    activity.setBlocked('native-background', true);
    if (order === 'dismiss-first') { sdk.resolve(); await tick(); expect(advance).not.toHaveBeenCalled(); activity.setBlocked('native-background', false); }
    else { activity.setBlocked('native-background', false); await tick(); expect(advance).not.toHaveBeenCalled(); sdk.resolve(); }
    await tick(); expect(advance).toHaveBeenCalledOnce(); expect(flow.busy).toBe(false); expect(activity.isBlocked()).toBe(false); flow.destroy();
  });
  it('never guesses dismissal from elapsed time or advances after disposal', async () => {
    vi.useFakeTimers(); const activity = new GameplayActivityCoordinator(() => {}, () => {}), sdk = deferred(), advance = vi.fn(async () => {});
    const flow = createAdTransition(activity, () => {}, () => {}); flow.start(async () => true, () => sdk.promise, advance); await tick();
    await vi.advanceTimersByTimeAsync(600000); expect(advance).not.toHaveBeenCalled(); expect(flow.busy).toBe(true);
    flow.destroy(); sdk.resolve(); await tick(); expect(advance).not.toHaveBeenCalled();
  });
});
