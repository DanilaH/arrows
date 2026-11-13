import { Board } from '../domain/board';
import { cascadePlan, routePlan, routePending, routeCurrent, contentKey, localIdentity, singlePlan, validatePlan, type HelpKind, type HelpPlan, type HelpVariant } from '../domain/assistance';
import { parseReceipt, type EarnedReceipt } from '../platform/ads';
import type { GameSave, SavedAttempt } from './save';

export interface HelpOwner { attempt: string; mode: 'campaign'|'daily'; levelId: string; contentVersion: number; contentKey: string; }
export interface HelpOffer { id: string; owner: HelpOwner; variant: HelpVariant; kind: HelpKind|'lives'; amount: number; plan: HelpPlan|null; fallback: string; }
export interface HelpRequest extends HelpOffer { schema: 2; intentVersion: 1; requestId: string; assignmentId: string; createdAt: number; }
export interface HelpRight {
  id: string; origin: 'sdk'|'legacy-save'; receiptId: string|null; requestId: string|null;
  originalOwner: HelpOwner; owner: HelpOwner|null; kind: HelpKind|'lives'; version: 1; amount: number;
  plan: HelpPlan|null; status: 'active'|'reserved'|'used'; claimId?: string;
  operation?: {id:string;manual:string[];native:string[];bonus:string[]};
}
export interface HelpLedger {
  version: 1; installId: string; nextVariant: HelpVariant; candidateEnabled: boolean;
  assignments: Record<string,HelpVariant>; requests: Record<string,HelpRequest>; rights: Record<string,HelpRight>;
  unresolved: EarnedReceipt[];
  enrollments:Record<string,{variant:HelpVariant;at:number;qa:boolean}>;
  continues:Record<string,{attempt:string;startedAt:number;firstMove:boolean;closed:boolean}>;
}
export interface ContinueFact {id:string;entitlement:string;attempt:string;outcome:string;activeMs:number;}
export interface HelpFact { id:string; phase:'request'|'grant'|'reserve'|'claim'|'use'|'unresolved'|'assignment'|'progress'; entitlement:string; request:string; sourceAttempt:string; attempt:string; kind:string; variant:string; manual:number; native:number; bonus:number; }
const validId=(v:unknown):v is string=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
const variant=(v:unknown):v is HelpVariant=>v==='legacy'||v==='single-v2'||v==='cascade-v1'||v==='route-v1';
const kind=(v:unknown):v is HelpRight['kind']=>v==='lives'||v==='legacy-single'||v==='single-v2'||v==='cascade-v1'||v==='route-v1';
export function freshHelpLedger(installId:string=crypto.randomUUID()):HelpLedger{return {version:1,installId,nextVariant:'single-v2',candidateEnabled:true,assignments:{},requests:{},rights:{},unresolved:[],enrollments:{},continues:{}};}
export const assignmentId=(ledger:HelpLedger,variant:HelpVariant):string=>`assignment-${localIdentity(ledger.installId+':'+variant)}`;
export function beginContinue(ledger:HelpLedger,a:SavedAttempt,id:string):void{ledger.continues[id]??={attempt:a.board.id,startedAt:a.activeMs,firstMove:false,closed:false};}
export function continueFacts(ledger:HelpLedger,a:SavedAttempt,outcome:'first_move'|'repeat_loss'|'exit'|'restart'|'completed'):ContinueFact[]{
  const rows:ContinueFact[]=[];
  for(const [id,r]of Object.entries(ledger.continues))if(r.attempt===a.board.id&&!r.closed){
    if(outcome==='first_move'&&r.firstMove)continue;
    const name=outcome==='exit'?r.firstMove?'exit_after_move':'exit_before_move':outcome;
    if(outcome==='first_move')r.firstMove=true;else r.closed=true;
    rows.push({id:`${id}-${name}`,entitlement:id,attempt:r.attempt,outcome:name,activeMs:Math.max(0,a.activeMs-r.startedAt)});
  }
  return rows;
}
export function ownerOf(a:SavedAttempt,mode:HelpOwner['mode']):HelpOwner{return {attempt:a.board.id,mode,levelId:a.level.id,contentVersion:a.level.contentVersion,contentKey:contentKey(a.level)};}
export function sameOwner(a:HelpOwner,b:HelpOwner):boolean{return a.attempt===b.attempt&&a.mode===b.mode&&a.levelId===b.levelId&&a.contentVersion===b.contentVersion&&a.contentKey===b.contentKey;}
export function activeRight(save:GameSave,attempt:string):HelpRight|null{return Object.values(save.helpLedger.rights).find(r=>r.status==='active'&&r.owner?.attempt===attempt)??null;}
export function fact(phase:HelpFact['phase'],r:HelpRight,target=r.owner?.attempt??r.originalOwner.attempt):HelpFact{
  const op=r.operation;return {id:`${r.id}-${phase}-${phase==='claim'?r.claimId??'0':phase==='use'||phase==='progress'?op?.id??'0':'0'}`,phase,entitlement:r.id,request:r.requestId??'',sourceAttempt:r.originalOwner.attempt,attempt:target,kind:r.kind,variant:'',manual:op?.manual.length??0,native:op?.native.length??0,bonus:op?.bonus.length??0};
}
export function makeOffer(save:GameSave,a:SavedAttempt,mode:HelpOwner['mode'],placement:'hint'|'lives',visible?:ReadonlySet<string>):HelpOffer|null{
  const ledger=save.helpLedger,owner=ownerOf(a,mode),assigned=ledger.assignments[a.board.id]??'single-v2',b=new Board(a.level,a.board.id,a.board);
  if(b.complete)return null;
  if(placement==='lives')return b.hearts===0?{id:`offer-${localIdentity(a.board.id+'-lives')}`,owner,variant:assigned,kind:'lives',amount:3,plan:null,fallback:''}:null;
  if(b.hearts===0||a.hint||activeRight(save,a.board.id))return null;
  let plan:HelpPlan|null=null,fallback='';
  if(assigned==='route-v1'&&ledger.candidateEnabled){plan=routePlan(b);if(!plan)fallback='no_short_route';}
  else if(assigned==='route-v1')fallback='candidate_disabled';
  else if(assigned==='cascade-v1'&&ledger.candidateEnabled){plan=cascadePlan(b);if(!plan)fallback='no_causal_group';}
  else if(assigned==='cascade-v1')fallback='candidate_disabled';
  plan??=singlePlan(b,assigned==='legacy',visible);if(!plan)return null;
  return {id:`offer-${localIdentity(JSON.stringify([owner,plan]))}`,owner,variant:assigned,kind:plan.kind,amount:plan.kind==='cascade-v1'||plan.kind==='route-v1'?plan.budget:1,plan,fallback};
}
function checkOwner(o:HelpOwner):void{if(!o||!validId(o.attempt)||!['campaign','daily'].includes(o.mode)||!validId(o.levelId)||!Number.isInteger(o.contentVersion)||o.contentVersion<1||!validId(o.contentKey))throw Error('Invalid help owner');}
function checkBudget(k:HelpRight['kind'],n:number):void{if(!Number.isInteger(n)||(k==='cascade-v1'?n<2||n>4:k==='route-v1'?n<1||n>3:k==='lives'?n!==3:n!==1))throw Error('Invalid help amount');}

