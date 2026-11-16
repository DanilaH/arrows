import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {Board,canExit,freshSave,freshAttempt,decodeSave,ProgressStore,campaign,dailyCatalog,dailyLevel,monthDates,trophyBinding} from '../../.test-output/ui-composition-0321/ssr/ui-composition-source.js';
import {controlledNative} from '../qa/assistance-native-transport.mjs';

// Audit only. Never imported by the game, never alters source CSS/content.
const out='.test-output/ui-composition-0321',port=4271,sleep=ms=>new Promise(r=>setTimeout(r,ms));
await mkdir(out,{recursive:true});const source=JSON.parse(await readFile(`${out}/source.json`,'utf8'));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',`${out}/web`,'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const browser=await chromium.launch(),report={source,profiles:[],screens:[],flows:[],errors:[]};
const profiles=[
 {id:'normal-dark',w:390,h:844,theme:'dark',lang:'ru'},
 {id:'normal-light',w:390,h:844,theme:'light',lang:'ru'},
 {id:'small-dark',w:320,h:568,theme:'dark',lang:'ru'},
 {id:'tall-en',w:430,h:932,theme:'light',lang:'en'},
 {id:'font150',w:360,h:640,theme:'dark',lang:'ru',font:1.5,reduced:true},
];
function seed(index=39){
 const s=freshSave();s.index=index;s.campaign=freshAttempt(campaign[index]);
 const group=Math.max(1,Math.ceil(index/3));
 s.wins=campaign.slice(0,index).map((l,i)=>({attempt:`composition-${i}`,levelId:l.id,activeMs:43000,completedAt:Date.parse(`2026-11-${String(14+Math.floor(i/group)).padStart(2,'0')}T12:00:00+05:00`)+i*60000,localDate:`2026-11-${String(14+Math.floor(i/group)).padStart(2,'0')}`,mistakes:i%7===0?1:0}));
 s.facts=s.wins.map(w=>({kind:'win',attempt:w.attempt,mode:'campaign',localDate:w.localDate,at:w.completedAt}));
 s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=index>=19?['collection','calendar']:index>=9?['collection']:[];return s;
}
function partial(index=39){const s=seed(index),b=new Board(s.campaign.level,s.campaign.board.id);for(let i=0;i<Math.min(8,s.campaign.level.arrows.length-1);i++)b.activate(b.hint());s.campaign.board=b.snapshot();s.campaign.started=true;s.campaign.activeMs=38000;return s;}
function almost(index=2,error=false){const s=seed(index),b=new Board(s.campaign.level,s.campaign.board.id);if(error)b.activate(b.remaining.find(a=>!canExit(a,b.remaining)).id);while(b.remaining.length>1)b.activate(b.hint());s.campaign.board=b.snapshot();s.campaign.started=true;return {s,last:b.remaining[0]};}
function lost(freeUsed=false){const s=seed(9),b=new Board(s.campaign.level,s.campaign.board.id);while(b.hearts)b.activate(b.remaining.find(a=>!b.isError(a.id)&&!canExit(a,b.remaining)).id);s.campaign.board=b.snapshot();s.campaign.started=true;s.freeContinueUsed=freeUsed;return s;}
function cup(){const s=partial();for(const date of monthDates('2026-08')){const a=freshAttempt(dailyCatalog[date]),b=new Board(a.level,a.board.id);while(!b.complete)b.activate(b.hint());a.board=b.snapshot();a.started=true;s.daily[date]=a;s.dailyWins[date]={attempt:b.attemptId,levelId:b.level.id,completedAt:Date.parse(date+'T12:00:00+05:00'),localDate:date,activeMs:84000,mistakes:0};}s.cups=['2026-08'];s.trophyDesigns['2026-08']=trophyBinding('2026-08');return decodeSave(s);}
async function boot(p,s){
 decodeSave(s);const context=await browser.newContext({viewport:{width:p.w,height:p.h},deviceScaleFactor:1.5,isMobile:true,hasTouch:true,timezoneId:'Asia/Yekaterinburg',locale:p.lang==='ru'?'ru-RU':'en-US',reducedMotion:p.reduced?'reduce':'no-preference'});
 await context.addInitScript(controlledNative,{save:s,preserve:true,settings:{version:1,language:p.lang,theme:p.theme,sound:true,vibration:true}});
 const page=await context.newPage();page.setDefaultTimeout(9000);page.on('pageerror',e=>report.errors.push({profile:p.id,error:e.message}));await page.clock.setFixedTime(new Date('2026-11-16T12:00:00+05:00'));
 await page.goto(`http://127.0.0.1:${port}/`);await page.locator('#home-play:enabled').waitFor();
 // Provenance belongs in the report/recording border, not over app navigation.
 await page.evaluate(()=>document.querySelector('#qa-recording-source')?.remove());return{context,page};
}
async function settle(page){await page.waitForFunction(()=>!document.querySelector('.route-snapshot,.board-transition'));await sleep(350);}
async function snap(page,p,name){
 await settle(page);
 if(p.font)await page.evaluate(f=>{const es=[...document.querySelectorAll('body *')].filter(e=>e instanceof HTMLElement),sizes=es.map(e=>parseFloat(getComputedStyle(e).fontSize));es.forEach((e,i)=>{e.dataset.compositionFont=e.style.fontSize;e.style.fontSize=sizes[i]*f+'px';});},p.font);
 await sleep(60);const file=`${p.id}-${name}.png`;await page.screenshot({path:`${out}/${file}`});
 const data=await page.evaluate(()=>{
  const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
  const controls=[...document.querySelectorAll('button,summary,select')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]')).map(e=>{const r=rect(e),s=getComputedStyle(e);return{id:e.id||e.dataset.action||e.dataset.date||e.className,text:e.textContent.trim().slice(0,80),label:e.getAttribute('aria-label'),disabled:e.disabled??false,...r,visibility:s.visibility,opacity:s.opacity,hit:e.contains(document.elementFromPoint(r.x+r.w/2,r.y+r.h/2)),font:s.fontSize,color:s.color,bg:s.backgroundColor,overflow:e.scrollWidth>e.clientWidth+1};});
  const selectors=['.home-heading','.campaign-heading','.home-board','#home-play','.home-progress','#game-header','#game-footer','.heading','#app-status','.month-award','.calendar-scroll','.selected-day','.record-grid','.medal-grid','.trophy-list','.settings-heading','.settings-body','.settings-save','.trophy-viewer-body','#win'];
  const blocks=Object.fromEntries(selectors.map(key=>{const e=document.querySelector(key);return[key,e&&e.getClientRects().length?{...rect(e),visibility:getComputedStyle(e).visibility,text:e.textContent.trim().slice(0,140),scrollH:e.scrollHeight,clientH:e.clientHeight}:null]}));
  const preview=document.querySelector('.home-board');
  return{viewport:{w:innerWidth,h:innerHeight},screen:document.querySelector('#game-shell').dataset.screen,level:document.querySelector('#game-shell').dataset.level,remaining:document.querySelector('#game-shell').dataset.remaining,homePreview:preview?{level:preview.dataset.level,selected:preview.dataset.selected,paths:preview.querySelectorAll('polyline').length}:null,camera:JSON.parse(document.querySelector('#game-root').dataset.camera||'null'),controls,blocks,bodyOverflow:document.documentElement.scrollWidth>innerWidth+1};
 });
 report.screens.push({profile:p.id,name,file,...data});await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
 if(p.font)await page.evaluate(()=>{for(const e of document.querySelectorAll('[data-composition-font]')){e.style.fontSize=e.dataset.compositionFont;delete e.dataset.compositionFont;}});
 console.log(p.id,name);
}
async function close(page,id){await page.locator(id).press('Escape');await page.locator(id).waitFor({state:'hidden'});}
async function tap(page,arrow){const c=JSON.parse(await page.locator('#game-root').getAttribute('data-camera')),q=arrow.path.at(-1);await page.mouse.click(c.x+q.x*c.scale,c.y+q.y*c.scale);}
async function month(page,key){for(let i=0;i<24;i++){const current=(await page.locator('[data-date]').first().getAttribute('data-date')).slice(0,7);if(current===key)return;await page.locator(`[data-shift="${current>key?-1:1}"]`).click();}throw Error('Month fixture unreachable');}
try{
 for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}/`)).ok)break;}catch{}await sleep(100);}
 const awardSave=cup();await writeFile(`${out}/prepared-awards.json`,JSON.stringify(awardSave));
 for(const p of profiles){
  report.profiles.push(p);const {context,page}=await boot(p,awardSave);
  try{
   await snap(page,p,'home-resume');await page.locator('#home-collection').click();await snap(page,p,'collection-top');
   await page.locator('#record-rules > summary').click();await page.locator('[data-medal="legend"] > summary').click();await snap(page,p,'collection-expanded');
   await page.locator('#meta-screen').evaluate(e=>e.scrollTop=e.scrollHeight);await snap(page,p,'collection-bottom');
   await page.locator('#home-calendar').click();await snap(page,p,'calendar-current');await page.locator('#view-trophy').click();await snap(page,p,'trophy-preview');await close(page,'#trophy-viewer');
   await month(page,'2026-08');await snap(page,p,'calendar-earned');await page.locator('#view-trophy').click();await snap(page,p,'trophy-earned');await close(page,'#trophy-viewer');
   await page.locator('#home-settings').click();await snap(page,p,'settings');await page.locator('#settings-testing > summary').click();await snap(page,p,'settings-testing');await close(page,'#settings-dialog');
   await page.locator('#home-tab').click();await page.locator('#home-play').click();await snap(page,p,'game-nightmare-fit');await page.locator('#hint:visible').waitFor();await snap(page,p,'game-help-ready');
   await page.locator('#guides').click();await snap(page,p,'game-guides');await page.locator('#hint').click();await snap(page,p,'cascade-confirmation');await close(page,'#game-dialog');
   await page.locator('#restart').click();await snap(page,p,'restart-confirmation');await close(page,'#game-dialog');
   await page.mouse.move(p.w/2,p.h/2);await page.mouse.wheel(0,-1300);await sleep(350);await snap(page,p,'game-zoom');
   await page.locator('#choose-field').click();await snap(page,p,'home-after-game');
  }catch(e){report.errors.push({profile:p.id,error:String(e)});await page.screenshot({path:`${out}/${p.id}-ERROR.png`});}finally{await context.close();}
 }
 for(const p of [profiles[0],profiles[1],profiles[2]]){
  for(const [name,s] of [['fresh-home',freshSave()],['upcoming-03',seed(2)],['upcoming-40',seed(39)],['resume-03',partial(2)],['resume-120',partial(119)]]){
   const {context,page}=await boot(p,s);try{await snap(page,p,name);if(name!=='fresh-home'){await page.locator('#home-play').click();await snap(page,p,name+'-game');}}finally{await context.close();}
  }
  for(const mode of ['ftue','loss-gift','loss-video','finish-perfect','finish-errors']){
   let state,last;if(mode.startsWith('loss'))state=lost(mode==='loss-video');else if(mode.startsWith('finish')){const a=almost(2,mode==='finish-errors');state=a.s;last=a.last;}else state=freshSave();
   const {context,page}=await boot(p,state);try{await page.locator('#home-play').click();await settle(page);if(last){await tap(page,last);await page.locator('#next:visible').waitFor();await sleep(2200);}await snap(page,p,mode);}finally{await context.close();}
  }
 }
 await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log('DONE',report.screens.length,'screens,',report.errors.length,'errors');
}finally{await browser.close();server.kill();}
