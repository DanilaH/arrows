import fixtures from './controlScenes.json' with { type: 'json' };
import type { Level } from '../domain/board';

/** Fixed own control fixtures, generated offline; see tools/content/control-scene-source.ts. */
export const controlScenes = fixtures as readonly Level[];
export const controlSceneStats = controlScenes.map(level => ({
  id: level.id, arrows: level.arrows.length, segments: level.arrows.reduce((sum, arrow) => sum + arrow.path.length - 1, 0), dots: level.mask.length,
}));
