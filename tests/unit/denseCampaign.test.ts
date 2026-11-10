import { describe, expect, it } from 'vitest';
import { campaign } from '../../src/content/campaign';
import { validateLevel } from '../../src/domain/board';
import { analyzeCampaignLevel } from '../../tools/content/campaign-analysis';
import { denseCampaignField } from '../../tools/content/dense-campaign-generator';
import { qualityProblems } from '../../tools/content/dense-quality';
import { shape } from '../../tools/content/silhouettes';
import type { Pace } from '../../tools/content/campaign-shapes';
import selected from '../../docs/verification/CAMPAIGN_SELECTION_V4.json';
import previous from '../fixtures/campaign-pre-dense.json';
import type { Level } from '../../src/domain/board';

describe('dense campaign quality contract', () => {
  it('fills all 116 rebuilt silhouettes and checks freedom throughout the first half of solving', () => {
    expect(selected.levels).toHaveLength(116);
    for (const row of selected.levels) {
      const level = campaign[row.number - 1]!, m = analyzeCampaignLevel(level);
      expect(m, level.id).toEqual(row.metrics); expect(m.coverage, level.id).toBeGreaterThanOrEqual(.98); expect(m.largestHole, level.id).toBeLessThanOrEqual(3);
      expect(qualityProblems(row.pace as Pace, m), level.id).toEqual([]);
      if (level.difficulty === 'hard' || level.difficulty === 'nightmare') {
        const nightmare = level.difficulty === 'nightmare';
        expect(m.initialFreeFraction, level.id).toBeLessThanOrEqual(nightmare ? .2 : .3);
        expect(m.meanEarlyFreeFraction, level.id).toBeLessThanOrEqual(nightmare ? .2 : .3);
        expect(m.depth, level.id).toBeGreaterThanOrEqual(nightmare ? 18 : 10);
      }
    }
    expect(new Set(selected.levels.map(r => r.family)).size).toBe(20);
  });
  it('rejects the historical sparse Nightmare instead of accepting its label or arrow count', () => {
    const old = previous.find(l => l.id === 'c120') as Level;
    expect(qualityProblems('nightmare', analyzeCampaignLevel(old))).toContain('coverage');
    expect(qualityProblems('nightmare', analyzeCampaignLevel(old))).toContain('initial free');
  });
  it('peels and repairs different shapes reproducibly without intersections or blocked heads in their own paths', () => {
    for (const kind of ['heart', 'ring', 'butterfly'] as const) for (const seed of [19, 991]) {
      const level = denseCampaignField('quality', 17, 21, seed, shape(kind, 17, 21), 'normal');
      expect(() => validateLevel(level)).not.toThrow();
      expect(denseCampaignField('quality', 17, 21, seed, shape(kind, 17, 21), 'normal')).toEqual(level);
      expect(analyzeCampaignLevel(level).coverage).toBeGreaterThan(.95);
    }
  });
});
