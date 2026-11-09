import { describe, expect, it, vi } from 'vitest';
import type { AppPlugin, AppState } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { GameplayActivityCoordinator } from '@danilah/mini-games-kit/platform';
import { installNativeLifecycle } from '../../src/app/nativeLifecycle';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function setup() {
  const state = deferred<AppState>();
  const registrations = [deferred<PluginListenerHandle>(), deferred<PluginListenerHandle>()];
  const listeners = new Map<string, (event: AppState) => void>();
  let index = 0;
  const app = {
    addListener(name: string, listener: (event: AppState) => void) {
      listeners.set(name, listener);
      return registrations[index++]!.promise;
    },
    getState: () => state.promise,
  } as unknown as Pick<AppPlugin, 'addListener' | 'getState'>;
  const activity = new GameplayActivityCoordinator(vi.fn(), vi.fn());
  const back = vi.fn();
  const report = vi.fn();
  const dispose = installNativeLifecycle(activity, app, back, report);
  return { state, registrations, listeners, activity, back, report, dispose };
}

describe('native lifecycle integration', () => {
  it('does not let an old state query undo a newer background event', async () => {
    const s = setup();
    s.listeners.get('appStateChange')!({ isActive: false });
    s.state.resolve({ isActive: true });
    await Promise.resolve();
    expect(s.activity.getBlockReasons()).toEqual(['native-background']);
    s.dispose();
  });

  it('a native resume cannot remove an independent visibility/ad blocker', () => {
    const s = setup();
    s.activity.setBlocked('visibility', true);
    s.activity.setBlocked('ad', true);
    s.listeners.get('appStateChange')!({ isActive: false });
    s.listeners.get('appStateChange')!({ isActive: true });
    expect(s.activity.getBlockReasons()).toEqual(['visibility', 'ad']);
    s.dispose();
  });

  it('removes late listener handles and ignores late state/Back after disposal', async () => {
    const s = setup();
    s.dispose();
    s.dispose();
    const remove = vi.fn(async () => undefined);
    for (const registration of s.registrations) registration.resolve({ remove });
    s.state.resolve({ isActive: false });
    s.listeners.get('appStateChange')!({ isActive: false });
    s.listeners.get('backButton')!({ isActive: true });
    await Promise.resolve();
    expect(remove).toHaveBeenCalledTimes(2);
    expect(s.back).not.toHaveBeenCalled();
    expect(s.activity.isBlocked()).toBe(false);
  });

  it('routes root-screen Back without waiting for a state response', () => {
    const s = setup();
    s.listeners.get('backButton')!({ isActive: true });
    expect(s.back).toHaveBeenCalledOnce();
    s.dispose();
  });
});
