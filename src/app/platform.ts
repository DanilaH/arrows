import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { GameplayActivityCoordinator, installDocumentVisibilityBlocker } from '@danilah/mini-games-kit/platform';
import { installNativeLifecycle } from './nativeLifecycle';
import { createAnalytics } from '../platform/analytics';
import { createAds } from '../platform/ads';
import { createFeedback } from '../platform/feedback';
import { SettingsStore } from './settings';
import { createStorage } from '../platform/storage';

export function createPlatformRuntime(onBack: () => boolean = () => false) {
  // The bootstrap surface is not gameplay. Stage A will own gameplayDesired.
  const activity = new GameplayActivityCoordinator(() => undefined, () => undefined);
  const removeVisibility = installDocumentVisibilityBlocker(activity);
  const native = Capacitor.isNativePlatform();
  const removeNative = native
    ? installNativeLifecycle(activity, App, () => {
      if (!onBack()) void App.minimizeApp().catch(console.warn);
    })
    : () => undefined;
  const analytics = createAnalytics();
  const ads = createAds(activity, analytics);
  const flushAnalytics = (): void => analytics.flush(); window.addEventListener('pagehide', flushAnalytics);
  const storage = createStorage();
  const settings = new SettingsStore(storage, navigator.language);
  const feedback = createFeedback(activity, settings);
  const blur = (): void => activity.setBlocked('window-blur', true), focus = (): void => activity.setBlocked('window-blur', false);
  if (!native) { window.addEventListener('blur', blur); window.addEventListener('focus', focus); }
  return {
    activity,
    analytics, ads, feedback, storage, settings,
    kind: native ? 'android' : 'browser',
    destroy() {
      window.removeEventListener('pagehide', flushAnalytics);
      ads.destroy();
      analytics.destroy();
      if (!native) { window.removeEventListener('blur', blur); window.removeEventListener('focus', focus); }
      feedback.destroy(); settings.destroy();
      removeVisibility();
      removeNative();
      activity.setGameplayDesired(false);
    },
  };
}
