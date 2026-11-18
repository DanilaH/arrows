import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.danilah.arrows',
  appName: 'Стрелки',
  webDir: 'dist',
  backgroundColor: '#f3f4fa',
  android: { path: 'native/android', webContentsDebuggingEnabled: false },
  loggingBehavior: 'debug',
  plugins: { SystemBars: { style: 'LIGHT', insetsHandling: 'css', initialViewportFitValueHint: 'cover' } },
};

export default config;
