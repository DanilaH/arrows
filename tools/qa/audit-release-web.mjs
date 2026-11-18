import {preview} from 'vite';
import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {controlledNative} from './assistance-native-transport.mjs';

const out=resolve('.test-output/production-readiness'),web=resolve(process.env.ARROWS_AUDIT_WEB??'.test-output/release-web');
const {campaign,freshSave,freshAttempt,Board,canExit}=await import(new URL('../../.test-output/production-readiness/ssr/ui-composition-source.js',import.meta.url));
await mkdir(out,{recursive:true});
assert.equal(JSON.parse(await readFile(web+'/arrows-build.json','utf8')).channel,'release');
const names=await readdir(web);assert(!names.includes('target-lab.html')&&!names.includes('content-pilot.html'));
const server=await preview({build:{outDir:web},preview:{host:'127.0.0.1',port:4291,strictPort:true}}),browser=await chromium.launch({headless:true});
const profiles=[['ru','dark',320,568],['en','light',320,568],['ru','light',390,844],['en','dark',430,932],['ru','dark',390,844,true]];
const states=[],errors=[];
async function settle(p){await p.waitForFunction(()=>!document.querySelector('.route-snapshot,.board-transition')&&document.getAnimations().every(a=>a.playState!=='running'||a.effect?.target?.closest?.('.home-emblem')));}
async function capture(p,profile,state){
 await settle(p);
 if(profile[4]){
  await p.evaluate(()=>{const seen=window.__releaseScaled??=new WeakSet(),sizes=[...document.querySelectorAll('h1,h2,h3,p,small,label,button,summary,select')].filter(el=>!seen.has(el)).map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);for(const [el,size]of sizes){seen.add(el);el.style.setProperty('font-size',`${size*1.5}px`,'important');}});
  await p.waitForTimeout(300);await settle(p);
 }
 const row=await p.evaluate(()=>({lang:document.documentElement.lang,title:document.title,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,visible:[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(b).visibility!=='hidden';}).map(b=>({id:b.id,text:b.textContent.trim(),label:b.getAttribute('aria-label')}))}));
 assert.equal(row.lang,profile[0]);assert.equal(row.title,profile[0]==='ru'?'Стрелки':'Arrows');assert(!row.overflow);
 const name=profile.join('-')+'-'+state+'.png';await p.screenshot({path:out+'/'+name});const bytes=await readFile(out+'/'+name);
 states.push({profile,state,...row,screenshot:name,sha256:createHash('sha256').update(bytes).digest('hex')});
}
function seed(lost=false){
 const s=freshSave();s.index=19;s.campaign=freshAttempt(campaign[19]);s.wins=campaign.slice(0,19).map((l,i)=>({attempt:`audit-before-${i}`,levelId:l.id,activeMs:1000,completedAt:1,mistakes:0}));s.seenUnlocks=['collection','calendar'];s.tutorials=['tap','turns','blockers','guides','zoom','hint'];
 if(lost){const b=new Board(s.campaign.level,s.campaign.board.id);while(b.hearts>0){const arrow=b.remaining.find(a=>!b.isError(a.id)&&!canExit(a,b.remaining));assert(arrow);b.activate(arrow.id);}s.campaign.board=b.snapshot();s.campaign.started=true;assert.equal(b.hearts,0);}
 return s;
}
try{
 for(const profile of profiles){
  const [language,theme,width,height,enlarged]=profile,context=await browser.newContext({viewport:{width,height},locale:language,reducedMotion:enlarged?'reduce':'no-preference'}),p=await context.newPage();p.on('pageerror',e=>errors.push({profile,message:e.message}));
  await p.addInitScript(controlledNative,{save:seed(),settings:{version:1,language,theme,sound:true,vibration:true}});await p.clock.setFixedTime(new Date('2026-11-17T12:00:00+05:00'));
  await p.goto('http://127.0.0.1:4291');await p.locator('#home-play:enabled').waitFor();await p.evaluate(()=>document.querySelector('#qa-recording-source')?.remove());
  await capture(p,profile,'home');await p.locator('#home-play').click();await capture(p,profile,'board');
  assert.equal(await p.locator('#difficulty').textContent(),language==='ru'?'Кошмар':'Nightmare');
  await p.locator('#game-settings').click();
  // The transport deliberately claims playtest=true: the release build must
  // exclude these tools independently of native flags or old local QA notes.
  assert.equal(await p.locator('#settings-testing,#help-qa,#a1-cue-qa-mode,#target-lab-open,#content-pilot-open,#debug-root').count(),0);
  await capture(p,profile,'settings');await p.locator('#close-settings').click();
  await p.locator('#choose-field').click();await p.locator('#home-collection').click();await capture(p,profile,'collection');
  await p.locator('#home-calendar').click();await capture(p,profile,'calendar');
  const play=await p.locator('#start-daily').boundingBox(),nav=await p.locator('#meta-nav').boundingBox();assert(play.height>=44&&play.y+play.height<=nav.y+1);
  await p.locator('#view-trophy').click();await capture(p,profile,'trophy');await p.locator('[data-close-trophy]').click();await context.close();
 }
 for(const language of ['ru','en']){
  const profile=[language,'dark',320,568],context=await browser.newContext({viewport:{width:320,height:568},locale:language}),p=await context.newPage();p.on('pageerror',e=>errors.push({profile,message:e.message}));
  await p.addInitScript(controlledNative,{save:seed(true),settings:{version:1,language,theme:'dark',sound:true,vibration:true}});await p.goto('http://127.0.0.1:4291');await p.locator('#home-play:enabled').click();await p.locator('[data-action=free-continue]').waitFor();await capture(p,profile,'loss');await context.close();
 }
 assert.equal(errors.length,0);await writeFile(out+'/matrix.json',JSON.stringify({source:process.env.ARROWS_AUDIT_SOURCE??'local',payload:web,provenance:'Actual release-mode production web in headless Chromium; prepared possible progress and controlled native transport; not a phone or live SDK. Synthetic150% CSS is not Android system-font scaling.',states,errors},null,2));console.info(JSON.stringify({states:states.length,profiles:profiles.length,errors:errors.length,releaseLabsAbsent:true}));
}finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
