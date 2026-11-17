import type {StorageAdapter} from '@danilah/mini-games-kit/platform';
import type {GameSave,SavedAttempt} from './save';
import type {Level} from '../domain/board';
import {immutableLevel} from './saveDraft';

export const ARCHIVE_PREFIX='arrows.archive.';
export const INLINE_BYTES=512*1024;
const PART=16384,MAX_BLOCK=128*1024,FORMAT='arrows-progress-archive';
type Hash=string;
type Block={kind:'text';text:string}|{kind:'join';parts:Hash[]}|{kind:'map';entries:Record<string,Hash>}|{kind:'attempt';level:Hash;state:Hash}|{kind:'root';header:Hash;campaign:Hash;daily:Hash};
type ListedStorage=StorageAdapter&{listKeys?(prefix:string):Promise<string[]>};
const bytes=(s:string)=>new TextEncoder().encode(s);
const digest=async(raw:string):Promise<Hash>=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(raw))),n=>n.toString(16).padStart(2,'0')).join('');
const hash=(v:unknown):v is Hash=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const children=(b:Block):Hash[]=>b.kind==='text'?[]:b.kind==='join'?b.parts:b.kind==='map'?Object.values(b.entries):b.kind==='attempt'?[b.level,b.state]:[b.header,b.campaign,b.daily];
const queues=new Map<string,Promise<unknown>>();
async function localLock<T>(key:string,work:()=>Promise<T>):Promise<T>{const old=queues.get(key)??Promise.resolve(),task=old.catch(()=>undefined).then(work);queues.set(key,task);try{return await task;}finally{if(queues.get(key)===task)queues.delete(key);}}
async function locked<T>(key:string,work:()=>Promise<T>):Promise<T>{
  const locks=typeof navigator!=='undefined'?navigator.locks:undefined;
  return locks?locks.request(key,work):localLock(key,work);
}
async function parallel<T,R>(items:T[],work:(item:T)=>Promise<R>):Promise<R[]>{const result:R[]=new Array(items.length);let cursor=0;await Promise.all(Array.from({length:Math.min(8,items.length)},async()=>{while(cursor<items.length){const i=cursor++;result[i]=await work(items[i]!);}}));return result;}

/** Arrows physical format only. Logical schema2 and its decoder stay intact.
 * Immutable blocks are verified first; one small root publication commits the
 * entire result+receipt ledger. Unpublished/old blocks never authorize effects. */
