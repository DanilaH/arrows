import type { analyzeCampaignLevel } from './campaign-analysis';
import type { Pace } from './campaign-shapes';
type Metrics = ReturnType<typeof analyzeCampaignLevel>;
export function qualityProblems(pace: Pace, metrics: Metrics): string[] {
  const limits = pace === 'breather' ? { free: .65, early: .65, peak: 1, depth: 2, bends: 2, straight: .45 }
    : pace === 'normal' ? { free: .5, early: .5, peak: .85, depth: 4, bends: 2.5, straight: .35 }
    : pace === 'hard' ? { free: .3, early: .3, peak: .5, depth: 10, bends: 3, straight: .28 }
    : { free: .2, early: .2, peak: .45, depth: 18, bends: 3.2, straight: .25 };
  return [metrics.coverage < .98 && 'coverage', metrics.largestHole > 3 && 'hole', metrics.initialFreeFraction > limits.free && 'initial free',
    metrics.meanEarlyFreeFraction > limits.early && 'early frontier', metrics.peakEarlyFreeFraction > limits.peak && 'peak frontier',
    metrics.depth < limits.depth && 'depth', metrics.meanBends < limits.bends && 'bends', metrics.straightFraction > limits.straight && 'straights'].filter((v): v is string => !!v);
}
