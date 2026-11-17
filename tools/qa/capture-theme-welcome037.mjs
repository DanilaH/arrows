// Unmodified signed-APK web, fresh browser storage, real input and WebAudio.
// QA recorder only: never imported into an application entry point.
import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=process.env.ARROWS_CAPTURE_ROOT??'.test-output/theme037',port=4297,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const manifest=JSON.parse(await readFile(root+'/manifest.json','utf8'));
const version=manifest.version.split('/')[0];
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',root+'/web','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const browser=await chromium.launch();let context;
function audioTee(){
 const Original=window.AudioContext,connect=AudioNode.prototype.connect;let main,destination,recorder,recordingContext,chunks=[];
 AudioNode.prototype.connect=function(target,...args){if(main&&target===main.destination)connect.call(this,destination);return connect.call(this,target,...args);};
 window.AudioContext=class extends Original{constructor(...args){super(...args);main=this;destination=this.createMediaStreamDestination();}};
 window.welcomeCapture={async start(){assertDestination();chunks=[];recordingContext=new Original();await recordingContext.resume();const sink=recordingContext.createMediaStreamDestination();recordingContext.createMediaStreamSource(destination.stream).connect(sink);recorder=new MediaRecorder(sink.stream,{mimeType:'audio/webm;codecs=opus'});recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();},stop(){return new Promise(r=>{recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());await recordingContext.close();r(Array.from(bytes));};recorder.stop();});}};
 function assertDestination(){if(!destination)throw Error('No actual game audio context');}
 Object.defineProperty(navigator,'language',{configurable:true,value:'ru-RU'});
}
const click=async(p,id)=>{const box=await p.locator(id).boundingBox();assert(box);await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await sleep(85);await p.mouse.up();};
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:'+port)).ok)break;}catch{}await sleep(100);}
 context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1.5,isMobile:true,hasTouch:true,timezoneId:'Asia/Yekaterinburg'});await context.addInitScript(audioTee);
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+port);await p.locator('#welcome-light').waitFor();await p.locator('#home-play:enabled').waitFor();if(manifest.welcomeNavHidden)assert(await p.locator('#meta-nav').isHidden());await p.evaluate(()=>document.fonts.ready);await sleep(300);
 // A same-choice tap only warms the real one-shot player; no storage is seeded.
 await click(p,'#welcome-light');await sleep(500);await p.evaluate(()=>welcomeCapture.start());
 const frames=[],cdp=await context.newCDPSession(p),dir=root+'/record';await mkdir(dir,{recursive:true});let recording=true;const start=performance.now();frames.push({at:0,data:await p.screenshot({type:'jpeg',quality:94,scale:'css'})});
 cdp.on('Page.screencastFrame',e=>{if(recording)frames.push({at:performance.now()-start,data:Buffer.from(e.data,'base64')});void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});});await cdp.send('Page.startScreencast',{format:'jpeg',quality:94,maxWidth:390,maxHeight:844,everyNthFrame:1});
 await sleep(600);await click(p,'#welcome-dark');await sleep(850);await click(p,'#welcome-light');await sleep(800);await click(p,'#welcome-dark');await sleep(120);await click(p,'#welcome-light');await sleep(650);await click(p,'#welcome-dark');await sleep(70);const play=performance.now();await click(p,'#home-play');await p.waitForFunction(()=>document.querySelector('#game-shell').dataset.screen==='game');const enterMs=performance.now()-play;await p.waitForFunction(()=>!document.querySelector('.route-snapshot,.board-transition'));await sleep(550);
 const a=await p.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign),head=a.level.arrows[0].path.at(-1),camera=JSON.parse(await p.locator('#game-root').getAttribute('data-camera'));await p.mouse.click(camera.x+head.x*camera.scale,camera.y+head.y*camera.scale);await p.waitForFunction(()=>document.querySelector('#game-shell').dataset.remaining==='2');await sleep(600);await click(p,'#choose-field');await p.locator('#home-play:visible').waitFor();await sleep(750);assert.equal(await p.locator('#welcome-dark').count(),0);if(manifest.welcomeNavHidden)assert(await p.locator('#meta-nav').isVisible());
 const duration=performance.now()-start;recording=false;await cdp.send('Page.stopScreencast');const audio=await p.evaluate(()=>welcomeCapture.stop());assert(audio.length>1000);assert.deepEqual(errors,[]);await writeFile(dir+'/actual-output.webm',Buffer.from(audio));
 for(const[i,f]of frames.entries())await writeFile(dir+'/'+String(i).padStart(5,'0')+'.jpg',f.data);
 await writeFile(dir+'/frames.txt',frames.map((f,i)=>"file '"+String(i).padStart(5,'0')+".jpg'\nduration "+Math.max(.01,((frames[i+1]?.at??duration)-f.at)/1000)).join('\n')+"\nfile '"+String(frames.length-1).padStart(5,'0')+".jpg'\n");
 const footer="fps=30,scale=390:844,pad=390:884:0:0:color=0x1e1e2c,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='CURRENT "+version+" "+manifest.source.slice(0,7)+" - theme choice':x=(w-tw)/2:y=850:fontsize=10:fontcolor=white,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Actual game audio - Chromium APK web - not a phone':x=(w-tw)/2:y=868:fontsize=9:fontcolor=white";
 execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',dir+'/frames.txt','-i',dir+'/actual-output.webm','-vf',footer,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',root+'/Arrows-'+version+'-theme-audio.mp4']);
 execFileSync('ffmpeg',['-y','-v','error','-i',root+'/Arrows-'+version+'-theme-audio.mp4','-vf',"drawbox=x=0:y=864:w=390:h=20:color=0x1e1e2c:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='SILENT GIF - actual Chromium - not a phone':x=(w-tw)/2:y=868:fontsize=9:fontcolor=white,fps=20,split[a][b];[a]palettegen=max_colors=128[q];[b][q]paletteuse=dither=bayer:bayer_scale=3",'-loop','0',root+'/Arrows-'+version+'-theme.gif']);
 manifest.capture={frames:frames.length,durationMs:duration,viewport:{width:390,height:844},dpr:1.5,playInputToGameMs:enterMs,includesAuthoredPressHoldMs:85,realLegalMove:true,welcomeDoesNotReturn:true,errors,source:'Unmodified signed APK web payload in Chromium; clean unseeded profile, preliminary same-choice tap warms WebAudio. Real pointer/CDP frames and actual game audio, no overdub. No native SDK transport or physical phone.'};await writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.info(JSON.stringify(manifest.capture));
}finally{await context?.close();await browser.close();server.kill();}