export class ArchiveRepository{
  private token:string|null|undefined;
  /** Exact durable root, for optional read projections. Never an optimistic draft. */
  public get witness(): string | null | undefined { return this.token; }
  private sharded=false;
  private alive=true;
  private graph=new Map<Hash,Hash[]>();
  private rawCache=new Map<Hash,Block>();
  private known=new Set<Hash>();
  private committed=new Set<Hash>();
  private staged=new Set<Hash>();
  private levels=new WeakMap<Level,Hash>();
  private attempts=new WeakMap<SavedAttempt,Hash>();
  private lastAttempts=new Map<string,{signature:string;level:Level;ref:Hash}>();
  private cleanupPending=false;
  private garbage:string[]=[];
  private writes=0;
  public constructor(private readonly storage:ListedStorage,private readonly key:string,private readonly decode:(value:unknown)=>GameSave,private readonly fresh:()=>GameSave){}
  private remember(ref:Hash,block:Block):void{
    this.graph.set(ref,children(block));this.known.add(ref);this.rawCache.delete(ref);this.rawCache.set(ref,block);
    while(this.rawCache.size>128)this.rawCache.delete(this.rawCache.keys().next().value!);
  }
  private async block(ref:Hash):Promise<Block>{
    if(!hash(ref))throw Error('Invalid archive reference');const cached=this.rawCache.get(ref);if(cached)return cached;
    const raw=await this.storage.getItem(ARCHIVE_PREFIX+ref);
    if(raw===null||bytes(raw).length>MAX_BLOCK||await digest(raw)!==ref)throw Error('Missing or damaged archive block');
    const b=JSON.parse(raw) as Block;
    if(!b||!['text','join','map','attempt','root'].includes(b.kind)||children(b).some(r=>!hash(r)))throw Error('Invalid archive block');
    if(b.kind==='text'&&typeof b.text!=='string')throw Error('Invalid archive text');
    this.remember(ref,b);return b;
  }
  private async put(block:Block):Promise<Hash>{
    const raw=JSON.stringify(block);if(bytes(raw).length>MAX_BLOCK)throw Error('Archive block exceeds its budget');
    const ref=await digest(raw);if(this.committed.has(ref)||this.staged.has(ref))return ref;
    try{await this.storage.setItem(ARCHIVE_PREFIX+ref,raw);}catch{if(await this.storage.getItem(ARCHIVE_PREFIX+ref)!==raw)throw Error('Archive block write failed');}
    // Validate the bytes before publishing a reference, including adapters which
    // report success before a disk write or return a truncated value.
    if(await this.storage.getItem(ARCHIVE_PREFIX+ref)!==raw)throw Error('Archive block verification failed');
    this.remember(ref,block);this.staged.add(ref);return ref;
  }
  private async text(raw:string):Promise<Hash>{
    let refs=await parallel(Array.from({length:Math.max(1,Math.ceil(raw.length/PART))},(_,i)=>raw.slice(i*PART,(i+1)*PART)),text=>this.put({kind:'text',text}));
    while(refs.length>1){const groups=Array.from({length:Math.ceil(refs.length/128)},(_,i)=>refs.slice(i*128,(i+1)*128));refs=await parallel(groups,parts=>this.put({kind:'join',parts}));}
    return refs[0]!;
  }
  private async readText(ref:Hash,depth=0):Promise<string>{
    if(depth>8)throw Error('Archive tree too deep');const b=await this.block(ref);
    if(b.kind==='text')return b.text;if(b.kind!=='join'||!b.parts.length)throw Error('Invalid text tree');
    return (await parallel(b.parts,r=>this.readText(r,depth+1))).join('');
  }
  private async map(ref:Hash):Promise<Record<string,Hash>>{const b=await this.block(ref);if(b.kind!=='map'||!b.entries||Array.isArray(b.entries))throw Error('Invalid archive index');return b.entries;}
  private async attempt(a:SavedAttempt):Promise<Hash>{
    const existing=this.attempts.get(a);if(existing&&(this.committed.has(existing)||this.staged.has(existing)))return existing;
    const signature=JSON.stringify({...a,level:null}),prior=this.lastAttempts.get(a.board.id);
    if(prior?.signature===signature&&prior.level===a.level&&(this.committed.has(prior.ref)||this.staged.has(prior.ref))){this.attempts.set(a,prior.ref);return prior.ref;}
    let level=this.levels.get(a.level);if(!level||!this.committed.has(level)&&!this.staged.has(level)){immutableLevel(a.level);level=await this.text(JSON.stringify(a.level));this.levels.set(a.level,level);}
    const state=await this.text(signature),ref=await this.put({kind:'attempt',level,state});
    this.attempts.set(a,ref);this.lastAttempts.set(a.board.id,{signature,level:a.level,ref});return ref;
  }
  private async readAttempt(ref:Hash,levels:Map<Hash,Promise<Level>>):Promise<SavedAttempt>{
    const b=await this.block(ref);if(b.kind!=='attempt')throw Error('Invalid archived attempt');
    let level=levels.get(b.level);if(!level){level=this.readText(b.level).then(s=>immutableLevel(JSON.parse(s) as Level));levels.set(b.level,level);}
    const a={...JSON.parse(await this.readText(b.state)),level:await level} as SavedAttempt;
    this.levels.set(a.level,b.level);this.attempts.set(a,ref);return a;
  }
  private root(raw:string):Hash|null{
    const value=JSON.parse(raw) as Record<string,unknown>;
    if(value.schema!==undefined)return null;
    if(value.format!==FORMAT||value.version!==1||!hash(value.root))throw Error('Unsupported archive format');return value.root;
  }
  private async read(raw:string|null):Promise<GameSave>{
    if(raw===null)return this.fresh();const root=this.root(raw);if(!root)return this.decode(JSON.parse(raw));
    const b=await this.block(root);if(b.kind!=='root')throw Error('Invalid archive root');
    const header=JSON.parse(await this.readText(b.header)),levels=new Map<Hash,Promise<Level>>(),daily:Record<string,SavedAttempt>={};
    const years=await this.map(b.daily);
    for(const [year,ref]of Object.entries(years)){
      if(!/^20\d\d$|^21\d\d$|^2200$/.test(year))throw Error('Invalid archive year');
      const months=await this.map(ref);
      for(const [month,monthRef]of Object.entries(months)){
        if(!month.startsWith(year+'-'))throw Error('Invalid archive month');const days=await this.map(monthRef);
        const entries=await parallel(Object.entries(days),async([date,attemptRef])=>{if(!date.startsWith(month+'-'))throw Error('Invalid archive date');return [date,await this.readAttempt(attemptRef,levels)] as const;});
        for(const [date,a]of entries)daily[date]=a;
      }
    }
    if(!Array.isArray(header.daily)||header.daily.length!==Object.keys(daily).length||new Set(header.daily).size!==header.daily.length||header.daily.some((d:unknown)=>typeof d!=='string'||!Object.hasOwn(daily,d)))throw Error('Invalid archive ordering');
    return this.decode({...header,campaign:await this.readAttempt(b.campaign,levels),daily:Object.fromEntries(header.daily.map((date:string)=>[date,daily[date]!]))});
  }
  public load():Promise<GameSave>{return locked(this.key,async()=>{
    this.reset();const raw=await this.storage.getItem(this.key);this.token=raw;const state=await this.read(raw),root=raw===null?null:this.root(raw);this.sharded=root!==null;if(root)this.committed=this.reachable(root);
    // Large legacy values migrate before gameplay/receipt processing is enabled.
    // A failed migration leaves the original root available for a later retry.
    if(raw!==null&&!this.sharded&&bytes(raw).length>INLINE_BYTES)await this.writeLocked(state);
    this.scheduleCleanup();return state;
  });}
  private reset():void{this.graph.clear();this.rawCache.clear();this.known.clear();this.committed.clear();this.staged.clear();this.levels=new WeakMap();this.attempts=new WeakMap();this.lastAttempts.clear();this.garbage=[];}
  public async readRaw():Promise<string|null>{return locked(this.key,async()=>{const raw=await this.storage.getItem(this.key);if(raw===null)return null;const state=await this.read(raw),root=this.root(raw);this.token=raw;this.sharded=root!==null;this.committed=root?this.reachable(root):new Set();return JSON.stringify(state);});}
  private async writeLocked(state:GameSave):Promise<void>{
    this.staged.clear();
    const current=await this.storage.getItem(this.key);if(this.token===undefined)this.token=current;if(current!==this.token)throw Error('Concurrent progress writer');
    let raw:string;
    if(!this.sharded){raw=JSON.stringify(state);if(bytes(raw).length<=INLINE_BYTES){await this.publish(raw);return;}}
    const header=await this.text(JSON.stringify({...state,campaign:null,daily:Object.keys(state.daily)})),campaign=await this.attempt(state.campaign);
    const grouped:Record<string,Record<string,Record<string,Hash>>>={};
    for(const [date,a]of Object.entries(state.daily)){const year=date.slice(0,4),month=date.slice(0,7);((grouped[year]??={})[month]??={})[date]=await this.attempt(a);}
    const years:Record<string,Hash>={};
    for(const [year,months]of Object.entries(grouped)){const entries:Record<string,Hash>={};for(const [month,days]of Object.entries(months))entries[month]=await this.put({kind:'map',entries:days});years[year]=await this.put({kind:'map',entries});}
    const daily=await this.put({kind:'map',entries:years}),root=await this.put({kind:'root',header,campaign,daily});
    raw=JSON.stringify({format:FORMAT,version:1,root});
    if(await this.storage.getItem(this.key)!==current)throw Error('Concurrent progress publication');
    await this.publish(raw);this.sharded=true;this.committed=this.reachable(root);this.writes++;
    // Keep signatures only for reachable attempts; do not retain retired boards.
    const ids=new Set([state.campaign.board.id,...Object.values(state.daily).map(a=>a.board.id)]);for(const id of this.lastAttempts.keys())if(!ids.has(id))this.lastAttempts.delete(id);
    this.scheduleCleanup();
  }
  private async publish(raw:string):Promise<void>{
    try{await this.storage.setItem(this.key,raw);}catch(error){if(await this.storage.getItem(this.key)!==raw)throw error;}
    if(await this.storage.getItem(this.key)!==raw)throw Error('Progress publication unverified');this.token=raw;
  }
  public write(state:GameSave):Promise<void>{return locked(this.key,()=>this.writeLocked(state));}
  private reachable(root:Hash):Set<Hash>{const live=new Set<Hash>(),visit=(ref:Hash):void=>{if(live.has(ref))return;const refs=this.graph.get(ref);if(!refs)throw Error('Unknown live archive references');live.add(ref);for(const child of refs)visit(child);};visit(root);return live;}
  private scheduleCleanup():void{
    if(!this.alive||this.cleanupPending||!this.sharded||typeof window!=='undefined'&&!navigator.locks)return;this.cleanupPending=true;
    // Cleanup has no authority to acknowledge receipts or expose the candidate.
    void Promise.resolve().then(()=>locked(this.key,async()=>{
      if(!this.alive)return;const raw=await this.storage.getItem(this.key);if(raw===null||raw!==this.token)return;const root=this.root(raw);if(!root)return;
      const live=this.reachable(root);
      if(!this.garbage.length&&(this.writes%16===0||this.writes===1)){
        const keys=[...new Set([...[...this.known].map(h=>ARCHIVE_PREFIX+h),...(this.storage.listKeys?await this.storage.listKeys(ARCHIVE_PREFIX):[])])];
        this.garbage=keys.filter(key=>key.startsWith(ARCHIVE_PREFIX)&&hash(key.slice(ARCHIVE_PREFIX.length))&&!live.has(key.slice(ARCHIVE_PREFIX.length)));
      }
      for(let n=0;n<16&&this.garbage.length&&this.alive;n++){
        const key=this.garbage.shift()!,ref=key.slice(ARCHIVE_PREFIX.length);if(live.has(ref))continue;
        await this.storage.removeItem(key);this.known.delete(ref);this.graph.delete(ref);this.rawCache.delete(ref);
      }
    })).catch(()=>{/* Optional cleanup failure never invalidates committed progress. */}).finally(()=>{this.cleanupPending=false;});
  }
  public destroy():void{this.alive=false;}
}
