import {writeFileSync} from 'node:fs';
import {generateCampaignV5} from '../../.test-output/campaign-v5-source/campaign-v5-source.js';
const {levels,report}=generateCampaignV5();
writeFileSync('src/content/campaign.json',JSON.stringify(levels));
writeFileSync('docs/verification/CAMPAIGN_SELECTION_V5.json',JSON.stringify({catalogVersion:6,contentVersion:5,policy:'Owner-authorized full rollout: c01–c04 unchanged, fresh c05–c120 v5; 40 original silhouettes, no repeat within24, neighbor normalized-mask IoU<.82, denser peak cadence. Existing attempts/rights immutable. Four qualified seeds from at most24, old strict quality gates, multiple roots and unlocks. Proxies do not prove human enjoyment.',levels:report},null,2)+'\n');
