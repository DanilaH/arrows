import { qualityProblems } from './dense-quality';
import { denseCampaignField } from './dense-campaign-generator';
import { compactOpening } from './compact-opening-source';
import { campaignFamilies, campaignPacing, campaignMask, type Family, type Pace } from './campaign-shapes';
import { shape } from './silhouettes';
import { analyzeCampaignLevel } from './campaign-analysis';
import { validateLevel, type Level } from '../../src/domain/board';

const openingKinds = ['ring', 'flower', 'heart', 'star', 'leaf', 'cross', 'diamond', 'butterfly'] as const;
type Metrics = ReturnType<typeof analyzeCampaignLevel>;
export const denseReport: { number: number; family: Family; pace: Pace; seed: number; candidates: number; metrics: Metrics }[] = [];
export const campaignV4: readonly Level[] = [...compactOpening, ...Array.from({ length: 116 }, (_, i) => {
  const number = i + 5, early = number <= 20, index = number - 21, arc = Math.floor(index / 10);
  const pace: Pace = early ? number === 20 ? 'nightmare' : [6, 12, 18].includes(number) ? 'hard' : 'normal' : campaignPacing[index % 10]!;
  const family: Family = early ? number === 6 ? 'flower' : number === 20 ? 'butterfly' : openingKinds[(number + 2) % openingKinds.length]! : campaignFamilies[((index % 20) * 7 + Math.floor(index / 20) * 3) % campaignFamilies.length]!;
  const width = early ? number === 20 ? 47 : pace === 'hard' ? 29 : 15 + Math.floor((number - 5) / 4) * 2
    : pace === 'breather' ? 17 + arc % 3 * 2 : pace === 'normal' ? 25 + arc % 4 * 2 : pace === 'hard' ? 35 + arc % 3 * 2 : 47 + arc % 3 * 2;
  const height = number === 20 ? 55 : width + 4, difficulty = pace === 'breather' ? 'normal' : pace;
  const inside = early ? shape(family as Parameters<typeof shape>[0], width, height) : campaignMask(family, width, height);
  const candidates: { level: Level; seed: number; metrics: Metrics; score: number }[] = [], rejected: string[][] = [];
  let tries = 0;
  for (let candidate = 0; candidate < 24; candidate++) {
    tries++; const seed = 19062027 + number * 10007 + candidate * 7919;
    const level = denseCampaignField(`c${String(number).padStart(2, '0')}`, width, height, seed, inside, difficulty, pace === 'breather' ? .35 : pace === 'normal' ? .25 : pace === 'hard' ? .12 : .08);
    validateLevel(level); const metrics = analyzeCampaignLevel(level), problems = qualityProblems(pace, metrics); rejected.push(problems);
    if (!problems.length) {
      const desiredDepth = pace === 'breather' ? 4 : pace === 'normal' ? early ? 6 : 11 : pace === 'hard' ? 17 : 28;
      const score = metrics.coverage * 12 + metrics.meanBends - metrics.meanEarlyFreeFraction * 14 - metrics.straightFraction * 4 - Math.abs(metrics.depth - desiredDepth) * .15;
      candidates.push({ level, metrics, seed, score });
    }
    if (candidates.length >= 4) break;
  }
  if (!candidates.length) throw Error(`c${number} ${family} ${pace}: no qualified candidate ${JSON.stringify(rejected)}`);
  candidates.sort((a, b) => b.score - a.score); const chosen = candidates[0]!;
  denseReport.push({ number, family, pace, seed: chosen.seed, candidates: tries, metrics: chosen.metrics });
  console.info(`Dense c${number}: ${family} ${pace}, ${chosen.metrics.arrows} arrows, ${(chosen.metrics.coverage*100).toFixed(1)}% fill, ${(chosen.metrics.initialFreeFraction*100).toFixed(1)}% free, depth ${chosen.metrics.depth}`);
  return chosen.level;
})];
