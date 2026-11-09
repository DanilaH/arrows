import { Capacitor, registerPlugin } from '@capacitor/core';
import type { StorageAdapter } from '@danilah/mini-games-kit/platform';

export interface StorageBridge {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
}
export function createStorage(bridge?: StorageBridge): StorageAdapter {
  if (!bridge && !Capacitor.isNativePlatform()) return {
    async getItem(key) { return window.localStorage.getItem(key); },
    async setItem(key, value) { window.localStorage.setItem(key, value); },
    async removeItem(key) { window.localStorage.removeItem(key); },
  };
  const native = bridge ?? registerPlugin<StorageBridge>('ArrowsStorage');
  return {
    async getItem(key) { return (await native.get({ key })).value; },
    async setItem(key, value) { await native.set({ key, value }); },
    async removeItem(key) { await native.remove({ key }); },
  };
}
