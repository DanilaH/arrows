/** Actual new-daily creation/binding plus first-error cue in frozen APK payload. */
import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Board,canExit,campaign,freshSave,freshAttempt} from '../../.test-output/assistance-source/assistance-state.js';
import {controlledNative} from './assistance-native-transport.mjs';
const base='http://127.0.0.1:4210',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir','.test-output/a1-error-cue-026/web','--host','127.0.0.1','--port','4210','--strictPort'],{stdio:'ignore'}),browser=await chromium.launch();
const state=freshSave();state.index=39;state.campaign=freshAttempt(campaign[39]);state.campaign.started=true;state.helpLedger.nextVariant='single-v2';state.helpLedger.assignments[state.campaign.board.id]='single-v2';state.tutorials=['tap','turns','blockers','guides','zoom','hint'];state.seenUnlocks=['collection','calendar'];state.wins=campaign.slice(0,39).map((l,i)=>({attempt:`daily-qa-${i}`,levelId:l.id,activeMs:1000,completedAt:1000+i,mistakes:0}));
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await sleep(50);}
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(controlledNative,{save:state,preserve:true,settings:{version:1,language:'en',theme:'dark',sound:false,vibration:false}});
 // Current campaign is Off; only a genuinely created daily may receive next Cue.
 await context.addInitScript(id=>{if(!localStorage.getItem('arrows.qa.a1-error-cue.v1'))localStorage.setItem('arrows.qa.a1-error-cue.v1',JSON.stringify({version:1,next:'cue',attempts:{[id]:'off'},trace:[]}));},state.campaign.board.id);
 const page=await context.newPage();await page.goto(base);await page.locator('#home-calendar:enabled').click();await page.locator('#start-daily:enabled').click();await page.locator('#hint:visible').waitFor();await page.waitForFunction(()=>!document.querySelector('#hint').getAnimations().length);
 const current=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('arrows.progress.v1')),id=document.querySelector('#game-shell').dataset.attempt,q=JSON.parse(localStorage.getItem('arrows.qa.a1-error-cue.v1')),entry=Object.entries(s.daily).find(([_,a])=>a.board.id===id);return{date:entry[0],a:entry[1],binding:q.attempts[id],campaign:s.campaign.board};});
 assert.equal(current.binding,'cue');assert.deepEqual(current.campaign,state.campaign.board);
 const board=new Board(current.a.level,current.a.board.id,current.a.board),camera=JSON.parse(await page.locator('#game-root').getAttribute('data-camera')),blocked=board.remaining.find(a=>{const p=camera.y+a.path.at(-1).y*camera.scale;return p>120&&p<750&&!canExit(a,board.remaining);});assert(blocked);
 const p=blocked.path.at(-1);await page.mouse.click(camera.x+p.x*camera.scale,camera.y+p.y*camera.scale);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('arrows.qa.a1-error-cue.v1')).trace.some(t=>t.event==='shown'));
 await page.waitForFunction(()=>!document.querySelector('.a1-error-cue'));
 const before=await page.evaluate(()=>({save:JSON.parse(localStorage.getItem('arrows.progress.v1')),qa:JSON.parse(localStorage.getItem('arrows.qa.a1-error-cue.v1'))}));
 assert.deepEqual(before.qa.trace.map(t=>t.event),['opportunity','shown']);assert(before.qa.trace.every(t=>t.owner.mode==='daily'&&t.owner.attempt===current.a.board.id));assert.equal(before.save.daily[current.date].board.lives,2);
 await page.reload();await page.locator('#home-calendar:enabled').click();await page.locator('#start-daily:enabled').click();await page.locator('#hint:visible').waitFor();await sleep(1200);
 const after=await page.evaluate(()=>({save:JSON.parse(localStorage.getItem('arrows.progress.v1')),qa:JSON.parse(localStorage.getItem('arrows.qa.a1-error-cue.v1'))}));assert.deepEqual(after.save.daily[current.date].board,before.save.daily[current.date].board);assert.deepEqual(after.qa.trace,before.qa.trace);assert.equal(await page.locator('.a1-error-cue').count(),0);
 await writeFile('docs/evidence/a1-error-cue-026/daily.json',JSON.stringify({source:'19b2fecbe123c8c7b4d3666949b800f725b635f1',method:'Frozen APK web payload, real Calendar/start-daily action, seeded unlocked campaign, controlled native transport; no physical SDK claim.',date:current.date,newDailyBinding:current.binding,events:before.qa.trace.map(t=>t.event),ownerMode:'daily',campaignUnchanged:true,reloadNoReplay:true,lives:2},null,2)+'\n');console.log('Actual daily creation/binding/cue/reload passed');await context.close();
}finally{await browser.close();server.kill();}
