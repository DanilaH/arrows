import { writeFileSync } from 'node:fs';
import { campaign } from '../../.test-output/campaign-source/campaign-source.js';
import { expansionReport } from '../../.test-output/campaign-source/campaign-source.js';
writeFileSync('src/content/campaign.json', JSON.stringify(campaign));
writeFileSync('docs/verification/CAMPAIGN_BANK_SELECTION.json', JSON.stringify({ policy: 'Four deterministic candidates per new level; structural scoring, not player-tested difficulty.', levels: expansionReport }, null, 2) + '\n');
console.info({ levels: campaign.length, arrows: campaign.reduce((n, l) => n + l.arrows.length, 0), expansion: expansionReport.map(r => ({ number: r.number, family: r.family, pace: r.pace, ...r.metrics })) });
