import Phaser from 'phaser';
import { getBackingStoreSize, getRenderPixelRatio } from '@danilah/mini-games-kit/core';
import { destroyRenderer } from '@danilah/mini-games-kit/phaser';
import { createStartupPreloadDomView, StartupPreloadController } from '@danilah/mini-games-kit/startup';
import './style.css';
import { copy, normalizeGameLanguage } from './app/language';
import { createPlatformRuntime } from './app/platform';
import { getStartupSnapshot, startupTimeline } from './app/startup';
import { getInitialGameSize, installViewportRuntime } from './app/viewport';
import { BootstrapScene, GAME_PRESENTABLE_EVENT } from './game/BootstrapScene';

const language = normalizeGameLanguage(navigator.language);
const text = copy[language];
document.documentElement.lang = language;
document.title = text.title;
document.querySelector('#app-title')!.textContent = text.title;
document.querySelector('#app-status')!.textContent = text.status;

let alive = true;
let ready = false;
let firstFrame = false;
let reportReady: (() => void) | undefined;
const disposers: Array<() => void> = [];
const releaseResources = (): void => {
  for (const dispose of disposers.reverse()) {
    try { dispose(); } catch (error) { console.warn('Cleanup failed', error); }
  }
  disposers.length = 0;
};
const shell = document.querySelector<HTMLElement>('#game-shell')!;
const domView = createStartupPreloadDomView();
const preload = new StartupPreloadController({
  render(snapshot) {
    domView.render(snapshot);
    if (snapshot.phase !== 'hidden' || !firstFrame) return;
    // Publish readiness after the uncovered surface crosses a paint boundary.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!alive || ready) return;
      ready = true;
      startupTimeline.mark('ready');
      shell.dataset.status = 'ready';
      document.dispatchEvent(new Event('arrows:ready'));
      reportReady?.();
    }));
  },
}, { copy: { heading: text.loading, status: text.preparing, failedHeading: text.failed, failedStatus: text.retry } });
preload.begin();
const cleanup = (): void => {
  if (!alive) return;
  alive = false;
  releaseResources();
  preload.destroy();
};

try {
  const platform = createPlatformRuntime();
  reportReady = () => platform.analytics.track('app_ready', { language });
  disposers.push(() => platform.destroy());
  startupTimeline.mark('platformReady');
  const size = getInitialGameSize();
  const ratio = getRenderPixelRatio(2);
  const backing = getBackingStoreSize(size.width, size.height, ratio);
  let renderQueued = false;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-root',
    width: backing.width, height: backing.height,
    backgroundColor: '#1e1e2c',
    scene: [BootstrapScene],
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / ratio },
    callbacks: {
      preBoot(bootingGame) {
        bootingGame.events.once(GAME_PRESENTABLE_EVENT, () => {
          bootingGame.events.once(Phaser.Core.Events.POST_RENDER, () => {
            firstFrame = true;
            startupTimeline.mark('gamePresentable');
            shell.dataset.scene = 'bootstrap';
            preload.complete();
            bootingGame.loop.sleep();
          });
        });
      },
    },
  });
  disposers.push(() => destroyRenderer(game));

  // This scene has no animation. Stage A must wake while motion is active and
  // sleep only after its final frame, preserving this dirty-paint boundary.
  const requestRender = (): void => {
    if (!alive || !firstFrame || platform.activity.isBlocked()) return;
    if (!renderQueued) {
      renderQueued = true;
      game.events.once(Phaser.Core.Events.POST_RENDER, () => {
        renderQueued = false;
        game.loop.sleep();
      });
    }
    game.loop.wake();
  };
  const applyBlocked = (blocked: boolean): void => {
    if (!game.isBooted) return;
    game.sound.mute = blocked;
    game.input.enabled = !blocked;
    if (!firstFrame) return;
    if (blocked) game.loop.sleep();
    else requestRender();
  };
  const removeBlocked = platform.activity.onBlockedChange(applyBlocked);
  disposers.push(removeBlocked);
  game.events.once(Phaser.Core.Events.READY, () => applyBlocked(platform.activity.isBlocked()));
  const viewport = installViewportRuntime(game, requestRender);
  disposers.push(() => viewport.destroy());
  if (import.meta.env.DEV) {
    void import('./app/debug').then(({ installDebugPanel }) => {
      if (!alive) return;
      const debug = installDebugPanel(() => ({ platform: platform.kind, timings: getStartupSnapshot() }));
      disposers.push(() => debug.destroy());
    });
  }
  const restore = (): void => requestRender();
  const pageHide = (event: PageTransitionEvent): void => {
    if (!event.persisted) cleanup();
  };
  window.addEventListener('pageshow', restore);
  window.addEventListener('pagehide', pageHide);
  disposers.push(() => {
    window.removeEventListener('pageshow', restore);
    window.removeEventListener('pagehide', pageHide);
  });
  import.meta.hot?.dispose(() => cleanup());
} catch (error: unknown) {
  alive = false;
  releaseResources();
  shell.dataset.status = 'failed';
  preload.fail(error instanceof Error ? error.message : String(error));
  console.error('Arrows startup failed', error);
}
