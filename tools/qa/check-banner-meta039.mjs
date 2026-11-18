import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {controlledNative} from './assistance-native-transport.mjs';
const seed=JSON.parse(await readFile('.test-output/banner039/seed.json','utf8')),out='.test-output/banner039';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',out+'/web','--host','127.0.0.1','--port','4287','--strictPort'],{stdio:'ignore'}),browser=await chromium.launch(),states=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:4287')).ok)break;}catch{}await sleep(100);}
 for(const [width,height,language,theme,large] of [[320,568,'ru','light',false],[320,568,'ru','dark',true],[390,844,'en','light',true],[844,390,'ru','light',true]]){
  const c=await browser.newContext({viewport:{width,height},locale:language,timezoneId:'Asia/Yekaterinburg',deviceScaleFactor:1.5});await c.addInitScript(controlledNative,{save:seed.save,settings:{...seed.settings,language,theme},banner:{scale:3,adHeight:150,safeInsets:{top:72,bottom:84}}});const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date(seed.date+'T12:00:00Z'));await p.goto('http://127.0.0.1:4287');await p.locator('#home-play:enabled').waitFor();
  const scale=async()=>{if(large)await p.evaluate(()=>{const seen=window.__bannerScaled??=new WeakSet();for(const el of document.querySelectorAll('h1,h2,h3,p,small,label,button,summary,select'))if(!seen.has(el)){const size=parseFloat(getComputedStyle(el).fontSize);seen.add(el);el.style.setProperty('font-size',size*1.5+'px','important');}});};
  const check=async(name,keys)=>{await scale();await sleep(350);const result=await p.evaluate(keys=>keys.map(key=>{const e=document.querySelector(key),r=e.getBoundingClientRect(),slot=document.querySelector('#native-banner-slot').getBoundingClientRect();return{key,rect:r.toJSON(),height:r.height>=43,clear:r.top>=0&&r.bottom<=slot.top-7&&r.left>=0&&r.right<=innerWidth+1,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};}),keys);const shot=`${out}/meta-${language}-${theme}-${width}x${height}-${name}.png`;await p.screenshot({path:shot});states.push({profile:{width,height,language,theme,large},name,result,errors,shot});if(result.some(r=>!r.height||!r.clear||!r.hit))throw Error(JSON.stringify(states.at(-1)));};
  await check('home',['#home-play','#home-daily','#home-settings']);
  await p.locator('#home-calendar').click();await p.locator('#start-daily').waitFor();await check('calendar',['#start-daily','#home-settings']);
  await p.locator('#home-collection').click();await p.locator('#collection-open-month').waitFor();await check('collection',['#collection-open-month','#collection-current-trophy','#home-settings']);
  await c.close();
 }
 await writeFile(out+'/meta-layout.json',JSON.stringify({states},null,2));console.log('PASS',states.length,'current-APK meta states with banner and large text');
}finally{await writeFile(out+'/meta-layout.json',JSON.stringify({states},null,2));await browser.close();server.kill();}
