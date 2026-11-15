import {denseCampaignField} from './dense-campaign-generator';
import {campaignMask,type Family,type Pace} from './campaign-shapes';
import {analyzeCampaignLevel} from './campaign-analysis';
import {qualityProblems} from './dense-quality';
import {validateLevel,type Level} from '../../src/domain/board';

/** Frozen shortlist, not a replacement for the published campaign or dated generator. */
const specs:readonly [Pace,Family,number,string][]=[
 ['normal','shield',23,'warm-up'],['hard','crescent',37,'interior-exit'],['normal','wave',27,'unlock-burst'],['hard','butterfly',35,'two-wings'],['nightmare','hexagon',35,'shared-blockers'],
 ['breather','heart',19,'short-release'],['hard','gear',33,'interior-exit'],['normal','hourglass',27,'shared-blockers'],['hard','flower',31,'unlock-burst'],['nightmare','infinity',41,'two-wings'],
 ['breather','lightning',25,'short-release'],['hard','shield',31,'shared-blockers'],['normal','crescent',33,'interior-exit'],['hard','wave',35,'unlock-burst'],['nightmare','heart',35,'shared-blockers'],
 ['breather','diamond',19,'short-release'],['hard','infinity',39,'two-wings'],['normal','crown',29,'unlock-burst'],['hard','hourglass',35,'shared-blockers'],['nightmare','infinity',43,'interior-exit'],
 ['hard','crescent',39,'interior-exit'],['hard','butterfly',37,'two-wings'],['nightmare','shield',35,'shared-blockers'],['hard','flower',33,'unlock-burst'],['hard','infinity',41,'two-wings'],['nightmare','infinity',43,'interior-exit'],['hard','heart',33,'shared-blockers'],
];
/** Separate cell-walking signature, including mid-solve unlocks. Structural proxy only. */
export function situationSignature(level:Level){
 const cells=new Map<string,string>();
 for(const a of level.arrows)for(let i=1;i<a.path.length;i++){
  const p=a.path[i-1]!,q=a.path[i]!,n=Math.abs(q.x-p.x)+Math.abs(q.y-p.y);
  for(let k=0;k<=n;k++)cells.set(`${p.x+Math.sign(q.x-p.x)*k},${p.y+Math.sign(q.y-p.y)*k}`,a.id);
 }
 const deps=new Map<string,Set<string>>();let interiorRoots=0,remoteRayCells=0;
 for(const a of level.arrows){const h=a.path.at(-1)!,p=a.path.at(-2)!,dx=Math.sign(h.x-p.x),dy=Math.sign(h.y-p.y),d=new Set<string>();
  for(let x=h.x+dx,y=h.y+dy;x>=0&&y>=0&&x<level.width&&y<level.height;x+=dx,y+=dy){const id=cells.get(`${x},${y}`);if(id&&id!==a.id){d.add(id);if(Math.hypot(x-h.x,y-h.y)>level.width*.35)remoteRayCells++;}}
  deps.set(a.id,d);
  if(!d.size&&h.x>level.width*.22&&h.x<level.width*.78&&h.y>level.height*.22&&h.y<level.height*.78)interiorRoots++;
 }
 const remaining=new Set(deps.keys());let unlockBursts=0,maxUnlock=0;
 while(remaining.size){const ready=[...remaining].filter(id=>![...deps.get(id)!].some(b=>remaining.has(b)));if(!ready.length)throw Error('Pilot cycle');
  const choices=ready.map(id=>({id,unlocks:[...remaining].filter(a=>a!==id&&deps.get(a)!.has(id)&&[...deps.get(a)!].filter(b=>remaining.has(b)).length===1).length})).sort((a,b)=>b.unlocks-a.unlocks||a.id.localeCompare(b.id));
  const next=choices[0]!;if(next.unlocks>=2)unlockBursts++;maxUnlock=Math.max(maxUnlock,next.unlocks);remaining.delete(next.id);
 }
 return{interiorRoots,sharedBlockers:[...deps.values()].filter(d=>d.size>=2).length,remoteRayCells,unlockBursts,maxUnlock};
}
export function generatePilot(){
 return specs.map(([pace,family,width,motif],index)=>{
  let best:{level:Level;score:number;seed:number;metrics:ReturnType<typeof analyzeCampaignLevel>;situations:ReturnType<typeof situationSignature>}|undefined;
  const id=index<20?`pc${index+21}`:`pd202611${index-4}`;
  for(let trial=0;trial<24;trial++){
   const seed=290100+index*997+trial*37,difficulty=pace==='breather'?'normal':pace;
   const level=denseCampaignField(id,width,width+2,seed,campaignMask(family,width,width+2),difficulty,pace==='breather'?.32:pace==='normal'?.2:pace==='hard'?.1:.065);
   try{validateLevel(level);const metrics=analyzeCampaignLevel(level);if(qualityProblems(pace,metrics).length||metrics.initialFree<2)continue;
    const situations=situationSignature(level);if(situations.maxUnlock<2&&pace!=='breather'||motif==='interior-exit'&&!situations.interiorRoots)continue;
    const score=motif==='interior-exit'?situations.interiorRoots*4+situations.unlockBursts:motif==='unlock-burst'?situations.maxUnlock*3+situations.unlockBursts:motif==='two-wings'?Math.min(30,situations.remoteRayCells)/5+metrics.initialFree:situations.sharedBlockers/metrics.arrows*12+Math.min(situations.unlockBursts,5);
    if(!best||score>best.score)best={level,score,seed,metrics,situations};
   }catch{/* Reject malformed/cyclic candidates before nomination. */}
  }
  if(!best)throw Error(`No bounded pilot candidate ${id}/${pace}/${family}`);
  console.error(`${id}: ${pace}, ${best.metrics.arrows} arrows, ${best.metrics.initialFree} roots, depth ${best.metrics.depth}`);
  return{...best,pace,family,motif,position:index<20?index+21:undefined,date:index>=20?`2026-11-${index-4}`:undefined,review:'HOLD: human comparison pending'};
 });
}
