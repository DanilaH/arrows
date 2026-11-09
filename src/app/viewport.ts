import { BrowserViewportWatcher, resolveViewportState } from '@danilah/mini-games-kit/layout';
import { getBackingStoreSize, getRenderPixelRatio } from '@danilah/mini-games-kit/core';
import type Phaser from 'phaser';

export function getInitialGameSize() {
  const visual = window.visualViewport;
  return resolveViewportState(
    visual ? { width: visual.width, height: visual.height } : null,
    { width: window.innerWidth, height: window.innerHeight },
    { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
    window.matchMedia('(orientation: portrait)').matches,
  );
}

/** Portrait-first; short landscape remains usable instead of covering the scene. */
export function installViewportRuntime(game: Phaser.Game, requestRender: () => void) {
  const watcher = new BrowserViewportWatcher({
    onApply(viewport, context) {
      const width = Math.max(1, Math.round(viewport.width));
      const height = Math.max(1, Math.round(viewport.height));
      const ratio = getRenderPixelRatio(2);
      const backing = getBackingStoreSize(width, height, ratio);
      const densityChanged = game.scale.zoom !== 1 / ratio;
      if (densityChanged) game.scale.setZoom(1 / ratio);
      if (context.changed || densityChanged) game.scale.resize(backing.width, backing.height);
      game.scale.refresh();
      // A watchdog on identical geometry must not restart an idle render loop.
      if (context.changed || densityChanged || context.reason === 'event') requestRender();
    },
  });
  watcher.start();
  return { destroy: () => watcher.destroy() };
}
