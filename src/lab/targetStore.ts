import type {StorageAdapter} from '@danilah/mini-games-kit/platform';
import {Board,canExit,validateLevel,type Attempt,type Level,type MoveResult} from '../domain/board';
import {singlePlan} from '../domain/assistance';
import catalogue from './challenges.json' with {type:'json'};
export const TARGET_KEY='arrows.target-lab.v1';
export type LabHelp='none'|'single';
export interface TargetChallenge {id:string;version:1;source:{id:string;version:number};goal:string;level:Level;}
export const targetChallenges=catalogue as TargetChallenge[];
export interface TargetAttempt {level:Level;goal:string;board:Attempt;helpMode:LabHelp;helpUsed:boolean;hint:string|null;}
export interface TargetResult {id:string;attempt:string;goal:string;completedAt:number;mistakes:number;remaining:number;}
export interface TargetSave {version:1;index:number;nextHelp:LabHelp;attempts:Record<string,TargetAttempt>;results:Record<string,TargetResult>;}
export const targetFinished=(a:TargetAttempt):boolean=>a.board.removed.includes(a.goal);
function fresh(challenge:TargetChallenge,mode:LabHelp):TargetAttempt{return{level:challenge.level,goal:challenge.goal,board:new Board(challenge.level,crypto.randomUUID()).snapshot(),helpMode:mode,helpUsed:false,hint:null};}
export function freshTargetSave():TargetSave{return{version:1,index:0,nextHelp:'none',attempts:{'b1-01':fresh(targetChallenges[0]!,'none')},results:{}};}
const validId=(x:unknown):x is string=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
export function decodeTargetSave(raw:unknown):TargetSave {
  const s=structuredClone(raw) as TargetSave;if(!s||s.version!==1||!Number.isInteger(s.index)||s.index<0||s.index>=targetChallenges.length||!['none','single'].includes(s.nextHelp)||!s.attempts||!s.results)throw Error('Invalid target lab save');
  for(const [id,a]of Object.entries(s.attempts)){
    const c=targetChallenges.find(c=>c.id===id);if(!c||a.goal!==c.goal||JSON.stringify(a.level)!==JSON.stringify(c.level)||!validId(a.board.id)||a.board.levelId!==id||a.board.contentVersion!==c.version||!['none','single'].includes(a.helpMode)||typeof a.helpUsed!=='boolean')throw Error('Invalid target attempt');
    validateLevel(a.level);const b=a.board,ids=new Set(a.level.arrows.map(a=>a.id));
    if(!Array.isArray(b.removed)||!Array.isArray(b.errors)||new Set(b.removed).size!==b.removed.length||new Set(b.errors).size!==b.errors.length||b.errors.some(id=>!ids.has(id))||b.lives!==3-b.errors.length||b.lives<0)throw Error('Invalid target history');
    const remaining=[...a.level.arrows];for(const id of b.removed){const at=remaining.findIndex(a=>a.id===id);if(at<0||!canExit(remaining[at]!,remaining))throw Error('Illegal target removal');remaining.splice(at,1);}
    if(a.hint!==null&&(!validId(a.hint)||!a.helpUsed||!remaining.some(x=>x.id===a.hint&&canExit(x,remaining))))throw Error('Invalid target QA hint');
    if(a.helpMode==='none'&&(a.hint!==null||a.helpUsed))throw Error('Mixed target help variant');
    if(targetFinished(a)&&!s.results[id])throw Error('Target result missing');
  }
  if(!s.attempts[targetChallenges[s.index]!.id])throw Error('Missing selected target');
  for(const [id,r]of Object.entries(s.results))if(!targetChallenges.some(c=>c.id===id&&c.goal===r.goal)||r.id!==id||!validId(r.attempt)||!Number.isSafeInteger(r.completedAt)||r.completedAt<0||!Number.isInteger(r.mistakes)||r.mistakes<0||r.mistakes>3||!Number.isInteger(r.remaining)||r.remaining<0)throw Error('Invalid target result');
  return s;
}
/** A separate, small lab writer. It never imports or writes campaign/daily/cadence. */
export class TargetLabStore {
  public state=freshTargetSave();public uncertain=false;public error=false;
  private tail:Promise<unknown>=Promise.resolve();
  public constructor(private readonly storage:StorageAdapter,private readonly now=()=>Date.now()){}
  public get current():TargetAttempt{return this.state.attempts[targetChallenges[this.state.index]!.id]!;}
  public get board():Board{const a=this.current;return new Board(a.level,a.board.id,a.board);}
  public async load():Promise<void>{const raw=await this.storage.getItem(TARGET_KEY);this.state=raw===null?freshTargetSave():decodeTargetSave(JSON.parse(raw));this.uncertain=false;this.error=false;}
  private update<T>(change:(s:TargetSave)=>T):Promise<T>{
    const action=this.tail.then(async()=>{
      if(this.uncertain)throw Error('Target save outcome unknown');const next=structuredClone(this.state),result=change(next);decodeTargetSave(next);
      try{await this.storage.setItem(TARGET_KEY,JSON.stringify(next));}
      catch{
        let confirmed=false;
        try{const raw=await this.storage.getItem(TARGET_KEY);if(raw===JSON.stringify(next)){this.state=next;this.error=false;return result;}if(raw===null||JSON.stringify(decodeTargetSave(JSON.parse(raw)))===JSON.stringify(this.state)){confirmed=true;throw Error('Target write failed');}}catch(error){if(confirmed){this.error=true;throw error;}}
        this.error=true;this.uncertain=true;throw Error('Target save outcome unknown');
      }
      this.state=next;this.error=false;return result;
    });this.tail=action.catch(()=>undefined);return action;
  }
  public move(id:string,expected=this.current.board.id):Promise<MoveResult>{return this.update(s=>{
    const key=targetChallenges[s.index]!.id,a=s.attempts[key]!;if(a.board.id!==expected||targetFinished(a))return{kind:'ignored'};
    const b=new Board(a.level,a.board.id,a.board),result=b.activate(id);a.board=b.snapshot();if(a.hint&&a.board.removed.includes(a.hint))a.hint=null;
    if(targetFinished(a))s.results[key]??={id:key,attempt:a.board.id,goal:a.goal,completedAt:this.now(),mistakes:a.board.errors.length,remaining:b.remaining.length};return result;
  });}
  public select(index:number):Promise<void>{return this.update(s=>{if(!Number.isInteger(index)||!targetChallenges[index])throw Error('Invalid target choice');s.index=index;const c=targetChallenges[index]!;s.attempts[c.id]??=fresh(c,s.nextHelp);});}
  public restart():Promise<void>{return this.update(s=>{const c=targetChallenges[s.index]!;s.attempts[c.id]=fresh(c,s.nextHelp);});}
  public nextHelp(mode:LabHelp):Promise<void>{return this.update(s=>{if(!['none','single'].includes(mode))throw Error('Invalid QA help');s.nextHelp=mode;});}
  public hint():Promise<boolean>{return this.update(s=>{const a=s.attempts[targetChallenges[s.index]!.id]!;if(a.helpMode!=='single'||a.helpUsed||a.board.lives===0||targetFinished(a))return false;const b=new Board(a.level,a.board.id,a.board),plan=singlePlan(b);if(!plan)return false;a.helpUsed=true;a.hint=plan.root;return true;});}
  public flush():Promise<unknown>{return this.tail;}
}
