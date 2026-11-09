import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.danilah.arrows',
  appName: 'Стрелки',
  webDir: 'dist',
  backgroundColor: '#1e1e2c',
  android: { path: 'native/android' },
  plugins: { SystemBars: { style: 'DARK', insetsHandling: 'css', initialViewportFitValueHint: 'cover' } },
};

export default config;
