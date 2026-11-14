import { chromium, devices } from '../probe-checkout/node_modules/@playwright/test/index.mjs';
import { Board, campaign, freshSave, freshAttempt, decodeSave } from '../probe-checkout/.test-output/assistance-source/assistance-state.js';
import { controlledNative } from '../probe-checkout/tools/qa/assistance-native-transport.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const repo=fileURLToPath(new URL('../probe-checkout/',import.meta.url));
const output=fileURLToPath(new URL('./result.json',import.meta.url));
const report={schema:1,startedAt:new Date().toISOString(),source:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),app:'0.25.0 / 37',surface:'Unmodified production dist, seeded save, existing controlled native transport; headless Pixel 7 browser. This is not a physical phone or real ad SDK.',analytics:'Local captured calls only; controlled ArrowsAnalytics returns accepted:false,disabled:true.',commands:['npm run build','node node_modules/vite/bin/vite.js build --ssr tools/qa/assistance-state.ts --outDir .test-output/assistance-source','node ../baseline_probe/run.mjs'],cases:[],errors:[]};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const key='arrows.progress.v1';
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
function seed(){const s=freshSave();s.index=39;s.campaign=freshAttempt(campaign[39]);const b=new Board(s.campaign.level,s.campaign.board.id);for(let i=0;i<21;i++)b.activate(`c40-${i}`);s.campaign.board=b.snapshot();s.campaign.started=true;s.freeContinueUsed=true;s.helpLedger.assignments[b.attemptId]='single-v2';s.wins=campaign.slice(0,39).map((l,i)=>({attempt:`before-${i}`,levelId:l.id,activeMs:1000,completedAt:1000+i,mistakes:0}));s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=['collection','calendar'];return decodeSave(s);}
async function state(page){return page.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key)),q=window.assistanceQA.snapshot(),h=document.querySelector('#hint'),cs=getComputedStyle(h),r=h.getBoundingClientRect();return {at:performance.now(),board:{attempt:s.campaign.board.id,lives:s.campaign.board.lives,errors:s.campaign.board.errors,removed:s.campaign.board.removed.length,hint:s.campaign.hint},hint:{hidden:h.hidden,visible:!h.hidden&&cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0,disabled:h.disabled,text:h.textContent,readiness:h.dataset.readiness,effect:h.dataset.helpEffect,title:h.title,videoVisible:getComputedStyle(h.querySelector('.video-mark')).display!=='none',transform:cs.transform,rect:{x:r.x,y:r.y,width:r.width,height:r.height},animations:h.getAnimations({subtree:true}).map(a=>({playState:a.playState,currentTime:a.currentTime,duration:a.effect.getTiming().duration,target:a.effect.target?.id||a.effect.target?.className,keyframes:a.effect.getKeyframes().map(f=>({offset:f.offset,transform:f.transform,opacity:f.opacity}))}))},transport:{readiness:q.readiness,request:q.request},errors:q.events.filter(e=>e.event==='level_error').map(e=>({event:e.event,params:e.params})),adSessions:q.events.filter(e=>e.event==='ad_session').map(e=>({event:e.event,params:e.params})),rights:Object.values(s.helpLedger.rights).map(r=>({id:r.id,kind:r.kind,status:r.status,owner:r.owner,originalOwner:r.originalOwner})),requests:Object.keys(s.helpLedger.requests).length};},key);}
async function tap(page,id){const s=await read(page),c=JSON.parse(await page.locator('#game-root').getAttribute('data-camera')),p=s.campaign.level.arrows.find(a=>a.id===id).path.at(-1);await page.touchscreen.tap(c.x+p.x*c.scale,c.y+p.y*c.scale);}
async function waitErrorCount(page,count){await page.waitForFunction(count=>window.assistanceQA.snapshot().events.filter(e=>e.event==='level_error').length===count,count);}
const probe=createServer();await new Promise((resolve,reject)=>probe.once('error',reject).listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
let browser,server;const serverLog=[];
try{
  server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:repo,stdio:['ignore','pipe','pipe']});
  for(const stream of [server.stdout,server.stderr])stream.on('data',b=>{if(serverLog.join('').length<8000)serverLog.push(b.toString());});
  report.preview={url:`http://127.0.0.1:${port}`,command:`node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${port} --strictPort`};
  for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error('Preview exited');try{if((await fetch(report.preview.url)).ok)break;}catch{}if(i===99)throw Error('Preview not ready');await wait(50);}
  browser=await chromium.launch({headless:true});
  report.browser={version:browser.version(),profile:'Playwright Pixel 7',viewport:devices['Pixel 7'].viewport};
  const context=await browser.newContext({...devices['Pixel 7']});
  await context.addInitScript(controlledNative,{save:seed(),preserve:true,settings:{version:1,language:'en',theme:'dark',sound:true,vibration:true}});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>report.errors.push(String(e)));
  await page.goto(report.preview.url);
  await page.evaluate(()=>{window.baselineHintTimeline=[];const h=document.querySelector('#hint');new MutationObserver(records=>{for(const m of records)if(m.attributeName==='hidden')window.baselineHintTimeline.push({at:performance.now(),hidden:h.hidden});}).observe(h,{attributes:true,attributeFilter:['hidden']});});
  const enteredAt=await page.evaluate(()=>performance.now());await page.locator('#home-play').click();
  const immediate=await state(page);
  await page.waitForFunction(()=>!document.querySelector('#hint').hidden);
  const arrival=await state(page);
  assert.equal(immediate.hint.hidden,true);assert.equal(arrival.hint.visible,true);
  assert.equal(arrival.hint.effect,'single-v2');assert.equal(arrival.hint.readiness,'ready');
  assert(arrival.hint.animations.some(a=>a.duration===900),'Existing real Hint arrival animation must be observed');
  report.cases.push({id:'initial-hint-boundary',enteredAt,immediate,arrival,timeline:await page.evaluate(()=>window.baselineHintTimeline),note:'Wall-clock observation of the existing idle gate and arrival; not proof of an exact sample()/3 s race.'});
  await tap(page,'c40-23');await waitErrorCount(page,1);const first=await state(page);
  assert.equal(first.board.lives,2);assert.deepEqual(first.board.errors,['c40-23']);assert.equal(first.errors[0].params.first,true);
  await page.waitForTimeout(1200);const settled=await state(page);assert.equal(settled.hint.animations.length,0);
  await tap(page,'c40-23');await waitErrorCount(page,2);const repeated=await state(page);
  assert.equal(repeated.board.lives,2);assert.equal(repeated.errors[1].params.first,false);
  await page.waitForTimeout(1000);await tap(page,'c40-24');await waitErrorCount(page,3);const secondDistinct=await state(page);
  assert.equal(secondDistinct.board.lives,1);assert.deepEqual(secondDistinct.board.errors,['c40-23','c40-24']);assert.equal(secondDistinct.errors[2].params.first,true);
  assert.equal(secondDistinct.hint.animations.length,0);
  report.cases.push({id:'errors-and-hint-motion',first,repeated,secondDistinct,settled,note:'Two distinct blocked arrows both report first:true in one attempt. Repeating the first reports first:false and costs no additional life. A second distinct error after Hint arrival settled adds no Hint animation.'});
  const ready=await state(page);await page.evaluate(()=>window.assistanceQA.loading());await page.waitForFunction(()=>document.querySelector('#hint').dataset.readiness==='loading');const loading=await state(page);
  await page.evaluate(()=>window.assistanceQA.backoff());await page.waitForFunction(()=>document.querySelector('#hint').dataset.readiness==='backoff');const backoff=await state(page);
  for(const s of [ready,loading,backoff]){assert.equal(s.hint.visible,true);assert.equal(s.hint.disabled,false);}
  assert.match(loading.hint.text,/Video loading/);assert.match(backoff.hint.text,/Try later/);
  assert.equal(loading.transport.readiness.ready,false);assert.equal(backoff.transport.readiness.ready,false);
  assert.equal(backoff.adSessions.length,0);
  report.cases.push({id:'readiness-is-not-visibility',ready,loading,backoff,note:'Visible and enabled is broader than fresh rewarded-ready eligibility. No Hint click was made in loading/backoff.'});
  await page.evaluate(()=>window.assistanceQA.lateReady());await page.waitForFunction(()=>document.querySelector('#hint').dataset.readiness==='ready');
  await page.locator('#hint').click();await page.waitForFunction(()=>!!window.assistanceQA.snapshot().request);
  await page.evaluate(()=>{window.assistanceQA.shown();window.assistanceQA.earned();window.assistanceQA.dismiss();});
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).campaign.hint!==null,key);
  const earned=await state(page);assert.equal(earned.adSessions.length,1);
  await page.waitForTimeout(1500);await page.locator('#restart').click();await page.locator('[data-action=confirm-restart]').click();
  await page.waitForFunction(old=>JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign.board.id!==old,earned.board.attempt);
  await page.waitForFunction(()=>!document.querySelector('#hint').hidden);
  await page.evaluate(()=>window.assistanceQA.backoff());await page.waitForFunction(()=>document.querySelector('#hint').dataset.readiness==='backoff');
  const reserved=await state(page);assert.match(reserved.hint.text,/Use saved help/);assert.match(reserved.hint.text,/no video/i);assert.equal(reserved.hint.videoVisible,false);
  const sessionsBefore=reserved.adSessions.length,requestsBefore=reserved.requests;
  await page.locator('#hint').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).campaign.hint!==null,key);
  const claimed=await state(page);assert.equal(claimed.adSessions.length,sessionsBefore);assert.equal(claimed.requests,requestsBefore);assert.equal(claimed.transport.readiness.ready,false);
  report.cases.push({id:'saved-help-free-in-backoff',earned,reserved,claimed,note:'Earned A1 was reserved by an actual Restart, then claimed with transport in backoff. No additional ad_session or saved ad request was created. This is a distinct offer source even when the effect is single-v2.'});
  const freshContext=await browser.newContext({...devices['Pixel 7']});
  await freshContext.addInitScript(controlledNative,{save:seed(),preserve:true,settings:{version:1,language:'en',theme:'dark',sound:true,vibration:true}});
  const freshPage=await freshContext.newPage();freshPage.setDefaultTimeout(10000);freshPage.on('pageerror',e=>report.errors.push(String(e)));
  await freshPage.goto(report.preview.url);await freshPage.locator('#home-play').click();await freshPage.waitForFunction(()=>!document.querySelector('#hint').hidden);
  await freshPage.waitForTimeout(1100);const preFirstSettled=await state(freshPage);
  assert.equal(preFirstSettled.hint.visible,true);assert.equal(preFirstSettled.hint.disabled,false);assert.equal(preFirstSettled.hint.effect,'single-v2');assert.equal(preFirstSettled.hint.readiness,'ready');assert.equal(preFirstSettled.hint.animations.length,0);assert.equal(preFirstSettled.rights.length,0);assert.equal(preFirstSettled.errors.length,0);
  await tap(freshPage,'c40-23');await waitErrorCount(freshPage,1);const firstSettled=await state(freshPage);await freshPage.waitForTimeout(700);const afterImpact=await state(freshPage);
  assert.equal(firstSettled.board.lives,2);assert.equal(firstSettled.errors[0].params.first,true);assert.equal(firstSettled.hint.animations.length,0);assert.equal(afterImpact.hint.animations.length,0);assert.equal(afterImpact.adSessions.length,0);
  report.cases.push({id:'first-error-with-settled-ready-a1',before:preFirstSettled,afterSave:firstSettled,afterImpact,note:'First accepted blocked arrow with an already visible, settled, enabled, fresh single-v2 Hint and ready transport. Hint has no animation immediately after save or 700 ms later; no ad was started.'});
  report.status='passed';
}catch(error){report.status='failed';report.failure={name:error.name,message:error.message,stack:error.stack};process.exitCode=1;}
finally{
  await browser?.close();
  if(server&&server.exitCode===null){server.kill('SIGTERM');await Promise.race([new Promise(r=>server.once('exit',r)),wait(3000)]);if(server.exitCode===null)server.kill('SIGKILL');}
  report.finishedAt=new Date().toISOString();report.previewStopped=!server||server.exitCode!==null||server.killed;report.serverLog=serverLog.join('');
  report.gitStatus=execFileSync('git',['status','--short'],{cwd:repo,encoding:'utf8'}).trim();
  await writeFile(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,cases:report.cases.map(c=>c.id),failure:report.failure,output,previewStopped:report.previewStopped,gitStatus:report.gitStatus}));
}
