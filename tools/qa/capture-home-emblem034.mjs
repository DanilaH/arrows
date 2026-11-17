// Real signed-APK web payload, isolated QA transport; never an application entry.
import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {controlledNative} from './assistance-native-transport.mjs';
import {freshSave,Board} from '../../.test-output/home-emblem/ssr/ui-composition-source.js';
const root='.test-output/home-emblem',port=4286,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const manifest=JSON.parse(await readFile(root+'/capture-manifest.json','utf8'));
assert.equal(manifest.version,'0.34.0/code48');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',root+'/web','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const browser=await chromium.launch(),errors=[],states=[];
const saved=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));
async function boot(profile={w:390,h:844,theme:'dark',language:'ru'}){
 const context=await browser.newContext({viewport:{width:profile.w,height:profile.h},deviceScaleFactor:1.5,isMobile:true,hasTouch:true,timezoneId:'Asia/Yekaterinburg',reducedMotion:profile.reduced?'reduce':'no-preference'});
 await context.addInitScript(controlledNative,{save:freshSave(),preserve:true,settings:{version:1,theme:profile.theme,language:profile.language,sound:true,vibration:true}});
 const p=await context.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
 await p.clock.setFixedTime(new Date('2026-11-17T12:00:00+05:00'));await p.goto('http://127.0.0.1:'+port);await p.locator('#home-play:enabled').waitFor();await p.waitForFunction(()=>!document.querySelector('.route-snapshot,.board-transition'));await p.evaluate(()=>document.querySelector('#qa-recording-source')?.remove());return{context,p};
}
async function click(p,selector){const r=await p.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});assert(r.hit,selector);await p.mouse.click(r.x,r.y);}
async function snap(p,profile,name){
 if(profile.font)await p.evaluate(f=>{const es=[...document.querySelectorAll('body *')].filter(e=>e instanceof HTMLElement),sizes=es.map(e=>parseFloat(getComputedStyle(e).fontSize));es.forEach((e,i)=>{e.dataset.emblemFontBefore=e.style.fontSize;e.style.fontSize=sizes[i]*f+'px';});},profile.font);
 await sleep(150);const data=await p.evaluate(()=>{const b=document.querySelector('#home-play'),r=b.getBoundingClientRect(),nav=document.querySelector('#meta-nav').getBoundingClientRect(),a=document.querySelector('.home-emblem');return{emblem:!!a,button:{x:r.x,y:r.y,w:r.width,h:r.height,hit:b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))},navTop:nav.top,overflow:document.documentElement.scrollWidth>innerWidth};});
 assert(data.button.hit&&data.button.w>=44&&data.button.h>=44&&!data.overflow);assert(data.button.y+data.button.h<data.navTop);
 await p.screenshot({path:root+'/matrix-'+profile.id+'-'+name+'.png'});states.push({profile:profile.id,name,...data});
 if(profile.font)await p.evaluate(()=>{for(const e of document.querySelectorAll('[data-emblem-font-before]')){e.style.fontSize=e.dataset.emblemFontBefore;delete e.dataset.emblemFontBefore;}});
}
try{
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:'+port)).ok)break;}catch{}await sleep(100);}
 for(const profile of [
  {id:'dark',w:390,h:844,theme:'dark',language:'ru'},
  {id:'light',w:390,h:844,theme:'light',language:'ru'},
  {id:'small',w:320,h:568,theme:'dark',language:'ru'},
  {id:'english',w:430,h:932,theme:'light',language:'en'},
  {id:'tablet',w:800,h:1280,theme:'dark',language:'ru'},
  {id:'font150',w:320,h:568,theme:'light',language:'en',font:1.5,reduced:true},
  {id:'short',w:568,h:320,theme:'dark',language:'ru'},
 ]){
  const {context,p}=await boot(profile);
  try{await snap(p,profile,'unopened');await click(p,'#home-play');await p.locator('#choose-field:visible').waitFor();await p.waitForFunction(()=>!document.querySelector('.route-snapshot,.board-transition'));await click(p,'#choose-field');await p.locator('#home-play:visible').waitFor();await p.waitForFunction(()=>!document.querySelector('.route-snapshot,.board-transition'));await snap(p,profile,'selected');assert(!await p.locator('#meta-screen .home-emblem').count());}finally{await context.close();}
 }
 assert.deepEqual(errors,[]);await writeFile(root+'/matrix.json',JSON.stringify({source:manifest.source,apkSha256:manifest.apkSha256,states,errors,syntheticFontScaleNotNative:true},null,2)+'\n');
 const {context,p}=await boot();
 await click(p,'#home-settings');await click(p,'#preview-sound');await sleep(650);await click(p,'#close-settings');await p.locator('#settings-dialog').waitFor({state:'hidden'});await sleep(250);
 const before=await saved(p);await p.evaluate(()=>assistanceQA.startAudio());
 const cdp=await context.newCDPSession(p),frames=[],dir=root+'/record-'+manifest.source.slice(0,7);await mkdir(dir,{recursive:true});
 let recording=true;const start=performance.now();frames.push({at:0,data:await p.screenshot({type:'jpeg',quality:94,scale:'css'})});
 cdp.on('Page.screencastFrame',e=>{if(recording)frames.push({at:performance.now()-start,data:Buffer.from(e.data,'base64')});void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:94,maxWidth:390,maxHeight:844,everyNthFrame:1});
 const observed=new Set();
 for(let i=0;i<44;i++){const active=await p.locator('.home-emblem-arrow').evaluateAll(es=>es.flatMap((e,i)=>e.getAnimations().some(a=>a.playState==='running')?[i]:[]));active.forEach(i=>observed.add(i));await sleep(160);}
 assert.deepEqual([...observed].sort(),[0,1,2]);assert.deepEqual(await saved(p),before);
 const r=await p.locator('#home-play').boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await sleep(130);const playAt=performance.now();await p.mouse.up();
 await p.waitForFunction(()=>document.querySelector('#game-shell').dataset.screen==='game');const enterMs=performance.now()-playAt;
 await p.waitForFunction(()=>!document.querySelector('.route-snapshot,.board-transition'));await sleep(650);
 const a=(await saved(p)).campaign,b=new Board(a.level,a.board.id,a.board),id=b.hint(),head=a.level.arrows.find(a=>a.id===id).path.at(-1),c=JSON.parse(await p.locator('#game-root').getAttribute('data-camera'));
 await p.mouse.click(c.x+head.x*c.scale,c.y+head.y*c.scale);await sleep(850);await click(p,'#choose-field');await p.locator('#home-play:visible').waitFor();await sleep(1000);
 assert.equal(await p.locator('#meta-screen .home-emblem').count(),0);assert.equal((await saved(p)).campaign.board.removed.length,1);
 const duration=performance.now()-start;recording=false;await cdp.send('Page.stopScreencast');const bytes=await p.evaluate(()=>assistanceQA.stopAudio());assert(bytes.length>0);assert.deepEqual(errors,[]);
 await writeFile(dir+'/actual-output.webm',Buffer.from(bytes));for(const[i,f]of frames.entries())await writeFile(dir+'/'+String(i).padStart(5,'0')+'.jpg',f.data);
 await writeFile(dir+'/frames.txt',frames.map((f,i)=>"file '"+String(i).padStart(5,'0')+".jpg'\nduration "+Math.max(.01,((frames[i+1]?.at??duration)-f.at)/1000)).join('\n')+"\nfile '"+String(frames.length-1).padStart(5,'0')+".jpg'\n");
 const caption="fps=30,scale=390:844,pad=390:884:0:0:color=0x1e1e2c,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='CURRENT 0.34.0 "+manifest.source.slice(0,7)+" - living Home':x=(w-tw)/2:y=850:fontsize=10:fontcolor=white,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Actual game audio - Chromium APK web - not a phone':x=(w-tw)/2:y=868:fontsize=9:fontcolor=white";
 execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',dir+'/frames.txt','-i',dir+'/actual-output.webm','-vf',caption,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',root+'/Arrows-0.34.0-home-audio.mp4']);
 execFileSync('ffmpeg',['-y','-v','error','-i',root+'/Arrows-0.34.0-home-audio.mp4','-vf',"drawbox=x=0:y=864:w=390:h=20:color=0x1e1e2c:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='SILENT GIF - actual Chromium - not a phone':x=(w-tw)/2:y=868:fontsize=9:fontcolor=white,fps=20,split[a][b];[a]palettegen=max_colors=128[q];[b][q]paletteuse=dither=bayer:bayer_scale=3",'-loop','0',root+'/Arrows-0.34.0-home.gif']);
 manifest.clips=[{name:'living-home',source:manifest.source,frames:frames.length,durationMs:duration,viewport:{width:390,height:844},dpr:1.5,observedArrows:[...observed].sort(),idleSaveUnchanged:true,actualPressAndLegalMove:true,playToGameMs:enterMs,selectedHomeReplacesEmblem:true,frameDirectory:dir,errors,method:'Fresh progress/no seeded wins, actual pointer/CDP frames/game WebAudio; controlled native transport; not phone or SDK footage; no overdub'}];await writeFile(root+'/capture-manifest.json',JSON.stringify(manifest,null,2)+'\n');
 await context.close();console.log(JSON.stringify({states:states.length,frames:frames.length,durationMs:duration,observedArrows:[...observed].sort(),playToGameMs:enterMs,errors},null,2));
}finally{await browser.close();server.kill();}
