/** Twelve own monthly engravings on four cup silhouettes. No network/raster assets. */
const engravings = [
  '<path d="M50 29v25M39 35l22 13m-22 0 22-13m-11-7-4 5m4-5 4 5m-4 21-4-5m4 5 4-5"/>',
  '<path d="M50 52 38 40c-8-11 6-17 12-8 7-9 20-3 12 8Z"/>',
  '<path d="M50 54V40m0 4c-12 0-14-9-13-13 10 0 15 4 13 13Zm0-6c0-9 7-12 14-11 0 9-4 14-14 11Z"/>',
  '<path d="M50 28c-3 6-12 14-12 20 0 15 24 15 24 0 0-6-9-14-12-20Zm-6 20c0 4 2 6 6 6"/>',
  '<circle cx="50" cy="42" r="4"/><path d="M46 37c-11-8 0-19 4-7 7-10 18 0 7 7 13 1 10 16-2 11 3 13-12 15-13 2-10 6-17-8-5-12Z"/>',
  '<circle cx="50" cy="42" r="8"/><path d="M50 27v4m0 22v4m-15-15h4m22 0h4M39 31l3 3m16 16 3 3m-22 0 3-3m16-16 3-3"/>',
  '<path d="M36 35c6-6 8 6 14 0s8 6 14 0M36 43c6-6 8 6 14 0s8 6 14 0M36 51c6-6 8 6 14 0s8 6 14 0"/>',
  '<path d="M50 56V27m0 8c-7 0-10-4-10-8 7 0 10 4 10 8Zm0 9c-8 0-12-5-12-9 8 0 12 5 12 9Zm0 9c-8 0-12-5-12-9 8 0 12 5 12 9Zm0-13c8 0 12-5 12-9-8 0-12 5-12 9Zm0 9c8 0 12-5 12-9-8 0-12 5-12 9Z"/>',
  '<path d="M38 39h24c0 11-6 17-12 19-6-2-12-8-12-19Zm-2 0c0-12 28-12 28 0H36Zm14-12 3-4m-12 12 4-4m10 4 4-4"/>',
  '<path d="M56 29c-18 1-20 23-3 26 4 1 8-1 11-5-15 3-22-11-8-21Z"/><path d="m61 27 1 4 4 1-4 2-1 4-2-4-4-2 4-1Z"/>',
  '<path d="M43 49c-2-12 8-18 15-19-1 10-3 17-15 19Zm0 0 11-14"/>',
  '<path d="M50 29v24m-10-18 20 13m-20 0 20-13"/>',
] as const;
const bodies = [
  'M27 17h46l-4 28c-2 13-10 20-19 20s-17-7-19-20Z',
  'M28 17h44v26c0 12-9 22-22 22S28 55 28 43Z',
  'M24 17h52l-8 30-18 18-18-18Z',
  'M31 17h38l3 14-9 24-13 10-13-10-9-24Z',
] as const;
export function trophy(month: string, earned = false): string {
  const index = Number(month.slice(-2)) - 1;
  if (index < 0 || index >= engravings.length || !Number.isInteger(index)) throw Error('Missing monthly trophy');
  return `<svg class="trophy ${earned ? 'earned' : ''}" data-trophy-month="${index + 1}" viewBox="0 0 100 110" aria-hidden="true"><path class="cup-handle" d="M29 23H15v11c0 15 13 20 22 20m34-31h14v11c0 15-13 20-22 20"/><path class="cup-body" d="${bodies[index % bodies.length]}"/><path class="cup-base" d="M50 65v19m-16 7h32l4 8H30Zm6-7h20"/><g class="cup-engraving">${engravings[index]}</g></svg>`;
}
