import { writeFileSync } from 'node:fs';
import { generateTrophyDesign, TROPHY_FIRST_YEAR, TROPHY_LAST_YEAR } from '../../.test-output/trophy-source/trophy.js';
const rows = {};
for (let year = TROPHY_FIRST_YEAR; year <= TROPHY_LAST_YEAR; year++) for (let month = 1; month <= 12; month++) {
  const key = `${year}-${String(month).padStart(2, '0')}`; rows[key] = generateTrophyDesign(key);
}
writeFileSync('src/content/trophies-v2.json', JSON.stringify(rows, null, 2) + '\n');
console.info({ designs: Object.keys(rows).length, years: [TROPHY_FIRST_YEAR, TROPHY_LAST_YEAR] });
