import { kinds, shape } from './silhouettes';
import { campaignExpansion } from './campaign-expansion-source';
export { expansionReport } from './campaign-expansion-source';
import { hand, silhouette } from './control-scene-source';
import { validateLevel, type Level } from '../../src/domain/board';

const first: Level[] = [
  hand('c01', [[[2, 3], [6, 3]], [[3, 7], [3, 5]], [[6, 11], [6, 8]]]),
  hand('c02', [[[1, 4], [1, 2], [5, 2]], [[7, 4], [7, 0]], [[2, 7], [5, 7], [5, 5]], [[1, 11], [6, 11]]]),
  hand('c03', [[[1, 2], [4, 2]], [[6, 5], [6, 0]], [[5, 6], [1, 6]], [[3, 10], [3, 8]], [[1, 12], [6, 12]], [[8, 11], [8, 7]]]),
  hand('c04', [[[1, 3], [1, 1], [5, 1]], [[7, 4], [7, 0]], [[5, 6], [2, 6], [2, 4]], [[4, 9], [7, 9], [7, 6]], [[1, 10], [1, 12], [6, 12]], [[8, 11], [8, 7]]]),
];
export const campaign: readonly Level[] = [...first, ...Array.from({ length: 16 }, (_, offset) => {
  const number = offset + 5, hard = number === 6 || number === 12 || number === 18, nightmare = number === 20;
  const kind = number === 6 ? 'flower' : nightmare ? 'butterfly' : kinds[(number + 3) % kinds.length]!;
  const width = nightmare ? 47 : hard ? 29 : 13 + Math.floor((number - 5) / 4) * 2;
  const height = nightmare ? 55 : width + 4;
  return silhouette(`c${String(number).padStart(2, '0')}`, width, height, 53117 + number * 97, shape(kind, width, height), nightmare ? 'nightmare' : hard ? 'hard' : 'normal');
}), ...campaignExpansion];
for (const level of campaign) validateLevel(level);
