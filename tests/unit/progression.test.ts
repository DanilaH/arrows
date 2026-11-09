import { describe, expect, it } from 'vitest';
import type { StorageAdapter } from '@danilah/mini-games-kit/platform';
import { dailyCatalog } from '../../src/content/daily';
import { campaign } from '../../src/content/campaign';
import { Board, canExit } from '../../src/domain/board';
import { decodeSave, freshAttempt, freshSave, ProgressStore, SAVE_KEY } from '../../src/progression/save';
import type { EarnedReceipt } from '../../src/platform/ads';

function memory() {
  const rows = new Map<string, string>();
  const storage: StorageAdapter = { async getItem(k) { return rows.get(k) ?? null; }, async setItem(k, v) { rows.set(k, v); }, async removeItem(k) { rows.delete(k); } };
  return { rows, storage };
}
function seed(index: number) {
  const save = freshSave(); save.index = index; save.campaign = freshAttempt(campaign[index]!);
  save.wins = campaign.slice(0, index).map((level, i) => ({ attempt: `past-${i}`, levelId: level.id, activeMs: 1000, completedAt: 1000 + i, mistakes: 0 }));
  return save;
}
function receipt(attempt: string, placement: EarnedReceipt['placement'] = 'hint', id = 'reward-1'): EarnedReceipt {
  return { id, schema: 1, attempt, mode: 'campaign', placement };
}
async function solve(store: ProgressStore) {
  while (!store.board.complete) { const board = store.board; await store.move(board.attemptId, board.hint()!); }
}

describe('fixed first chapter', () => {
  it('has twenty legal distinct boards, independently removable in multiple orders', () => {
    expect(campaign).toHaveLength(20); expect(new Set(campaign.map(l => l.id)).size).toBe(20);
    expect(campaign[5]!.difficulty).toBe('hard'); expect(campaign[19]!.difficulty).toBe('nightmare');
    for (const level of campaign) for (let order = 0; order < 3; order++) {
      const board = new Board(level, 'independent');
      while (!board.complete) {
        const remaining = board.remaining;
        const possible = remaining.filter(arrow => {
          const head = arrow.path.at(-1)!, before = arrow.path.at(-2)!;
          const dx = Math.sign(head.x - before.x), dy = Math.sign(head.y - before.y);
          const occupied = new Set<string>();
          for (const other of remaining) if (other !== arrow) for (let j = 1; j < other.path.length; j++) {
            const a = other.path[j - 1]!, b = other.path[j]!, length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
            for (let k = 0; k <= length; k++) occupied.add(`${a.x + Math.sign(b.x - a.x) * k},${a.y + Math.sign(b.y - a.y) * k}`);
          }
          for (let x = head.x + dx, y = head.y + dy; x >= 0 && y >= 0 && x < level.width && y < level.height; x += dx, y += dy) if (occupied.has(`${x},${y}`)) return false;
          return true;
        });
        expect(possible.length, level.id).toBeGreaterThan(0);
        const chosen = possible[order === 0 ? 0 : order === 1 ? possible.length - 1 : Math.floor(possible.length / 2)]!;
        expect(board.activate(chosen.id).kind).toBe('removed');
      }
    }
  });
});

