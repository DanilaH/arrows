/** Real current-production frames/audio. Seeded progression and controlled ad
 * receipts are explicit QA; this is neither a physical phone nor SDK video. */
import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Board,campaign,freshSave,freshAttempt,decodeSave} from '../../.test-output/assistance-source/assistance-state.js';
import {controlledNative} from './assistance-native-transport.mjs';

const out='.test-output/ui-polish-025',port=4198,base=`http://127.0.0.1:${port}`,sleep=ms=>new Promise(r=>setTimeout(r,ms));
await mkdir(out,{recursive:true});
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const payload={};for(const n of await readdir(`${out}/web`,{recursive:true})){try{payload[n]=createHash('sha256').update(await readFile(`${out}/web/${n}`)).digest('hex');}catch{}}
const manifest={source,version:'0.25.0/code37',method:'Real Chromium390x844 DPR1.5 frames, actual WebAudio output, seeded QA saves, controlled native receipt transport; no physical Android/SDK video or human performance measurement. Original timing retained; source caption padded below real frames.',payload,clips:[]};
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',`${out}/web`,'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'}),browser=await chromium.launch();
function seed(variant){if(!variant)return freshSave();const s=freshSave();s.index=39;s.campaign=freshAttempt(campaign[39]);const b=new Board(s.campaign.level,s.campaign.board.id);for(let i=0;i<21;i++)b.activate(`c40-${i}`);s.campaign.board=b.snapshot();s.campaign.started=true;s.campaign.view={centerX:32,centerY:10,zoom:3};s.helpLedger.assignments[b.attemptId]=variant;s.helpLedger.nextVariant=variant;s.wins=campaign.slice(0,39).map((l,i)=>({attempt:`film-${i}`,levelId:l.id,completedAt:i+1,activeMs:1000,mistakes:0}));s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=['collection','calendar'];return decodeSave(s);}
async function tapHint(page){const a=await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign),c=JSON.parse(await page.locator('#game-root').getAttribute('data-camera')),p=a.level.arrows.find(v=>v.id===a.hint).path.at(-1);await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);}
async function clip(name,variant,prepare,action){
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  await ctx.addInitScript(controlledNative,{save:seed(variant),settings:{version:1,language:'ru',theme:'dark',sound:true,vibration:true}});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.locator('#home-play:enabled').waitFor();await prepare(page);await sleep(300);
  // Unlock the actual audio context with a normal control if this case starts
  // before gameplay. Audio capture is only a tap from the game's real sink.
  if(name==='main-controls'){await page.locator('#home-settings').click();await page.locator('#close-settings').click();await page.locator('#settings-dialog').waitFor({state:'hidden'});}
  await page.evaluate(()=>assistanceQA.startAudio());
  const cdp=await ctx.newCDPSession(page),frames=[],start=performance.now();let recording=true;
  cdp.on('Page.screencastFrame',e=>{if(recording)frames.push({t:performance.now()-start,data:Buffer.from(e.data,'base64')});void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});});
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:390,maxHeight:844,everyNthFrame:1});await sleep(450);await action(page);await sleep(700);
  const audio=await page.evaluate(()=>assistanceQA.stopAudio()),end=performance.now()-start;recording=false;await cdp.send('Page.stopScreencast');
  const dir=`${out}/${name}`;await mkdir(dir,{recursive:true});assert(frames.length>5,`No actual frames: ${name}`);
  for(const[i,f]of frames.entries())await writeFile(`${dir}/${String(i).padStart(5,'0')}.jpg`,f.data);
  await writeFile(`${dir}/actual-output.webm`,Buffer.from(audio));
  await writeFile(`${dir}/frames.txt`,frames.map((f,i)=>`file '${String(i).padStart(5,'0')}.jpg'\nduration ${Math.max(.01,((frames[i+1]?.t??end)-f.t)/1000)}`).join('\n')+`\nfile '${String(frames.length-1).padStart(5,'0')}.jpg'\n`);
  const caption=`0.25.0 - ${source.slice(0,7)} - Chromium - seeded QA`;
  execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',`${dir}/frames.txt`,'-i',`${dir}/actual-output.webm`,'-vf',`scale=390:844,pad=390:880:0:0:color=0x1e1e2c,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='${caption}':x=(w-tw)/2:y=850:fontsize=10:fontcolor=white,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Actual game audio - controlled ad transport - no phone':x=(w-tw)/2:y=865:fontsize=9:fontcolor=0xc5c5d5`,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',`${out}/${name}-audio.mp4`]);
  execFileSync('ffmpeg',['-y','-v','error','-i',`${out}/${name}-audio.mp4`,'-vf','fps=20,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',`${out}/${name}.gif`]);
  assert.deepEqual(errors,[]);const state=await page.evaluate(()=>({save:JSON.parse(localStorage.getItem('arrows.progress.v1')),lab:JSON.parse(localStorage.getItem('arrows.target-lab.v1')||'null'),native:assistanceQA.snapshot()}));await writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));
  manifest.clips.push({name,variant,frames:frames.length,durationMs:end,errors,remaining:await page.locator('#game-shell').getAttribute('data-remaining'),screen:await page.locator('#game-shell').getAttribute('data-screen')});await writeFile(`${out}/capture-manifest.json`,JSON.stringify(manifest,null,2));await ctx.close();console.log(name,frames.length,'real frames');
}
try{
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await sleep(100);}
  await clip('main-controls',null,async()=>{},async page=>{
    const b=await page.locator('#home-play').boundingBox();await page.mouse.move(b.x+2,b.y+b.height/2);await page.mouse.down();await sleep(160);await page.mouse.up();await page.waitForFunction(()=>document.querySelector('#game-shell').dataset.screen==='game');await sleep(600);
    await page.locator('#game-settings').click();await sleep(35);await page.keyboard.press('Escape');await page.locator('#settings-dialog').waitFor({state:'hidden'});await page.locator('#game-settings').click();await sleep(350);await page.locator('#theme-light').click();await sleep(350);await page.locator('#close-settings').click();await sleep(500);
  });
  await clip('b1-centred-hint',null,async page=>{await page.goto(base+'/target-lab.html');await page.locator('#lab-options summary').click();await page.locator('#lab-help').selectOption('single');await page.locator('#lab-restart').click();},async page=>{
    const before=await page.locator('#lab-hint').boundingBox();await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();await sleep(180);assert.deepEqual(await page.locator('#lab-hint').boundingBox(),before);await page.mouse.up();await page.locator('#lab-hint').waitFor({state:'hidden'});await sleep(1000);
  });
  for(const variant of ['route-v1','cascade-v1'])await clip(variant==='route-v1'?'route-overview':'cascade-overview',variant,async page=>{await page.locator('#home-play').click();await page.locator('#hint:visible').waitFor();await sleep(950);},async page=>{
    await page.locator('#hint').click();await page.waitForFunction(()=>!!assistanceQA.snapshot().request);await sleep(180);await page.evaluate(()=>assistanceQA.shown());await sleep(180);await page.evaluate(()=>{assistanceQA.earned();assistanceQA.dismiss();});await sleep(1000);
    if(variant==='route-v1'){for(let i=0;i<3;i++){await tapHint(page);await sleep(450);}assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign.hint),null);}
    else {await tapHint(page);await sleep(1100);assert.equal(await page.locator('#game-shell').getAttribute('data-remaining'),'15');}
  });
}finally{await browser.close();server.kill();}
