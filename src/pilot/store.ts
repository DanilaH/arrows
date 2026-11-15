import {canExit,type Attempt,type Level} from '../domain/board';
export const PILOT_KEY='arrows.qa.content-pilot.boards.v1';
export type PilotVariant='candidate'|'baseline';
interface PilotSave{version:1;index:number;boards:Record<string,Attempt>;}
const fresh=():PilotSave=>({version:1,index:0,boards:{}});
/** Optional QA resume, bounded to the frozen 27 fields × 2 variants. No product rewards/results. */
export function validPilotAttempt(b:Attempt,level:Level):boolean{
 if(!b||typeof b.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(b.id)||b.levelId!==level.id||b.contentVersion!==level.contentVersion||!Array.isArray(b.removed)||!Array.isArray(b.errors)||new Set(b.errors).size!==b.errors.length||b.errors.length>3||b.lives!==3-b.errors.length||b.errors.some(id=>!level.arrows.some(a=>a.id===id)))return false;
 const remaining=[...level.arrows];for(const id of b.removed){const at=remaining.findIndex(a=>a.id===id);if(at<0||!canExit(remaining[at]!,remaining))return false;remaining.splice(at,1);}return true;
}
export function createPilotStore(storage:Pick<Storage,'getItem'|'setItem'>,banks:Record<PilotVariant,readonly Level[]>){
 let state=fresh(),failed=false;
 try{const raw=storage.getItem(PILOT_KEY);if(raw){const s=JSON.parse(raw) as PilotSave;if(s.version!==1||!Number.isInteger(s.index)||s.index<0||s.index>=27||!s.boards||Object.keys(s.boards).length>54)throw Error('Invalid pilot save');
  for(const [key,b]of Object.entries(s.boards)){const match=/^(candidate|baseline):(\d+)$/.exec(key),level=match&&banks[match[1] as PilotVariant][Number(match[2])];if(!level||!validPilotAttempt(b,level))throw Error('Invalid pilot board');}state=s;}
 }catch{failed=true;}
 return{
  get index(){return state.index;},get failed(){return failed;},
  restore(variant:PilotVariant,index:number){return state.boards[`${variant}:${index}`];},
  save(variant:PilotVariant,index:number,board:Attempt){const level=banks[variant][index];if(!level||!validPilotAttempt(board,level))throw Error('Invalid pilot write');state.index=index;state.boards[`${variant}:${index}`]=board;try{storage.setItem(PILOT_KEY,JSON.stringify(state));failed=false;}catch{failed=true;}},
 };
}
