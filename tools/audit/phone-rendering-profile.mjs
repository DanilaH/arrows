import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const dir=process.argv[2], label=process.argv[3], port=4191;
const fields=JSON.parse(await readFile('src/content/campaign.json','utf8'));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',dir,'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const browser=await chromium.launch({headless:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}`)).ok)break;}catch{}await sleep(100);}
 const rows=[];
 for(const index of [19,119]){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const level=fields[index],a={level,board:{id:'profile',levelId:level.id,contentVersion:level.contentVersion,removed:[],errors:[],lives:3},view:null,guides:false,freeUsed:false,continuations:0,hint:null,started:false,activeMs:0};
 const state={schema:2,revision:0,catalogVersion:5,index,campaign:a,daily:{},wins:fields.slice(0,index).map((l,i)=>({attempt:`past-${i}`,levelId:l.id,activeMs:1000,completedAt:i*1000,mistakes:0})),tutorials:['tap','turns','blockers','guides','zoom','hint'],receipts:[],reservedRewards:[],dailyCatalogVersion:3,dailyWins:{},cups:[],facts:[],seenAwards:[],collectionSeen:true,trophyDesigns:{},seenUnlocks:index>=19?['collection','calendar']:[],freeContinueUsed:true};
 await context.addInitScript(s=>{localStorage.setItem('arrows.progress.v1',JSON.stringify(s));const frames=[];Reflect.set(window,'profileFrames',frames);const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>raf(t=>{frames.push(t);fn(t);});},state);
 const page=await context.newPage();page.on('pageerror',e=>console.error(e));await page.goto(`http://127.0.0.1:${port}`);await page.locator('#home-play:enabled').click();await sleep(700);
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
 const before=(await cdp.send('Performance.getMetrics')).metrics;await page.evaluate(()=>Reflect.get(window,'profileFrames').length=0);
 const fingers=gap=>[{x:195-gap,y:370,id:1},{x:195+gap,y:370,id:2}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:fingers(25)});
 for(let i=0;i<30;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:fingers(25+Math.sin(i/29*Math.PI)*18)});await sleep(24);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 // A real held arrow keeps guide rendering alive while the unchanged field is drawn.
 const c=JSON.parse(await page.locator('#game-root').getAttribute('data-camera')),p=level.arrows[0].path.at(-1);
 await page.mouse.move(c.x+p.x*c.scale,c.y+p.y*c.scale);await page.mouse.down();await sleep(1400);await page.mouse.up();await sleep(600);
 const after=(await cdp.send('Performance.getMetrics')).metrics,{profile}=await cdp.send('Profiler.stop');
 const frames=await page.evaluate(()=>Reflect.get(window,'profileFrames'));const deltas=frames.slice(1).map((t,i)=>t-frames[i]).filter(n=>n>3&&n<300).sort((a,b)=>a-b);const metric=name=>after.find(x=>x.name===name).value-before.find(x=>x.name===name).value;
 const totals=new Map();for(let i=0;i<(profile.samples?.length??0);i++){const n=profile.nodes.find(n=>n.id===profile.samples[i]),name=n.callFrame.functionName||'(anonymous)';totals.set(name,(totals.get(name)||0)+(profile.timeDeltas[i]||0));}
 const row={label,index,arrows:level.arrows.length,dots:level.mask.length,samples:deltas.length,p50:deltas[Math.floor(deltas.length*.5)],p95:deltas[Math.floor(deltas.length*.95)],scriptMs:metric('ScriptDuration')*1000,taskMs:metric('TaskDuration')*1000,top:[...totals].sort((a,b)=>b[1]-a[1]).slice(0,12)};rows.push(row);console.log(JSON.stringify(row));await writeFile(`.test-output/feel-next/${label}-${level.id}-profile.json`,JSON.stringify(profile));await context.close();
 }
 await writeFile(`.test-output/feel-next/${label}.json`,JSON.stringify(rows,null,2));
}finally{await browser.close();server.kill();}
