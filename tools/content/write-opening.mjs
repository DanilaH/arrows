import { readFileSync, writeFileSync } from 'node:fs';
import { campaignOpening, openingReport } from '../../.test-output/opening-source/opening-source.js';
const previous = JSON.parse(readFileSync('src/content/campaign.json', 'utf8'));
writeFileSync('src/content/campaign.json', JSON.stringify([...campaignOpening, ...previous.slice(20)]));
writeFileSync('docs/verification/OPENING_SELECTION_V3.json', JSON.stringify({ policy: 'Fresh c01-c04 use version 3; c05-c20 remain version 2. Every saved attempt retains embedded geometry.', firstFour: 'Own fully occupied compact tiles with one-cell line spacing, calibrated against V06 25s/33s/50s.', levels: openingReport }, null, 2) + '\n');
console.info(campaignOpening.map(level => ({ id: level.id, contentVersion: level.contentVersion, arrows: level.arrows.length })));
