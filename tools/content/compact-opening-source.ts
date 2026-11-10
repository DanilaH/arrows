import { hand } from './control-scene-source';
import type { Level } from '../../src/domain/board';

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
export const compactOpening = [
  tile('c01', 6, 6, small),
  tile('c02', 8, 8, medium.map(path => path.map(([x, y]) => [7 - x, y] as const))),
  tile('c03', 10, 12, tall),
  tile('c04', 12, 10, tall.map(path => path.map(([x, y]) => [11 - y, x] as const))),
];
