import {campaign} from '../../src/content/campaign';
import {campaign as oldCampaign} from '../../tests/fixtures/campaignV4';
import {chooseSingle,cascadePlan} from '../../src/domain/assistance';
import {chooseSingle as oldSingle,cascadePlan as oldCascade} from '../../tests/fixtures/assistanceReferenceV28';
import {Board,canExit,type Level} from '../../src/domain/board';
import {generateDenseDaily} from '../../src/content/dailyDense';
export function compareLargePlanners(){
 const levels=[...oldCampaign,...campaign,...['2026-11-15','2026-11-16','2026-11-18','2026-11-21','2026-12-23','2027-01-08','2028-02-29','2200-12-31'].map(generateDenseDaily)];
 let comparisons=0;const timings:{arrows:number;oldSingle:number;single:number;oldCascade:number;cascade:number}[]=[];
 for(const level of levels)for(let phase=0;phase<3;phase++){
  const b=new Board(level,'differential');if(phase)for(let i=0;i<Math.floor(level.arrows.length*.35);i++)b.activate(b.hint()!);
  if(phase===2)for(const a of b.remaining.filter(a=>!canExit(a,b.remaining)).slice(0,2))b.activate(a.id);
  const before=JSON.stringify(b.snapshot()),visible=new Set(b.remaining.filter((_,i)=>i%3===0).map(a=>a.id));
  const timed=<T>(fn:()=>T):[T,number]=>{const start=performance.now(),value=fn();return[value,performance.now()-start];};
  const [oldA,oa]=timed(()=>oldSingle(b,visible)),[a,na]=timed(()=>chooseSingle(b,visible)),[oldC,oc]=timed(()=>oldCascade(b)),[c,nc]=timed(()=>cascadePlan(b));
  if(JSON.stringify(oldA)!==JSON.stringify(a)||JSON.stringify(oldC)!==JSON.stringify(c)||before!==JSON.stringify(b.snapshot()))throw Error(`Planner mismatch ${level.id}/v${level.contentVersion}/${phase}`);
  for(const budget of[2,4])if(JSON.stringify(oldCascade(b,{budget}))!==JSON.stringify(cascadePlan(b,{budget})))throw Error(`Budget mismatch ${level.id}/${phase}/${budget}`);
  comparisons++;if(level.arrows.length>=140&&phase===0)timings.push({arrows:level.arrows.length,oldSingle:oa,single:na,oldCascade:oc,cascade:nc});
 }
 const median=(v:number[])=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)];
 return{comparisons,exact:true,method:'Frozen0.28 planners vs optimized planners, all old120/new120 plus8large dailies × fresh/mid/marked; same ordered A1/A2 output for budgets2/3/4; no state mutation. Host CPU samples only.',largeMedianMs:Object.fromEntries(['oldSingle','single','oldCascade','cascade'].map(key=>[key,median(timings.map(t=>t[key as keyof typeof t]))])),timings};
}
