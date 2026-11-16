import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshSave,freshAttempt,campaign,dailyLevel} from '../../.test-output/primary-help-state/primary-help-state.js';
import {controlledNative} from './assistance-native-transport.mjs';

// Both roots are extracted signed APK assets, checked by verify-ui-apk.py.
// No generated UI frames or synthesized demonstration sounds are used.
const out='.test-output/ui-audit-032',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const manifest=JSON.parse(await readFile(`${out}/capture-manifest.json`,'utf8'));manifest.clips=[];
const servers=[['web',4261],['before-web',4262]].map(([dir,port])=>spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',`${out}/${dir}`,'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'}));
const browser=await chromium.launch();
const state=freshSave();state.index=39;state.campaign=freshAttempt(campaign[39]);
state.wins=campaign.slice(0,39).map((l,i)=>({attempt:`ui-prepared-${i}`,levelId:l.id,activeMs:1000,completedAt:i+1,mistakes:0}));
state.seenUnlocks=['calendar','collection'];state.tutorials=['tap','turns','blockers','guides','zoom','hint'];
state.daily['2026-11-02']=freshAttempt(dailyLevel('2026-11-02'));
async function geometry(p,selector){return p.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});}
async function click(p,selector){const r=await geometry(p,selector);assert(r.hit,selector);await p.mouse.click(r.x+r.w/2,r.y+r.h/2);}
async function clip(name,before,viewport,prepare,actions,delayFirstWorker=false){
 const context=await browser.newContext({viewport,deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
 await context.addInitScript(controlledNative,{save:state,preserve:true,settings:{version:1,language:'ru',theme:'dark',sound:true,vibration:true}});
 if(delayFirstWorker)await context.addInitScript(()=>{
  const Original=window.Worker;let first=true;
  window.uiCaptureWorker={terminated:false};
  window.Worker=class {
   constructor(...args){if(!first)return new Original(...args);first=false;this.onmessage=this.onerror=this.onmessageerror=null;}
   postMessage(){} // Hold only the first construction; retry uses the real Worker.
   terminate(){window.uiCaptureWorker.terminated=true;}
  };
 });
 const p=await context.newPage(),errors=[];p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-11-16T12:00:00+05:00'));
 await p.goto(`http://127.0.0.1:${before?4262:4261}/`);await p.locator('#home-calendar:enabled').click();await p.waitForFunction(()=>!document.querySelector('.route-snapshot'));await sleep(400);await prepare(p);
 await p.evaluate(()=>document.querySelector('#qa-recording-source')?.remove());await p.evaluate(()=>assistanceQA.startAudio());
 const cdp=await context.newCDPSession(p),frames=[],start=performance.now();let running=true;
 // An idle page may emit its first screencast frame only AFTER the first input.
 // Take the actual initial viewport explicitly so it is held for its real time
 // and audio stays aligned with the following input, rather than cropping it.
 frames.push({at:0,data:await p.screenshot({type:'jpeg',quality:92,scale:'css'})});
 cdp.on('Page.screencastFrame',e=>{if(running)frames.push({at:performance.now()-start,data:Buffer.from(e.data,'base64')});void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:viewport.width,maxHeight:viewport.height,everyNthFrame:1});
 await sleep(850);const facts=await actions(p);await sleep(900);const audio=await p.evaluate(()=>assistanceQA.stopAudio()),end=performance.now()-start;running=false;await cdp.send('Page.stopScreencast');
 assert.deepEqual(errors,[]);assert(frames.length>=3);assert(audio.length>0);
 const dir=`${out}/${name}`;await mkdir(dir,{recursive:true});
 for(const[i,f]of frames.entries())await writeFile(`${dir}/${String(i).padStart(5,'0')}.jpg`,f.data);
 await writeFile(`${dir}/actual-output.webm`,Buffer.from(audio));await writeFile(`${dir}/prepared-save.json`,JSON.stringify(state));
 await writeFile(`${dir}/frames.txt`,frames.map((f,i)=>`file '${String(i).padStart(5,'0')}.jpg'\nduration ${Math.max(.01,((frames[i+1]?.at??end)-f.at)/1000)}`).join('\n')+`\nfile '${String(frames.length-1).padStart(5,'0')}.jpg'\n`);
 const source=before?manifest.beforeSource:manifest.source,w=viewport.width,h=viewport.height;
 const caption=`fps=30,scale=${w}:${h},pad=${w}:${h+36}:0:0:color=0x1e1e2c,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='${before?'BEFORE 0.31':'CURRENT 0.32'} ${source.slice(0,7)} - ${name}':x=(w-tw)/2:y=${h+5}:fontsize=9:fontcolor=white,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Actual audio - prepared QA - Chromium - not a phone':x=(w-tw)/2:y=${h+20}:fontsize=9:fontcolor=white`;
 execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',`${dir}/frames.txt`,'-i',`${dir}/actual-output.webm`,'-vf',caption,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',`${out}/${name}-audio.mp4`]);
 manifest.clips.push({name,source,viewport,dpr:1.5,frames:frames.length,controlledFirstWorkerDelay:delayFirstWorker,initialFrame:'Actual viewport screenshot at recording start; subsequent CDP frames with elapsed timing',durationMs:end,facts,errors});await writeFile(`${out}/capture-manifest.json`,JSON.stringify(manifest,null,2)+'\n');
 await context.close();console.log(name,frames.length,'actual frames',Math.round(end)+'ms');
}
function combine(names,name){const args=['-y','-v','error'];for(const n of names)args.push('-i',`${out}/${n}-audio.mp4`);args.push('-filter_complex',names.map((_,i)=>`[${i}:v][${i}:a]`).join('')+`concat=n=${names.length}:v=1:a=1[v][a]`,'-map','[v]','-map','[a]','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',`${out}/${name}-audio.mp4`);execFileSync('ffmpeg',args);}
function gif(name,w,h){execFileSync('ffmpeg',['-y','-v','error','-i',`${out}/${name}-audio.mp4`,'-vf',`drawbox=x=0:y=${h+18}:w=${w}:h=18:color=0x1e1e2c:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='SILENT GIF - actual Chromium - not a phone':x=(w-tw)/2:y=${h+21}:fontsize=9:fontcolor=white,fps=20,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`,'-loop','0',`${out}/${name}.gif`]);}
try{
 for(const port of [4261,4262])for(let i=0;i<80;i++){try{if((await fetch(`http://127.0.0.1:${port}/`)).ok)break;}catch{}await sleep(100);}
 await clip('calendar-before',true,{width:320,height:568},async()=>{},async p=>{
  const initial=await geometry(p,'#start-daily');assert(!initial.hit);
  await sleep(700);await p.mouse.move(170,350);await p.mouse.wheel(0,250);await sleep(1200);
  await click(p,'[data-date="2026-11-02"]');await sleep(500);const revealed=await geometry(p,'#start-daily');
  return{initial,revealed,initialRootScroll:0,explanation:'Play starts below the fold; real wheel scroll exposes it. Date fixture matches after.'};
 });
 await clip('calendar-after',false,{width:320,height:568},async()=>{},async p=>{
  const initial=await geometry(p,'#start-daily');assert(initial.hit);assert(initial.y+initial.h<492);
  const date=await geometry(p,'[data-date="2026-11-02"]');
  // A real wheel gesture only changes the month's scroll; Play stays put.
  await p.mouse.move(170,340);await p.mouse.wheel(0,100);await sleep(700);const scrolled=await geometry(p,'#start-daily');assert.deepEqual(scrolled,initial);
  await p.mouse.wheel(0,-200);await sleep(600);await click(p,'[data-date="2026-11-02"]');
  const during=await geometry(p,'#start-daily');assert.deepEqual(during,initial);await click(p,'#start-daily');
  await p.waitForFunction(()=>document.querySelector('#game-shell').dataset.level==='d20261102');await sleep(900);
  const s=await p.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));assert.deepEqual(s.daily['2026-11-02'].level,state.daily['2026-11-02'].level);
  await click(p,'#choose-field');await sleep(450);const returned=await geometry(p,'#start-daily');assert(returned.hit);
  return{initial,scrolled,during,returned,date,startedDate:'2026-11-02',sameEmbeddedLevel:true,freeContinueUsed:s.freeContinueUsed};
 });
 await clip('calendar-cancel-retry',false,{width:320,height:568},async()=>{},async p=>{
  await click(p,'[data-date="2026-11-15"]');await click(p,'#start-daily');await p.locator('#start-daily[aria-busy="true"]').waitFor();await sleep(500);
  await click(p,'#view-trophy');await sleep(550);await click(p,'[data-close-trophy]');await p.locator('#trophy-viewer').waitFor({state:'hidden'});
  await p.locator('#start-daily:enabled').waitFor();const recovered=await geometry(p,'#start-daily');assert(recovered.hit);assert(await p.evaluate(()=>uiCaptureWorker.terminated));
  await sleep(350);await click(p,'#start-daily');await p.waitForFunction(()=>document.querySelector('#game-shell').dataset.level==='d20261115');await sleep(500);
  const s=await p.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));assert.deepEqual(s.daily['2026-11-15'].level,dailyLevel('2026-11-15'));assert.deepEqual(s.receipts,[]);
  return{firstWorker:'Explicit QA delay, cancelled by trophy entry',retry:'Real production Worker and actual dated level',recovered,receipts:0,freeContinueUsed:s.freeContinueUsed};
 },true);
 const trophy=async p=>{await p.locator('#view-trophy').click();await sleep(400);};
 await clip('trophy-before',true,{width:568,height:320},trophy,async p=>{
  const initial=await geometry(p,'[data-open-month]');assert(!initial.hit);await sleep(850);
  await p.mouse.move(280,210);await p.mouse.wheel(0,350);await sleep(1100);const revealed=await geometry(p,'[data-open-month]');
  return{initial,revealed,explanation:'Before: large portrait pushes Open month outside the initial dialog.'};
 });
 await clip('trophy-after',false,{width:568,height:320},trophy,async p=>{
  const open=await geometry(p,'[data-open-month]'),close=await geometry(p,'[data-close-trophy]');assert(open.hit&&close.hit);assert(close.w>=44&&close.h>=44);
  await sleep(750);await click(p,'[data-close-trophy]');await sleep(300);await click(p,'#view-trophy');await sleep(90);
  await click(p,'[data-open-month]');await p.locator('#trophy-viewer').waitFor({state:'hidden'});await sleep(550);
  const play=await geometry(p,'#start-daily');assert(play.hit);return{open,close,play,interruptedEntranceAccepted:true};
 });
 combine(['calendar-before','calendar-after','calendar-cancel-retry'],'calendar-before-after');gif('calendar-before-after',320,568);
 combine(['trophy-before','trophy-after'],'trophy-before-after');gif('trophy-before-after',568,320);
 // One short audible recording, with only current-build UI sounds.
 combine(['calendar-after','calendar-cancel-retry'],'ui');
 manifest.comparison={samePreparedSave:true,calendarViewport:'320x568',trophyViewport:'568x320',before:'signed0.31APK web',after:'signed0.32APK web'};
 await writeFile(`${out}/capture-manifest.json`,JSON.stringify(manifest,null,2)+'\n');
}finally{await browser.close();for(const server of servers)server.kill();}
