import catalog from './trophies-v2.json' with { type: 'json' };
import type { TrophyBinding, TrophyDesign } from '../domain/trophy';
export const trophyCatalog = catalog as Readonly<Record<string, Readonly<TrophyDesign>>>;
export const trophyYears = [...new Set(Object.keys(trophyCatalog).map(key => key.slice(0, 4)))];
export function trophyBinding(month: string): TrophyBinding {
  const design = trophyCatalog[month]; if (!design) throw Error('Missing frozen trophy design');
  return { version: 2, id: design.id };
}
export function legacyTrophyBinding(month: string): TrophyBinding { return { version: 1, id: `t1-${month}` }; }
export function validTrophyBinding(month: string, binding: unknown): binding is TrophyBinding {
  if (!binding || typeof binding !== 'object') return false;
  const b = binding as TrophyBinding;
  return b.version === 1 ? b.id === `t1-${month}` : b.version === 2 && b.id === trophyCatalog[month]?.id;
}
