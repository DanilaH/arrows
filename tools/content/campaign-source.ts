import { campaignExpansion } from './campaign-expansion-source';
import { campaignOpening } from './opening-source';
export { expansionReport } from './campaign-expansion-source';
import { validateLevel, type Level } from '../../src/domain/board';

export const campaign: readonly Level[] = [...campaignOpening, ...campaignExpansion];
for (const level of campaign) validateLevel(level);
