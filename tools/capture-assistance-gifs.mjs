import { build } from 'vite';
import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const output=resolve(process.argv[2]??'.test-output/assistance-gifs'); await mkdir(output,{recursive:true});
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
 for(let i=0;i<3;i++){await solve(page,i);await page.locator('#next').click();}
 await capture(page,'arrows-recovery-and-transition',async()=>{
  await solve(page,3);await sleep(1400);await page.locator('#next').evaluate(e=>e.click());await expect(page.locator('#game-shell')).toHaveAttribute('data-level','c05');await sleep(1000);
  const l=fields[4],blocked=l.arrows.filter(a=>blockers(a,l.arrows).length).slice(0,3);
  if(blocked.length!==3)throw Error('Missing blocked arrows');for(const a of blocked){await tap(page,a);await sleep(750);}
  await page.locator('[data-action=free-continue]').waitFor();await sleep(650);await page.locator('[data-action=free-continue]').evaluate(e=>e.click());await sleep(1100);
 },true);
 const normal=await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));
 if(normal.index!==4||normal.wins.length!==4||normal.campaign.board.lives!==3||normal.campaign.continuations!==1)throw Error('Unexpected authentic progress');
 const result=await build({configFile:false,publicDir:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('tests/fixtures/assistanceReview.ts'),name:'AssistanceReview',formats:['iife']}}});
 const built=Array.isArray(result)?result[0]:result,code=built.output.find(i=>i.type==='chunk').code,css=built.output.filter(i=>i.type==='asset'&&i.fileName.endsWith('.css')).map(i=>i.source).join('\n');
 const html=(await readFile('index.html','utf8')).replace(/<script type="module" src="\/src\/main.ts"><\/script>/,'<script defer src="/__assistance-review.js"></script>').replace('</head>',`<style>${css}</style></head>`);
 await page.route('**/__assistance-review.js',route=>route.fulfill({contentType:'text/javascript',body:code}));await page.route('**/__assistance-review',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('http://127.0.0.1:4189/__assistance-review');await page.locator('#home-play:enabled').click();await sleep(3500);
 await capture(page,'arrows-hint-test-transport',async()=>{
  await page.locator('#hint:visible').evaluate(e=>e.click());await expect.poll(()=>page.evaluate(()=>window.assistanceFixture.snapshot().shows)).toBe(1);await sleep(650);
  await page.evaluate(()=>{const f=window.assistanceFixture;f.shown();f.earn();});await sleep(600);await page.evaluate(()=>window.assistanceFixture.dismiss());await sleep(2000);
 });
 const assets={};for(const sub of ['assets','ui'])for(const file of await readdir(`dist/${sub}`))assets[`${sub}/${file}`]=createHash('sha256').update(await readFile(`dist/${sub}/${file}`)).digest('hex');
 await writeFile(resolve(output,'capture-manifest.json'),JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),productionProvenance:'Current unmodified production build, Chromium RU390x844 DPR1 mobile emulation. Fresh storage; four wins and three distinct errors earned by ordinary touch selected with an independent cell-walking oracle. Real free continuation. Actual-output audio tee, no substituted sound. Not physical device evidence.',hintProvenance:'Separate isolated in-memory test entry, visible test/no-ad banner. Same application scene and real ProgressStore receipt commit; controlled SDK transport confirms reward without any real video. Starts with the authentic saved c05 attempt from the preceding production recording. Never included in normal build/APK.',fixtureBundleSha256:createHash('sha256').update(code).digest('hex'),assets,records,ending:{wins:normal.wins.length,index:normal.index,lives:normal.campaign.board.lives,continuations:normal.campaign.continuations}},null,2));await context.close();
}finally{await browser.close();server.kill('SIGTERM');}
