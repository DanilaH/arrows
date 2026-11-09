import { writeFileSync } from 'node:fs';
import { campaign } from '../../.test-output/campaign-source/campaign-source.js';
writeFileSync('src/content/campaign.json', JSON.stringify(campaign));
console.info(campaign.map(l => ({ id: l.id, arrows: l.arrows.length, dots: l.mask.length, difficulty: l.difficulty })));
