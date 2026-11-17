import {registerPlugin} from '@capacitor/core';
import {startGame} from '../../src/app/bootstrap';
import {createPlatformRuntime} from '../../src/app/platform';
import type {DailyReminderBridge,ReminderStatus} from '../../src/platform/dailyReminders';
let state:ReminderStatus={enabled:false,allowed:false,time:'19:00',offered:false,pending:''};
const listeners=new Set<()=>void>(),calls:{method:string;value?:unknown}[]=[];
const bridge:DailyReminderBridge={
 async status(){return {...state};},async sync(value){calls.push({method:'sync',value});return {...state};},
 async configure(value){calls.push({method:'configure',value});state={...state,...value,offered:true};return {...state};},
 async request(){calls.push({method:'request'});state.allowed=true;return {...state};},
 async markOffered(){calls.push({method:'offered'});state.offered=true;return {...state};},
 async consume(value){calls.push({method:'consume',value});if(value.nonce===state.pending)state.pending='';return {...state};},
 async openSettings(){calls.push({method:'settings'});},
 async addListener(_name,fn){listeners.add(fn);return{async remove(){listeners.delete(fn);}};},
};
registerPlugin('ArrowsDaily',{web:async()=>bridge});
Reflect.set(window,'dailyEntryFixture',{tap(nonce:string){state.pending=nonce;for(const listener of listeners)listener();},status:()=>({...state}),reasons:()=>runtime.activity.getBlockReasons(),calls,block(value:boolean){runtime?.activity.setBlocked('external-activity',value);}});
let runtime:ReturnType<typeof createPlatformRuntime>;
startGame([],()=>{runtime=createPlatformRuntime();return{...runtime,kind:'android'};});
