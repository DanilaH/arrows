import { writeFileSync } from 'node:fs';
import { dailyCatalog } from '../../.test-output/daily-source/daily-source.js';
writeFileSync('src/content/daily.json', JSON.stringify(dailyCatalog));
console.info({ days: Object.keys(dailyCatalog).length, arrows: Object.values(dailyCatalog).reduce((n, l) => n + l.arrows.length, 0) });
