import catalog from './trophies-v2.json' with { type: 'json' };
import { generateTrophyDesign, type TrophyBinding, type TrophyDesign } from '../domain/trophy';
export const trophyCatalog = catalog as Readonly<Record<string, Readonly<TrophyDesign>>>;
export const trophyYears = [...new Set(Object.keys(trophyCatalog).map(key => key.slice(0, 4)))];
export function trophyDesign(month: string): Readonly<TrophyDesign> {
  return trophyCatalog[month] ?? generateTrophyDesign(month);
}
export function trophyBinding(month: string): TrophyBinding {
  const design = trophyDesign(month);
  return { version: 2, id: design.id };
}
export function legacyTrophyBinding(month: string): TrophyBinding { return { version: 1, id: `t1-${month}` }; }
export function validTrophyBinding(month: string, binding: unknown): binding is TrophyBinding {
  if (!binding || typeof binding !== 'object') return false;
  const b = binding as TrophyBinding;
  try { return b.version === 1 ? b.id === `t1-${month}` : b.version === 2 && b.id === trophyDesign(month).id; }
  catch { return false; }
}
