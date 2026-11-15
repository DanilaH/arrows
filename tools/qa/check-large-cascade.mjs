import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Board,canExit,freshSave,freshAttempt,campaign,dailyLevel} from '../../.test-output/rollout-state/rollout-state.js';
import {controlledNative} from './assistance-native-transport.mjs';

// Actual APK web and a controlled reward receipt. No real SDK or money claim.
const out='.test-output/content-rollout-030',date='2026-11-14';
const {source}=JSON.parse(await readFile(`${out}/capture-manifest.json`,'utf8'));
const state=freshSave();state.index=19;state.campaign=freshAttempt(campaign[19]);
state.wins=campaign.slice(0,19).map((l,i)=>({attempt:`prepared-${i}`,levelId:l.id,activeMs:1000,completedAt:i+1,mistakes:0}));
state.tutorials=['tap','turns','blockers','guides','zoom','hint'];state.seenUnlocks=['collection','calendar'];state.freeContinueUsed=true;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',`${out}/web`,'--host','127.0.0.1','--port','4240','--strictPort'],{stdio:'ignore'});
const browser=await chromium.launch();
try{
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4240')).ok)break;}catch{}await sleep(100);}
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
 await context.addInitScript(controlledNative,{save:state,preserve:true,settings:{version:1,language:'ru',theme:'dark',sound:true,vibration:true}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-15T12:00:00+05:00'));
 await page.goto('http://127.0.0.1:4240');await page.locator('#home-calendar').click();await page.locator(`[data-date="${date}"]`).click();await page.locator('#start-daily').click();await page.locator('#cascade:visible').waitFor();
 await page.locator('#cascade').click();await page.locator('[data-action=rewarded-cascade]').click();
 await page.waitForFunction(()=>!!assistanceQA.snapshot().request);
 await page.evaluate(()=>{assistanceQA.shown();assistanceQA.earned();assistanceQA.dismiss();});
 await page.waitForFunction(()=>assistanceQA.snapshot().events.some(e=>e.event==='assistance_fact'&&e.params.phase==='reveal_ready'));
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));
 const earned=await saved(),attempt=earned.daily[date],level=dailyLevel(date),right=Object.values(earned.helpLedger.rights).find(r=>r.kind==='cascade-v1');
 assert(right&&right.status==='active');assert.deepEqual(attempt.level,level);assert.equal(attempt.hint,right.plan.root);
 assert(right.plan.bonus.length>=2&&right.plan.bonus.length<=4);
 const camera=JSON.parse(await page.locator('#game-root').getAttribute('data-camera'));
 const points=[right.plan.root,...right.plan.bonus].flatMap(id=>level.arrows.find(a=>a.id===id).path);
 const top=await page.locator('#game-header').evaluate(e=>e.getBoundingClientRect().bottom),bottom=await page.locator('#game-footer').evaluate(e=>e.getBoundingClientRect().top);
 const xs=points.map(p=>camera.x+p.x*camera.scale),ys=points.map(p=>camera.y+p.y*camera.scale);
 const groupBounds={left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
 assert(groupBounds.left>=0&&groupBounds.right<=390&&groupBounds.top>=top&&groupBounds.bottom<=bottom);
 const simulated=new Board(level,attempt.board.id,attempt.board);
 for(const id of[right.plan.root,...right.plan.bonus]){assert(canExit(simulated.remaining.find(a=>a.id===id),simulated.remaining));assert.equal(simulated.activate(id).kind,'removed');}
 const head=level.arrows.find(a=>a.id===right.plan.root).path.at(-1);
 await page.mouse.click(camera.x+head.x*camera.scale,camera.y+head.y*camera.scale);
 await page.waitForFunction(n=>Number(document.querySelector('#game-shell').dataset.remaining)===n,level.arrows.length-right.plan.bonus.length-1);
 const used=await saved(),usedRight=used.helpLedger.rights[right.id];
 assert.equal(usedRight.status,'used');assert.deepEqual(used.daily[date].board.removed,simulated.snapshot().removed);
 assert.equal(usedRight.operation.bonus.length,right.plan.bonus.length);assert.equal(used.daily[date].board.lives,3);assert.deepEqual(used.daily[date].board.errors,[]);assert.equal(used.freeContinueUsed,true);
 await page.reload();await page.locator('#home-calendar').click();await page.locator(`[data-date="${date}"]`).click();await page.locator('#start-daily').click();await page.waitForFunction(()=>document.querySelector('#game-shell').dataset.mode==='daily');
 const restored=await saved();assert.deepEqual(restored.daily[date].board,used.daily[date].board);assert.deepEqual(restored.helpLedger.rights[right.id],usedRight);assert.deepEqual(errors,[]);
 const result={source,method:'Actual extracted-APK Chromium390x844/DPR1.5, ordinary Calendar, actual cascade dialog/pointer use/reload; prepared campaign unlocks and controlled native reward receipt. No physical/SDK/money evidence.',date,arrows:level.arrows.length,groupBounds,operation:usedRight.operation,lives:3,errors,exactLegalGroup:true,quietReloadPreserved:true};
 await writeFile(`${out}/cascade-check.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));await context.close();
}finally{await browser.close();server.kill();}
