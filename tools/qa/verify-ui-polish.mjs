/** Additional real-production camera checks on early/middle/late help. */
import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Board,campaign,freshSave,freshAttempt,decodeSave} from '../../.test-output/assistance-source/assistance-state.js';
import {controlledNative} from './assistance-native-transport.mjs';
const root='.test-output/ui-polish-025',port=4199,base=`http://127.0.0.1:${port}`,sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',`${root}/web`,'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'}),browser=await chromium.launch(),rows=[];
function seed(index,variant){const s=freshSave();s.index=index;s.campaign=freshAttempt(campaign[index]);const b=new Board(s.campaign.level,s.campaign.board.id);if(index===39)for(let i=0;i<21;i++)b.activate(`c40-${i}`);s.campaign.board=b.snapshot();s.campaign.started=true;s.campaign.view={centerX:(b.level.width-1)/2,centerY:(b.level.height-1)/2,zoom:3};s.helpLedger.assignments[b.attemptId]=variant;s.wins=campaign.slice(0,index).map((l,i)=>({attempt:`check-${i}`,levelId:l.id,completedAt:i+1,activeMs:1000,mistakes:0}));s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=['collection','calendar'];return decodeSave(s);}
const camera=page=>page.locator('#game-root').getAttribute('data-camera');
async function earned(page){await page.locator('#hint').click();await page.waitForFunction(()=>!!assistanceQA.snapshot().request);await page.evaluate(()=>{assistanceQA.shown();assistanceQA.earned();assistanceQA.dismiss();});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign.hint);}
try{for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await sleep(100);}
 for(const index of [19,39,119])for(const variant of ['route-v1','cascade-v1'])for(const reduced of [false,true]){
  const ctx=await browser.newContext({viewport:{width:320,height:568},deviceScaleFactor:1.5,isMobile:true,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});
  await ctx.addInitScript(controlledNative,{save:seed(index,variant),settings:{version:1,language:'ru',theme:'light',sound:false,vibration:false}});const page=await ctx.newPage();await page.goto(base);await page.locator('#home-play').click();await page.locator('#hint:visible').waitFor();await earned(page);await sleep(550);
  const view=await page.evaluate(()=>{const r=document.querySelector('#game-root'),s=JSON.parse(localStorage.getItem('arrows.progress.v1')),a=s.campaign,c=JSON.parse(r.dataset.camera),route=JSON.parse(r.dataset.helpRoute||'[]'),group=JSON.parse(r.dataset.helpGroup||'[]'),ids=[...new Set([a.hint,...route,...group])],top=parseFloat(r.style.getPropertyValue('--board-clear-top')),bottom=parseFloat(r.style.getPropertyValue('--board-clear-bottom'));return{plan:Object.values(s.helpLedger.requests).at(-1).plan,kind:Object.values(s.helpLedger.requests).at(-1).kind,top,bottom,points:ids.flatMap(id=>{const arrow=a.level.arrows.find(v=>v.id===id);return(route.length||group.length?arrow.path:[arrow.path.at(-1)]).map(p=>({id,x:c.x+p.x*c.scale,y:c.y+p.y*c.scale}));})};});
  for(const p of view.points){assert(p.x>=12&&p.x<=308,`${index}/${variant} x${p.x}`);assert(p.y>=view.top+12&&p.y<=view.bottom-12,`${index}/${variant} y${p.y}`);}
  rows.push({level:campaign[index].id,variant,reduced,actualKind:view.kind,points:view.points.length,allVisible:true});
  // Restart before checking a gesture during the actual incoming overview.
  await ctx.close();
 }
 for(const variant of ['route-v1','cascade-v1'])for(const gesture of ['pan','pinch']){
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ctx.addInitScript(controlledNative,{save:seed(39,variant),settings:{version:1,language:'ru',theme:'dark',sound:false,vibration:false}});const page=await ctx.newPage();await page.goto(base);await page.locator('#home-play').click();await page.locator('#hint:visible').waitFor();await earned(page);await sleep(40);const cdp=await ctx.newCDPSession(page);
  const start=gesture==='pan'?[{id:1,x:170,y:410}]:[{id:1,x:165,y:410},{id:2,x:225,y:410}],move=gesture==='pan'?[{id:1,x:230,y:445}]:[{id:1,x:140,y:410},{id:2,x:250,y:410}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:start});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:move});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(100);const hand=await camera(page);await sleep(900);assert.equal(await camera(page),hand,'Auto focus returned after manual input');
  rows.push({variant,gesture,noCameraReturn:true});await ctx.close();
 }
 console.log(rows.length,'production camera cases passed');
}finally{await writeFile(`${root}/camera-matrix.json`,JSON.stringify({source:'f8a75b3106f8194d1ad27a2a58ede7c3b30d48d3',method:'Frozen exact APK web payload, controlled receipts, real UI/CDP touch,320x568 light /390x844 dark; no physical phone claim.',rows},null,2));await browser.close();server.kill();}
