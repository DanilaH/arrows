/** Isolated component cleanup probe of the actual finite manager source.
 * Complements production-game E2E; not a phone/SDK or gameplay recording. */
import {build} from 'vite';
import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const built=await build({configFile:false,publicDir:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:'src/game/uiMotion.ts',name:'ActualUiMotion',formats:['iife']}}});
const output=Array.isArray(built)?built[0]:built;
const code=output.output.find(x=>x.type==='chunk').code,browser=await chromium.launch(),rows=[];
try{
 for(const reduced of [false,true])for(const action of ['cancel','finish','destroy','resize','paint-then-destroy']){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:reduced?'reduce':'no-preference'}),page=await context.newPage();
  await page.setContent('<main id="game-shell"><button id="hint" style="position:absolute;left:40px;top:600px;width:220px;height:44px">Hint</button></main><style>.a1-error-cue{position:absolute;inset:0;opacity:0;pointer-events:none;box-shadow:inset 0 0 0 2px black}</style>');await page.addScriptTag({content:code});
  await page.evaluate(()=>{
    const api=window.ActualUiMotion.createUiMotion();window.probe={api,shown:0,done:0,arrivalDone:false,frames:0};
    const raf=requestAnimationFrame;window.requestAnimationFrame=fn=>raf(t=>{window.probe.frames++;fn(t);});
    api.gameUnlock('Calendar','Original arrival','<svg/>',()=>{window.probe.arrivalDone=true;});
  });
  const button=page.locator('#hint'),rect=await button.boundingBox();await page.mouse.move(rect.x+2,rect.y+22);await page.mouse.down();
  await page.evaluate(()=>{const p=window.probe;p.cancel=p.api.hintCue(document.querySelector('#hint'),()=>true,()=>p.shown++,()=>p.done++);});
  if(action==='paint-then-destroy')await page.waitForFunction(()=>window.probe.shown===1);
  await page.evaluate(action=>{const p=window.probe;if(action==='cancel')p.cancel();else if(action==='resize')dispatchEvent(new Event('resize'));else if(action==='paint-then-destroy')p.api.destroy();else p.api[action]();},action);
  assert.equal(await page.locator('.a1-error-cue').count(),0);
  if(action==='cancel'){
    assert.equal(await page.locator('.game-unlock').count(),1);assert.equal(await page.locator('#hint[data-pressed=true] .ui-press-feedback').count(),1);assert.deepEqual(await button.boundingBox(),rect);
    assert.equal(await page.evaluate(()=>window.probe.arrivalDone),false);await page.evaluate(()=>window.probe.api.destroy());
  }
  await page.waitForTimeout(100);const first=await page.evaluate(()=>({shown:window.probe.shown,done:window.probe.done,frames:window.probe.frames}));await page.waitForTimeout(120);const last=await page.evaluate(()=>window.probe.frames);
  assert.equal(first.shown,action==='paint-then-destroy'?1:0);assert.equal(first.done,1);assert.equal(first.frames,last);assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
  rows.push({reduced,action,shown:first.shown,cleanup:true,noRemainingRaf:true,independentPressArrival:action==='cancel'});await context.close();
 }
}finally{await browser.close();}
const result={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),method:'Actual UI motion source bundled by Vite in isolated Chromium component DOM; complements real production-game E2E, not native hardware evidence.',rows};
await writeFile('docs/evidence/a1-error-cue-026/motion-cleanup.json',JSON.stringify(result,null,2)+'\n');console.log(rows.length,'finite-manager cleanup cases passed');
