import type { GameTheme } from './settings';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
let nativeTheme: GameTheme | undefined;
export const boardPalettes = {
  dark: { arrow: 0xb4bcfa, exit: 0x6767ff, error: 0xff526d, dot: 0x3e425b, guide: 0x41455f },
  light: { arrow: 0x374468, exit: 0x6355d9, error: 0xcd3553, dot: 0xc2cbdc, guide: 0xc0c7db },
} as const;
export function applyTheme(theme: GameTheme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f3f4fa' : '#1e1e2c');
  if (Capacitor.isNativePlatform() && nativeTheme !== theme) {
    nativeTheme = theme;
    void SystemBars.setStyle({ style: theme === 'light' ? SystemBarsStyle.Light : SystemBarsStyle.Dark }).catch(() => { if (nativeTheme === theme) nativeTheme = undefined; });
  }
}
