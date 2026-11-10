import { readFileSync, writeFileSync } from 'node:fs';
import { compactOpening } from '../../.test-output/opening-source/compact-opening-source.js';
const previous = JSON.parse(readFileSync('src/content/campaign.json', 'utf8'));
writeFileSync('src/content/campaign.json', JSON.stringify([...compactOpening, ...previous.slice(4)]));
console.info(compactOpening.map(level => ({ id: level.id, contentVersion: level.contentVersion, arrows: level.arrows.length })));
