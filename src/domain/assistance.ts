import { Board, canExit, type Attempt, type Level, type MoveResult } from './board';
import { measurePath, rayHitsPath } from './geometry';

export type HelpKind = 'legacy-single' | 'single-v2' | 'cascade-v1' | 'route-v1';
export type HelpVariant = 'legacy' | 'single-v2' | 'cascade-v1' | 'route-v1' | 'continue-single-v1';
export interface HelpPlan {
  kind: HelpKind;
  root: string;
  bonus: string[];
  budget: number;
  // Frozen original context establishes initial blocking/causality. Current
  // marked-auto predictions are recalculated, never substituted for bonus IDs.
  basis: Attempt;
  contentKey: string;
  route?: string[];
  target?: string;
}
export interface HelpPrediction {
  board: Board;
  result: Extract<MoveResult, {kind:'removed'}>;
  manual: string[];
  native: string[];
  bonus: string[];
  newlyFree: string[];
}
export interface SingleChoice { root: string; native: string[]; newlyFree: string[]; }

/** Stable local geometry identity, not an authorization/security signature. */
export function localIdentity(raw: string): string {
  let a=2166136261,b=5381;
  for(let i=0;i<raw.length;i++){a=Math.imul(a^raw.charCodeAt(i),16777619);b=Math.imul(b,33)^raw.charCodeAt(i);}
  return `${(a>>>0).toString(16)}${(b>>>0).toString(16)}`;
}
export function contentKey(level: Level): string {return `content-${localIdentity(JSON.stringify([level.id,level.contentVersion,level.width,level.height,level.arrows,level.mask]))}`;}
const freeIds = (board: Board): string[] => {const remaining=board.remaining;return remaining.filter(a=>canExit(a,remaining)).map(a=>a.id);};
const copy = (board: Board): Board => new Board(board.level,board.attemptId,board.snapshot());

export function routePending(board:Board,plan:HelpPlan):string[]{
  const removed=new Set(board.snapshot().removed);
  if(plan.target&&removed.has(plan.target))return[];
  return (plan.route??[]).filter(id=>!removed.has(id));
}
export function routeCurrent(board:Board,plan:HelpPlan):string|null {
  const pending=new Set(routePending(board,plan));return (plan.route??[]).find(id=>pending.has(id)&&board.remaining.some(a=>a.id===id&&canExit(a,board.remaining)))??null;
}
/** Bounded local search of actual manual activations, never an autoplay rule.
 * Only newly freed ordinary participants extend the route. No optimality claim. */
export function routePlan(board:Board,maxSteps=3):HelpPlan|null {
  if(board.hearts===0||board.complete||maxSteps<1)return null;
  const make=(route:string[]):HelpPlan=>({kind:'route-v1',root:route[0]!,target:route.at(-1)!,route,bonus:[],budget:route.length,basis:board.snapshot(),contentKey:contentKey(board.level)});
  if(maxSteps===1){const single=chooseSingle(board),root=single&&!board.isError(single.root)?single.root:board.remaining.find(a=>!board.isError(a.id)&&canExit(a,board.remaining))?.id;return root?make([root]):null;}
  const initialFree=new Set(freeIds(board));let fallback:HelpPlan|null=null,nodes=0;
  for(const root of board.remaining.filter(a=>initialFree.has(a.id)&&!board.isError(a.id))){
    const causal=descendants(board,root.id);if(!causal.size)continue;
    const after=copy(board);after.activate(root.id);nodes++;
    const choices=after.remaining.filter(a=>!after.isError(a.id)&&canExit(a,after.remaining)).sort((a,b)=>Number(initialFree.has(a.id))-Number(initialFree.has(b.id)));
    for(const second of choices){
      if(!initialFree.has(second.id)&&causal.has(second.id)){fallback??=make([root.id,second.id]);if(maxSteps===2)return fallback;}
      if(maxSteps===2)continue;
      const next=copy(after);next.activate(second.id);nodes++;
      const before=new Set(freeIds(after));
      const target=next.remaining.find(a=>causal.has(a.id)&&!initialFree.has(a.id)&&!before.has(a.id)&&!next.isError(a.id)&&canExit(a,next.remaining));
      if(target)return make([root.id,second.id,target.id]);if(nodes>=256)return fallback;
    }
    if(nodes>=256)break;
  }
  return fallback;
}

