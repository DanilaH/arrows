import {validateLevel,type Level} from '../domain/board';
import {dailyId} from './dailyGenerated';
import {DENSE_DAILY_VERSION} from './dailyPolicyV2';

const aborted=()=>new DOMException('Aborted','AbortError');
class WorkerTransportError extends Error{}
async function cooperative(date:string,signal?:AbortSignal):Promise<Level>{
 const {denseDailySteps}=await import('./dailyDense');if(signal?.aborted)throw aborted();const steps=denseDailySteps(date),deadline=performance.now()+15000;let n=steps.next(),yieldAt=performance.now();
 while(!n.done){if(signal?.aborted)throw aborted();if(performance.now()>deadline)throw Error('Daily generation deadline');if(performance.now()-yieldAt>6){await new Promise<void>(resolve=>setTimeout(resolve,0));yieldAt=performance.now();}n=steps.next();}
 if(signal?.aborted)throw aborted();return n.value.level;
}
/** One worker per request, finite search, cancellation and idempotent settlement. No reward ownership. */
export async function prepareDenseDaily(date:string,signal?:AbortSignal):Promise<Level>{
 if(signal?.aborted)throw aborted();
 if(typeof Worker==='undefined')return cooperative(date,signal);
 try{return await new Promise<Level>((resolve,reject)=>{
  let worker:Worker;try{worker=new Worker(new URL('./dailyWorker.ts',import.meta.url),{type:'module'});}catch{reject(new WorkerTransportError('Daily worker unavailable'));return;}
  let settled=false;
  const finish=(level?:Level,error?:unknown):void=>{if(settled)return;settled=true;clearTimeout(timer);worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;worker.terminate();signal?.removeEventListener('abort',cancel);if(error)reject(error);else resolve(level!);};
  const cancel=()=>finish(undefined,aborted()),timer=setTimeout(()=>finish(undefined,Error('Daily generation deadline')),15000);
  signal?.addEventListener('abort',cancel,{once:true});
  if(signal?.aborted){cancel();return;}
  worker.onerror=()=>finish(undefined,new WorkerTransportError('Daily worker failed'));worker.onmessageerror=()=>finish(undefined,new WorkerTransportError('Daily worker message failed'));
  worker.onmessage=(e:MessageEvent)=>{if(signal?.aborted){cancel();return;}const {result}=e.data??{};if(e.data?.date!==date||!result?.level||result.level.id!==dailyId(date)||result.level.contentVersion!==DENSE_DAILY_VERSION){finish(undefined,Error('Invalid daily worker result'));return;}
   try{validateLevel(result.level);finish(result.level);}catch(error){finish(undefined,error);}
  };
  try{worker.postMessage({date});}catch{finish(undefined,new WorkerTransportError('Daily worker post failed'));}
 });}catch(error){if(error instanceof WorkerTransportError)return cooperative(date,signal);throw error;}
}
