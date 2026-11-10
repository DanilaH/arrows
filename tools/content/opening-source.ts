import { hand } from './control-scene-source';
import { shape } from './silhouettes';
import { campaignField } from './campaign-generator';
import { analyzeCampaignLevel } from './campaign-analysis';
import { validateLevel, type Level } from '../../src/domain/board';

type Path = readonly (readonly [number, number])[];
// Own compact tiles, informed by the reference's spacing rather than recovered coordinates.
// Adjacent paths share a one-cell gap and occupy the whole small rectangle.
const small: readonly Path[] = [
  [[0, 0], [5, 0], [5, 5], [0, 5]],
  [[1, 4], [4, 4], [4, 1], [0, 1], [0, 4]],
  [[2, 3], [3, 3], [3, 2], [1, 2], [1, 3]],
];
const medium: readonly Path[] = [
  [[0, 0], [7, 0], [7, 7], [0, 7]],
  [[1, 6], [6, 6], [6, 1], [0, 1], [0, 6]],
  [[1, 4], [1, 2], [5, 2], [5, 5], [1, 5]],
  [[2, 3], [4, 3], [4, 4], [2, 4]],
];
const tall: readonly Path[] = [
  [[0, 0], [9, 0], [9, 11], [0, 11]],
  [[1, 10], [8, 10], [8, 1], [0, 1], [0, 10]],
  [[1, 8], [1, 2], [7, 2], [7, 9], [1, 9]],
  [[2, 7], [2, 3], [6, 3], [6, 8], [2, 8]],
  [[3, 4], [5, 4], [5, 5], [3, 5]],
  [[3, 6], [5, 6], [5, 7], [3, 7]],
];
const tile = (id: string, width: number, height: number, paths: readonly Path[]): Level => ({ ...hand(id, paths), contentVersion: 3, width, height });
const first = [
  tile('c01', 6, 6, small),
  tile('c02', 8, 8, medium.map(path => path.map(([x, y]) => [7 - x, y] as const))),
  tile('c03', 10, 12, tall),
  tile('c04', 12, 10, tall.map(path => path.map(([x, y]) => [11 - y, x] as const))),
];
const families = ['ring', 'flower', 'heart', 'star', 'leaf', 'cross', 'diamond', 'butterfly'] as const;
export const openingReport: object[] = [];
export const campaignOpening: readonly Level[] = [...first, ...Array.from({ length: 16 }, (_, offset) => {
  const number = offset + 5, hard = [6, 12, 18].includes(number), nightmare = number === 20;
  const kind = number === 6 ? 'flower' : nightmare ? 'butterfly' : families[(number + 2) % families.length]!;
  const width = nightmare ? 47 : hard ? 29 : 15 + Math.floor((number - 5) / 4) * 2;
  const height = nightmare ? 55 : width + 4, difficulty = nightmare ? 'nightmare' : hard ? 'hard' : 'normal';
  const candidates = Array.from({ length: 8 }, (_, i) => {
    const seed = 720211 + number * 997 + i * 7919;
    const level = { ...campaignField(`c${String(number).padStart(2, '0')}`, width, height, seed, shape(kind, width, height), difficulty), contentVersion: 2 };
    validateLevel(level); const metrics = analyzeCampaignLevel(level);
    const score = metrics.coverage * 10 + metrics.meanBends * 2 + Math.min(metrics.depth, nightmare ? 10 : hard ? 7 : 5) - metrics.initialFree / metrics.arrows;
    return { level, metrics, seed, score };
  }).sort((a, b) => b.score - a.score);
  const selected = candidates[0]!; openingReport.push({ number, kind, seed: selected.seed, metrics: selected.metrics }); return selected.level;
})];
for (const level of campaignOpening) { try { validateLevel(level); } catch (error) { throw Error(`${level.id}: ${String(error)}`); } }
