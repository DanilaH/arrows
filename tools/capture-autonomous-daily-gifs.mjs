import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const output=resolve(process.argv[2]??'.test-output/autonomous-daily-release'); await mkdir(output,{recursive:true});
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
 execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',resolve(dir,'frames.txt'),'-vf',`fps=18,scale=${page.viewportSize().width}:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`,'-loop','0',resolve(output,`${name}.gif`)]);
 if(sound)execFileSync('ffmpeg',['-y','-loglevel','error','-threads','2','-filter_threads','1','-f','concat','-safe','0','-i',resolve(dir,'frames.txt'),'-ss',String(Math.max(0,(frames[0].at-audioStart)/1000)),'-i',resolve(dir,'actual-web-audio.webm'),'-vf',`fps=30,scale=${page.viewportSize().width}:-2:flags=lanczos`,'-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-af','apad','-t',String((frames.at(-1).at-frames[0].at+55)/1000),'-movflags','+faststart',resolve(output,`${name}-sound.mp4`)]);
 records.push({name,viewport:page.viewportSize(),frames:frames.length,durationMs:frames.at(-1).at-frames[0].at,audio:sound?'Actual AudioContext output tee into MediaStreamAudioDestinationNode and MediaRecorder Opus; timestamp-aligned and muxed AAC, no added/replaced sound.':null});console.info(`Captured ${name}`);
}
try {
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4189')).ok)break;}catch{}if(i===99)throw Error('Preview unavailable');await sleep(100);}
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'ru-RU',timezoneId:'Asia/Yekaterinburg'});
 const page=await context.newPage();page.on('pageerror',error=>{throw error;});
 await page.clock.setFixedTime(new Date('2026-11-11T12:00:00Z'));
 await page.goto('http://127.0.0.1:4189');await page.locator('#home-play:enabled').click();await sleep(650);
 for(let i=0;i<19;i++){await solve(page,i);await page.locator('#next').click();}
 await expect(page.locator('#game-shell')).toHaveAttribute('data-level','c20');await sleep(600);
 await page.setViewportSize({width:320,height:568});await sleep(400);
 await capture(page,'arrows-late-zoom',async cdp=>{
  const points=gap=>[{x:160-gap,y:270,id:1},{x:160+gap,y:270,id:2}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(25)});
  for(const gap of [35,45,55,65,75]){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(gap)});await sleep(80);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(700);
 });
 const learned=await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')).tutorials.includes('zoom'));if(!learned)throw Error('Real late pinch was not recorded');
 await page.locator('#choose-field').click();await page.setViewportSize({width:390,height:844});
 await page.clock.setFixedTime(new Date('2027-01-05T12:00:00Z'));await sleep(500);
 await capture(page,'arrows-daily-2027',async()=>{
  await page.locator('#home-calendar').click();await expect(page.locator('[data-date="2027-01-05"]')).toHaveAttribute('aria-pressed','true');await sleep(650);
  await page.locator('#start-daily').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-level','d20270105');await sleep(500);
  const a=await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')).daily['2027-01-05']);const remaining=[...a.level.arrows];
  for(let i=0;i<4;i++){const index=remaining.findIndex(a=>!blockers(a,remaining).length);if(index<0)throw Error('No free arrow');await tap(page,remaining[index]);remaining.splice(index,1);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining',String(remaining.length));await sleep(260);}
  await page.locator('#choose-field').click();await sleep(550);
 });
 await page.locator('#home-settings').click();await page.locator('#theme-light').click();await page.locator('#close-settings').click();await expect(page.locator('#settings-dialog')).not.toBeVisible();
 await page.clock.setFixedTime(new Date('2046-06-08T12:00:00Z'));await sleep(500);await page.locator('#home-collection').click();await sleep(450);
 await capture(page,'arrows-trophies-2046',async()=>{
  await expect(page.locator('#trophy-year')).toHaveValue('2046');await page.locator('[data-month="2046-06"]').click();await sleep(500);await page.locator('#view-trophy').click();await sleep(1100);await page.keyboard.press('Escape');await sleep(450);
 });
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));
 if(state.wins.length!==19||state.index!==19||state.wins.some(w=>w.mistakes)||state.cups.length||Object.keys(state.dailyWins).length||state.receipts.length||state.daily['2027-01-05'].board.removed.length!==4)throw Error('Unexpected authentic progress');
 const assets={};for(const sub of ['assets','ui'])for(const file of await readdir(`dist/${sub}`))assets[`${sub}/${file}`]=createHash('sha256').update(await readFile(`dist/${sub}/${file}`)).digest('hex');
 await writeFile(resolve(output,'capture-manifest.json'),JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),provenance:'Current unmodified production Chromium mobile emulation, RU, Asia/Yekaterinburg. Fresh storage, nineteen campaign wins earned by real touch via independent cell-walking oracle, real late c20 pinch recorded. Browser clock is explicitly controlled: 2027-01-05 for new daily (four genuine legal touches), 2046-06-08 for generated trophy preview. No injected progress, cup, receipt, SDK transport or hidden production route. Future-clock previews are QA demonstrations, not actual calendar dates or earned awards. Reminder experiment is absent from production. No physical-phone performance/feel claim.',assets,records,ending:{wins:state.wins.length,index:state.index,daily:Object.keys(state.daily),dailyWins:Object.keys(state.dailyWins),cups:state.cups,receipts:state.receipts,zoomLearned:learned}},null,2));
 await writeFile(resolve(output,'earned-save.json'),JSON.stringify(state));await context.close();
} finally {await browser.close();server.kill('SIGTERM');}
