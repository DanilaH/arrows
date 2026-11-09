import fields from './campaign.json' with { type: 'json' };
import type { Level } from '../domain/board';
export const CATALOG_VERSION = 1;
/** Own, offline-generated and validated first chapter. Never reroll on Continue. */
export const campaign = fields as readonly Level[];
export const tutorialFor = (index: number): string | null => ({ 0: 'tap', 1: 'turns', 2: 'blockers', 3: 'guides', 5: 'zoom' })[index] ?? null;
