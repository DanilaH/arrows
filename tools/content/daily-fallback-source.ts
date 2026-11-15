import {denseCampaignField} from './dense-campaign-generator';
import {patternMask,patternSize} from '../../src/content/patternsV1';
import {denseDailyQualified} from '../../src/content/dailyDense';
import {analyzeCampaignLevel} from './campaign-analysis';
import {validateLevel,type Level} from '../../src/domain/board';
export function generateDenseFallbacks(){
 const bank:Level[]=[],report=[];
 for(const [i,kind]of(['rocket','fish','owl','castle'] as const).entries()){
  const difficulty=i<2?'hard':'nightmare',size=patternSize(kind,i<2?2800:3700),depth=i<2?28:39;let chosen=false;
  for(let n=0;n<24;n++){
   const seed=300001+i*10007+n*7919,level={...denseCampaignField(`daily-v2-safety-${i}`,size.width,size.height,seed,patternMask(kind,size.width,size.height),difficulty,i<2?.10:.065,depth),contentVersion:3};
   try{validateLevel(level);if(!denseDailyQualified(level))continue;const metrics=analyzeCampaignLevel(level);if(metrics.meanEarlyFreeFraction>(i<2?.25:.18)||metrics.largestHole>3)continue;bank.push(level);report.push({kind,seed,metrics});chosen=true;console.error(`${level.id} ${kind}: ${metrics.arrows}/${metrics.initialFree}/depth${metrics.depth}`);break;}catch{}
  }
  if(!chosen)throw Error(`No safe large fallback ${kind}`);
 }
 return{bank,report};
}
