import { describe, expect, it, vi } from 'vitest';
import type { StorageAdapter } from '@danilah/mini-games-kit/platform';
import { SettingsStore, defaultSettings, SETTINGS_KEY } from '../../src/app/settings';
import { feedbackEligibility } from '../../src/platform/feedback';
import { soundSamples, type SoundCue } from '../../src/platform/sound';

function memory(raw: string | null = null) {
  const writes: string[] = [];
  const storage: StorageAdapter = { getItem: async () => raw, setItem: async (key, value) => { expect(key).toBe(SETTINGS_KEY); writes.push(value); raw = value; }, removeItem: async () => {} };
  return { storage, writes, raw: () => raw };
}
describe('independent preferences', () => {
  it('hydrates saved preferences without touching gameplay or rewriting an old document', async () => {
    const original = JSON.stringify({ ...defaultSettings('en'), theme: 'light', sound: false });
    const m = memory(original), store = new SettingsStore(m.storage, 'ru'); await store.ready;
    expect(store.state).toMatchObject({ theme: 'light', language: 'en', sound: false, vibration: true });
    expect(m.writes).toEqual([]); store.destroy();
  });
  it('merges a late disk read with choices made while preferences are loading', async () => {
    const m = memory(); let resolve!: (value: string) => void;
    m.storage.getItem = () => new Promise(r => { resolve = r; });
    const store = new SettingsStore(m.storage, 'ru'), write = store.update({ theme: 'light' });
    resolve(JSON.stringify({ ...defaultSettings('en'), sound: false })); await write;
    expect(store.state).toMatchObject({ theme: 'light', language: 'en', sound: false });
    expect(JSON.parse(m.writes.at(-1)!)).toEqual(store.state); store.destroy();
  });
  it('keeps a failed choice in the session and retries the latest snapshot in order', async () => {
    const m = memory(); let fail = true;
    const write = m.storage.setItem;
    m.storage.setItem = async (...args) => { if (fail) throw Error('disk full'); await write(...args); };
    const store = new SettingsStore(m.storage, 'ru'); await store.ready;
    expect(await store.update({ sound: false })).toBe(false); expect(store.status).toBe('error'); expect(store.state.sound).toBe(false);
    fail = false; await Promise.all([store.update({ vibration: false }), store.update({ theme: 'light' })]); await store.flush();
    expect(store.status).toBe('saved'); expect(JSON.parse(m.writes.at(-1)!)).toMatchObject({ sound: false, vibration: false, theme: 'light' }); store.destroy();
  });
  it.each(['broken JSON', JSON.stringify({ version: 99 })])('preserves unreadable preferences until an explicit choice: %s', async raw => {
    const m = memory(raw), store = new SettingsStore(m.storage, 'ru'); await store.ready;
    expect(store.status).toBe('error'); expect(m.raw()).toBe(raw); expect(m.writes).toEqual([]); store.destroy();
  });
  it('bounds optional preference hydration and ignores a read arriving after the deadline', async () => {
    vi.useFakeTimers();
    try {
      const m = memory(); let resolve!: (value: string) => void;
      m.storage.getItem = () => new Promise(r => { resolve = r; });
      const store = new SettingsStore(m.storage, 'ru', 100); await vi.advanceTimersByTimeAsync(101); await store.ready;
      await store.update({ theme: 'light' }); resolve(JSON.stringify({ ...defaultSettings('en'), sound: false })); await Promise.resolve();
      expect(store.state).toMatchObject({ theme: 'light', language: 'ru', sound: true }); store.destroy();
    } finally { vi.useRealTimers(); }
  });
});
describe('bounded feedback', () => {
  it('permits menu UI while retaining background/ad blockers in either dismissal order', () => {
    expect(feedbackEligibility(['menu', 'settings'])).toEqual({ gameplay: false, ui: true });
    for (const reasons of [['settings', 'native-background'], ['native-background'], ['dialog', 'ad'], ['ad'], ['window-blur']]) expect(feedbackEligibility(reasons)).toEqual({ gameplay: false, ui: false });
    expect(feedbackEligibility([])).toEqual({ gameplay: true, ui: true });
  });
  it('produces short finite click-free samples with bounded combined amplitude', () => {
    for (const cue of ['button', 'remove', 'error', 'hint', 'life', 'win', 'award'] as SoundCue[]) {
      const samples = soundSamples(cue, 44100);
      expect(samples.length).toBeLessThanOrEqual(44100); expect(samples[0]).toBe(0);
      expect(samples.every(Number.isFinite)).toBe(true); expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(.21);
      expect(Math.abs(samples.at(-1)!)).toBeLessThan(.001);
    }
  });
});
