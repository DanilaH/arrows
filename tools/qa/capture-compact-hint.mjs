/** Real current-production frames/audio. Seeded progression and controlled ad
 * receipts are explicit QA; this is neither a physical phone nor SDK video. */
import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Board,campaign,freshSave,freshAttempt,decodeSave} from '../../.test-output/assistance-source/assistance-state.js';
import {controlledNative} from './assistance-native-transport.mjs';

const out='.test-output/compact-hint-0261',port=4208,base=`http://127.0.0.1:${port}`,sleep=ms=>new Promise(r=>setTimeout(r,ms));
await mkdir(out,{recursive:true});
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const payload={};for(const n of await readdir(`${out}/web`,{recursive:true})){try{payload[n]=createHash('sha256').update(await readFile(`${out}/web/${n}`)).digest('hex');}catch{}}
const manifest={source,version:'0.26.1/code39',method:'Real Chromium390x844 DPR1.5 frames, actual WebAudio output, seeded QA saves, controlled native receipt transport; no physical Android/SDK video or human performance measurement. Original timing retained; source caption padded below real frames.',payload,clips:[]};
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',`${out}/web`,'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'}),browser=await chromium.launch();
function seed(variant){if(!variant)return freshSave();const s=freshSave();s.index=39;s.campaign=freshAttempt(campaign[39]);const b=new Board(s.campaign.level,s.campaign.board.id);for(let i=0;i<21;i++)b.activate(`c40-${i}`);s.campaign.board=b.snapshot();s.campaign.started=true;s.campaign.view={centerX:32,centerY:10,zoom:3};s.helpLedger.assignments[b.attemptId]=variant;s.helpLedger.nextVariant=variant;s.wins=campaign.slice(0,39).map((l,i)=>({attempt:`film-${i}`,levelId:l.id,completedAt:i+1,activeMs:1000,mistakes:0}));s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=['collection','calendar'];return decodeSave(s);}
async function tapHint(page){const a=await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign),c=JSON.parse(await page.locator('#game-root').getAttribute('data-camera')),p=a.level.arrows.find(v=>v.id===a.hint).path.at(-1);await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);}
async function clip(name,mode,prepare,action){
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  const prepared=seed('single-v2');prepared.campaign.view=null;
  await ctx.addInitScript(controlledNative,{save:prepared,settings:{version:1,language:'ru',theme:'dark',sound:true,vibration:true}});
  await ctx.addInitScript(({id,mode})=>localStorage.setItem('arrows.qa.a1-error-cue.v1',JSON.stringify({version:1,next:mode,attempts:{[id]:mode},trace:[]})),{id:prepared.campaign.board.id,mode});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(name==='before'?beforeBase:base);await page.locator('#home-play:enabled').waitFor();await prepare(page);await sleep(300);
  // Unlock the actual audio context with a normal control if this case starts
  // before gameplay. Audio capture is only a tap from the game's real sink.
  if(name==='unused'){await page.locator('#home-settings').click();await page.locator('#close-settings').click();await page.locator('#settings-dialog').waitFor({state:'hidden'});}
  await page.evaluate(()=>assistanceQA.startAudio());
  const cdp=await ctx.newCDPSession(page),frames=[],start=performance.now();let recording=true;
  cdp.on('Page.screencastFrame',e=>{if(recording)frames.push({t:performance.now()-start,data:Buffer.from(e.data,'base64')});void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});});
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:390,maxHeight:844,everyNthFrame:1});await sleep(450);await action(page);await sleep(700);
  const audio=await page.evaluate(()=>assistanceQA.stopAudio()),end=performance.now()-start;recording=false;await cdp.send('Page.stopScreencast');
  const dir=`${out}/${name}`;await mkdir(dir,{recursive:true});assert(frames.length>5,`No actual frames: ${name}`);
  for(const[i,f]of frames.entries())await writeFile(`${dir}/${String(i).padStart(5,'0')}.jpg`,f.data);
  await writeFile(`${dir}/actual-output.webm`,Buffer.from(audio));
  await writeFile(`${dir}/frames.txt`,frames.map((f,i)=>`file '${String(i).padStart(5,'0')}.jpg'\nduration ${Math.max(.01,((frames[i+1]?.t??end)-f.t)/1000)}`).join('\n')+`\nfile '${String(frames.length-1).padStart(5,'0')}.jpg'\n`);
  const caption=name==='before'?'0.26.0 - 19b2fec - Chromium - seeded QA':`0.26.1 - ${source.slice(0,7)} - Chromium - seeded QA`;
  execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',`${dir}/frames.txt`,'-i',`${dir}/actual-output.webm`,'-vf',`scale=390:844,pad=390:880:0:0:color=0x1e1e2c,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='${caption}':x=(w-tw)/2:y=850:fontsize=10:fontcolor=white,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Actual game audio - controlled ad transport - no phone':x=(w-tw)/2:y=865:fontsize=9:fontcolor=0xc5c5d5`,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',`${out}/${name}-audio.mp4`]);
  execFileSync('ffmpeg',['-y','-v','error','-i',`${out}/${name}-audio.mp4`,'-vf',"drawbox=x=0:y=863:w=390:h=17:color=0x1e1e2c:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='SILENT GIF - browser recording - no physical phone':x=(w-tw)/2:y=865:fontsize=9:fontcolor=0xc5c5d5,fps=20,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3",'-loop','0',`${out}/${name}.gif`]);
  assert.deepEqual(errors,[]);const state=await page.evaluate(()=>({save:JSON.parse(localStorage.getItem('arrows.progress.v1')),cue:JSON.parse(localStorage.getItem('arrows.qa.a1-error-cue.v1')||'null'),native:assistanceQA.snapshot()}));await writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));
  const metrics=await page.locator('#hint').evaluate(h=>{const r=h.getBoundingClientRect(),p=getComputedStyle(h,'::before');return{width:r.width,targetHeight:r.height,paintHeight:p.content==='none'?r.height:parseFloat(p.height),text:h.textContent};});
  manifest.clips.push({name,mode,metrics,frames:frames.length,durationMs:end,errors,remaining:await page.locator('#game-shell').getAttribute('data-remaining'),screen:await page.locator('#game-shell').getAttribute('data-screen')});await writeFile(`${out}/capture-manifest.json`,JSON.stringify(manifest,null,2));await ctx.close();console.log(name,frames.length,'real frames');
}
const beforeBase='http://127.0.0.1:4211';
const beforeServer=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir','.test-output/a1-error-cue-026/web','--host','127.0.0.1','--port','4211','--strictPort'],{stdio:'ignore'});
manifest.baseline=JSON.parse(await readFile('.test-output/a1-error-cue-026/capture-manifest.json','utf8'));
async function prepared(page){await page.locator('#home-play').click();await page.locator('#hint:visible').waitFor();await page.waitForFunction(()=>document.querySelector('#hint').getAnimations().length===0);}
try{
  for(const url of [base,beforeBase])for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await sleep(50);}
  for(const name of ['before','after'])await clip(name,'off',prepared,async page=>{
    const h=page.locator('#hint'),rect=await h.boundingBox();await sleep(500);await page.evaluate(()=>assistanceQA.loading());await sleep(650);await page.evaluate(()=>assistanceQA.backoff());await sleep(650);await page.evaluate(()=>assistanceQA.lateReady());await sleep(600);
    if(name==='after'){assert.deepEqual(await h.boundingBox(),rect);assert.equal(await page.locator('#app-status').textContent(),'');assert(!/готово|ready|×1/i.test(await h.textContent()));}
  });
  await clip('compact-cue-edge','cue',prepared,async page=>{
    const a=await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign),c=JSON.parse(await page.locator('#game-root').getAttribute('data-camera')),p=a.level.arrows.find(v=>v.id==='c40-23').path.at(-1);await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('arrows.qa.a1-error-cue.v1')).trace.some(t=>t.event==='shown'));const h=page.locator('#hint'),rect=await h.boundingBox(),cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:rect.x+rect.width-2,y:rect.y+rect.height/2}]});await sleep(220);assert.deepEqual(await h.boundingBox(),rect);assert.equal(await page.locator('.a1-error-cue').count(),0);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>!!assistanceQA.snapshot().request);await page.evaluate(()=>{assistanceQA.shown();assistanceQA.earned();assistanceQA.dismiss();});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign.hint);await sleep(1000);
    assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('arrows.progress.v1')).helpLedger.requests).length),1);
  });
  execFileSync('ffmpeg',['-y','-v','error','-i',`${out}/before-audio.mp4`,'-i',`${out}/after-audio.mp4`,'-filter_complex',"[0:v]pad=390:904:0:24:color=0x1e1e2c,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='BEFORE - 0.26.0':x=(w-tw)/2:y=6:fontsize=12:fontcolor=white[a];[1:v]pad=390:904:0:24:color=0x1e1e2c,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='AFTER - 0.26.1':x=(w-tw)/2:y=6:fontsize=12:fontcolor=white[b];[a][b]hstack=shortest=1[v]",'-map','[v]','-map','1:a','-c:v','libx264','-pix_fmt','yuv420p','-c:a','copy','-shortest',`${out}/before-after-audio.mp4`]);
  execFileSync('ffmpeg',['-y','-v','error','-i',`${out}/before-after-audio.mp4`,'-vf',"drawbox=x=0:y=887:w=780:h=17:color=0x1e1e2c:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='SILENT GIF - independent browser takes - controlled ads':x=(w-tw)/2:y=890:fontsize=10:fontcolor=white,fps=20,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3",'-loop','0',`${out}/before-after.gif`]);
  execFileSync('ffmpeg',['-y','-v','error','-i',`${out}/before-after-audio.mp4`,'-vf',"crop=780:260:0:644,pad=780:284:0:24:color=0x1e1e2c,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='BEFORE - 0.26.0':x=115:y=6:fontsize=12:fontcolor=white,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='AFTER - 0.26.1':x=510:y=6:fontsize=12:fontcolor=white,drawbox=x=0:y=266:w=780:h=18:color=0x1e1e2c:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Actual browser frames - cropped detail - silent GIF - controlled ads':x=(w-tw)/2:y=270:fontsize=10:fontcolor=white,fps=20,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3",'-loop','0',`${out}/before-after-detail.gif`]);
}finally{await browser.close();server.kill();beforeServer.kill();}
