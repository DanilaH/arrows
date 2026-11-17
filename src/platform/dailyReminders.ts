import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { ProgressStore } from '../progression/save';
import { reminderProjection } from '../progression/dailyEntry';

export interface ReminderStatus { enabled: boolean; allowed: boolean; offered: boolean; time: string; pending: string }
export interface DailyReminderBridge {
  status(): Promise<ReminderStatus>;
  sync(options: { language: string; snapshot: (NonNullable<ReturnType<typeof reminderProjection>> & { rootHash: string }) | null }): Promise<ReminderStatus>;
  configure(options: { enabled?: boolean; time?: string }): Promise<ReminderStatus>;
  markOffered(): Promise<ReminderStatus>;
  request(): Promise<ReminderStatus>;
  openSettings(): Promise<void>;
  consume(options: { nonce: string }): Promise<ReminderStatus>;
  addListener(name: 'dailyEntry', listener: () => void): Promise<PluginListenerHandle>;
}
/** Optional service. Progress stays authoritative even when permission, disk or scheduling fails. */
export function createDailyReminders(progress: ProgressStore, language: () => string, changed: () => void, enabled: boolean, bridge?: DailyReminderBridge) {
  const native = enabled ? bridge ?? registerPlugin<DailyReminderBridge>('ArrowsDaily') : null;
  let alive = true, state: ReminderStatus | null = null, error = false, busy = false;
  let listener: PluginListenerHandle | undefined, publishing = false;
  let queued: { raw: string; snapshot: NonNullable<ReturnType<typeof reminderProjection>>; language: string } | null = null;
  const accepted = (value: ReminderStatus): void => { if (alive) { const activated=value.enabled&&!state?.enabled;state = value; error = false; if(activated)sync();changed(); } };
  const action = async (work: () => Promise<ReminderStatus>): Promise<void> => {
    if (!native || busy || !alive) return;
    busy = true; changed();
    try { accepted(await work()); } catch { if (alive) error = true; }
    finally { busy = false; if (alive) changed(); }
  };
  const refresh = async (): Promise<void> => { if (native && alive) try { accepted(await native.status()); } catch { if (alive) { error = true; changed(); } } };
  const publish = async (): Promise<void> => {
    if (!native || publishing) return; publishing = true;
    try { while (queued && alive) {
      const item = queued; queued = null;
      try {
        const bytes = new TextEncoder().encode(item.raw), hash = await crypto.subtle.digest('SHA-256', bytes);
        if (!alive) return;
        // A newer committed root supersedes this projection before bridge delivery.
        if (queued) continue;
        const rootHash = [...new Uint8Array(hash)].map(v => v.toString(16).padStart(2, '0')).join('');
        accepted(await native.sync({ language: item.language, snapshot: { ...item.snapshot, rootHash } }));
      } catch { /* A concurrent durable write safely rejects an old projection. Next commit/resume retries. */ }
    } } finally { publishing = false; }
  };
  const sync = (): void => {
    if (!native || !alive || !state?.enabled) return;
    // Capture proof and state together BEFORE hashing/awaiting; never pair a new root with old wins.
    const raw = progress.durableWitness, snapshot = reminderProjection(progress.state);
    if (typeof raw !== 'string' || !snapshot) { queued = null; void native.sync({ language: language(), snapshot: null }).then(accepted).catch(() => {}); return; }
    queued = { raw, snapshot, language: language() }; void publish();
  };
  const resume = (): void => { if (!document.hidden) { sync(); void refresh(); } };
  const unsubscribe = native ? progress.subscribe(sync) : () => {};
  if (native) {
    void native.addListener('dailyEntry', () => { void refresh(); }).then(handle => { if (alive) listener = handle; else void handle.remove(); }).catch(() => {});
    window.addEventListener('focus', resume); document.addEventListener('visibilitychange', resume); void refresh();
  }
  return {
    get available() { return !!native; }, get state() { return state; }, get error() { return error; }, get busy() { return busy; }, sync, refresh,
    enable(): Promise<void> { return action(async () => { await native!.request(); return native!.configure({ enabled: true }); }); },
    configure(options: { enabled?: boolean; time?: string }): Promise<void> { return action(() => native!.configure(options)); },
    offered(): void { if (native) void native.markOffered().then(accepted).catch(() => {}); },
    consume(nonce: string): Promise<void> { return action(() => native!.consume({ nonce })); },
    async openSettings(): Promise<void> { if (native) try { await native.openSettings(); } catch { error = true; changed(); } },
    destroy(): void { alive = false; queued = null; unsubscribe(); void listener?.remove(); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); },
  };
}
export type DailyReminders = ReturnType<typeof createDailyReminders>;
