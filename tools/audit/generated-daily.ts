import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { generateDaily, dailyFallback } from '../../src/content/dailyGenerated';
import { dailyCatalog } from '../../src/content/daily';
import { dailyCatalog as reproducedArchive } from '../content/daily-source';
import { monthDates } from '../../src/progression/calendar';
import type { Level } from '../../src/domain/board';

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Independent integer-cell occupancy/ray walk. Never calls canExit, rayHitsPath or the generator solver. */
function verify(level: Level) {
  const cells = new Map<string, string>();
  for (const a of level.arrows) for (let i = 1; i < a.path.length; i++) {
    const from = a.path[i - 1]!, to = a.path[i]!, dx = Math.sign(to.x - from.x), dy = Math.sign(to.y - from.y);
    for (let j = 0; j <= Math.abs(to.x - from.x) + Math.abs(to.y - from.y); j++) {
      const key = `${from.x + dx * j},${from.y + dy * j}`, owner = cells.get(key);
      if (owner && owner !== a.id) throw Error(`Overlap ${level.id}`);
      cells.set(key, a.id);
    }
  }
  const deps = new Map(level.arrows.map(a => {
    const h = a.path.at(-1)!, p = a.path.at(-2)!, dx = Math.sign(h.x - p.x), dy = Math.sign(h.y - p.y), blockers = new Set<string>();
    for (let x = h.x + dx, y = h.y + dy; x >= 0 && x < level.width && y >= 0 && y < level.height; x += dx, y += dy) {
      const owner = cells.get(`${x},${y}`); if (owner) blockers.add(owner);
    }
    return [a.id, blockers] as const;
  }));
  const initialFree = [...deps.values()].filter(v => !v.size).length;
  while (deps.size) {
    const free = [...deps].filter(([, blockers]) => [...blockers].every(b => !deps.has(b)));
    if (!free.length) throw Error(`Cycle or self-block ${level.id}`);
    for (const [id] of free) deps.delete(id);
  }
  return { occupied: cells.size, initialFree };
}
for (const [date, level] of Object.entries(dailyCatalog)) if (hash(level) !== hash(reproducedArchive[date])) throw Error(`Archive changed: ${date}`);
const dates = new Set<string>();
for (const year of [2027, 2028]) for (let m = 1; m <= 12; m++) for (const d of monthDates(`${year}-${String(m).padStart(2, '0')}`)) dates.add(d);
for (let y = 2029; y <= 2200; y++) for (const suffix of ['02-08', '07-14', '12-28']) dates.add(`${y}-${suffix}`);
for (const d of ['2046-01-05', '2046-01-28', '2048-02-29', '2096-02-29', '2100-02-28', '2200-12-31']) dates.add(d);
const seen = new Map<string, string>(), rows = [], duplicates = [], timings = [];
for (const date of [...dates].sort()) {
  const begin = performance.now(), level = generateDaily(date); timings.push(performance.now() - begin);
  const stats = verify(level), signature = hash([level.width, level.height, level.arrows.map(a => a.path), level.mask]);
  if (seen.has(signature)) duplicates.push([seen.get(signature), date]); else seen.set(signature, date);
  // Every calendar shape's deterministic fallback is independently checked too.
  const fallback = dailyFallback(date); verify(fallback);
  rows.push({ date, hash: hash(level), difficulty: level.difficulty, arrows: level.arrows.length, initialFree: stats.initialFree, fill: stats.occupied / level.mask.length, fallback: hash(level) === hash(fallback) });
}
timings.sort((a, b) => a - b);
const report = { algorithm: 'dated generator v1 / contentVersion 2, boundary 2027-01-01', archiveUnchanged: Object.keys(dailyCatalog).length,
  provenance: 'Node/V8 generation timings include runtime validation, exclude oracle. Host measurements, not Android phone or human difficulty/enjoyment. All 2027/2028 dates plus three annual strata through supported calendar year 2200 and boundary probes.',
  count: rows.length, duplicates, fallbackCount: rows.filter(r => r.fallback).length,
  timingMs: { median: timings[Math.floor(timings.length / 2)], p95: timings[Math.floor(timings.length * .95)], max: timings.at(-1) }, rows };
mkdirSync('.test-output', { recursive: true });
writeFileSync('.test-output/generated-daily-audit.json', JSON.stringify(report, null, 2) + '\n');
console.info({ count: report.count, archiveUnchanged: report.archiveUnchanged, duplicates: duplicates.length, fallbackCount: report.fallbackCount, timingMs: report.timingMs });
