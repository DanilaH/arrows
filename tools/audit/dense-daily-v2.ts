import {generateDenseDailyDetailed} from '../../src/content/dailyDense';
import {analyzeCampaignLevel} from '../content/campaign-analysis';
import {validateLevel} from '../../src/domain/board';
export {generateDenseDailyDetailed};
export function auditDenseDates(dates:string[]){
 const fingerprints=new Set<string>(),rows=[];
 for(const date of dates){const start=performance.now(),result=generateDenseDailyDetailed(date),ms=performance.now()-start;validateLevel(result.level);const metrics=analyzeCampaignLevel(result.level),night=result.level.difficulty==='nightmare';
  if(metrics.arrows<(night?170:140)||metrics.arrows>300||metrics.depth<(night?28:20)||metrics.coverage<.98||metrics.initialFree<4||metrics.meanEarlyFreeFraction>(night?.18:.25)||metrics.largestHole>3)throw Error(`Invalid large daily ${date}: ${JSON.stringify(metrics)}`);
  const geometry=JSON.stringify([result.level.width,result.level.height,result.level.arrows.map(a=>a.path)]);if(fingerprints.has(geometry))throw Error(`Repeated exact daily ${date}`);fingerprints.add(geometry);
  rows.push({date,difficulty:result.level.difficulty,kind:result.kind,candidate:result.candidate,fallback:result.fallback,width:result.level.width,height:result.level.height,hostMs:ms,metrics});console.error(date,result.kind,metrics.arrows,metrics.depth,Math.round(ms)+'ms',result.fallback?'FALLBACK':'');
 }
 return{version:2,start:'2026-01-01',method:'Independent occupied-cell geometry/DAG/three-order validation; host timings only, not phone FPS or human difficulty.',rows};
}
