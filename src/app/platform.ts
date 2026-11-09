import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { GameplayActivityCoordinator, installDocumentVisibilityBlocker } from '@danilah/mini-games-kit/platform';
import { installNativeLifecycle } from './nativeLifecycle';
import { createAnalytics } from '../platform/analytics';
import { createAds } from '../platform/ads';
import { createHaptics } from '../platform/haptics';
import { createStorage } from '../platform/storage';

export function createPlatformRuntime() {
  // The bootstrap surface is not gameplay. Stage A will own gameplayDesired.
  const activity = new GameplayActivityCoordinator(() => undefined, () => undefined);
  const removeVisibility = installDocumentVisibilityBlocker(activity);
  const native = Capacitor.isNativePlatform();
  const removeNative = native
    ? installNativeLifecycle(activity, App, () => {
      // Only one root screen exists at init. Replace with navigation-stack Back
      // before adding gameplay, dialogs, campaign or Challenge.
      void App.minimizeApp().catch(console.warn);
    })
    : () => undefined;
  const analytics = createAnalytics();
  const ads = createAds(activity, analytics);
  const haptics = createHaptics();
  const storage = createStorage();
  haptics.setBlocked(activity.isBlocked());
  const removeFeedbackBlocker = activity.onBlockedChange((blocked) => haptics.setBlocked(blocked));
  return {
    activity,
    analytics, ads, haptics, storage,
    kind: native ? 'android' : 'browser',
    destroy() {
      ads.destroy();
      analytics.destroy();
      removeFeedbackBlocker();
      haptics.destroy();
      removeVisibility();
      removeNative();
      activity.setGameplayDesired(false);
    },
  };
}
