import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Board,canExit,freshSave,freshAttempt,ProgressStore,archivedCampaign,dailyLevel} from '../../.test-output/primary-help-state/primary-help-state.js';
import {controlledNative} from './assistance-native-transport.mjs';

// Before bytes match the previous signed APK; current bytes are extracted from
// the verified final APK. Controlled receipts are not real SDK ad footage.
const out='.test-output/cascade-primary-031',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const manifest=JSON.parse(await readFile(`${out}/capture-manifest.json`,'utf8'));manifest.clips=[];
const servers=[['web',4241],['before-web',4242]].map(([directory,port])=>spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',`${out}/${directory}`,'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'}));
const browser=await chromium.launch();
function seed(lost=false){
 const s=freshSave();s.index=39;s.campaign=freshAttempt(archivedCampaign[39]);
 s.wins=archivedCampaign.slice(0,39).map((l,i)=>({attempt:`prepared-${i}`,levelId:l.id,activeMs:1000,completedAt:i+1,mistakes:0}));
 const b=new Board(s.campaign.level,s.campaign.board.id);for(let i=0;i<21;i++)b.activate(`c40-${i}`);
 if(lost)for(const a of b.remaining.filter(a=>!canExit(a,b.remaining)).slice(0,3))b.activate(a.id);
 s.campaign.board=b.snapshot();s.campaign.started=true;s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=['collection','calendar'];s.freeContinueUsed=true;return s;
}
async function savedSeed(){
 let raw=JSON.stringify(seed());const store=new ProgressStore({async getItem(){return raw;},async setItem(_k,v){raw=v;},async removeItem(){}});await store.load();
 const id=store.board.attemptId,r=await store.prepareHelpRequest(store.helpOffer(id));
 await store.commitReward({schema:2,intentVersion:1,id:r.requestId,requestId:r.requestId,attempt:id,mode:'campaign',placement:'hint'});await store.restart(id);
 for(let i=0;i<21;i++)await store.move(store.board.attemptId,`c40-${i}`);
 const s=structuredClone(store.state);store.destroy();return s;
}
const saved=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));
async function camera(p){return JSON.parse(await p.locator('#game-root').getAttribute('data-camera'));}
async function tapHint(p,date){const s=await saved(p),a=date?s.daily[date]:s.campaign,c=await camera(p),h=a.level.arrows.find(arrow=>arrow.id===a.hint).path.at(-1);await p.mouse.click(c.x+h.x*c.scale,c.y+h.y*c.scale);}
async function grant(p){await p.waitForFunction(()=>!!assistanceQA.snapshot().request);await p.evaluate(()=>assistanceQA.shown());await sleep(350);await p.evaluate(()=>{assistanceQA.earned();assistanceQA.dismiss();});await p.waitForFunction(()=>assistanceQA.snapshot().events.some(e=>e.event==='assistance_fact'&&e.params.phase==='reveal_ready'));}
async function clip(name,{state=seed(),before=false,date,lost=false},action){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
 await context.addInitScript(controlledNative,{save:state,preserve:true,settings:{version:1,language:'ru',theme:'dark',sound:true,vibration:true}});
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-11-16T12:00:00+05:00'));
 await p.goto(`http://127.0.0.1:${before?4242:4241}/`);
 await p.locator(date?'#home-calendar':'#home-play').click();
 if(date){await p.locator(`[data-date="${date}"]`).click();await p.locator('#start-daily').click();await p.waitForFunction(id=>document.querySelector('#game-shell').dataset.level===id,`d${date.replaceAll('-','')}`);}
 await p.waitForFunction(()=>document.querySelectorAll('.board-transition,.route-snapshot').length===0);
 await p.locator(lost?'[data-action=rewarded-continue]':'#hint:visible').waitFor();await sleep(450);
 await mkdir(`${out}/${name}`,{recursive:true});await writeFile(`${out}/${name}/prepared-save.json`,JSON.stringify(await saved(p)));
 await p.evaluate(()=>document.querySelector('#qa-recording-source')?.remove());await p.evaluate(()=>assistanceQA.startAudio());
 const cdp=await context.newCDPSession(p),frames=[],start=performance.now();let running=true;
 cdp.on('Page.screencastFrame',e=>{if(running)frames.push({at:performance.now()-start,data:Buffer.from(e.data,'base64')});void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});});
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:390,maxHeight:844,everyNthFrame:1});
 await sleep(650);await action(p);await sleep(900);const audio=await p.evaluate(()=>assistanceQA.stopAudio()),end=performance.now()-start;running=false;await cdp.send('Page.stopScreencast');
 assert.deepEqual(errors,[]);assert(frames.length>20);
 const dir=`${out}/${name}`;await mkdir(dir,{recursive:true});for(const[i,f]of frames.entries())await writeFile(`${dir}/${String(i).padStart(5,'0')}.jpg`,f.data);
 await writeFile(`${dir}/actual-output.webm`,Buffer.from(audio));
 await writeFile(`${dir}/frames.txt`,frames.map((f,i)=>`file '${String(i).padStart(5,'0')}.jpg'\nduration ${Math.max(.01,((frames[i+1]?.at??end)-f.at)/1000)}`).join('\n')+`\nfile '${String(frames.length-1).padStart(5,'0')}.jpg'\n`);
 const source=before?manifest.beforeSource:manifest.source;
 execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',`${dir}/frames.txt`,'-i',`${dir}/actual-output.webm`,'-vf',`scale=390:844,pad=390:880:0:0:color=0x1e1e2c,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='${before?'BEFORE 0.30':'CURRENT 0.31'} ${source.slice(0,7)} - ${name} - real web frames':x=(w-tw)/2:y=849:fontsize=9:fontcolor=white,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Actual audio - prepared QA - controlled receipt - no SDK video':x=(w-tw)/2:y=864:fontsize=9:fontcolor=white`,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',`${out}/${name}-audio.mp4`]);
 const final=await saved(p),a=date?final.daily[date]:final.campaign;assert.equal(final.freeContinueUsed,true);
 manifest.clips.push({name,source,frames:frames.length,durationMs:end,errors,mode:date?'daily':'campaign',level:{id:a.level.id,contentVersion:a.level.contentVersion,arrows:a.level.arrows.length},board:a.board,rights:Object.values(final.helpLedger.rights).map(r=>({id:r.id,kind:r.kind,status:r.status,amount:r.amount,operation:r.operation,bundle:r.bundle})),requests:Object.values(final.helpLedger.requests).map(r=>({id:r.requestId,kind:r.kind,amount:r.amount})),freeContinueUsed:final.freeContinueUsed});
 await writeFile(`${out}/capture-manifest.json`,JSON.stringify(manifest,null,2)+'\n');await context.close();console.log(name,frames.length,'actual frames',Math.round(end)+'ms');
}
function combine(names,name){const args=['-y','-v','error'];for(const n of names)args.push('-i',`${out}/${n}-audio.mp4`);args.push('-filter_complex',names.map((_,i)=>`[${i}:v][${i}:a]`).join('')+`concat=n=${names.length}:v=1:a=1[v][a]`,'-map','[v]','-map','[a]','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',`${out}/${name}-audio.mp4`);execFileSync('ffmpeg',args);}
function gif(name){const caption="drawbox=x=0:y=862:w=390:h=18:color=0x1e1e2c:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='SILENT GIF - real Chromium - prepared QA - not a phone':x=(w-tw)/2:y=865:fontsize=9:fontcolor=white";execFileSync('ffmpeg',['-y','-v','error','-i',`${out}/${name}-audio.mp4`,'-vf',`${caption},fps=20,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`,'-loop','0',`${out}/${name}.gif`]);}
try{
 for(const port of [4241,4242])for(let i=0;i<80;i++){try{if((await fetch(`http://127.0.0.1:${port}/`)).ok)break;}catch{}await sleep(100);}
 await clip('before-choice',{before:true,date:'2026-11-14'},async p=>{const initial=(await saved(p)).daily['2026-11-14'].board;assert.equal(await p.locator('.board-actions button:visible').count(),3);await p.locator('#cascade').click();await sleep(600);await p.locator('[data-action=cancel]').click();assert.equal((await saved(p)).daily['2026-11-14'].hint,null);assert.deepEqual((await saved(p)).daily['2026-11-14'].board,initial);});
 await clip('primary-cascade-use',{date:'2026-11-14'},async p=>{
  const before=await saved(p);assert.equal(await p.locator('#cascade').count(),0);assert.equal(await p.locator('.board-actions button:visible').count(),2);
  await p.locator('#hint').click();await sleep(750);await p.locator('[data-action=rewarded-cascade]').click();await grant(p);await sleep(400);
  const earned=await saved(p),right=Object.values(earned.helpLedger.rights).find(r=>r.kind==='cascade-v1');assert(right);assert(right.amount>=2&&right.amount<=4);assert.equal(await p.locator('#game-root').getAttribute('data-help-group'),JSON.stringify(right.plan.bonus));
  await tapHint(p,'2026-11-14');await p.waitForFunction(id=>JSON.parse(localStorage.getItem('arrows.progress.v1')).helpLedger.rights[id].status==='used',right.id);
  const used=await saved(p),r=used.helpLedger.rights[right.id];assert.deepEqual(r.operation.bonus,right.plan.bonus);assert.equal(used.daily['2026-11-14'].board.removed.length,before.daily['2026-11-14'].board.removed.length+right.amount+1);assert.equal(used.daily['2026-11-14'].board.lives,3);
 });
 const fallback=seed(),b=new Board(fallback.campaign.level,fallback.campaign.board.id,fallback.campaign.board);while(b.remaining.length>2)b.activate(b.hint());fallback.campaign.board=b.snapshot();
 await clip('ordinary-fallback',{state:fallback},async p=>{assert.equal(await p.locator('#hint').getAttribute('data-help-effect'),'single-v2');await p.locator('#hint').click();await grant(p);await sleep(250);await tapHint(p);await p.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('arrows.progress.v1')).helpLedger.rights).some(r=>r.status==='used'));const s=await saved(p),r=Object.values(s.helpLedger.rights)[0];assert.equal(r.kind,'single-v2');assert.deepEqual(r.operation.bonus,[]);});
 await clip('saved-ordinary',{state:await savedSeed()},async p=>{assert.equal(await p.locator('#hint').getAttribute('data-help-reserved'),'true');await p.locator('#hint').click();await p.waitForFunction(()=>assistanceQA.snapshot().events.some(e=>e.event==='assistance_fact'&&e.params.phase==='reveal_ready'));assert.equal(await p.evaluate(()=>assistanceQA.snapshot().request),null);await sleep(400);await tapHint(p);await p.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('arrows.progress.v1')).helpLedger.rights).some(r=>r.status==='used'));const s=await saved(p),r=Object.values(s.helpLedger.rights)[0];assert.equal(r.kind,'single-v2');assert.deepEqual(r.operation.bonus,[]);assert.equal(Object.keys(s.helpLedger.requests).length,1);});
 await clip('continue-single',{state:seed(true),lost:true},async p=>{const before=(await saved(p)).campaign.board;await p.locator('[data-action=rewarded-continue]').click();await grant(p);await sleep(450);const s=await saved(p),r=Object.values(s.helpLedger.rights)[0];assert.equal(r.kind,'continue-single-v1');assert.equal(s.campaign.board.lives,3);assert.deepEqual(s.campaign.board.errors,before.errors);await tapHint(p);await p.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('arrows.progress.v1')).helpLedger.rights).some(r=>r.status==='used'));assert.deepEqual(Object.values((await saved(p)).helpLedger.rights)[0].operation.bonus,[]);});
 const before=JSON.parse(await readFile(`${out}/before-choice/prepared-save.json`,'utf8')),after=JSON.parse(await readFile(`${out}/primary-cascade-use/prepared-save.json`,'utf8'));assert.deepEqual(before.daily['2026-11-14'].level,after.daily['2026-11-14'].level);manifest.beforeAfterSameLevel=true;await writeFile(`${out}/capture-manifest.json`,JSON.stringify(manifest,null,2)+'\n');
 combine(['before-choice','primary-cascade-use'],'primary-cascade');gif('primary-cascade');combine(['ordinary-fallback','saved-ordinary','continue-single'],'ordinary-context');gif('ordinary-context');combine(['primary-cascade-use','ordinary-fallback','saved-ordinary','continue-single'],'primary-help');
}finally{await browser.close();for(const server of servers)server.kill();}
