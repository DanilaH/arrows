import {denseCampaignField} from './dense-campaign-generator';
import {analyzeCampaignLevel} from './campaign-analysis';
import {qualityProblems} from './dense-quality';
import {compactOpening} from './compact-opening-source';
import {patternKinds,patternMask,patternSize,type PatternKind} from '../../src/content/patternsV1';
import {validateLevel,type Level} from '../../src/domain/board';
import type {Pace} from './campaign-shapes';
import {situationSignature} from './pilot-source';

const pacing:readonly Pace[]=['normal','hard','normal','hard','nightmare','breather','hard','normal','hard','nightmare','breather','hard','normal','hard','nightmare','breather','hard','normal','hard','nightmare'];
export const campaignPace=(n:number):Pace=>n<=20?n===20?'nightmare':[6,12,18].includes(n)?'hard':'normal':pacing[(n-21)%20]!;
function signature(kind:PatternKind){const inside=patternMask(kind,64,64),points=[];for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(inside(x,y))points.push([x,y]);const xs=points.map(p=>p[0]!),ys=points.map(p=>p[1]!),l=Math.min(...xs),t=Math.min(...ys),r=Math.max(...xs),b=Math.max(...ys),s=new Set<number>();for(let y=0;y<40;y++)for(let x=0;x<40;x++)if(inside(Math.round(l+x*(r-l)/39),Math.round(t+y*(b-t)/39)))s.add(y*40+x);return s;}
const signatures=new Map(patternKinds.map(k=>[k,signature(k)]));
export function patternSimilarity(a:PatternKind,b:PatternKind):number{const aa=signatures.get(a)!,bb=signatures.get(b)!,overlap=[...aa].filter(p=>bb.has(p)).length;return overlap/(aa.size+bb.size-overlap);}
export function generateCampaignV5(){
 const levels:Level[]=[...compactOpening],report=[],used=new Map<PatternKind,number>(),recent:PatternKind[]=[];
 for(let number=5;number<=120;number++){
  const pace=campaignPace(number),stage=Math.floor(Math.max(0,number-21)/20),early=number<=20;
  const pool=patternKinds.filter(k=>!recent.slice(-24).includes(k)&&(!['heart','butterfly'].includes(k)||!used.has(k))&&recent.slice(-2).every(p=>patternSimilarity(k,p)<.82));
  pool.sort((a,b)=>(used.get(a)??0)-(used.get(b)??0)||((patternKinds.indexOf(a)-(number-5)+80)%40)-((patternKinds.indexOf(b)-(number-5)+80)%40));
  const family=pool[0];if(!family)throw Error(`No contrasting silhouette c${number}`);
  const cells=early?(pace==='nightmare'?1250:pace==='hard'?440:210+Math.floor((number-5)/4)*38):pace==='breather'?190+stage*22:pace==='normal'?430+stage*65:pace==='hard'?800+stage*160:1350+stage*260;
  const {width,height}=patternSize(family,cells,78),difficulty=pace==='breather'?'normal':pace;
  const desiredDepth=pace==='breather'?4:pace==='normal'?early?6:10+stage:pace==='hard'?early?13:18+stage*2:26+stage*3;
  const choices=[];let tries=0;
  for(let candidate=0;candidate<24;candidate++){
   tries++;const seed=30010000+number*10007+candidate*7919;
   const raw=denseCampaignField(`c${String(number).padStart(2,'0')}`,width,height,seed,patternMask(family,width,height),difficulty,pace==='breather'?.32:pace==='normal'?.22:pace==='hard'?.105:.065,desiredDepth),level={...raw,contentVersion:5};
   try{validateLevel(level);const metrics=analyzeCampaignLevel(level),problems=qualityProblems(pace,metrics);if(problems.length||metrics.initialFree<2)continue;
    const situations=situationSignature(level);if(!early&&pace!=='breather'&&situations.maxUnlock<2)continue;
    const score=-Math.abs(metrics.depth-desiredDepth)*.15-metrics.meanEarlyFreeFraction*8+Math.min(situations.unlockBursts,8)*.1;
    choices.push({level,metrics,seed,situations,score});if(choices.length>=4)break;
   }catch{/* Reject, never silently lower an authored level's admission gate. */}
  }
  choices.sort((a,b)=>b.score-a.score);const pick=choices[0];if(!pick)throw Error(`No qualified c${number}: ${family}/${pace}/${width}×${height}`);
  levels.push(pick.level);report.push({number,family,pace,seed:pick.seed,candidates:tries,metrics:pick.metrics,situations:pick.situations,neighborSimilarity:recent.length?patternSimilarity(family,recent.at(-1)!):0});recent.push(family);used.set(family,(used.get(family)??0)+1);
  console.error(`v5 c${number} ${family}/${pace}: ${pick.metrics.arrows} arrows, ${pick.metrics.initialFree} exits, depth ${pick.metrics.depth}`);
 }
 return{levels,report};
}
