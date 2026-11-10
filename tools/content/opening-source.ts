import { hand } from './control-scene-source';
import { shape } from './silhouettes';
import { campaignField } from './campaign-generator';
import { analyzeCampaignLevel } from './campaign-analysis';
import { validateLevel, type Level } from '../../src/domain/board';

type Path = readonly (readonly [number, number])[];
const a: Path = [[1, 2], [1, 1], [5, 1], [5, 3], [3, 3]];
const b: Path = [[6, 2], [6, 4], [1, 4], [1, 3], [0, 3]];
const c: Path = [[4, 5], [2, 5], [2, 7], [6, 7], [6, 6]];
const d: Path = [[4, 8], [1, 8], [1, 10], [7, 10], [7, 5]];
const e: Path = [[7, 3], [9, 3], [9, 0], [0, 0]];
const f: Path = [[0, 7], [0, 11], [8, 11], [8, 5], [9, 5]];
const woven = (id: string, width: number, height: number, paths: readonly Path[]): Level => ({ ...hand(id, paths), contentVersion: 2, width, height });
const first = [
  woven('c01', 8, 9, [b, a, c]),
  woven('c02', 9, 12, [b, a, c, d].map(path => path.map(([x, y]) => [7 - x, y] as const))),
  woven('c03', 11, 13, [b, a, c, d, e, f]),
  woven('c04', 13, 11, [b, a, c, d, e, f].map(path => path.map(([x, y]) => [11 - y, x] as const))),
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
