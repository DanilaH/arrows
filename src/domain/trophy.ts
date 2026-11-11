/** Immutable style v2. Change the version for future art revisions, never reinterpret an awarded binding. */
export const TROPHY_FIRST_YEAR = 2026;
export const TROPHY_LAST_YEAR = 2045;
export const TROPHY_STYLE_VERSION = 2;
export interface TrophyDesign {
  version: 2; month: string; id: string; body: number; handles: number; stem: number; base: number;
  rim: number; metal: number; gem: number; ornament: number; emblem: number;
}
export interface TrophyBinding { version: 1 | 2; id: string; }
export function trophySeed(value: string): number {
  let seed = 2166136261;
  for (const character of value) { seed ^= character.charCodeAt(0); seed = Math.imul(seed, 16777619); }
  return seed >>> 0;
}
function random(seed: number): () => number {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function permutation(length: number, seed: number): number[] {
  const values = Array.from({ length }, (_, i) => i), next = random(seed);
  for (let i = length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [values[i], values[j]] = [values[j]!, values[i]!]; }
  return values;
}
export function generateTrophyDesign(month: string): TrophyDesign {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error('Invalid trophy month');
  const year = Number(month.slice(0, 4)), index = Number(month.slice(-2)) - 1;
  if (year < TROPHY_FIRST_YEAR || year > 2200) throw Error('Unsupported trophy year');
  const seed = trophySeed(`arrows.trophy.v2.${month}`), next = random(seed);
  const take = (count: number): number => Math.floor(next() * count);
  return { version: 2, month, id: `t2-${month}-${seed.toString(16).padStart(8, '0')}`,
    body: permutation(16, trophySeed(`arrows.trophy.v2.${year}.body`))[index]!,
    handles: take(8), stem: take(6), base: take(6), rim: take(6),
    metal: permutation(10, trophySeed(`arrows.trophy.v2.${year}.metal`))[index % 10]!,
    gem: (index * 3 + take(3)) % 12, ornament: take(8), emblem: take(3) };
}
