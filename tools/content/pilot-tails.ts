import {canExit,type Level} from '../../src/domain/board';
import {baselineFields,candidateFields} from '../../src/pilot/catalog';
/** Domain-based policy traces, complementary to the independent legality oracle.
 * A late all-free tail is a question for human review, not an enjoyability score. */
function tails(level:Level){
 const deps=new Map(level.arrows.map(a=>[a.id,new Set(level.arrows.filter(b=>b.id!==a.id&&!canExit(a,[a,b])).map(b=>b.id))]));
 return ['first','reverse','unlock-greedy'].map(policy=>{
  const left=new Set(deps.keys());let cleanup=0;
  while(left.size){const free=[...left].filter(id=>![...deps.get(id)!].some(b=>left.has(b)));if(!free.length)throw Error('Cycle');
   if(free.length===left.size){cleanup=left.size;break;}
   const gain=(id:string)=>[...left].filter(a=>deps.get(a)!.has(id)&&[...deps.get(a)!].filter(b=>left.has(b)).length===1).length;
   const id=policy==='reverse'?free.at(-1)!:policy==='unlock-greedy'?[...free].sort((a,b)=>gain(b)-gain(a)||a.localeCompare(b))[0]!:free[0]!;left.delete(id);
  }
  return{policy,allFreeTail:cleanup,fraction:cleanup/level.arrows.length};
 });
}
export const tailReport={method:'Three domain-based legal policies; fully independent cell-walking validity remains in content-report.json. Last entirely free suffix measures cleanup exposure only; not human timing, difficulty or enjoyment.',fields:candidateFields.map((level,i)=>({id:level.id,candidate:tails(level),baseline:tails(baselineFields[i]!)}))};
