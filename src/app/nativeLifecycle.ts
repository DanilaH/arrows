import type { AppPlugin } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import type { GameplayActivityCoordinator } from '@danilah/mini-games-kit/platform';

/** Installs immediately; asynchronous native registration never owns first paint. */
export function installNativeLifecycle(
  activity: Pick<GameplayActivityCoordinator, 'setBlocked'>,
  app: Pick<AppPlugin, 'addListener' | 'getState'>,
  onBack: () => void,
  report: (error: unknown) => void = console.warn,
): () => void {
  let disposed = false;
  let stateEvents = 0;
  const handles = new Set<PluginListenerHandle>();
  const remove = (handle: PluginListenerHandle): void => {
    void handle.remove().catch(report);
  };
  const retain = (pending: Promise<PluginListenerHandle>): void => {
    void pending.then((handle) => {
      if (disposed) remove(handle);
      else handles.add(handle);
    }).catch(report);
  };

  retain(app.addListener('appStateChange', ({ isActive }) => {
    if (disposed) return;
    stateEvents += 1;
    activity.setBlocked('native-background', !isActive);
  }));
  retain(app.addListener('backButton', () => {
    if (!disposed) onBack();
  }));
  const stateRevision = stateEvents;
  void app.getState().then(({ isActive }) => {
    // An older getState response must not undo a newer native pause event.
    if (!disposed && stateEvents === stateRevision) {
      activity.setBlocked('native-background', !isActive);
    }
  }).catch(report);

  return () => {
    if (disposed) return;
    disposed = true;
    for (const handle of handles) remove(handle);
    handles.clear();
    activity.setBlocked('native-background', false);
  };
}
