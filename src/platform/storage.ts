import { Capacitor, registerPlugin } from '@capacitor/core';
import type { StorageAdapter } from '@danilah/mini-games-kit/platform';
import {archiveDb} from './archiveDb';

export interface StorageBridge {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
  list?(options:{prefix:string}):Promise<{keys:string[]}>;
}
export function createStorage(bridge?: StorageBridge): StorageAdapter&{listKeys(prefix:string):Promise<string[]>} {
  if (!bridge && !Capacitor.isNativePlatform()) return {
    async getItem(key) { return key.startsWith('arrows.archive.')?archiveDb.get(key):window.localStorage.getItem(key); },
    async setItem(key, value) { if(key.startsWith('arrows.archive.'))await archiveDb.set(key,value);else window.localStorage.setItem(key, value); },
    async removeItem(key) { if(key.startsWith('arrows.archive.'))await archiveDb.remove(key);else window.localStorage.removeItem(key); },
    listKeys:prefix=>archiveDb.keys(prefix),
  };
  const native = bridge ?? registerPlugin<StorageBridge>('ArrowsStorage');
  return {
    async getItem(key) { return (await native.get({ key })).value; },
    async setItem(key, value) { await native.set({ key, value }); },
    async removeItem(key) { await native.remove({ key }); },
    async listKeys(prefix){return native.list?(await native.list({prefix})).keys:[];},
  };
}
