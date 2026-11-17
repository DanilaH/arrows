import type {GameSave,SavedAttempt} from './save';
import type {Level} from '../domain/board';

const frozen=new WeakSet<object>();
export function immutableLevel(level:Level):Level{
  const freeze=(value:object):void=>{if(frozen.has(value))return;for(const item of Object.values(value))if(item&&typeof item==='object')freeze(item);Object.freeze(value);frozen.add(value);};
  freeze(level);return level;
}
/** Copy mutable state on access. Published geometry is immutable and shared;
 * an ordinary move never clones the geometry of every archived daily. */
export function draftSave(source:GameSave){
  const next=structuredClone({...source,campaign:null,daily:null}) as unknown as GameSave;
  const daily={...source.daily},copied=new Set<string>();let campaign=source.campaign,campaignCopied=false;
  const copy=(a:SavedAttempt):SavedAttempt=>({...structuredClone({...a,level:null}),level:immutableLevel(a.level)});
  Object.defineProperty(next,'campaign',{enumerable:true,configurable:true,get(){if(!campaignCopied){campaign=copy(campaign);campaignCopied=true;}return campaign;},set(value:SavedAttempt){campaign=value;campaignCopied=true;}});
  next.daily=new Proxy(daily,{get(target,key,receiver){if(typeof key==='string'&&Object.hasOwn(target,key)&&!copied.has(key)){target[key]=copy(target[key]!);copied.add(key);}return Reflect.get(target,key,receiver);},set(target,key,value){if(typeof key==='string')copied.add(key);return Reflect.set(target,key,value);}});
  return {state:next,finish:():GameSave=>({...next,campaign,daily})};
}
