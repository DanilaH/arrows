import fields from './campaign.json' with { type: 'json' };
import type { Level } from '../domain/board';
export const CATALOG_VERSION = 6;
/** Fixed selected bank. Fresh c01-c04 retain v3; varied c05-c120 use v5. Embedded legacy fields stay immutable. */
export const campaign = fields as readonly Level[];
export const tutorialFor = (index: number): string | null => ({ 0: 'tap', 1: 'turns', 2: 'blockers', 3: 'guides', 5: 'zoom' })[index] ?? null;
