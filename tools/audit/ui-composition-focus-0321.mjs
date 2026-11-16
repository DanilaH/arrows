import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Board,canExit,freshSave,freshAttempt,campaign} from '../../.test-output/ui-composition-0321/ssr/ui-composition-source.js';
import {controlledNative} from '../qa/assistance-native-transport.mjs';

// Current APK only. These helpers prepare QA state, never patch application UI.
const out='.test-output/ui-composition-0321',port=4274,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const source=JSON.parse(await readFile(`${out}/source.json`,'utf8'));
const evidence={source,screens:[],recordings:[],errors:[]};
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',`${out}/web`,'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const browser=await chromium.launch();
function seed(index=39){
 const s=freshSave();s.index=index;s.campaign=freshAttempt(campaign[index]);
 s.wins=campaign.slice(0,index).map((l,i)=>({attempt:`focus-past-${i}`,levelId:l.id,activeMs:43000,completedAt:Date.parse('2026-11-16T09:00:00+05:00')+i*60000,localDate:'2026-11-16',mistakes:0}));
 s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=index>=19?['collection','calendar']:index>=9?['collection']:[];return s;
}
function partial(index=39,left){const s=seed(index),b=new Board(s.campaign.level,s.campaign.board.id);const count=left===undefined?8:b.remaining.length-left;for(let i=0;i<count;i++)b.activate(b.hint());s.campaign.board=b.snapshot();s.campaign.started=true;s.campaign.activeMs=38000;return s;}
function lost(){const s=seed(9),b=new Board(s.campaign.level,s.campaign.board.id);while(b.hearts)b.activate(b.remaining.find(a=>!b.isError(a.id)&&!canExit(a,b.remaining)).id);s.campaign.board=b.snapshot();s.campaign.started=true;s.freeContinueUsed=true;return s;}
async function boot(s,profile='dark',w=390,h=844){
 const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1.5,isMobile:true,hasTouch:true,timezoneId:'Asia/Yekaterinburg'});
 await context.addInitScript(controlledNative,{save:s,preserve:true,settings:{version:1,language:'ru',theme:profile,sound:true,vibration:true}});
 const p=await context.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>evidence.errors.push(e.message));
 await p.clock.setFixedTime(new Date('2026-11-16T12:00:00+05:00'));await p.goto(`http://127.0.0.1:${port}/`);await p.locator('#home-play:enabled').waitFor();
 await p.evaluate(()=>document.querySelector('#qa-recording-source')?.remove());await settle(p);return{context,p,profile:`${profile}-${w}x${h}`};
}
async function settle(p){await p.waitForFunction(()=>!document.querySelector('.route-snapshot,.board-transition'));await sleep(320);}
async function click(p,key){const r=await p.locator(key).evaluate(e=>{const r=e.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{x:r.x+r.width/2,y:r.y+r.height/2,hit:e.contains(top),top:top?.outerHTML.slice(0,400)};});if(!r.hit){await p.screenshot({path:`${out}/focus-hit-error.png`});console.log('HIT ERROR',key,r);}assert(r.hit,key);await p.mouse.click(r.x,r.y);}
const saved=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));
const qa=(p,key,...args)=>p.evaluate(({key,args})=>assistanceQA[key](...args),{key,args});
async function tap(p,id){const a=(await saved(p)).campaign,c=JSON.parse(await p.locator('#game-root').getAttribute('data-camera')),q=a.level.arrows.find(a=>a.id===id).path.at(-1);await p.mouse.click(c.x+q.x*c.scale,c.y+q.y*c.scale);}
async function snap(p,profile,name){
 await settle(p);const file=`focus-${profile}-${name}.png`;await p.screenshot({path:`${out}/${file}`});
 const facts=await p.evaluate(()=>{const selectors=['.home-board','.home-progress','.streak-chip','.heading','#app-title','#difficulty','#app-status','#hint','#guides','#win','.record-grid','.trophy-list','.trophy-inspect','.month-count','.trophy-year'];const entries=Object.fromEntries(selectors.map(k=>{const e=document.querySelector(k);if(!e)return[k,null];const r=e.getBoundingClientRect(),s=getComputedStyle(e);return[k,{x:r.x,y:r.y,w:r.width,h:r.height,visibility:s.visibility,display:s.display,font:s.fontSize,color:s.color,background:s.backgroundColor,text:e.textContent.trim().slice(0,120)}];}));return{entries,bg:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),horizontalOverflow:document.documentElement.scrollWidth>innerWidth,mode:document.querySelector('#game-shell').dataset.screen,camera:JSON.parse(document.querySelector('#game-root').dataset.camera),controls:[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility==='visible'&&!e.closest('[hidden]')).map(e=>{const r=e.getBoundingClientRect();return{id:e.id||e.dataset.action,text:e.textContent.trim().slice(0,60),x:r.x,y:r.y,w:r.width,h:r.height,disabled:e.disabled,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};})};});
 evidence.screens.push({profile,name,file,...facts});console.log(profile,name);await writeFile(`${out}/focus.json`,JSON.stringify(evidence,null,2)+'\n');
}
async function earned(p){await p.waitForFunction(()=>!!assistanceQA.snapshot().request);await qa(p,'shown');await qa(p,'earned');await qa(p,'dismiss');await p.waitForFunction(()=>!!JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign.hint);}
async function record(name,prepare,actions){
 const session=await prepare(),{context,p}=session,viewport=p.viewportSize(),dir=`${out}/${name}`;await mkdir(dir,{recursive:true});
 await settle(p);await qa(p,'startAudio');const cdp=await context.newCDPSession(p),frames=[],start=performance.now();let running=true;
 frames.push({at:0,data:await p.screenshot({type:'jpeg',quality:94,scale:'css'})});
 cdp.on('Page.screencastFrame',e=>{if(running)frames.push({at:performance.now()-start,data:Buffer.from(e.data,'base64')});void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:94,maxWidth:viewport.width,maxHeight:viewport.height,everyNthFrame:1});
 await sleep(1100);const facts=await actions(session);await sleep(1150);const bytes=await qa(p,'stopAudio'),duration=performance.now()-start;running=false;await cdp.send('Page.stopScreencast');assert(frames.length>=3&&bytes.length>0);
 for(const[i,f]of frames.entries())await writeFile(`${dir}/${String(i).padStart(5,'0')}.jpg`,f.data);
 await writeFile(`${dir}/actual-output.webm`,Buffer.from(bytes));await writeFile(`${dir}/frames.txt`,frames.map((f,i)=>`file '${String(i).padStart(5,'0')}.jpg'\nduration ${Math.max(.01,((frames[i+1]?.at??duration)-f.at)/1000)}`).join('\n')+`\nfile '${String(frames.length-1).padStart(5,'0')}.jpg'\n`);
 const w=viewport.width,h=viewport.height,caption=`fps=30,scale=${w}:${h},pad=${w}:${h+40}:0:0:color=0x1e1e2c,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='CURRENT 0.32.1 c072973 - ${name}':x=(w-tw)/2:y=${h+6}:fontsize=9:fontcolor=white,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Actual audio - prepared QA - Chromium - not a phone':x=(w-tw)/2:y=${h+23}:fontsize=9:fontcolor=white`;
 execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',`${dir}/frames.txt`,'-i',`${dir}/actual-output.webm`,'-vf',caption,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',`${out}/${name}-audio.mp4`]);
 execFileSync('ffmpeg',['-y','-v','error','-i',`${out}/${name}-audio.mp4`,'-vf',`drawbox=x=0:y=${h+20}:w=${w}:h=20:color=0x1e1e2c:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='SILENT GIF - current Chromium - not a phone':x=(w-tw)/2:y=${h+23}:fontsize=9:fontcolor=white,fps=20,split[a][b];[a]palettegen=max_colors=128[q];[b][q]paletteuse=dither=bayer:bayer_scale=3`,'-loop','0',`${out}/${name}.gif`]);
 evidence.recordings.push({name,viewport,dpr:1.5,frames:frames.length,durationMs:duration,facts,source:'Only current signed0.32.1 APK web; real pointer/wheel input and game WebAudio; initial actual screenshot plus timed CDP JPEG frames; no synthetic effects or native phone claims'});await writeFile(`${out}/focus.json`,JSON.stringify(evidence,null,2)+'\n');console.log(name,frames.length,'frames');await context.close();
}
try{
 for(let i=0;i<80;i++){try{if((await fetch(`http://127.0.0.1:${port}/`)).ok)break;}catch{}await sleep(100);}
 for(const[theme,w,h]of[['dark',390,844],['light',390,844],['dark',320,568]]){
  let a=await boot(freshSave(),theme,w,h);await click(a.p,'#home-calendar');await snap(a.p,a.profile,'calendar-locked');await a.p.keyboard.press('Escape');await click(a.p,'#home-collection');await snap(a.p,a.profile,'collection-locked');await a.context.close();
  a=await boot(partial(),theme,w,h);await click(a.p,'#home-play');await a.p.locator('#hint:visible').waitFor();for(const phase of['loading','backoff','unavailable']){await qa(a.p,'readinessPhase',phase,30000);await snap(a.p,a.profile,`help-${phase}`);}await qa(a.p,'lateReady');await click(a.p,'#hint');await click(a.p,'[data-action=rewarded-cascade]');await earned(a.p);await sleep(950);await snap(a.p,a.profile,'cascade-earned');await a.context.close();
  a=await boot(partial(2,1),theme,w,h);await click(a.p,'#home-play');await a.p.locator('#hint:visible').waitFor();await snap(a.p,a.profile,'ordinary-ready');await click(a.p,'#hint');await earned(a.p);await sleep(850);await snap(a.p,a.profile,'ordinary-earned');await a.context.close();
  a=await boot(lost(),theme,w,h);await click(a.p,'#home-play');await click(a.p,'[data-action=rewarded-continue]');await earned(a.p);await sleep(900);await snap(a.p,a.profile,'continue-earned');assert.equal((await saved(a.p)).campaign.board.lives,3);await a.context.close();
  a=await boot(partial(119,1),theme,w,h);await click(a.p,'#home-play');await settle(a.p);let s=await saved(a.p);await tap(a.p,new Board(s.campaign.level,s.campaign.board.id,s.campaign.board).hint());await a.p.locator('#next:visible').waitFor();await sleep(2200);await snap(a.p,a.profile,'campaign-complete');await click(a.p,'#choose-field');await snap(a.p,a.profile,'home-complete');await a.context.close();
  for(const[index,label]of[[8,'collection'],[18,'calendar']]){
   a=await boot(partial(index,1),theme,w,h);await click(a.p,'#home-play');await settle(a.p);s=await saved(a.p);await tap(a.p,new Board(s.campaign.level,s.campaign.board.id,s.campaign.board).hint());await a.p.locator('#next:visible').waitFor();await click(a.p,'#next');await a.p.locator('.game-unlock').waitFor();await snap(a.p,a.profile,`unlock-${label}`);await a.context.close();
  }
 }
 await record('home-current',async()=>{
  const a=await boot(freshSave());await click(a.p,'#home-settings');await click(a.p,'#preview-sound');await a.p.keyboard.press('Escape');return a;
 },async({p})=>{
  const before=await p.locator('.home-board').getAttribute('data-selected');await click(p,'#home-play');await settle(p);await sleep(800);const s=await saved(p),b=new Board(s.campaign.level,s.campaign.board.id,s.campaign.board);await tap(p,b.hint());await sleep(850);await click(p,'#choose-field');await settle(p);await sleep(700);const after=await saved(p);return{fixture:'Fresh save, no prior wins. Settings audio preview only before recording.',initialPreviewSelected:before,afterPreviewSelected:await p.locator('.home-board').getAttribute('data-selected'),actualRemoved:after.campaign.board.removed,actualArrowTap:true};
 });
 await record('navigation-current',async()=>{const a=await boot(partial(119));await click(a.p,'#home-play');await a.p.locator('#hint:visible').waitFor();return a;},async({p})=>{
  const before=await saved(p),fit=JSON.parse(await p.locator('#game-root').getAttribute('data-camera'));await p.mouse.move(195,422);await p.mouse.wheel(0,-1000);await sleep(850);const zoom=JSON.parse(await p.locator('#game-root').getAttribute('data-camera'));await p.mouse.move(215,405);await p.mouse.down();for(let i=1;i<=7;i++){await p.mouse.move(215-i*13,405+i*21);await sleep(60);}await p.mouse.up();await sleep(900);const pan=JSON.parse(await p.locator('#game-root').getAttribute('data-camera'));await click(p,'#choose-field');await settle(p);await sleep(650);const after=await saved(p);assert.deepEqual(after.campaign.board,before.campaign.board);return{fixture:'Prepared c120, eight legal removals, original content; no hint/ad used',input:'Actual mouse wheel zoom and pointer drag, not a physical pinch',fit,zoom,pan,boardUnchanged:true,overviewControlPresent:await p.locator('[data-action="fit"],#fit-board,#overview').count()};
 });
 await record('finish-current',async()=>{const a=await boot(partial(2,1));await click(a.p,'#home-play');return a;},async({p})=>{
  const before=await saved(p),b=new Board(before.campaign.level,before.campaign.board.id,before.campaign.board);await tap(p,b.hint());await p.locator('#next:visible').waitFor();await sleep(1550);await click(p,'#next');await settle(p);await sleep(700);return{fixture:'Prepared flawless c03 with one remaining legal arrow; recorded last move and Next are real input',nextLevel:await p.locator('#game-shell').getAttribute('data-level'),recordedGameAudio:true};
 });
 assert.deepEqual(evidence.errors,[]);await writeFile(`${out}/focus.json`,JSON.stringify(evidence,null,2)+'\n');console.log('DONE',evidence.screens.length,'focused states,',evidence.recordings.length,'actual recordings,',evidence.errors.length,'errors');
}finally{await browser.close();server.kill();}
