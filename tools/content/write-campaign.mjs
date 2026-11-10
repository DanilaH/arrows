import { writeFileSync } from 'node:fs';
import { campaign, denseReport } from '../../.test-output/campaign-source/campaign-source.js';
writeFileSync('src/content/campaign.json', JSON.stringify(campaign));
writeFileSync('docs/verification/CAMPAIGN_SELECTION_V4.json', JSON.stringify({ catalogVersion: 5, contentVersion: 4, preserved: 'c01-c04 contentVersion 3; embedded saved attempts remain immutable.', policy: 'Filled-silhouette forward peeling; at least four qualified deterministic candidates selected from up to 24; hard gates on fill, accidental holes, initial and early-solve freedom, bends and dependency depth. Structural difficulty, not player-study evidence.', levels: denseReport }, null, 2) + '\n');
console.info({ levels: campaign.length, arrows: campaign.reduce((n, l) => n + l.arrows.length, 0), minimumFill: Math.min(...denseReport.map(r => r.metrics.coverage)) });