/** Uses the actual activation/marked closure; existing free moves are excluded. */
export function chooseSingle(board: Board, visible: ReadonlySet<string> = new Set()): SingleChoice | null {
  if(board.hearts===0 || board.complete)return null;
  const before=new Set(freeIds(board));
  let best:SingleChoice|null=null;
  for(const arrow of board.remaining){
    if(!before.has(arrow.id))continue;
    const candidate=copy(board),result=candidate.activate(arrow.id);
    if(result.kind!=='removed')continue;
    const choice={root:arrow.id,native:(result.released??[]).map(a=>a.id),newlyFree:freeIds(candidate).filter(id=>!before.has(id)&&!candidate.isError(id))};
    if(!best || choice.native.length>best.native.length || choice.native.length===best.native.length &&
      (choice.newlyFree.length>best.newlyFree.length || choice.newlyFree.length===best.newlyFree.length && visible.has(choice.root)&&!visible.has(best.root)))best=choice;
  }
  return best;
}

/** Current ray dependencies; this is computed on state changes, never per frame. */
function descendants(board: Board, root: string): Set<string> {
  const remaining=board.remaining,dependents=new Map<string,string[]>();
  for(const arrow of remaining){
    const head=arrow.path.at(-1)!,direction=measurePath(arrow.path).direction;
    for(const blocker of remaining)if(blocker.id!==arrow.id&&rayHitsPath(head,direction,blocker.path)){
      const rows=dependents.get(blocker.id)??[];rows.push(arrow.id);dependents.set(blocker.id,rows);
    }
  }
  const result=new Set<string>(),queue=[root];
  for(let i=0;i<queue.length;i++)for(const id of dependents.get(queue[i]!)??[])if(!result.has(id)){result.add(id);queue.push(id);}
  result.delete(root);return result;
}

export function singlePlan(board: Board, legacy = false, visible?: ReadonlySet<string>): HelpPlan | null {
  const root=legacy?board.hint():chooseSingle(board,visible)?.root;
  return root?{kind:legacy?'legacy-single':'single-v2',root,bonus:[],budget:0,basis:board.snapshot(),contentKey:contentKey(board.level)}:null;
}

/** Prefer a small connected group; exact-budget claims cannot silently shrink. */
export function cascadePlan(board: Board, options: {root?:string;budget?:number} = {}): HelpPlan | null {
  if(board.hearts===0||board.complete || options.budget!==undefined&&(!Number.isInteger(options.budget)||options.budget<2||options.budget>4))return null;
  const remaining=board.remaining,initiallyFree=new Set(freeIds(board));
  const roots=remaining.filter(a=>initiallyFree.has(a.id)&&!board.isError(a.id)&&(!options.root||a.id===options.root));
  let best:HelpPlan|null=null;
  for(const root of roots){
    const causal=descendants(board,root.id),candidate=copy(board),bonus:string[]=[];
    candidate.activate(root.id);
    const budget=options.budget??3;
    while(bonus.length<budget){
      const current=candidate.remaining;
      const next=current.find(a=>causal.has(a.id)&&!initiallyFree.has(a.id)&&!board.isError(a.id)&&canExit(a,current));
      if(!next)break;
      const result=candidate.activate(next.id);if(result.kind!=='removed')throw Error('Invalid cascade construction');bonus.push(next.id);
    }
    if(bonus.length<2 || options.budget!==undefined&&bonus.length!==options.budget)continue;
    const plan:HelpPlan={kind:'cascade-v1',root:root.id,bonus,budget:bonus.length,basis:board.snapshot(),contentKey:contentKey(board.level)};
    if(!best||plan.bonus.length>best.bonus.length)best=plan;
  }
  return best;
}

