import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {freshSave,freshAttempt,campaign,Board,canExit} from '../../.test-output/primary-help-state/primary-help-state.js';
import {controlledNative} from './assistance-native-transport.mjs';

// Independent initial-screen inspection. Never scroll/focus/click the control
// under measurement: Playwright's auto-scroll used to hide the calendar defect.
const out=process.env.UI_AUDIT_OUT??'.test-output/ui-audit-032/baseline';
const url=process.env.UI_AUDIT_URL??'http://127.0.0.1:4250';
const source=process.env.UI_AUDIT_SOURCE??'0.31.0 production dist /978fa67; prepared progress, controlled native transport; no phone claim';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',process.env.UI_AUDIT_DIST??'dist','--host','127.0.0.1','--port','4250','--strictPort'],{stdio:'ignore'});
for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch();
const state=freshSave();state.index=39;state.campaign=freshAttempt(campaign[39]);
state.wins=campaign.slice(0,39).map((l,i)=>({attempt:`audit-${i}`,levelId:l.id,activeMs:1000,completedAt:i+1,mistakes:0}));
state.seenUnlocks=['calendar','collection'];state.tutorials=['tap','turns','blockers','guides','zoom','hint'];
const rows=[];await mkdir(out,{recursive:true});
const geometry=async page=>page.evaluate(()=>{
 const controls=[...document.querySelectorAll('button,summary,select')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden]'));
 const scroller=document.querySelector('.calendar-scroll')??document.querySelector('#meta-screen');
 return {viewport:{w:innerWidth,h:innerHeight},scroll:{top:scroller?.scrollTop,height:scroller?.scrollHeight,client:scroller?.clientHeight},controls:controls.map(e=>{
  const r=e.getBoundingClientRect();let unclipped=r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;
  for(let p=e.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),a=p.getBoundingClientRect();
   if(/auto|scroll|hidden|clip/.test(s.overflowX))unclipped&&=r.left>=a.left+p.clientLeft-.01&&r.right<=a.left+p.clientLeft+p.clientWidth+.01;
   if(/auto|scroll|hidden|clip/.test(s.overflowY))unclipped&&=r.top>=a.top+p.clientTop-.01&&r.bottom<=a.top+p.clientTop+p.clientHeight+.01;
  }
  return {id:e.id||e.dataset.date||e.dataset.action||e.className,label:e.getAttribute('aria-label')||e.textContent.trim().slice(0,70),disabled:e.disabled??false,x:r.x,y:r.y,w:r.width,h:r.height,visible:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,unclipped,hit:[[.5,.5],[.2,.2],[.8,.8]].every(([x,y])=>e.contains(document.elementFromPoint(r.x+r.width*x,r.y+r.height*y)))};
 })};
});
try {
 for(const viewport of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:412,height:760},{width:568,height:320},{width:780,height:360},{width:800,height:1280}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  await context.addInitScript(controlledNative,{save:state,settings:{version:1,theme:'dark',language:'ru',sound:true,vibration:true}});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-16T12:00:00+05:00'));
  await page.goto(url);await page.locator('#home-play:enabled').waitFor();await page.waitForTimeout(450);
  const capture=async name=>{const data=await geometry(page);rows.push({name,viewport,data,errors:[...errors]});await page.screenshot({path:`${out}/${viewport.width}-${name}.png`});};
  await capture('home');
  await page.locator('#home-calendar').click();await page.waitForTimeout(450);await capture('calendar-initial');
  while(!(await page.locator('[data-date]').first().getAttribute('data-date')).startsWith('2026-08'))await page.locator('[data-shift="-1"]').click();
  await page.waitForTimeout(450);await capture('calendar-six-rows');
  await page.locator('#view-trophy').click();await page.waitForTimeout(400);await capture('trophy');await page.keyboard.press('Escape');
  await page.locator('#home-collection').click();await page.waitForTimeout(400);await capture('collection');
  await page.locator('#home-settings').click();await page.waitForTimeout(350);await capture('settings');await page.keyboard.press('Escape');
  await page.locator('#home-tab').click();await page.locator('#home-play').click();await page.waitForTimeout(600);await capture('game');
  await page.waitForTimeout(3600);if(await page.locator('#hint').isVisible()){await page.locator('#hint').click();await page.waitForTimeout(300);await capture('help');await page.keyboard.press('Escape');}
  await page.locator('#restart').click().catch(()=>{});await page.waitForTimeout(300);await capture('restart');
  await context.close();
 }
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:568,height:320}])for(const name of ['ftue','loss-gift','loss-video','finish-flawless','finish-errors']){
  const save=freshSave(),index=name.startsWith('loss')?9:2;
  if(name!=='ftue'){
   save.index=index;save.campaign=freshAttempt(campaign[index]);save.tutorials=['tap','turns','blockers','guides','zoom','hint'];
   save.wins=campaign.slice(0,index).map((l,i)=>({attempt:`result-${i}`,levelId:l.id,activeMs:1000,completedAt:i+1,mistakes:0}));
  }
  const board=new Board(save.campaign.level,save.campaign.board.id);let last;
  if(name.startsWith('loss')){
   while(board.hearts){const arrow=board.remaining.find(a=>!board.isError(a.id)&&!canExit(a,board.remaining));if(!arrow)throw Error('Loss fixture lacks blockers');board.activate(arrow.id);}
   save.freeContinueUsed=name==='loss-video';save.campaign.started=true;save.campaign.board=board.snapshot();
  }else if(name.startsWith('finish')){
   if(name==='finish-errors')board.activate(board.remaining.find(a=>!canExit(a,board.remaining)).id);
   while(board.remaining.length>1)board.activate(board.hint());last=board.remaining[0];save.campaign.started=true;save.campaign.board=board.snapshot();
  }
  const context=await browser.newContext({viewport,deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  await context.addInitScript(controlledNative,{save,settings:{version:1,language:'ru',theme:'dark',sound:true,vibration:true}});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-16T12:00:00+05:00'));
  await page.goto(url);await page.locator('#home-play:enabled').click();await page.waitForTimeout(450);
  if(last){const c=JSON.parse(await page.locator('#game-root').getAttribute('data-camera')),p=last.path.at(-1);await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);await page.locator('#next:visible').waitFor();await page.waitForTimeout(2400);}
  rows.push({name,viewport,data:await geometry(page),errors});await page.screenshot({path:`${out}/${viewport.width}-${name}.png`});await context.close();
 }
 await writeFile(`${out}/report.json`,JSON.stringify({source,rows},null,2)+'\n');
 console.log(JSON.stringify(rows.filter(r=>r.name.startsWith('calendar')||r.name==='game'||r.name==='trophy').map(r=>({viewport:r.viewport,name:r.name,scroll:r.data.scroll,controls:r.data.controls.filter(b=>['start-daily','guides','close-trophy'].includes(b.id)),errors:r.errors})),null,2));
}finally{await browser.close();server.kill();}
