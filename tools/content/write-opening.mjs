import { readFileSync, writeFileSync } from 'node:fs';
import { campaignOpening, openingReport } from '../../.test-output/opening-source/opening-source.js';
const previous = JSON.parse(readFileSync('src/content/campaign.json', 'utf8'));
writeFileSync('src/content/campaign.json', JSON.stringify([...campaignOpening, ...previous.slice(20)]));
writeFileSync('docs/verification/OPENING_SELECTION_V2.json', JSON.stringify({ policy: 'Fresh attempts use version 2; every saved attempt retains its embedded geometry.', firstFour: 'Own hand-composed bent/interlocking fields.', levels: openingReport }, null, 2) + '\n');
console.info(campaignOpening.map(level => ({ id: level.id, contentVersion: level.contentVersion, arrows: level.arrows.length })));
