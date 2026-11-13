import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const output=resolve(process.argv[2]??'.test-output/feel-next-release'); await mkdir(output,{recursive:true});
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
async function state(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));}
async function solve(page,index,keep=0){
 const level=fields[index];await expect(page.locator('#game-shell')).toHaveAttribute('data-level',level.id);await sleep(350);
 for(;;){const before=await state(page),remaining=level.arrows.filter(a=>!before.campaign.board.removed.includes(a.id));if(remaining.length<=keep)break;
 const arrow=remaining.find(a=>blockers(a,remaining).length===0);if(!arrow)throw Error('No legal arrow');await tap(page,arrow);await expect.poll(async()=>Number(await page.locator('#game-shell').getAttribute('data-remaining'))).toBeLessThan(remaining.length);}
 if(!keep)await expect(page.locator('#win')).toBeVisible();
}
async function pinch(page,cdp,at,factor=1.8){
 const start=18,fingers=gap=>[{x:at.x-gap,y:at.y,id:1},{x:at.x+gap,y:at.y,id:2}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:fingers(start)});
 for(let step=1;step<=10;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:fingers(start*(1+(factor-1)*step/10))});await sleep(30);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(450);
}
async function capture(page,name,action,sound=false){
 const dir=resolve(output,name);await mkdir(dir,{recursive:true});const cdp=await page.context().newCDPSession(page),frames=[];let recording=true;
 let audioStart;if(sound)audioStart=await page.evaluate(()=>window.__feelAudio.begin());
 const loop=(async()=>{while(recording){const at=Date.now(),file=`${String(frames.length).padStart(5,'0')}.png`,shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(dir,file),Buffer.from(shot.data,'base64'));frames.push({at,file});await sleep(Math.max(0,55-(Date.now()-at)));}})();
 await sleep(900);await action(cdp);await sleep(1250);recording=false;await loop;await cdp.detach();
 if(sound){const encoded=await page.evaluate(()=>window.__feelAudio.end());await writeFile(resolve(dir,'actual-web-audio.webm'),Buffer.from(encoded,'base64'));}
 await writeFile(resolve(dir,'frames.txt'),frames.map((f,i)=>`file '${f.file}'\nduration ${Math.max(.02,((frames[i+1]?.at??f.at+55)-f.at)/1000)}`).join('\n')+`\nfile '${frames.at(-1).file}'\n`);
 execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',resolve(dir,'frames.txt'),'-vf',`fps=18,scale=${page.viewportSize().width}:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`,'-loop','0',resolve(output,`${name}.gif`)]);
 if(sound)execFileSync('ffmpeg',['-y','-loglevel','error','-threads','2','-filter_threads','1','-f','concat','-safe','0','-i',resolve(dir,'frames.txt'),'-ss',String(Math.max(0,(frames[0].at-audioStart)/1000)),'-i',resolve(dir,'actual-web-audio.webm'),'-vf',`fps=30,scale=${page.viewportSize().width}:-2:flags=lanczos`,'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-af','apad','-t',String((frames.at(-1).at-frames[0].at+55)/1000),'-movflags','+faststart',resolve(output,`${name}-sound.mp4`)]);
 records.push({name,viewport:page.viewportSize(),frames:frames.length,durationMs:frames.at(-1).at-frames[0].at,audio:sound?'Actual AudioContext output tee into MediaStreamAudioDestinationNode and MediaRecorder Opus; timestamp-aligned and muxed AAC, no added/replaced sound.':null});console.info(`Captured ${name}`);
}try {
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4189')).ok)break;}catch{}if(i===99)throw Error('Preview unavailable');await sleep(100);}
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'ru-RU'});
 await context.addInitScript(()=>{
  const connect=AudioNode.prototype.connect;let output,recorder,chunks=[],audioContext;
  AudioNode.prototype.connect=function(...args){const result=Reflect.apply(connect,this,args);if(args[0]===this.context.destination&&this.context instanceof AudioContext){audioContext=this.context;output??=audioContext.createMediaStreamDestination();Reflect.apply(connect,this,[output]);}return result;};
  window.__feelAudio={begin:async()=>{if(!output)throw Error('Missing real audio output');await audioContext.resume();chunks=[];recorder=new MediaRecorder(output.stream,{mimeType:'audio/webm;codecs=opus',audioBitsPerSecond:128000});recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();return Date.now();},end:()=>new Promise(resolve=>{recorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:recorder.mimeType}));};recorder.stop();})};
 });
 const page=await context.newPage();page.on('pageerror',error=>{throw error;});await page.goto('http://127.0.0.1:4189');await page.locator('#home-play:enabled').waitFor();await page.evaluate(()=>document.fonts.ready);

 const settled=async()=>{await expect(page.locator('.board-transition,.route-snapshot')).toHaveCount(0);await sleep(100);};
 await page.locator('#home-play').click();await settled();
 for(let i=0;i<2;i++){await solve(page,i);await page.locator('#next').click();await sleep(350);}
 await capture(page,'arrows-auto-release',async()=>{
  await tap(page,fields[2].arrows[1]);await expect(page.locator('#game-shell')).toHaveAttribute('data-lives','2');await sleep(750);
  await tap(page,fields[2].arrows[0]);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','4');await sleep(750);
 },true);
 for(let i=2;i<4;i++){await solve(page,i);await page.locator('#next').click();await sleep(350);}
 await capture(page,'arrows-hint-guides-buttons',async cdp=>{
  await page.locator('#hint:visible').waitFor();await sleep(700);await page.locator('#guides').click();await sleep(650);await page.locator('#guides').click();
  const c=JSON.parse(await page.locator('#game-root').getAttribute('data-camera')),p=fields[4].arrows[0].path.at(-1),at={x:c.x+p.x*c.scale,y:c.y+p.y*c.scale};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...at,id:1}]});await sleep(700);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:at.x+45,y:at.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const b=await page.locator('#game-settings').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]});await sleep(220);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.locator('#close-settings').click();await sleep(250);
 });
 await solve(page,4);await page.locator('#next').click();await sleep(350);await solve(page,5,1);
 await capture(page,'arrows-perfect-framing',async cdp=>{
  const before=await state(page),remaining=fields[5].arrows.filter(a=>!before.campaign.board.removed.includes(a.id));if(remaining.length!==1)throw Error('Missing final Hard arrow');
  const c=JSON.parse(await page.locator('#game-root').getAttribute('data-camera')),p=remaining[0].path.at(-1);
  await pinch(page,cdp,{x:Math.max(55,Math.min(335,c.x+p.x*c.scale)),y:Math.max(130,Math.min(620,c.y+p.y*c.scale))},2);
  await tap(page,remaining[0]);await expect(page.locator('#win')).toBeVisible();await sleep(1250);
  if(Math.abs((await state(page)).campaign.view.zoom-1)>.001)throw Error('Completed camera did not fit');
 },true);
 await page.locator('#next').click();
 for(let i=6;i<9;i++){await solve(page,i);if(i!==8){await page.locator('#next').click();await sleep(350);}}
 await capture(page,'arrows-collection-arrival',async()=>{
  await page.locator('#next').click();await expect(page.locator('.game-unlock')).toContainText('Коллекция');await sleep(1800);await page.locator('#choose-field').click();await settled();await expect(page.locator('#home-collection')).toBeEnabled();await page.locator('#home-play').click();await settled();
 });
 for(let i=9;i<19;i++){console.info('Earning level '+(i+1));await solve(page,i);if(i!==18){await page.locator('#next').click();await sleep(350);}}
 await capture(page,'arrows-daily-arrival',async()=>{
  await page.locator('#next').click();await expect(page.locator('.game-unlock')).toContainText('Ежедневные');await sleep(1850);
 });
 await capture(page,'arrows-large-field',async cdp=>{
  await page.locator('#guides').click();await pinch(page,cdp,{x:195,y:360},1.6);await sleep(450);await pinch(page,cdp,{x:195,y:360},.72);await page.locator('#guides').click();
 });
 const ending=await state(page);if(ending.wins.length!==19||ending.index!==19||ending.wins.filter(w=>w.mistakes).length!==1||ending.wins[2].mistakes!==1||ending.receipts.length||ending.cups.length||Object.keys(ending.dailyWins).length)throw Error('Unexpected real progression');
 const assets={};for(const sub of ['assets','ui','fonts'])for(const file of await readdir(`dist/${sub}`))assets[`${sub}/${file}`]=createHash('sha256').update(await readFile(`dist/${sub}/${file}`)).digest('hex');
 await writeFile(resolve(output,'capture-manifest.json'),JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),provenance:'Unmodified production Chromium mobile emulation RU390x844 DPR1. Fresh storage; nineteen wins earned through ordinary touches chosen by independent cell-walking oracle. One intentional c03 mistake followed by automatic marked-arrow release. Real c05 guide/hold/cancel/Settings presses; actual two-finger zoom before the perfect Hard c06 final move; real c10/c20 section arrivals and actual big-field pinch. No injected progress/camera/rewards/SDK transport. Companion MP4s tee actual AudioContext output, GIFs are silent. Browser evidence, not physical-device performance/subjective feel.',assets,records,ending:{wins:ending.wins,index:ending.index,board:ending.campaign.board,view:ending.campaign.view,freeContinueUsed:ending.freeContinueUsed,seenUnlocks:ending.seenUnlocks,receipts:ending.receipts}},null,2));await context.close();
} finally {await browser.close();server.kill();}
