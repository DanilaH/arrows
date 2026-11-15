import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {baselineFields,pilotRows} from '../../src/pilot/catalog';
import {analyzeCampaignLevel} from './campaign-analysis';
export const report={
 version:1,scope:'Isolated content pilot; not rolled out to campaign/calendar; no human enjoyment claim',
 baselineHashes:Object.fromEntries(['src/content/campaign.json','src/content/daily.json','src/content/dailyGenerated.ts','src/domain/silhouette.ts'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')])),
 budget:{fields:27,seedsPerField:24,totalCandidates:648,runtimeGeneration:false},
 fields:pilotRows.map((r,i)=>({id:r.level.id,position:r.position,date:r.date,pace:r.pace,family:r.family,motif:r.motif,candidate:analyzeCampaignLevel(r.level),baseline:analyzeCampaignLevel(baselineFields[i]!),situations:r.situations,decision:'HOLD pending human comparison'})),
};
