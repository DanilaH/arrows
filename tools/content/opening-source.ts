import { shape } from './silhouettes';
import { campaignField } from './campaign-generator';
import { analyzeCampaignLevel } from './campaign-analysis';
import { validateLevel, type Level } from '../../src/domain/board';

import { compactOpening } from './compact-opening-source';
const families = ['ring', 'flower', 'heart', 'star', 'leaf', 'cross', 'diamond', 'butterfly'] as const;
export const openingReport: object[] = [];
export const campaignOpening: readonly Level[] = [...compactOpening, ...Array.from({ length: 16 }, (_, offset) => {
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