/** Validate the promised original group independently of later errors/removals. */
export function validatePlan(level: Level, plan: HelpPlan): void {
  if(!plan||!['legacy-single','single-v2','cascade-v1','route-v1'].includes(plan.kind)||plan.contentKey!==contentKey(level)||
    plan.basis.levelId!==level.id||plan.basis.contentVersion!==level.contentVersion||!Array.isArray(plan.bonus)||
    new Set([plan.root,...plan.bonus]).size!==1+plan.bonus.length)throw Error('Invalid help identity');
  if(!Array.isArray(plan.basis.removed)||!Array.isArray(plan.basis.errors)||new Set(plan.basis.removed).size!==plan.basis.removed.length||
    new Set(plan.basis.errors).size!==plan.basis.errors.length||!Number.isInteger(plan.basis.lives)||plan.basis.lives<0||plan.basis.lives>3||
    (plan.basis.errors.length+plan.basis.lives)%3!==0)throw Error('Invalid help basis');
  const history=[...level.arrows],ids=new Set(history.map(a=>a.id));
  if(plan.basis.errors.some(id=>!ids.has(id)))throw Error('Invalid help error history');
  for(const id of plan.basis.removed){const i=history.findIndex(a=>a.id===id);if(i<0||!canExit(history[i]!,history))throw Error('Invalid help move history');history.splice(i,1);}
  const basis=new Board(level,plan.basis.id,plan.basis),remaining=basis.remaining;
  const root=remaining.find(a=>a.id===plan.root);if(!root||basis.hearts===0&&plan.kind!=='legacy-single'||!canExit(root,remaining))throw Error('Invalid help root');
  if(plan.kind==='route-v1'){
    const route=plan.route;if(!route||route.length<1||route.length>3||plan.budget!==route.length||new Set(route).size!==route.length||route[0]!==plan.root||route.at(-1)!==plan.target||plan.bonus.length)throw Error('Invalid manual route');
    const target=remaining.find(a=>a.id===plan.target);if(!target||route.length>1&&canExit(target,remaining))throw Error('Route target must start blocked');
    for(const id of route){if(basis.snapshot().removed.includes(id)||basis.isError(id)||basis.activate(id).kind!=='removed')throw Error('Illegal manual route');}
    return;
  }
  if(plan.kind==='cascade-v1'){
    if(plan.budget!==plan.bonus.length||plan.budget<2||plan.budget>4||basis.isError(root.id))throw Error('Invalid cascade budget');
    const causal=descendants(basis,root.id);
    for(const id of plan.bonus){const a=remaining.find(a=>a.id===id);if(!a||basis.isError(id)||canExit(a,remaining)||!causal.has(id))throw Error('Invalid cascade member');}
  } else if(plan.bonus.length||plan.budget!==0)throw Error('Invalid single budget');
  if(plan.kind!=='legacy-single'&&!predictHelp(basis,plan,false))throw Error('Illegal promised help order');
}

/** A2 commits this complete result once; delays belong only to its presenter. */
export function predictHelp(board: Board, plan: HelpPlan, validate = true): HelpPrediction | null {
  if(validate)validatePlan(board.level,plan);
  if(board.hearts===0||board.complete||board.snapshot().removed.includes(plan.root))return null;
  const before=new Set(freeIds(board)),candidate=copy(board),first=candidate.activate(plan.root);
  if(first.kind!=='removed')return null;
  const native=(first.released??[]).map(a=>a.id),bonus:string[]=[];
  for(const id of plan.bonus){
    if(candidate.snapshot().removed.includes(id))continue;
    const next=candidate.activate(id);if(next.kind!=='removed')return null;
    bonus.push(id);native.push(...(next.released??[]).map(a=>a.id));
  }
  const initial=new Set(board.snapshot().removed),removed=candidate.snapshot().removed.filter(id=>!initial.has(id)&&id!==plan.root),byId=new Map(board.level.arrows.map(a=>[a.id,a]));
  return {board:candidate,result:{kind:'removed',arrow:first.arrow,complete:candidate.complete,...(removed.length?{released:removed.map(id=>byId.get(id)!)}:{})},
    manual:[plan.root],native,bonus,newlyFree:freeIds(candidate).filter(id=>!before.has(id)&&!candidate.isError(id))};
}
