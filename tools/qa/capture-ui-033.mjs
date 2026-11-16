import{chromium}from'@playwright/test';
import{spawn,execFileSync}from'node:child_process';
import{mkdir,readFile,writeFile}from'node:fs/promises';
import assert from'node:assert/strict';
import{controlledNative}from'./assistance-native-transport.mjs';
import{Board,freshSave,activeSave,awardSave}from'./ui-033-state.mjs';
const out='.test-output/ui-033',port=4282,sleep=ms=>new Promise(r=>setTimeout(r,ms)),manifest=JSON.parse(await readFile(`${out}/capture-manifest.json`,'utf8'));
manifest.clips=[];
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',`${out}/web`,'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'}),browser=await chromium.launch();
async function settle(p){await p.waitForFunction(()=>!document.querySelector('.route-snapshot,.board-transition'));await sleep(250);}
async function click(p,key){const r=await p.locator(key).evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});assert(r.hit,key);await p.mouse.click(r.x,r.y);}
const saved=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));
const camera=async p=>JSON.parse(await p.locator('#game-root').getAttribute('data-camera'));
const qa=(p,name)=>p.evaluate(name=>assistanceQA[name](),name);
async function boot(save){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1.5,isMobile:true,hasTouch:true,timezoneId:'Asia/Yekaterinburg'});
 await context.addInitScript(controlledNative,{save,preserve:true,settings:{version:1,language:'ru',theme:'dark',sound:true,vibration:true}});
 const p=await context.newPage(),errors=[];p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-11-16T12:00:00+05:00'));await p.goto(`http://127.0.0.1:${port}`);await p.locator('#home-play:enabled').waitFor();await p.evaluate(()=>document.querySelector('#qa-recording-source')?.remove());
 // Unlock and warm the actual game audio outside the recorded sequence.
 await p.locator('#home-settings').click();await p.locator('#preview-sound').click();await sleep(650);await p.locator('#close-settings').click();await p.locator('#settings-dialog').waitFor({state:'hidden'});await sleep(200);return{context,p,errors};
}
async function tap(p,id){const a=(await saved(p)).campaign,c=await camera(p),head=a.level.arrows.find(a=>a.id===id).path.at(-1);await p.mouse.click(c.x+head.x*c.scale,c.y+head.y*c.scale);}
async function record(name,prepare,actions){
 const s=await prepare(),{context,p,errors}=s,dir=`${out}/record-${name}-${manifest.source.slice(0,7)}`;await mkdir(dir,{recursive:true});await settle(p);await qa(p,'startAudio');
 const cdp=await context.newCDPSession(p),frames=[],start=performance.now();let running=true;
 frames.push({at:0,data:await p.screenshot({type:'jpeg',quality:94,scale:'css'})});
 cdp.on('Page.screencastFrame',e=>{if(running)frames.push({at:performance.now()-start,data:Buffer.from(e.data,'base64')});void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:94,maxWidth:390,maxHeight:844,everyNthFrame:1});await sleep(1000);const facts=await actions(s);await sleep(1100);
 const duration=performance.now()-start;running=false;await cdp.send('Page.stopScreencast');const audio=await qa(p,'stopAudio');assert.deepEqual(errors,[]);assert(frames.length>3&&audio.length>0);
 for(const[i,f]of frames.entries())await writeFile(`${dir}/${String(i).padStart(5,'0')}.jpg`,f.data);
 await writeFile(`${dir}/actual-output.webm`,Buffer.from(audio));await writeFile(`${dir}/frames.txt`,frames.map((f,i)=>`file '${String(i).padStart(5,'0')}.jpg'\nduration ${Math.max(.01,((frames[i+1]?.at??duration)-f.at)/1000)}`).join('\n')+`\nfile '${String(frames.length-1).padStart(5,'0')}.jpg'\n`);
 const caption=`fps=30,scale=390:844,pad=390:884:0:0:color=0x1e1e2c,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='CURRENT 0.33.0 ${manifest.source.slice(0,7)} - ${name}':x=(w-tw)/2:y=850:fontsize=10:fontcolor=white,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Actual game audio - prepared QA - Chromium - not a phone':x=(w-tw)/2:y=868:fontsize=9:fontcolor=white`;
 execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',`${dir}/frames.txt`,'-i',`${dir}/actual-output.webm`,'-vf',caption,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',`${out}/${name}-audio.mp4`]);
 execFileSync('ffmpeg',['-y','-v','error','-i',`${out}/${name}-audio.mp4`,'-vf',`drawbox=x=0:y=864:w=390:h=20:color=0x1e1e2c:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='SILENT GIF - current Chromium - not a phone':x=(w-tw)/2:y=868:fontsize=9:fontcolor=white,fps=20,split[a][b];[a]palettegen=max_colors=128[q];[b][q]paletteuse=dither=bayer:bayer_scale=3`,'-loop','0',`${out}/${name}.gif`]);
 manifest.clips.push({name,source:manifest.source,application:manifest.application,viewport:{width:390,height:844},dpr:1.5,frames:frames.length,frameDirectory:dir,durationMs:duration,facts,errors,initialFrame:'Actual viewport screenshot; later CDP JPEG frames held for elapsed times',input:'Real pointer and wheel input; prepared progress; no synthetic UI frames or overdub'});await writeFile(`${out}/capture-manifest.json`,JSON.stringify(manifest,null,2)+'\n');await context.close();console.log(name,frames.length,'real frames');
}
try{
 for(let i=0;i<80;i++){try{if((await fetch(`http://127.0.0.1:${port}`)).ok)break;}catch{}await sleep(100);}
 await record('home',()=>boot(freshSave()),async({p})=>{
  assert.equal(await p.locator('.home-board').getAttribute('data-selected'),'false');const initial=await p.locator('.home-board').evaluate(e=>e.getBoundingClientRect().height);assert.equal(initial,0);await click(p,'#home-play');await settle(p);await sleep(650);const a=(await saved(p)).campaign,b=new Board(a.level,a.board.id,a.board);await tap(p,b.hint());await sleep(850);await click(p,'#choose-field');await settle(p);await sleep(800);assert.equal(await p.locator('.home-remaining').textContent(),'Осталось 2 стрелки');return{fixture:'Fresh save; no seeded victories; audio preview before recording only',initialHiddenSlotHeight:initial,actualMove:true,removed:(await saved(p)).campaign.board.removed,remainingLabel:await p.locator('.home-remaining').textContent()};
 });
 await record('overview',async()=>{const a=await boot(activeSave());await click(a.p,'#home-play');await a.p.locator('#hint:visible').waitFor();return a;},async({p})=>{
  const before=await saved(p),fit=await camera(p);await p.mouse.move(195,422);await p.mouse.wheel(0,-1000);await p.locator('#board-overview:visible').waitFor();await sleep(650);await click(p,'#board-overview');await sleep(85);await p.mouse.move(205,415);await p.mouse.down();for(let i=1;i<=6;i++){await p.mouse.move(205+i*10,415+i*13);await sleep(45);}await p.mouse.up();await sleep(500);const interrupted=await camera(p);assert(interrupted.scale>fit.scale);await click(p,'#board-overview');await p.locator('#board-overview').waitFor({state:'hidden'});await sleep(750);const final=await camera(p);assert(Math.abs(final.scale-fit.scale)<.000001);const after=await saved(p);assert.deepEqual(after.campaign.board,before.campaign.board);assert.equal(after.campaign.view.zoom,1);return{fixture:'Prepared current c120 with8legal removals, no paid help used',actualWheelZoom:true,actualPanInterruptedFit:true,fit,interrupted,final,boardUnchanged:true,persistedZoom:after.campaign.view.zoom};
 });
 await record('collection',()=>boot(awardSave()),async({p})=>{
  await click(p,'#home-collection');await settle(p);await sleep(850);await click(p,'#collection-current-trophy');await p.locator('#trophy-viewer').waitFor();await sleep(1000);await click(p,'[data-close-trophy]');await p.locator('#trophy-viewer').waitFor({state:'hidden'});await click(p,'#collection-open-month');await settle(p);await sleep(850);await click(p,'[data-nav="back"]');await settle(p);
  const key='[data-month="2026-08"]';for(let i=0;i<5;i++){const r=await p.locator(key).boundingBox();if(r.y>25&&r.y+r.height<750)break;await p.mouse.move(200,430);await p.mouse.wheel(0,r.y<25?-350:350);await sleep(320);}await click(p,key);await settle(p);await click(p,'#view-trophy');await p.locator('#trophy-viewer').waitFor();await sleep(1050);assert.equal(await p.locator('.trophy-rule').textContent(),'Все дни месяца пройдены');return{fixture:'Prepared current c40,6completed November dates, owned August legacy cup; no rewards granted by this recording',currentMonth:'2026-11',currentDays:6,earnedViewerMonth:'2026-08',earnedCopy:await p.locator('.trophy-rule').textContent(),realWheelScroll:true};
 });
 execFileSync('ffmpeg',['-y','-v','error','-i',`${out}/home-audio.mp4`,'-i',`${out}/overview-audio.mp4`,'-filter_complex','[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]','-map','[v]','-map','[a]','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',`${out}/ui-audio.mp4`]);
 console.log('DONE',manifest.clips.reduce((n,c)=>n+c.frames,0),'real frames');
}finally{await browser.close();server.kill();}
