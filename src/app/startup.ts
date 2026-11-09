import { StartupTimeline } from '@danilah/mini-games-kit/startup';

export const startupTimeline = new StartupTimeline<'platformReady' | 'gamePresentable' | 'ready'>();
export const isDebugBuild = (): boolean => import.meta.env.DEV;
export const getStartupSnapshot = () => startupTimeline.snapshot({
  moduleToPlatformMs: ['start', 'platformReady'],
  moduleToPresentableMs: ['start', 'gamePresentable'],
  moduleToReadyMs: ['start', 'ready'],
});
