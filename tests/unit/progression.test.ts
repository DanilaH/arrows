import legacyCampaign from '../fixtures/campaign-pre-polish.json';
import tailFingerprints from '../fixtures/campaign-tail-v2-hashes.json';
import type { Level } from '../../src/domain/board';
import { createHash } from 'node:crypto';
import originalChapter from '../fixtures/campaign-v1-hashes.json';
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

describe('fixed selected campaign bank', () => {
  it('pins the immutable legacy opening, preserves the published tail and keeps every fresh field distinct', () => {
    for (const level of legacyCampaign) expect(createHash('sha256').update(JSON.stringify(level)).digest('hex')).toBe(originalChapter[level.id as keyof typeof originalChapter]);
    for (const level of campaign.slice(20)) expect(createHash('sha256').update(JSON.stringify(level)).digest('hex')).toBe(tailFingerprints[level.id as keyof typeof tailFingerprints]);
    expect(campaign.slice(0, 20).every(l => l.contentVersion === 2)).toBe(true);
    const fingerprints = campaign.map(l => JSON.stringify({ mask: l.mask, paths: l.arrows.map(a => a.path) }));
    expect(new Set(fingerprints).size).toBe(120);
  });
  it('introduces bends and nearby blockers from the first board', () => {
    for (const level of campaign.slice(0, 4)) {
      expect(level.arrows.every(a => a.path.length >= 4)).toBe(true);
      expect(level.arrows.filter(a => !canExit(a, level.arrows)).length).toBeGreaterThan(0);
      const lengths = level.arrows.flatMap(a => a.path.slice(1).map((p, i) => Math.abs(p.x - a.path[i]!.x) + Math.abs(p.y - a.path[i]!.y)));
      expect(lengths.reduce((a, b) => a + b, 0) / (level.width * level.height)).toBeGreaterThan(.35);
    }
  });
  it('has 120 legal distinct boards, independently removable in multiple orders', () => {
    expect(campaign).toHaveLength(120); expect(new Set(campaign.map(l => l.id)).size).toBe(120);
    expect(campaign[5]!.difficulty).toBe('hard'); expect(campaign[19]!.difficulty).toBe('nightmare');
    for (const level of campaign) {
      const occupied = new Map<string, string>();
      for (const arrow of level.arrows) for (let j = 1; j < arrow.path.length; j++) {
        const a = arrow.path[j - 1]!, b = arrow.path[j]!, length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
        for (let k = 0; k <= length; k++) occupied.set(`${a.x + Math.sign(b.x - a.x) * k},${a.y + Math.sign(b.y - a.y) * k}`, arrow.id);
      }
      const dependencies = new Map(level.arrows.map(arrow => {
        const head = arrow.path.at(-1)!, before = arrow.path.at(-2)!, blockers = new Set<string>();
        const dx = Math.sign(head.x - before.x), dy = Math.sign(head.y - before.y);
        for (let x = head.x + dx, y = head.y + dy; x >= 0 && y >= 0 && x < level.width && y < level.height; x += dx, y += dy) {
          const blocker = occupied.get(`${x},${y}`); if (blocker) blockers.add(blocker);
        }
        return [arrow.id, blockers];
      }));
      for (let order = 0; order < 3; order++) {
      const board = new Board(level, 'independent');
      while (!board.complete) {
        const remaining = board.remaining, ids = new Set(remaining.map(a => a.id));
        const possible = remaining.filter(a => ![...dependencies.get(a.id)!].some(id => ids.has(id)));
        expect(remaining.filter(a => canExit(a, remaining)).map(a => a.id), level.id).toEqual(possible.map(a => a.id));
        expect(possible.length, level.id).toBeGreaterThan(0);
        const chosen = possible[order === 0 ? 0 : order === 1 ? possible.length - 1 : Math.floor(possible.length / 2)]!;
        expect(board.activate(chosen.id).kind).toBe('removed');
      }
      }
    }
  });
});

describe('authoritative progression writer', () => {
  it('upgrades a completed original bank and advances into c21 once without reissuing wins or moving earned rights', async () => {
    const { storage, rows } = memory(), state = seed(19); state.campaign = freshAttempt(legacyCampaign[19] as Level);
    const oldBoard = new Board(state.campaign.level, state.campaign.board.id);
    while (!oldBoard.complete) oldBoard.activate(oldBoard.hint()!);
    state.campaign.board = oldBoard.snapshot(); state.campaign.started = true; state.catalogVersion = 1;
    state.wins.push({ attempt: oldBoard.attemptId, levelId: 'c20', activeMs: 12000, completedAt: 40000, mistakes: 0 });
    state.daily['2026-11-09'] = freshAttempt(dailyCatalog['2026-11-09']!);
    state.receipts = ['existing-right']; state.reservedRewards = [receipt('old-retired', 'hint', 'existing-right')];
    rows.set(SAVE_KEY, JSON.stringify(state));
    const store = new ProgressStore(storage); await store.load();
    expect(store.available).toBe(true); expect(store.state.catalogVersion).toBe(3);
    expect(store.state.campaign).toEqual(state.campaign); expect(store.state.wins).toHaveLength(20);
    expect(store.state.daily).toEqual(state.daily); expect(store.state.reservedRewards).toEqual(state.reservedRewards);
    await Promise.all([store.next(oldBoard.attemptId), store.next(oldBoard.attemptId)]);
    expect(store.state.index).toBe(20); expect(store.board.level.id).toBe('c21'); expect(store.state.wins).toHaveLength(20);
    await store.commitReward(receipt(oldBoard.attemptId, 'lives', 'late-c20'));
    expect(store.state.campaign.continuations).toBe(0); expect(store.state.reservedRewards).toHaveLength(2);
    const restored = new ProgressStore(storage); await restored.load(); expect(restored.state).toEqual(store.state);
  });
  it('preserves a partial catalogue-2 campaign, embedded field, marks, camera, ledger and cadence through catalogue upgrade', async () => {
    const state = seed(5); state.campaign = freshAttempt(legacyCampaign[5] as Level); const board = new Board(state.campaign.level, state.campaign.board.id);
    const blocked = board.remaining.find(a => !canExit(a, board.remaining))!;
    board.activate(blocked.id); board.activate(board.hint()!);
    state.campaign.board = board.snapshot(); state.campaign.started = true;
    state.campaign.view = { centerX: 9, centerY: 14, zoom: 2.3 }; state.campaign.guides = true;
    state.catalogVersion = 2; state.adCadence.activeMs = 123456; state.receipts = ['confirmed-receipt'];
    const decoded = decodeSave(state);
    expect(decoded.campaign).toEqual(state.campaign); expect(decoded.receipts).toEqual(state.receipts);
    expect(decoded.adCadence).toEqual(state.adCadence); expect(decoded.catalogVersion).toBe(3);
    expect(() => decodeSave({ ...state, catalogVersion: 4 })).toThrow('Unsupported save');
    const schema1 = { ...state, schema: 1 }; expect(decodeSave(schema1).campaign).toEqual(state.campaign);
  });
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
    rows.set(SAVE_KEY, JSON.stringify(seed(campaign.length - 1))); const last = new ProgressStore(storage); await last.load(); await solve(last);
    expect(await last.next(last.board.attemptId)).toBeUndefined(); expect(last.state.wins).toHaveLength(campaign.length);
    expect(decodeSave(JSON.parse(rows.get(SAVE_KEY)!)).index).toBe(campaign.length - 1);
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
