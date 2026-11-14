/** Real frozen APK web payload,4 theme/motion narrow-screen cases and idle.
 * Seeded save and controlled native transport; no physical-phone claim. */
import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Board,campaign,freshSave,freshAttempt} from '../../.test-output/assistance-source/assistance-state.js';
import {controlledNative} from './assistance-native-transport.mjs';
const root='.test-output/a1-error-cue-026',base='http://127.0.0.1:4209',sleep=ms=>new Promise(r=>setTimeout(r,ms)),rows=[];
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',`${root}/web`,'--host','127.0.0.1','--port','4209','--strictPort'],{stdio:'ignore'}),browser=await chromium.launch();
const state=freshSave();state.index=39;state.campaign=freshAttempt(campaign[39]);const b=new Board(state.campaign.level,state.campaign.board.id);for(let i=0;i<21;i++)b.activate(`c40-${i}`);state.campaign.board=b.snapshot();state.campaign.started=true;state.helpLedger.assignments[b.attemptId]='single-v2';state.tutorials=['tap','turns','blockers','guides','zoom','hint'];state.seenUnlocks=['collection','calendar'];state.wins=campaign.slice(0,39).map((l,i)=>({attempt:`layout-${i}`,levelId:l.id,activeMs:1000,completedAt:1000+i,mistakes:0}));
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await sleep(50);}
 const results=await Promise.allSettled(['dark','light'].flatMap(theme=>[false,true].map(async reduced=>{
  const ctx=await browser.newContext({viewport:{width:320,height:700},deviceScaleFactor:1.5,isMobile:true,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});
  try{
   await ctx.addInitScript(controlledNative,{save:state,settings:{version:1,language:'ru',theme,sound:false,vibration:false}});
   await ctx.addInitScript(id=>{localStorage.setItem('arrows.qa.a1-error-cue.v1',JSON.stringify({version:1,next:'cue',attempts:{[id]:'cue'},trace:[]}));window.rafCount=0;const raf=requestAnimationFrame;window.requestAnimationFrame=fn=>raf(t=>{window.rafCount++;fn(t);});},state.campaign.board.id);
   const page=await ctx.newPage();await page.goto(base);await page.evaluate(()=>document.fonts.ready);await page.locator('#home-play').click();await page.locator('#hint:visible').waitFor();await page.waitForFunction(()=>!document.querySelector('#hint').getAnimations().length);
   const before=await page.locator('#hint').boundingBox(),c=JSON.parse(await page.locator('#game-root').getAttribute('data-camera')),p=state.campaign.level.arrows.find(a=>a.id==='c40-23').path.at(-1);await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('arrows.qa.a1-error-cue.v1')).trace.some(t=>t.event==='shown'));
   const during=await page.locator('#hint').boundingBox();assert.deepEqual(during,before);
   const view=await page.evaluate(()=>{const h=document.querySelector('#hint'),layer=h.querySelector('.a1-error-cue'),style=getComputedStyle(h);return{width:innerWidth,scroll:document.documentElement.scrollWidth,ink:style.color,background:style.backgroundColor,text:!!h.querySelector('[data-help-label]').getBoundingClientRect().width,readiness:!!h.querySelector('[data-help-readiness]').getBoundingClientRect().width,video:!!h.querySelector('.video-mark').getBoundingClientRect().width,layerVisible:!!layer&&Number(getComputedStyle(layer).opacity)>0,layerPointerEvents:layer&&getComputedStyle(layer).pointerEvents};});
   assert.equal(view.scroll,view.width);assert(view.text&&view.readiness&&view.video&&view.layerVisible);assert.equal(view.layerPointerEvents,'none');
   await page.waitForFunction(()=>!document.querySelector('.a1-error-cue'));await sleep(300);const first=await page.evaluate(()=>window.rafCount);await sleep(350);const last=await page.evaluate(()=>window.rafCount);assert.equal(first,last,'App did not return to idle');
   rows.push({theme,reduced,viewport:'320x700/DPR1.5',rect:before,...view,finite:true,idle:true,trace:await page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.qa.a1-error-cue.v1')).trace.map(t=>t.event))});
  }finally{await ctx.close();}
 })));
 for(const result of results)if(result.status==='rejected')throw result.reason;
}finally{await browser.close();server.kill();}
const manifest=JSON.parse(await readFile(`${root}/capture-manifest.json`,'utf8'));await writeFile('docs/evidence/a1-error-cue-026/layout-idle.json',JSON.stringify({source:manifest.source,method:'Real frozen APK web payload, controlled native transport, seeded c40, Chromium; no phone/human performance claim.',rows},null,2)+'\n');console.log(rows.length,'theme/motion/narrow/idle cases passed');