describe('authoritative progression writer', () => {
  it('restores an accepted move during flight, errors, guides and viewport without rerolling identity', async () => {
    const { storage, rows } = memory(), state = seed(2); rows.set(SAVE_KEY, JSON.stringify(state));
    const store = new ProgressStore(storage); await store.load(); const expected = store.board.attemptId;
    const blocked = store.board.remaining.find(a => !canExit(a, store.board.remaining))!;
    await store.move(expected, blocked.id, 1000); await store.move(expected, blocked.id, 1000);
    await store.move(expected, store.board.hint()!, 1000);
    await store.presentation(expected, { guides: true, view: { centerX: 3, centerY: 4, zoom: 2 } });
    const restored = new ProgressStore(storage); await restored.load();
    expect(restored.state).toEqual(store.state); expect(restored.board.hearts).toBe(2);
    expect(restored.board.isError(blocked.id)).toBe(true); expect(restored.board.attemptId).toBe(expected);
  });
  it('records victory before presentation, advances only once and explicitly stops at the chapter end', async () => {
    const { storage, rows } = memory(), store = new ProgressStore(storage); await store.load();
    await solve(store); const done = store.board.attemptId;
    const restored = new ProgressStore(storage); await restored.load(); expect(restored.state.wins).toHaveLength(1);
    expect(restored.board.complete).toBe(true);
    await Promise.all([restored.next(done), restored.next(done)]); expect(restored.state.index).toBe(1);
    expect(restored.state.wins).toHaveLength(1); expect(restored.board.complete).toBe(false);
    rows.set(SAVE_KEY, JSON.stringify(seed(19))); const last = new ProgressStore(storage); await last.load(); await solve(last);
    expect(await last.next(last.board.attemptId)).toBeUndefined(); expect(last.state.wins).toHaveLength(20);
    expect(decodeSave(JSON.parse(rows.get(SAVE_KEY)!)).index).toBe(19);
  });
  it('preserves marks through one free refill and idempotent earned lives; restart creates a fresh identity', async () => {
    const { storage, rows } = memory(); rows.set(SAVE_KEY, JSON.stringify(seed(5)));
    const store = new ProgressStore(storage); await store.load(); const attempt = store.board.attemptId;
    const errors = store.board.remaining.filter(a => !canExit(a, store.board.remaining)).slice(0, 6);
    expect(errors.length).toBe(6);
    for (const a of errors.slice(0, 3)) await store.move(attempt, a.id);
    expect(store.board.hearts).toBe(0); await Promise.all([store.continueFree(attempt), store.continueFree(attempt)]);
    expect(store.board.hearts).toBe(3); expect(store.state.campaign.continuations).toBe(1);
    await store.move(attempt, errors[0]!.id); expect(store.board.hearts).toBe(3);
    for (const a of errors.slice(3)) await store.move(attempt, a.id);
    const r = receipt(attempt, 'lives'); await store.commitReward(r); await store.commitReward(r);
    expect(store.state.campaign.continuations).toBe(2); expect(store.board.hearts).toBe(3);
    expect(store.state.campaign.board.errors).toHaveLength(6);
    expect(decodeSave(JSON.parse(rows.get(SAVE_KEY)!)).campaign).toEqual(store.state.campaign);
    await store.restart(attempt); expect(store.board.attemptId).not.toBe(attempt); expect(store.state.campaign.freeUsed).toBe(false);
    expect(store.state.campaign.board.errors).toEqual([]);
  });
  it('serializes ordinary changes with receipts, chooses a current legal hint and keeps daily independent', async () => {
    const { storage, rows } = memory(), state = seed(2); state.daily['2026-11-09'] = freshAttempt(dailyCatalog['2026-11-09']!); rows.set(SAVE_KEY, JSON.stringify(state));
    const store = new ProgressStore(storage); await store.load(); const expected = store.board.attemptId, arrow = store.board.hint()!;
    await Promise.all([store.move(expected, arrow), store.commitReward(receipt(expected)), store.presentation(expected, { guides: true })]);
    expect(store.state.campaign.hint).not.toBe(arrow); expect(store.board.remaining.some(a => a.id === store.state.campaign.hint && canExit(a, store.board.remaining))).toBe(true);
    expect(store.state.receipts).toEqual(['reward-1']); expect(store.state.campaign.guides).toBe(true);
    expect(store.state.daily).toEqual(state.daily);
    const restored = new ProgressStore(storage); await restored.load(); expect(await restored.commitReward(receipt(expected))).toBe('already-applied');
    expect(restored.state.campaign.hint).toBe(store.state.campaign.hint);
  });
  it('durably reserves a late reward for its retired attempt instead of redirecting or discarding it', async () => {
    const { storage, rows } = memory(), store = new ProgressStore(storage); await store.load(); const old = store.board.attemptId;
    await store.restart(old); await store.commitReward(receipt(old));
    expect(store.state.campaign.hint).toBeNull(); expect(store.state.reservedRewards).toEqual([receipt(old)]);
    expect(decodeSave(JSON.parse(rows.get(SAVE_KEY)!)).receipts).toEqual(['reward-1']);
  });
  it('establishes an ambiguous successful write by readback and never grants a duplicate', async () => {
    const { storage } = memory(); const ambiguous: StorageAdapter = { ...storage, async setItem(k, v) { await storage.setItem(k, v); throw Error('RPC lost'); } };
    const store = new ProgressStore(ambiguous); await store.load(); const r = receipt(store.board.attemptId);
    expect(await store.commitReward(r)).toBe('applied'); expect(await store.commitReward(r)).toBe('already-applied');
    expect(store.state.receipts).toHaveLength(1); expect(store.uncertain).toBe(false);
  });
  it('gates all mutations if failed-write readback is unavailable, then recovers durable truth', async () => {
    const { storage } = memory(); let failing = false;
    const uncertain: StorageAdapter = { ...storage, async getItem(k) { if (failing) throw Error('unreadable'); return storage.getItem(k); }, async setItem(k, v) { await storage.setItem(k, v); if (failing) throw Error('lost response'); } };
    const store = new ProgressStore(uncertain); await store.load(); const r = receipt(store.board.attemptId); failing = true;
    await expect(store.commitReward(r)).rejects.toThrow(); expect(store.uncertain).toBe(true);
    await expect(store.move(store.board.attemptId, store.board.hint()!)).rejects.toThrow();
    failing = false; await store.recover(); expect(store.uncertain).toBe(false);
    expect(await store.commitReward(r)).toBe('already-applied');
  });
  it('rejects bad/future saves without overwriting history and never acknowledges rewards in a session-only game', async () => {
    const { storage, rows } = memory(); rows.set(SAVE_KEY, '{"schema":999,"valuable":"keep me"}');
    const store = new ProgressStore(storage); await store.load(); expect(store.available).toBe(false);
    await store.move(store.board.attemptId, store.board.hint()!); expect(rows.get(SAVE_KEY)).toContain('keep me');
    await expect(store.commitReward(receipt(store.board.attemptId))).rejects.toThrow('No durable storage');
    expect(store.state.receipts).toEqual([]);
  });
  it('repairs only invalid camera metadata and rejects impossible removal/life histories', () => {
    const state = freshSave(); state.campaign.view = { centerX: Infinity, centerY: 0, zoom: -1 };
    expect(decodeSave(state).campaign.view).toBeNull();
    state.campaign.board = { ...state.campaign.board, lives: 1 }; expect(() => decodeSave(state)).toThrow();
    const s = seed(2), blocked = new Board(s.campaign.level, 'test').remaining.find(a => !canExit(a, s.campaign.level.arrows))!;
    s.campaign.started = true; s.campaign.board = { ...s.campaign.board, removed: [blocked.id] }; expect(() => decodeSave(s)).toThrow('removal');
  });
  it('ignores a late load after the player explicitly chooses an unsaved session', async () => {
    let resolveRead!: (value: string | null) => void;
    const storage: StorageAdapter = { getItem: () => new Promise(resolve => { resolveRead = resolve; }), async setItem() {}, async removeItem() {} };
    const store = new ProgressStore(storage), loading = store.load();
    store.startSessionOnly(); await store.move(store.board.attemptId, store.board.hint()!);
    const accepted = store.state;
    resolveRead(JSON.stringify(seed(5))); await loading;
    expect(store.state).toBe(accepted); expect(store.available).toBe(false); expect(store.board.remaining).toHaveLength(2);
  });
});
