import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {controlledNative} from '../qa/assistance-native-transport.mjs';
const out='.test-output/ui-composition-0321',port=4275,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',`${out}/web`,'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'}),browser=await chromium.launch(),report={actions:[],errors:[]};
try{
 for(let i=0;i<80;i++){try{if((await fetch(`http://127.0.0.1:${port}/`)).ok)break;}catch{}await sleep(100);}
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(controlledNative,{save:JSON.parse(await readFile(`${out}/prepared-awards.json`,'utf8')),preserve:true,settings:{version:1,language:'ru',theme:'dark',sound:true,vibration:true}});
 await context.addInitScript(()=>{
  const events=[];window.compositionAudio=events;const original=AudioBufferSourceNode.prototype.start,ids=new WeakMap();let serial=0;
  AudioBufferSourceNode.prototype.start=function(...args){if(!ids.has(this.context))ids.set(this.context,++serial);events.push({at:performance.now(),context:ids.get(this.context),length:this.buffer?.length,duration:this.buffer?.duration});return original.apply(this,args);};
 });
 const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(`http://127.0.0.1:${port}/`);await p.locator('#home-play:enabled').waitFor();await sleep(400);
 const actions=[['enter','#home-play'],['guides','#guides'],['back','#choose-field'],['calendar','#home-calendar'],['collection','#home-collection'],['settings','#home-settings'],['light','.theme-choice[data-theme="light"]'],['close','#close-settings']];
 for(const[name,key]of actions){
  const before=await p.evaluate(()=>({audio:compositionAudio.length,pulses:assistanceQA.snapshot().pulses.length}));
  if(name==='close')await p.keyboard.press('Escape');else{const target=name==='light'?p.locator('[data-theme-choice="light"],.theme-choice[data-theme="light"],#theme-light').first():p.locator(key);if(!await target.count()){report.actions.push({name,notRun:'selector unavailable'});continue;}await target.click();}
  await p.waitForFunction(()=>!document.querySelector('.route-snapshot,.board-transition'));await sleep(450);
  const after=await p.evaluate(before=>({audio:compositionAudio.slice(before.audio),pulses:assistanceQA.snapshot().pulses.slice(before.pulses)}),before);report.actions.push({name,...after});
 }
 await writeFile(`${out}/input-feedback.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await context.close();
}finally{await browser.close();server.kill();}
