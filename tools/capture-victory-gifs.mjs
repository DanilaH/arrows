import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const output=resolve(process.argv[2]??'.test-output/victory-final'); await mkdir(output,{recursive:true});
const fields=JSON.parse(await readFile('src/content/campaign.json','utf8')), records=[];
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4189','--strictPort'],{stdio:'ignore'});
const browser=await chromium.launch({headless:true}), sleep=ms=>new Promise(r=>setTimeout(r,ms));
function blockers(arrow,remaining) {
 const h=arrow.path.at(-1),b=arrow.path.at(-2),dx=Math.sign(h.x-b.x),dy=Math.sign(h.y-b.y);
 return remaining.filter(other=>other!==arrow&&other.path.slice(1).some((b,i)=>{
  const a=other.path[i],n=Math.abs(b.x-a.x)+Math.abs(b.y-a.y);
  for(let j=0;j<=n;j++){const x=a.x+Math.sign(b.x-a.x)*j,y=a.y+Math.sign(b.y-a.y)*j;if(dx&&y===h.y&&(x-h.x)*dx>0||dy&&x===h.x&&(y-h.y)*dy>0)return true;}return false;
 }));
}
async function tap(page,arrow){const c=JSON.parse(await page.locator('#game-root').getAttribute('data-camera')),p=arrow.path.at(-1);await page.touchscreen.tap(c.x+p.x*c.scale,c.y+p.y*c.scale);}
async function solve(page,index){
 const level=fields[index];await expect(page.locator('#game-shell')).toHaveAttribute('data-level',level.id);await sleep(400);
 const removed=await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign.board.removed),remaining=level.arrows.filter(a=>!removed.includes(a.id));
 while(remaining.length){const i=remaining.findIndex(a=>blockers(a,remaining).length===0);if(i<0)throw Error('No legal arrow');await tap(page,remaining[i]);remaining.splice(i,1);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining',String(remaining.length));}
 await expect(page.locator('#win')).toBeVisible();
}
async function capture(page,name,action,sound=false){
 const dir=resolve(output,name);await mkdir(dir,{recursive:true});const cdp=await page.context().newCDPSession(page),frames=[];let recording=true;
 let audioStart;if(sound)audioStart=await page.evaluate(()=>window.__feelAudio.begin());
 const loop=(async()=>{while(recording){const at=Date.now(),file=`${String(frames.length).padStart(5,'0')}.png`,shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(dir,file),Buffer.from(shot.data,'base64'));frames.push({at,file});await sleep(Math.max(0,55-(Date.now()-at)));}})();
 await sleep(900);await action(cdp);await sleep(1250);recording=false;await loop;await cdp.detach();
 if(sound){const encoded=await page.evaluate(()=>window.__feelAudio.end());await writeFile(resolve(dir,'actual-web-audio.webm'),Buffer.from(encoded,'base64'));}
 await writeFile(resolve(dir,'frames.txt'),frames.map((f,i)=>`file '${f.file}'\nduration ${Math.max(.02,((frames[i+1]?.at??f.at+55)-f.at)/1000)}`).join('\n')+`\nfile '${frames.at(-1).file}'\n`);
 execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',resolve(dir,'frames.txt'),'-vf','fps=18,scale=390:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',resolve(output,`${name}.gif`)]);
 if(sound)execFileSync('ffmpeg',['-y','-loglevel','error','-threads','2','-filter_threads','1','-f','concat','-safe','0','-i',resolve(dir,'frames.txt'),'-ss',String(Math.max(0,(frames[0].at-audioStart)/1000)),'-i',resolve(dir,'actual-web-audio.webm'),'-vf','fps=30,scale=390:-2:flags=lanczos','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-af','apad','-t',String((frames.at(-1).at-frames[0].at+55)/1000),'-movflags','+faststart',resolve(output,`${name}-sound.mp4`)]);
 records.push({name,frames:frames.length,durationMs:frames.at(-1).at-frames[0].at,audio:sound?'Actual AudioContext output tee into MediaStreamAudioDestinationNode and MediaRecorder Opus; timestamp-aligned and muxed AAC, no added/replaced sound.':null});console.info(`Captured ${name}`);
}
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4189')).ok)break;}catch{}if(i===99)throw Error('Preview unavailable');await sleep(100);}
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'ru-RU'});
 await context.addInitScript(()=>{
  const connect=AudioNode.prototype.connect;let output,recorder,chunks=[],audioContext;
  AudioNode.prototype.connect=function(...args){const result=Reflect.apply(connect,this,args);if(args[0]===this.context.destination&&this.context instanceof AudioContext){audioContext=this.context;output??=audioContext.createMediaStreamDestination();Reflect.apply(connect,this,[output]);}return result;};
  window.__feelAudio={begin:async()=>{if(!output)throw Error('Missing real audio output');await audioContext.resume();chunks=[];recorder=new MediaRecorder(output.stream,{mimeType:'audio/webm;codecs=opus',audioBitsPerSecond:128000});recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();return Date.now();},end:()=>new Promise(resolve=>{recorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:recorder.mimeType}));};recorder.stop();})};
 });


 const page=await context.newPage();page.on('pageerror',error=>{throw error;});await page.goto('http://127.0.0.1:4189');await page.locator('#home-play:enabled').click();await sleep(650);
 await capture(page,'arrows-victory-dark',async()=>{await solve(page,0);await sleep(1700);},true);
 await page.locator('#next').click();
 for(let i=1;i<5;i++){await solve(page,i);await page.locator('#next').click();}
 await expect(page.locator('#game-shell')).toHaveAttribute('data-level','c06');await sleep(500);
 await page.locator('#game-settings').click();await page.locator('#theme-light').click();await page.locator('#close-settings').click();await expect(page.locator('#settings-dialog')).not.toBeVisible();await sleep(350);
 const level=fields[5],remaining=[...level.arrows];
 while(remaining.length>5){const i=remaining.findIndex(a=>!blockers(a,remaining).length);if(i<0)throw Error('No legal arrow');await tap(page,remaining[i]);remaining.splice(i,1);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining',String(remaining.length));}
 await sleep(750);
 await capture(page,'arrows-victory-hard-light',async()=>{
  while(remaining.length){const i=remaining.findIndex(a=>!blockers(a,remaining).length);if(i<0)throw Error('No legal arrow');await tap(page,remaining[i]);remaining.splice(i,1);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining',String(remaining.length));await sleep(160);}
  await expect(page.locator('#win')).toBeVisible();await sleep(1700);
 });
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));
 if(state.wins.length!==6||state.index!==5||state.campaign.board.removed.length!==level.arrows.length||state.wins.some(w=>w.mistakes)||state.cups.length||Object.keys(state.dailyWins).length)throw Error('Unexpected authentic progress');
 const assets={};for(const sub of ['assets','ui'])for(const file of await readdir(`dist/${sub}`))assets[`${sub}/${file}`]=createHash('sha256').update(await readFile(`dist/${sub}/${file}`)).digest('hex');
 await writeFile(resolve(output,'capture-manifest.json'),JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),provenance:'Unmodified production Chromium RU390x844 DPR1 mobile emulation. Fresh storage, six error-free wins earned by ordinary touch selected with an independent cell-walking oracle. First clip records all of c01; second records the last five arrows and Hard finish on c06, after a real Settings theme switch to light. No injected progress, rewards, transport or production test route. MP4 contains actual AudioContext output, not added or replaced sound. Browser emulation is not physical-phone sound/haptics/performance evidence.',assets,records,ending:{wins:state.wins.length,index:state.index,errors:state.wins.reduce((n,w)=>n+w.mistakes,0),cups:state.cups,dailyWins:state.dailyWins}},null,2));await context.close();
}finally{await browser.close();server.kill('SIGTERM');}
