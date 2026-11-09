import { expect, it } from 'vitest';
import { generateTrophyDesign } from '../../src/domain/trophy';
import { trophyCatalog, trophyYears, trophyBinding } from '../../src/content/trophies';
import { trophy } from '../../src/game/trophies';
import { legacyTrophy } from '../../src/game/trophies-v1';

it('pins 240 reproducible compositions with distinct complete silhouettes within each year', () => {
  expect(trophyYears).toHaveLength(20); expect(Object.keys(trophyCatalog)).toHaveLength(240);
  const signatures = new Set<string>();
  for (const [month, design] of Object.entries(trophyCatalog)) {
    expect(generateTrophyDesign(month)).toEqual(design);
    const { month: _month, id: _id, ...parts } = design; signatures.add(JSON.stringify(parts));
    const svg = trophy(month, true);
    expect(svg).not.toContain('undefined'); expect(svg).not.toContain('NaN');
  }
  expect(signatures.size).toBe(240);
  for (const year of trophyYears) {
    const designs = Object.entries(trophyCatalog).filter(([m]) => m.startsWith(year)).map(([, d]) => d);
    expect(new Set(designs.map(d => d.body)).size).toBe(12);
  }
  expect(generateTrophyDesign('2026-01')).not.toEqual(generateTrophyDesign('2027-01'));
});
it('resolves an awarded frozen version and rejects a conflicting identity instead of changing its art', () => {
  expect(trophy('2026-11', true, { binding: { version: 1, id: 't1-2026-11' } })).toBe(legacyTrophy('2026-11', true));
  expect(trophy('2026-11', true, { binding: trophyBinding('2026-11') })).toContain('trophy-rich');
  expect(() => trophy('2026-11', true, { binding: trophyBinding('2026-10') })).toThrow('binding');
  expect(() => generateTrophyDesign('2026-13')).toThrow(); expect(() => generateTrophyDesign('2046-01')).toThrow();
});
it('uses separate SVG definitions for collection, calendar and full-size preview of the same award', () => {
  const scopes = ['collection', 'calendar', 'viewer'];
  const all = scopes.flatMap(scope => [...trophy('2026-01', true, { scope }).matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  expect(all.length).toBeGreaterThan(9); expect(new Set(all).size).toBe(all.length);
});
