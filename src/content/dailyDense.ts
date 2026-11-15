import {denseFieldSteps} from '../domain/denseFieldV1';
import {validateLevel,type Level} from '../domain/board';
import {measurePath,rayHitsPath,occupiedCells} from '../domain/geometry';
import {dailyId} from './dailyGenerated';
import {patternMask} from './patternsV1';
import fallbackFields from './dailyDenseFallbacks.json' with {type:'json'};

export {DENSE_DAILY_START,DENSE_DAILY_VERSION,denseDailyDifficulty,denseDailySpec} from './dailyPolicyV2';
import {DENSE_DAILY_VERSION,denseDailySpec} from './dailyPolicyV2';
/** Runtime admission uses geometry rays. Offline acceptance separately walks occupied cells. */
export function denseDailyMetrics(level:Level){
 const blockers=new Map<string,string[]>(),depths=new Map<string,number>(),visiting=new Set<string>();
 for(const a of level.arrows){const h=a.path.at(-1)!,d=measurePath(a.path).direction;blockers.set(a.id,level.arrows.filter(b=>b.id!==a.id&&rayHitsPath(h,d,b.path)).map(b=>b.id));}
 const depth=(id:string):number=>{if(visiting.has(id))throw Error('Daily dependency cycle');if(depths.has(id))return depths.get(id)!;visiting.add(id);const n=1+Math.max(0,...blockers.get(id)!.map(depth));visiting.delete(id);depths.set(id,n);return n;};
 const cells=new Set<string>();for(const a of level.arrows)for(const p of occupiedCells(a.path))cells.add(`${p.x},${p.y}`);
 const samples:number[]=[];for(let order=0;order<3;order++){const left=new Set(blockers.keys());while(left.size>=level.arrows.length/2){const free=[...left].filter(id=>!blockers.get(id)!.some(b=>left.has(b)));if(!free.length)throw Error('Daily cycle');samples.push(free.length/left.size);left.delete(free[order===0?0:order===1?free.length-1:Math.floor(free.length/2)]!);}}
 return{arrows:level.arrows.length,initialFree:[...blockers.values()].filter(b=>!b.length).length,depth:Math.max(...[...blockers.keys()].map(depth)),coverage:cells.size/level.mask.length,bends:level.arrows.reduce((n,a)=>n+a.path.length-2,0)/level.arrows.length,early:samples.reduce((n,x)=>n+x,0)/samples.length,peak:Math.max(...samples)};
}
export function denseDailyQualified(level:Level):boolean{const m=denseDailyMetrics(level),night=level.difficulty==='nightmare';return m.arrows>=(night?170:140)&&m.arrows<=300&&m.coverage>=.98&&m.initialFree>=4&&m.initialFree/m.arrows<=(night?.14:.2)&&m.depth>=(night?28:20)&&m.bends>=3.2&&m.early<=(night?.18:.25)&&m.peak<=(night?.4:.5);}
export interface DenseDailyResult{level:Level;candidate:number;fallback:boolean;kind:string;}
/** A date has exactly one result, irrespective of device speed, interruption or worker availability. */
export function* denseDailySteps(date:string):Generator<number,DenseDailyResult,void>{
 const spec=denseDailySpec(date);
 for(let candidate=0;candidate<4;candidate++){
  const steps=denseFieldSteps(dailyId(date),spec.width,spec.height,spec.seed+candidate*104729,patternMask(spec.kind,spec.width,spec.height),spec.difficulty,spec.difficulty==='nightmare'?.065:.10,spec.depth);
  let next=steps.next();while(!next.done){yield next.value;next=steps.next();}
  const level={...next.value,contentVersion:DENSE_DAILY_VERSION};
  try{validateLevel(level);if(denseDailyQualified(level))return{level,candidate,fallback:false,kind:spec.kind};}catch{/* Deterministic bounded next seed; never catch storage/service errors. */}
 }
 const bank=(fallbackFields as Level[]).filter(l=>l.difficulty===spec.difficulty),template=bank[spec.ordinal%bank.length];if(!template)throw Error('Dense fallback bank unavailable');
 const id=dailyId(date),level={...template,id,arrows:template.arrows.map((a,i)=>({...a,id:`${id}-${i}`}))};validateLevel(level);
 return{level,candidate:4,fallback:true,kind:template.id};
}
export function generateDenseDailyDetailed(date:string):DenseDailyResult{const steps=denseDailySteps(date);let n=steps.next();while(!n.done)n=steps.next();return n.value;}
export function generateDenseDaily(date:string):Level{return generateDenseDailyDetailed(date).level;}
