import { JsonStorageRepository, type StorageAdapter } from '@danilah/mini-games-kit/platform';
import { normalizeGameLanguage, type GameLanguage } from './language';

export const SETTINGS_KEY = 'arrows.settings.v1';
export type GameTheme = 'dark' | 'light';
export interface GameSettings { version: 1; theme: GameTheme; language: GameLanguage; sound: boolean; vibration: boolean; }
export type SettingsStatus = 'loading' | 'saved' | 'saving' | 'error';
type Preferences = Omit<GameSettings, 'version'>;
export const defaultSettings = (language?: string): GameSettings => ({ version: 1, theme: 'dark', language: normalizeGameLanguage(language), sound: true, vibration: true });
export function decodeSettings(value: unknown): GameSettings {
  const s = value as GameSettings | null;
  if (!s || s.version !== 1 || !['dark', 'light'].includes(s.theme) || !['ru', 'en'].includes(s.language) || typeof s.sound !== 'boolean' || typeof s.vibration !== 'boolean') throw Error('Unsupported preferences');
  return { version: 1, theme: s.theme, language: s.language, sound: s.sound, vibration: s.vibration };
}

/** Separate, noncritical preferences. Late hydration never overwrites a user choice. */
export class SettingsStore {
  private current: Readonly<GameSettings>;
  private readonly repository: JsonStorageRepository<GameSettings>;
  private readonly touched = new Set<keyof Preferences>();
  private readonly listeners = new Set<() => void>();
  private revision = 0;
  private disposed = false;
  private finishLoad: (() => void) | undefined;
  public status: SettingsStatus = 'loading';
  public readonly ready: Promise<void>;
  public constructor(storage: StorageAdapter, language?: string, deadlineMs = 1500) {
    const defaults = defaultSettings(language); this.current = Object.freeze(defaults);
    this.repository = new JsonStorageRepository({ storage, key: SETTINGS_KEY, createDefault: () => ({ ...defaults }), codec: { decode: decodeSettings, encode: s => s } });
    this.ready = new Promise(resolve => {
      let finished = false;
      const finish = (saved?: GameSettings): void => {
        if (finished) return; finished = true; clearTimeout(timer); this.finishLoad = undefined;
        if (saved) {
          const merged = { ...saved }; for (const key of this.touched) Object.assign(merged, { [key]: this.current[key] });
          this.current = Object.freeze(merged);
        }
        if (!this.revision) this.status = saved ? 'saved' : 'error';
        this.emit(); resolve();
      };
      const timer = setTimeout(() => finish(), deadlineMs);
      this.finishLoad = () => finish();
      void this.repository.load().then(s => finish(s), () => finish());
    });
  }
  public get state(): Readonly<GameSettings> { return this.current; }
  public subscribe(listener: () => void): () => void { this.listeners.add(listener); listener(); return () => this.listeners.delete(listener); }
  private emit(): void { if (!this.disposed) for (const listener of this.listeners) listener(); }
  public update(patch: Partial<Preferences>): Promise<boolean> {
    if (this.disposed) return Promise.resolve(false);
    const next = decodeSettings({ ...this.current, ...patch });
    for (const key of Object.keys(patch) as (keyof Preferences)[]) this.touched.add(key);
    this.current = Object.freeze(next); return this.save();
  }
  public async save(): Promise<boolean> {
    if (this.disposed) return false;
    const revision = ++this.revision; this.status = 'saving'; this.emit();
    await this.ready;
    try { await this.repository.write({ ...this.current }); if (revision === this.revision) { this.status = 'saved'; this.emit(); } return true; }
    catch { if (revision === this.revision) { this.status = 'error'; this.emit(); } return false; }
  }
  public async flush(): Promise<void> { await this.ready; await this.repository.flush(); }
  public destroy(): void { this.disposed = true; this.finishLoad?.(); this.listeners.clear(); }
}
