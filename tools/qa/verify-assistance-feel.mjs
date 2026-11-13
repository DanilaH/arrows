/** Extra actual-production checks; no scene-private hooks or alternate game implementation. */
import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {controlledNative} from './assistance-native-transport.mjs';
import {Board,campaign,freshSave,freshAttempt,singlePlan} from '../../.test-output/assistance-source/assistance-state.js';
const out='.test-output/assistance-023/feel-matrix',port=4197,sleep=ms=>new Promise(r=>setTimeout(r,ms));await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir','.test-output/assistance-023/web','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'}),browser=await chromium.launch();
const rows=[],source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const camera=page=>page.locator('#game-root').getAttribute('data-camera').then(JSON.parse);
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('arrows.progress.v1')));
async function open(index,variant,theme,offscreen=false){const s=freshSave();s.index=index;s.campaign=freshAttempt(campaign[index]);const b=new Board(s.campaign.level,s.campaign.board.id);if(index===39)for(let i=0;i<=20;i++)b.activate(`c40-${i}`);s.campaign.board=b.snapshot();s.campaign.started=true;s.wins=campaign.slice(0,index).map((l,i)=>({attempt:`matrix-${i}`,levelId:l.id,completedAt:1000+i,activeMs:1000,mistakes:0}));s.helpLedger.assignments[b.attemptId]=variant;s.helpLedger.nextVariant=variant;s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=['collection','calendar'];if(offscreen){const p=singlePlan(b).root,head=b.remaining.find(a=>a.id===p).path.at(-1);s.campaign.view={centerX:head.x<b.level.width/2?b.level.width:0,centerY:head.y<b.level.height/2?b.level.height:0,zoom:3};}else if(index===39)s.campaign.view={centerX:29,centerY:27,zoom:1.8};else s.campaign.view={centerX:33,centerY:45,zoom:2.5};const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});await ctx.addInitScript(controlledNative,{save:s,settings:{version:1,language:'en',theme,sound:false,vibration:false}});const page=await ctx.newPage();await page.goto(`http://127.0.0.1:${port}`);await page.locator('#home-play').click();await page.locator('#hint:visible').waitFor();return{ctx,page};}
async function earn(page){await page.locator('#hint').click();await page.waitForFunction(()=>!!assistanceQA.snapshot().request);await page.evaluate(()=>{assistanceQA.shown();assistanceQA.earned();assistanceQA.dismiss();});await page.waitForFunction(()=>!!JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign.hint);await page.locator('#game-dialog').waitFor({state:'hidden'});}
async function tap(page,id){const s=await saved(page),c=await camera(page),p=s.campaign.level.arrows.find(a=>a.id===id).path.at(-1);await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);}
try{
 for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}`)).ok)break;}catch{}await sleep(100);}
 for(const variant of ['cascade-v1','route-v1'])for(const theme of ['dark','light']){
  const{ctx,page}=await open(variant==='cascade-v1'?39:19,variant,theme);await earn(page);if(variant==='cascade-v1')await tap(page,'c40-23');await sleep(700);
  const before=(await saved(page)).campaign.board;await page.evaluate(()=>document.documentElement.style.filter='grayscale(1)');await page.screenshot({path:`${out}/${variant}-${theme}-monochrome.png`});const a=(await saved(page)).campaign,c=await camera(page),p=a.level.arrows.find(x=>x.id===a.hint).path.at(-1),x=c.x+p.x*c.scale,y=c.y+p.y*c.scale;
  await page.mouse.move(x,y);await page.mouse.down();await sleep(70);await page.mouse.move(x+36,y+24);await page.mouse.up();await sleep(400);assert.deepEqual((await saved(page)).campaign.board,before);assert.equal((await page.evaluate(()=>assistanceQA.snapshot().pulses)).filter(x=>x.method==='pulse').length,0);rows.push({id:'FEEL-03/06',variant,theme,silent:true,monochrome:true,gesture:'press→pan→release',boardUnchanged:true});await ctx.close();
 }
 for(const index of [19,119])for(const gesture of ['pan','pinch']){
  const{ctx,page}=await open(index,'single-v2','dark',true),before=await camera(page);await earn(page);const during=await camera(page),cdp=await ctx.newCDPSession(page);
  if(gesture==='pan'){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:170,y:410}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:230,y:445}]});}
  else{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:165,y:410},{id:2,x:225,y:410}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:140,y:410},{id:2,x:250,y:410}]});}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(80);const hand=await camera(page);await sleep(900);const after=await camera(page);assert(Math.abs(after.x-hand.x)<1&&Math.abs(after.y-hand.y)<1&&Math.abs(after.scale-hand.scale)<.05,'autofocus returned after manual gesture');assert.notDeepEqual(after,before);await page.screenshot({path:`${out}/c${index+1}-${gesture}-manual-camera.png`});rows.push({id:'FEEL-17',level:campaign[index].id,gesture,before,during,hand,after,noReturn:true});await ctx.close();
 }
 await writeFile(`${out}/results.json`,JSON.stringify({source,environment:'actual frozen0.23.0 APK web payload, Chromium390x844 DPR1.5; controlled native transport; sound/vibration off. Monochrome screenshots are an explicit CSS diagnostic, not a game theme.',rows},null,2));console.log(rows.length,'actual-payload cases passed');
}finally{await browser.close();server.kill();}
