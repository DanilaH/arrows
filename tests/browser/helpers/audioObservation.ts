import type {Page} from '@playwright/test';
import {soundSamples,type SoundCue} from '../../../src/platform/sound';
export type ObservedAudio={cues:SoundCue[];duration:number;at:number;modal:boolean;rate:number;gain:number;camera:{scale:number}|null};
/** Observe actual source starts. PCM fingerprints identify current shipped assets;
 * gain separates shared samples (manual remove vs quiet native auto). No app seam. */
export async function observeAudio(page:Page,key:string){
 const gain:Record<SoundCue,number>={button:.65,remove:.8,slide:.65,exit:.28,error:.8,hint:.65,life:.65,win:.9,perfect:.9,award:.9,auto:.28,'repeat-error':.65,'help-final':.65};
 const fingerprints=([44100,48000]).flatMap(rate=>(Object.keys(gain) as SoundCue[]).map(cue=>{const s=soundSamples(cue,rate);return{cue,rate,gain:gain[cue],length:s.length,pcm:Array.from({length:12},(_,i)=>s[Math.floor((i+.5)*s.length/12)]!)};}));
 await page.addInitScript(({key,fingerprints})=>{
  const events:ObservedAudio[]=[];Reflect.set(window,key,events);const gains=new WeakMap<AudioBufferSourceNode,GainNode>();
  const connect=AudioBufferSourceNode.prototype.connect;
  AudioBufferSourceNode.prototype.connect=function(this:AudioBufferSourceNode,...args:unknown[]){if(args[0] instanceof GainNode)gains.set(this,args[0]);return Reflect.apply(connect,this,args);} as typeof connect;
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){
   if(this.buffer){const b=this.buffer,s=b.getChannelData(0),volume=gains.get(this)?.gain.value??-1;
    const cues=fingerprints.filter(f=>f.rate===b.sampleRate&&f.length===s.length&&Math.abs(f.gain-volume)<.00001&&f.pcm.every((v,i)=>Math.abs(v-s[Math.floor((i+.5)*s.length/12)]!)<.000001)).map(f=>f.cue);
    events.push({cues,duration:b.duration,at:performance.now(),modal:!!document.querySelector('dialog[open]'),rate:Math.round(this.playbackRate.value*1000)/1000,gain:volume,camera:JSON.parse(document.querySelector('#game-root')?.getAttribute('data-camera')??'null')});
   }return start.apply(this,args);
  };
 },{key,fingerprints});
}
export const audioEvents=(page:Page,key:string):Promise<ObservedAudio[]>=>page.evaluate(key=>Reflect.get(window,key),key);
