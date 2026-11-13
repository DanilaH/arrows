import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const output=resolve(process.argv[2]??'.test-output/soft-edges-release');
await mkdir(output,{recursive:true});
const fields=JSON.parse(await readFile('src/content/campaign.json','utf8')),records=[];
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4189','--strictPort'],{stdio:'ignore'});
const browser=await chromium.launch({headless:true}),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));
const camera=async page=>JSON.parse(await page.locator('#game-root').getAttribute('data-camera'));
const area=page=>page.locator('#game-root').evaluate(e=>({top:parseFloat(getComputedStyle(e).getPropertyValue('--board-clear-top')),bottom:parseFloat(getComputedStyle(e).getPropertyValue('--board-clear-bottom'))}));
function free(arrow,remaining){
  const head=arrow.path.at(-1),before=arrow.path.at(-2),dx=Math.sign(head.x-before.x),dy=Math.sign(head.y-before.y);
  return !remaining.some(other=>other!==arrow&&other.path.slice(1).some((b,i)=>{
    const a=other.path[i],n=Math.abs(b.x-a.x)+Math.abs(b.y-a.y);
    for(let j=0;j<=n;j++){const x=a.x+Math.sign(b.x-a.x)*j,y=a.y+Math.sign(b.y-a.y)*j;if(dx&&y===head.y&&(x-head.x)*dx>0||dy&&x===head.x&&(y-head.y)*dy>0)return true;}return false;
  }));
}
async function solve(page,index){
  await expect(page.locator('#game-shell')).toHaveAttribute('data-level',fields[index].id);await sleep(350);
  for(;;){
    const saved=await state(page),remaining=fields[index].arrows.filter(a=>!saved.campaign.board.removed.includes(a.id));if(!remaining.length)break;
    const arrow=remaining.find(a=>free(a,remaining));if(!arrow)throw Error('Independent oracle found no legal move');
    const c=await camera(page),p=arrow.path.at(-1);await page.touchscreen.tap(c.x+p.x*c.scale,c.y+p.y*c.scale);
    await expect.poll(async()=>Number(await page.locator('#game-shell').getAttribute('data-remaining'))).toBeLessThan(remaining.length);
  }
  await expect(page.locator('#win')).toBeVisible();
}
async function pinch(page,cdp,factor){
  const v=await area(page),at={x:195,y:(v.top+v.bottom)/2},fingers=gap=>[{x:at.x-gap,y:at.y,id:1},{x:at.x+gap,y:at.y,id:2}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:fingers(22)});
  for(let i=1;i<=14;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:fingers(22*(1+(factor-1)*i/14))});await sleep(22);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(300);
}
async function drag(page,cdp,dx,dy){
  const v=await area(page),start={x:195,y:(v.top+v.bottom)/2};
  const points=(x,y)=>[{x,y,id:1}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(start.x,start.y)});
  // Enter pan explicitly so the final short adjustment cannot activate an arrow.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(start.x+12,start.y)});
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(start.x+12+(dx-12)*i/8,start.y+dy*i/8)});await sleep(24);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function place(page,cdp,point,target){
  for(let i=0;i<20;i++){
    const c=await camera(page),dx=target.x-c.x-point.x*c.scale,dy=target.y-c.y-point.y*c.scale;
    if(Math.hypot(dx,dy)<1)return;
    await drag(page,cdp,Math.max(-120,Math.min(120,dx)),Math.max(-150,Math.min(150,dy)));
  }
  throw Error('Could not reach edge through ordinary pan gestures');
}
async function capture(page,name,action){
  const dir=resolve(output,name);await mkdir(dir,{recursive:true});
  const cdp=await page.context().newCDPSession(page),frames=[];let recording=true;
  const loop=(async()=>{while(recording){const at=Date.now(),file=`${String(frames.length).padStart(5,'0')}.png`,shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(dir,file),Buffer.from(shot.data,'base64'));frames.push({at,file});await sleep(Math.max(0,60-(Date.now()-at)));}})();
  try{await sleep(700);await action(cdp);await sleep(1000);}finally{recording=false;await loop;await cdp.detach();}
  await writeFile(resolve(dir,'frames.txt'),frames.map((f,i)=>`file '${f.file}'\nduration ${Math.max(.02,((frames[i+1]?.at??f.at+60)-f.at)/1000)}`).join('\n')+`\nfile '${frames.at(-1).file}'\n`);
  execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',resolve(dir,'frames.txt'),'-vf','fps=16,scale=390:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',resolve(output,`${name}.gif`)]);
  records.push({name,frames:frames.length,durationMs:frames.at(-1).at-frames[0].at,sha256:createHash('sha256').update(await readFile(resolve(output,`${name}.gif`))).digest('hex')});
  console.info(`Captured ${name}`);
}
try{
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4189')).ok)break;}catch{}if(i===99)throw Error('Preview unavailable');await sleep(100);}
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'ru-RU'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4189');await page.locator('#home-play:enabled').waitFor();await page.evaluate(()=>document.fonts.ready);await page.locator('#home-play').click();
  for(let i=0;i<19;i++){await solve(page,i);await page.locator('#next').click();if(i%5===4)console.info(`Earned ${i+1} wins`);}
  await expect(page.locator('#game-shell')).toHaveAttribute('data-level','c20');await sleep(3100);await expect(page.locator('.game-unlock')).toHaveCount(0,{timeout:8000});
  const before=await state(page),v=await area(page);
  await capture(page,'arrows-soft-edges-pan',async cdp=>{
    await pinch(page,cdp,3);await sleep(450);
    await place(page,cdp,{x:22.5,y:21},{x:195,y:v.top-10});await sleep(750);
    await place(page,cdp,{x:26.5,y:34},{x:195,y:v.bottom+14});await sleep(750);
    await place(page,cdp,{x:22.5,y:21},{x:195,y:(v.top+v.bottom)/2});
  });
  await capture(page,'arrows-soft-edges-resume',async()=>{
    const c=await camera(page);await page.locator('#choose-field').click();await expect(page.locator('.route-snapshot,.board-transition')).toHaveCount(0);await sleep(750);
    await page.locator('#home-play').click();await expect(page.locator('.route-snapshot,.board-transition')).toHaveCount(0);
    const after=await camera(page);if(Math.hypot(after.x-c.x,after.y-c.y)>1||Math.abs(after.scale-c.scale)>.01)throw Error('Resume camera drift');
  });
  const after=await state(page);if(after.wins.length!==19||after.index!==19||JSON.stringify(after.campaign.board)!==JSON.stringify(before.campaign.board)||after.wins.some(w=>w.mistakes)||after.receipts.length||errors.length)throw Error('Capture changed game state or raised an error');
  const assets={};for(const sub of ['assets','ui','fonts'])for(const file of await readdir(`dist/${sub}`))assets[`${sub}/${file}`]=createHash('sha256').update(await readFile(`dist/${sub}/${file}`)).digest('hex');
  await writeFile(resolve(output,'capture-manifest.json'),JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),provenance:'Unmodified production Chromium, RU390x844 DPR1 mobile emulation. Fresh storage; nineteen wins genuinely earned by ordinary touches selected with an independent cell-walking oracle. Real pinch/pan at Nightmare c20 and Home/resume. No injected progress/camera/rewards/SDK transport, no added sound; GIFs are silent. Browser evidence, not physical-device performance.',assets,records,clearArea:v,ending:{wins:after.wins.length,index:after.index,board:after.campaign.board,view:after.campaign.view}},null,2));
  await context.close();
}finally{await browser.close();server.kill();}
