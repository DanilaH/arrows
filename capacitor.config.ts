import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.danilah.arrows',
  appName: 'Стрелки',
  webDir: 'dist',
  backgroundColor: '#1e1e2c',
  android: { path: 'native/android' },
};

export default config;
