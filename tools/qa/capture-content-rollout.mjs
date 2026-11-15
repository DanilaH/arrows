import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Board,chooseSingle,freshSave,freshAttempt,campaign,dailyLevel} from '../../.test-output/rollout-state/rollout-state.js';
import {controlledNative} from './assistance-native-transport.mjs';

// Run against extracted, verified signed APK assets, never a synthetic HTML scene.
const out='.test-output/content-rollout-030',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const manifest=JSON.parse(await readFile(`${out}/capture-manifest.json`,'utf8'));manifest.clips=[];
const dailies=Object.fromEntries(['2026-11-14','2026-11-15'].map(date=>[date,dailyLevel(date)]));
function seed(index){const s=freshSave();s.index=index;s.campaign=freshAttempt(campaign[index]);s.wins=campaign.slice(0,index).map((l,i)=>({attempt:`capture-past-${i}`,levelId:l.id,activeMs:1000,completedAt:i+1,mistakes:0}));s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=['collection','calendar'];s.freeContinueUsed=true;return s;}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',`${out}/web`,'--host','127.0.0.1','--port','4238','--strictPort'],{stdio:'ignore'});
const browser=await chromium.launch();
async function camera(p){return JSON.parse(await p.locator('#game-root').getAttribute('data-camera'));}
async function tap(p,level,id){const c=await camera(p),h=level.arrows.find(a=>a.id===id).path.at(-1);await p.mouse.click(c.x+h.x*c.scale,c.y+h.y*c.scale);}
const caption="drawbox=x=0:y=862:w=390:h=18:color=0x1e1e2c:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='SILENT GIF - actual APK web - scripted QA - no phone':x=(w-tw)/2:y=865:fontsize=9:fontcolor=white";
function gif(name){execFileSync('ffmpeg',['-y','-v','error','-i',`${out}/${name}-audio.mp4`,'-vf',`${caption},fps=20,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`,'-loop','0',`${out}/${name}.gif`]);}
function combine(names,name){const args=['-y','-v','error'];for(const n of names)args.push('-i',`${out}/${n}-audio.mp4`);args.push('-filter_complex',names.map((_,i)=>`[${i}:v][${i}:a]`).join('')+`concat=n=${names.length}:v=1:a=1[v][a]`,'-map','[v]','-map','[a]','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',`${out}/${name}-audio.mp4`);execFileSync('ffmpeg',args);gif(name);}
async function clip(name,index,mode,action,date){
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});await ctx.addInitScript(controlledNative,{save:seed(index),settings:{version:1,language:'ru',theme:'dark',sound:true,vibration:true}});const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-11-15T12:00:00+05:00'));
 await p.goto('http://127.0.0.1:4238/');await p.locator(mode==='campaign'?'#home-play':'#home-calendar').click();await sleep(550);if(mode==='daily'){await p.locator(`[data-date="${date}"]`).click();await p.locator('#start-daily').click();await p.waitForFunction(id=>document.querySelector('#game-shell').dataset.level===id,`d${date.replaceAll('-','')}`);await sleep(550);await p.locator('#guides').click();await sleep(150);await p.locator('#guides').click();await sleep(150);}await p.evaluate(()=>document.querySelector('#qa-recording-source')?.remove());await p.evaluate(()=>assistanceQA.startAudio());
 const cdp=await ctx.newCDPSession(p),frames=[],start=performance.now();let running=true;
 cdp.on('Page.screencastFrame',e=>{if(running)frames.push({at:performance.now()-start,data:Buffer.from(e.data,'base64')});void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});});await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:390,maxHeight:844,everyNthFrame:1});await sleep(650);await action(p);await sleep(1000);const audio=await p.evaluate(()=>assistanceQA.stopAudio()),end=performance.now()-start;running=false;await cdp.send('Page.stopScreencast');assert.deepEqual(errors,[]);assert(frames.length>30);
 const dir=`${out}/${name}`;await mkdir(dir,{recursive:true});for(const[i,f]of frames.entries())await writeFile(`${dir}/${String(i).padStart(5,'0')}.jpg`,f.data);await writeFile(`${dir}/actual-output.webm`,Buffer.from(audio));await writeFile(`${dir}/frames.txt`,frames.map((f,i)=>`file '${String(i).padStart(5,'0')}.jpg'\nduration ${Math.max(.01,((frames[i+1]?.at??end)-f.at)/1000)}`).join('\n')+`\nfile '${String(frames.length-1).padStart(5,'0')}.jpg'\n`);
 execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',`${dir}/frames.txt`,'-i',`${dir}/actual-output.webm`,'-vf',`scale=390:844,pad=390:880:0:0:color=0x1e1e2c,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='0.30.0 ${manifest.source.slice(0,7)} - ${name} - APK web in Chromium':x=(w-tw)/2:y=849:fontsize=9:fontcolor=white,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Actual audio - prepared progress - scripted input - no phone':x=(w-tw)/2:y=864:fontsize=9:fontcolor=white`,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',`${out}/${name}-audio.mp4`]);
 const final=await p.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));assert.equal(final.freeContinueUsed,true);manifest.clips.push({name,frames:frames.length,durationMs:end,errors,mode,preparedIndex:index,final:{campaign:{id:final.campaign.level.id,version:final.campaign.level.contentVersion,board:final.campaign.board},daily:Object.fromEntries(Object.entries(final.daily).map(([date,a])=>[date,{id:a.level.id,version:a.level.contentVersion,arrows:a.level.arrows.length,board:a.board}])),receipts:final.receipts,wins:final.wins.length}});await writeFile(`${out}/capture-manifest.json`,JSON.stringify(manifest,null,2)+'\n');await ctx.close();console.log(name,frames.length,'real frames',Math.round(end)+'ms');
}
try{
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4238')).ok)break;}catch{}await sleep(100);}
 for(const number of[83,85,89]){const level=campaign[number-1],choice=chooseSingle(new Board(level,'capture')),mark=choice.newlyFree[0];await clip(`campaign-${number}`,number-1,'campaign',async p=>{
  await p.locator('#choose-field').click();await sleep(450);await p.locator('#home-play').click();await p.waitForFunction(()=>!document.querySelector('.board-transition,.route-snapshot'));await sleep(250);
  if(mark){await tap(p,level,mark);await p.waitForFunction(()=>document.querySelector('#game-shell').dataset.lives==='2');await sleep(380);}
  await tap(p,level,choice.root);await p.waitForFunction(n=>Number(document.querySelector('#game-shell').dataset.remaining)===n,level.arrows.length-(mark?2:1));await sleep(450);
 });}
 for(const date of['2026-11-15','2026-11-14']){const level=dailies[date],b=new Board(level,'capture'),moves=[];for(let i=0;i<2;i++){const id=b.hint();moves.push(id);b.activate(id);}await clip(`daily-${date.slice(-2)}`,19,'daily',async p=>{
  for(let i=0;i<moves.length;i++){await tap(p,level,moves[i]);await p.waitForFunction(n=>Number(document.querySelector('#game-shell').dataset.remaining)===n,level.arrows.length-i-1);await sleep(300);}
  await p.mouse.move(195,430);await p.mouse.wheel(0,-650);await sleep(550);await p.mouse.move(195,430);await p.mouse.down();await p.mouse.move(125,480,{steps:8});await p.mouse.up();await sleep(500);
  const c=await camera(p),visible=b.remaining.map(a=>({a,h:a.path.at(-1)})).filter(({h})=>c.x+h.x*c.scale>32&&c.x+h.x*c.scale<358&&c.y+h.y*c.scale>145&&c.y+h.y*c.scale<690).sort((u,v)=>Math.hypot(c.x+u.h.x*c.scale-195,c.y+u.h.y*c.scale-430)-Math.hypot(c.x+v.h.x*c.scale-195,c.y+v.h.y*c.scale-430));
  if(visible[0]){const h=visible[0].h,x=c.x+h.x*c.scale,y=c.y+h.y*c.scale;await p.mouse.move(x,y);await p.mouse.down();await sleep(420);await p.mouse.move(x+35,y,{steps:4});await p.mouse.up();}
  await p.mouse.move(195,430);await p.mouse.wheel(0,900);await sleep(600);assert.equal(await p.locator('#game-shell').getAttribute('data-remaining'),String(level.arrows.length-2));
 },date);}
 combine(['campaign-83','campaign-85','campaign-89'],'campaign-variety');combine(['daily-15','daily-14'],'large-dailies');
}finally{await browser.close();server.kill();}