/** Additive schema2 migration; no receipt/request identity is invented for old hints. */
export function decodeHelpLedger(value:unknown,campaign:SavedAttempt,daily:Record<string,SavedAttempt>,reserved:EarnedReceipt[]):HelpLedger{
  const ledger=value===undefined?freshHelpLedger(`legacy-${localIdentity(campaign.board.id)}`):structuredClone(value) as HelpLedger;
  if(!ledger||ledger.version!==1||!validId(ledger.installId)||!variant(ledger.nextVariant)||typeof ledger.candidateEnabled!=='boolean'||
    !ledger.assignments||typeof ledger.assignments!=='object'||!ledger.requests||typeof ledger.requests!=='object'||!ledger.rights||typeof ledger.rights!=='object'||!Array.isArray(ledger.unresolved))throw Error('Invalid help ledger');
  ledger.enrollments??={};ledger.continues??={};
  for(const [id,e]of Object.entries(ledger.enrollments))if(!validId(id)||!variant(e.variant)||!Number.isFinite(e.at)||e.at<0||typeof e.qa!=='boolean')throw Error('Invalid assistance enrollment');
  for(const [id,e]of Object.entries(ledger.continues))if(!validId(id)||!validId(e.attempt)||!Number.isFinite(e.startedAt)||e.startedAt<0||typeof e.firstMove!=='boolean'||typeof e.closed!=='boolean')throw Error('Invalid continuation result');
  for(const [id,v]of Object.entries(ledger.assignments))if(!validId(id)||!variant(v))throw Error('Invalid help assignment');
  for(const [id,r]of Object.entries(ledger.requests)){
    if(!validId(id)||r.requestId!==id||r.schema!==2||r.intentVersion!==1||!variant(r.variant)||!kind(r.kind)||!validId(r.assignmentId)||!validId(r.id)||!Number.isFinite(r.createdAt)||r.createdAt<0)throw Error('Invalid help request');
    checkOwner(r.owner);checkBudget(r.kind,r.amount);
    if(r.kind!=='lives'&&(!r.plan||r.plan.kind!==r.kind||r.plan.contentKey!==r.owner.contentKey))throw Error('Invalid promised plan');
  }
  for(const [id,r]of Object.entries(ledger.rights)){
    if(!validId(id)||r.id!==id||!kind(r.kind)||r.version!==1||!['active','reserved','used'].includes(r.status)||!['sdk','legacy-save'].includes(r.origin)||
      r.receiptId!==null&&!validId(r.receiptId)||r.requestId!==null&&!validId(r.requestId))throw Error('Invalid earned help');
    checkOwner(r.originalOwner);if(r.owner)checkOwner(r.owner);checkBudget(r.kind,r.amount);
    if(r.plan&&(r.plan.kind!==r.kind||r.kind==='cascade-v1'&&r.plan.budget!==r.amount))throw Error('Help amount changed');
    if(r.kind==='route-v1'&&r.status==='active'&&r.plan&&r.plan.budget>r.amount)throw Error('Route exceeds paid limit');
    if(r.status==='active'&&(!r.owner||r.kind==='lives'||!r.plan||r.plan.kind!==r.kind))throw Error('Invalid active help');
  }
  const attempts:[SavedAttempt,HelpOwner['mode']][]=[[campaign,'campaign'],...Object.values(daily).map(a=>[a,'daily'] as [SavedAttempt,HelpOwner['mode']])];
  for(const [a,mode]of attempts){
    ledger.assignments[a.board.id]??=ledger.nextVariant;
    const active=Object.values(ledger.rights).filter(r=>r.status==='active'&&r.owner?.attempt===a.board.id);
    if(active.length>1)throw Error('Conflicting active assistance');
    if(active[0]){
      const right=active[0];if(!sameOwner(right.owner!,ownerOf(a,mode))||(right.kind==='route-v1'?routeCurrent(new Board(a.level,a.board.id,a.board),right.plan!):right.plan?.root)!==a.hint)throw Error('Assistance slot mismatch');
      validatePlan(a.level,right.plan!);
    }else if(a.hint){
      // Stable local origin. This is not an SDK receipt or a new grant event.
      const id=`legacy-${localIdentity(a.board.id+':'+a.hint)}`,owner=ownerOf(a,mode);
      if(ledger.rights[id])throw Error('Conflicting legacy help identity');
      ledger.rights[id]={id,origin:'legacy-save',receiptId:null,requestId:null,originalOwner:owner,owner,kind:'legacy-single',version:1,amount:1,status:'active',
        plan:{kind:'legacy-single',root:a.hint,bonus:[],budget:0,basis:a.board,contentKey:owner.contentKey}};
    }
  }
  ledger.unresolved=ledger.unresolved.map(parseReceipt);
  if(new Set(ledger.unresolved.map(r=>r.id)).size!==ledger.unresolved.length)throw Error('Duplicate unresolved receipt');
  for(const receipt of reserved){
    if(ledger.rights[receipt.id]||ledger.unresolved.some(r=>r.id===receipt.id))continue;
    // Only genuine schema1 is recoverable without a descriptor.
    if(receipt.schema!==1){ledger.unresolved.push(receipt);continue;}
    const a=attempts.find(([a])=>a.board.id===receipt.attempt)?.[0],owner:HelpOwner=a?ownerOf(a,receipt.mode):{attempt:receipt.attempt,mode:receipt.mode,levelId:'legacy-retired',contentVersion:1,contentKey:'legacy-unknown'};
    ledger.rights[receipt.id]={id:receipt.id,origin:'sdk',receiptId:receipt.id,requestId:null,originalOwner:owner,owner:null,kind:receipt.placement==='hint'?'legacy-single':'lives',version:1,amount:receipt.placement==='hint'?1:3,plan:null,status:'reserved'};
  }
  return ledger;
}
export function reserveAttempt(save:GameSave,attempt:string):HelpFact[]{
  const r=activeRight(save,attempt);if(!r)return[];
  if(r.kind==='route-v1'&&r.plan){const a=[save.campaign,...Object.values(save.daily)].find(a=>a.board.id===attempt);if(a)r.amount=routePending(new Board(a.level,attempt,a.board),r.plan).length;if(r.amount===0){r.status='used';return[fact('use',r,attempt)];}}
  r.status='reserved';r.owner=null;
  if(r.receiptId&&!save.reservedRewards.some(receipt=>receipt.id===r.receiptId)){
    const base={id:r.receiptId,attempt:r.originalOwner.attempt,mode:r.originalOwner.mode,placement:r.kind==='lives'?'lives' as const:'hint' as const};
    save.reservedRewards.push(r.requestId?{...base,schema:2,intentVersion:1,requestId:r.requestId}:{...base,schema:1});
  }
  return[fact('reserve',r,attempt)];
}
export function applyRight(save:GameSave,a:SavedAttempt,mode:HelpOwner['mode'],right:HelpRight,replan=false):boolean{
  const b=new Board(a.level,a.board.id,a.board);if(b.complete)return false;
  if(right.kind==='lives'){
    if(b.hearts!==0)return false;
    a.board={...a.board,lives:3};a.freeUsed=true;a.continuations++;right.status='used';right.owner=ownerOf(a,mode);beginContinue(save.helpLedger,a,right.id);return true;
  }
  if(b.hearts===0||a.hint||activeRight(save,a.board.id))return false;
  let plan=right.plan;
  if(replan)plan=right.kind==='route-v1'?routePlan(b,right.amount):right.kind==='cascade-v1'?cascadePlan(b,{budget:right.amount}):singlePlan(b,right.kind==='legacy-single');
  if(!plan||plan.kind!==right.kind||!b.remaining.some(a=>a.id===plan!.root))return false;
  validatePlan(a.level,plan);right.plan=plan;right.owner=ownerOf(a,mode);right.status='active';a.hint=right.kind==='route-v1'?routeCurrent(b,plan):plan.root;return true;
}
export function compatibleReserve(save:GameSave,a:SavedAttempt,mode:HelpOwner['mode']):HelpRight|null{
  const board=new Board(a.level,a.board.id,a.board),budgets=new Map<number,boolean>();
  if(board.complete)return null;
  for(const r of Object.values(save.helpLedger.rights))if(r.status==='reserved'){
    if(r.kind==='lives'){if(board.hearts===0)return r;continue;}
    if(board.hearts===0||a.hint||activeRight(save,a.board.id))continue;
    if(r.kind==='route-v1'){const key=-r.amount;if(!budgets.has(key))budgets.set(key,!!routePlan(board,r.amount));if(budgets.get(key))return r;continue;}
    if(r.kind!=='cascade-v1')return r;
    if(!budgets.has(r.amount))budgets.set(r.amount,!!cascadePlan(board,{budget:r.amount}));
    if(budgets.get(r.amount))return r;
  }
  return null;
}
