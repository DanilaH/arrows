import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {controlledNative} from './assistance-native-transport.mjs';

const out='.test-output/cascade-primary-031',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const {source}=JSON.parse(await readFile(`${out}/capture-manifest.json`,'utf8'));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',`${out}/web`,'--host','127.0.0.1','--port','4243','--strictPort'],{stdio:'ignore'});
const browser=await chromium.launch(),rows=[];
try{
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4243')).ok)break;}catch{}await sleep(100);}
 for(const reserved of [false,true])for(const language of ['ru','en'])for(const viewport of [{width:320,height:568},{width:568,height:320}]){
  const name=`${reserved?'saved':'cascade'}-${language}-${viewport.width}`,theme=(language==='ru')===(viewport.width===320)?'dark':'light';
  const state=JSON.parse(await readFile(`${out}/${reserved?'saved-ordinary':'primary-cascade-use'}/prepared-save.json`,'utf8'));
  const context=await browser.newContext({viewport,deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  await context.addInitScript(controlledNative,{save:state,preserve:true,settings:{version:1,language,theme,sound:true,vibration:true}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.clock.setFixedTime(new Date('2026-11-16T12:00:00+05:00'));
  await page.goto('http://127.0.0.1:4243/');await page.locator(reserved?'#home-play':'#home-calendar').click();
  if(!reserved){await page.locator('[data-date="2026-11-14"]').click();await page.locator('#start-daily').click();}
  await page.locator('#hint:visible').waitFor();await page.waitForFunction(()=>document.querySelectorAll('.board-transition,.route-snapshot').length===0);
  await page.locator('#hint').evaluate(e=>e.style.fontSize=`${parseFloat(getComputedStyle(e).fontSize)*1.5}px`);
  const geometry=await page.locator('.board-actions').evaluate(e=>[...e.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect();return {id:b.id,label:b.textContent,rect:{x:r.x,y:r.y,width:r.width,height:r.height},hit:b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),font:getComputedStyle(b).fontSize};}));
  assert.deepEqual(geometry.map(b=>b.id),['hint','guides']);
  // Existing style.css keeps Guides38px on short landscape; this change owns
  // the primary44px target and must not claim every legacy control is44dp.
  for(const button of geometry){const r=button.rect,minimum=button.id==='hint'||viewport.height>500?44:38;assert(r.height>=minimum&&r.width>=minimum,`${name}: ${JSON.stringify(button)}`);assert(r.x>=12&&r.x+r.width<=viewport.width-12&&r.y>=0&&r.y+r.height<=viewport.height);assert(button.hit);}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('#hint').getAttribute('data-help-effect'),reserved?'single-v2':'cascade-v1');
  assert.equal(await page.locator('#hint').getAttribute('data-help-reserved'),String(reserved));assert.deepEqual(errors,[]);
  if(reserved)assert(await page.locator('#hint .video-mark').isHidden());
  await mkdir(`${out}/ui-internal`,{recursive:true});await page.screenshot({path:`${out}/ui-internal/${name}.png`});
  rows.push({name,viewport,theme,language,simulatedButtonTextScale:1.5,reducedMotion:true,legacyGuideMinimum:viewport.height<=500?38:44,geometry,errors});await context.close();console.log(name,'PASS');
 }
 await writeFile(`${out}/ui-matrix.json`,JSON.stringify({source,method:'Actual extracted-APK Chromium/DPR1.5; initial unscrolled viewport, CSS button text150% simulation, reduced motion, actual elementFromPoint hits. Not Android system font scaling or physical accessibility proof.',rows},null,2)+'\n');
}finally{await browser.close();server.kill();}
