import{chromium}from'@playwright/test';
import{spawn}from'node:child_process';
import{mkdir,readFile,writeFile}from'node:fs/promises';
import assert from'node:assert/strict';
import{controlledNative}from'./assistance-native-transport.mjs';
import{freshSave,reviewSave,activeSave,awardSave,withDays}from'./ui-033-state.mjs';
const root='.test-output/ui-033',phase=process.argv[2]??'apk',web=phase==='working'?'dist':`${root}/web`,out=`${root}/matrix-${phase}`,port=4280,sleep=ms=>new Promise(r=>setTimeout(r,ms));
await mkdir(out,{recursive:true});
const manifest=phase==='working'?{source:'Working tree; not a signed source assertion',version:'0.33.0/code47',method:'Working production dist, not signed-APK evidence'}:JSON.parse(await readFile(`${root}/capture-manifest.json`,'utf8'));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',web,'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'}),browser=await chromium.launch(),report={source:manifest,profiles:[],states:[],errors:[]};
const profiles=[{id:'dark',w:390,h:844,theme:'dark',lang:'ru'},{id:'light',w:390,h:844,theme:'light',lang:'ru'},{id:'small',w:320,h:568,theme:'dark',lang:'ru'},{id:'english',w:430,h:932,theme:'light',lang:'en'},{id:'tablet',w:800,h:1280,theme:'dark',lang:'ru'},{id:'font150',w:320,h:568,theme:'dark',lang:'ru',font:1.5,reduced:true}];
async function boot(profile,save,date='2026-11-16'){
 const c=await browser.newContext({viewport:{width:profile.w,height:profile.h},deviceScaleFactor:1.5,isMobile:true,hasTouch:true,timezoneId:'Asia/Yekaterinburg',reducedMotion:profile.reduced?'reduce':'no-preference'});
 await c.addInitScript(controlledNative,{save,preserve:true,settings:{version:1,language:profile.lang,theme:profile.theme,sound:true,vibration:true}});
 const p=await c.newPage();p.on('pageerror',e=>report.errors.push({profile:profile.id,error:e.message}));p.setDefaultTimeout(10000);await p.clock.setFixedTime(new Date(date+'T12:00:00+05:00'));await p.goto(`http://127.0.0.1:${port}`);await p.locator('#home-play:enabled').waitFor();await p.evaluate(()=>document.querySelector('#qa-recording-source')?.remove());await settle(p);return{c,p};
}
async function settle(p){await p.waitForFunction(()=>!document.querySelector('.route-snapshot,.board-transition'));await p.waitForFunction(()=>document.querySelector('#meta-screen').getAnimations({subtree:true}).every(a=>a.playState!=='running'||a.effect?.getComputedTiming().iterations===Infinity));await sleep(180);}
async function click(p,key){const r=await p.locator(key).evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});assert(r.hit,key);await p.mouse.click(r.x,r.y);}
async function snap(p,profile,name,keys){
 await settle(p);
 if(profile.font)await p.evaluate(f=>{const es=[...document.querySelectorAll('body *')].filter(e=>e instanceof HTMLElement),sz=es.map(e=>parseFloat(getComputedStyle(e).fontSize));es.forEach((e,i)=>{e.dataset.fontBefore=e.style.fontSize;e.style.fontSize=sz[i]*f+'px';});},profile.font);
 await sleep(60);const file=`${profile.id}-${name}.png`;await p.screenshot({path:`${out}/${file}`});
 const state=await p.evaluate(keys=>{
  const controls=keys.flatMap(key=>{const e=document.querySelector(key);if(!e||!e.getClientRects().length||getComputedStyle(e).visibility==='hidden')return[];const r=e.getBoundingClientRect();return[{key,text:e.textContent.trim().slice(0,80),x:r.x,y:r.y,w:r.width,h:r.height,disabled:e.disabled??false,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),overflow:e.scrollWidth>e.clientWidth+1}];});
  const styles=Object.fromEntries(['.home-progress','.collection-current','.collection-goal-note','#view-trophy > span'].map(k=>{const e=document.querySelector(k);if(!e)return[k,null];const s=getComputedStyle(e),r=e.getBoundingClientRect();return[k,{x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontSize,color:s.color,overflow:e.scrollWidth>e.clientWidth+1}];}));
  return{mode:document.querySelector('#game-shell').dataset.screen,level:document.querySelector('#game-shell').dataset.level,remaining:document.querySelector('#game-shell').dataset.remaining,homePreview:document.querySelector('.home-board')?.getAttribute('data-level')??null,camera:JSON.parse(document.querySelector('#game-root').dataset.camera),controls,styles,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,navTop:document.querySelector('#meta-nav').getBoundingClientRect().top};
 },keys);
 report.states.push({profile:profile.id,name,file,...state});await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
 assert(!state.horizontalOverflow,`${profile.id}/${name}: horizontal overflow`);
 for(const c of state.controls){if(c.disabled)continue;assert(c.hit,`${profile.id}/${name}/${c.key}: centre obscured`);assert(c.w>=43.99&&c.h>=43.99,`${profile.id}/${name}/${c.key}: target under44px`);assert(c.y>=0&&c.y+c.h<=profile.h+.01,`${profile.id}/${name}/${c.key}: clipped action`);}
 if(name==='collection-current'){const c=state.controls.find(c=>c.key==='#collection-open-month');assert(c.y+c.h<=state.navTop,`${profile.id}: current month action behind navigation`);}
 if(profile.font)await p.evaluate(()=>{for(const e of document.querySelectorAll('[data-font-before]')){e.style.fontSize=e.dataset.fontBefore;delete e.dataset.fontBefore;}});
 console.log(profile.id,name);
}
try{
 for(let i=0;i<80;i++){try{if((await fetch(`http://127.0.0.1:${port}`)).ok)break;}catch{}await sleep(100);}
 for(const profile of profiles){
  report.profiles.push(profile);
  for(const[name,s]of[['home-fresh',freshSave()],['home-upcoming',reviewSave()],['home-last-arrow',reviewSave(2,1)]]){const{c,p}=await boot(profile,s);try{await snap(p,profile,name,['#home-play']);}finally{await c.close();}}
  let a=await boot(profile,awardSave());try{
   await snap(a.p,profile,'home-active',['#home-play']);await click(a.p,'#home-collection');await snap(a.p,profile,'collection-current',['#collection-current-trophy','#collection-open-month']);
   await click(a.p,'#collection-current-trophy');await snap(a.p,profile,'trophy-preview',['[data-close-trophy]','[data-open-month]']);await a.p.keyboard.press('Escape');await a.p.locator('#trophy-viewer').waitFor({state:'hidden'});
   await click(a.p,'#collection-open-month');await snap(a.p,profile,'calendar',['#view-trophy','#start-daily']);
   await click(a.p,'[data-nav="back"]');await settle(a.p);await a.p.locator('[data-month="2026-08"]').click();await settle(a.p);await click(a.p,'#view-trophy');await snap(a.p,profile,'trophy-earned',['[data-close-trophy]','[data-open-month]']);assert.equal(await a.p.locator('.trophy-rule').textContent(),profile.lang==='ru'?'Все дни месяца пройдены':'Every day of this month completed');await a.p.keyboard.press('Escape');await a.p.locator('#trophy-viewer').waitFor({state:'hidden'});
   await click(a.p,'#home-tab');await click(a.p,'#home-play');await a.p.locator('#hint:visible').waitFor();await snap(a.p,profile,'game-fit',['#choose-field','#game-settings','#guides','#hint']);const before=JSON.parse(await a.p.locator('#game-root').getAttribute('data-camera'));
   await a.p.mouse.move(profile.w/2,profile.h/2);for(let i=0;i<6&&!await a.p.locator('#board-overview').isVisible();i++){await a.p.mouse.wheel(0,-1000);await sleep(100);}await snap(a.p,profile,'game-zoom',['#board-overview','#game-settings','#guides','#hint']);await click(a.p,'#board-overview');await a.p.locator('#board-overview').waitFor({state:'hidden'});await snap(a.p,profile,'game-overview',['#choose-field','#game-settings','#guides','#hint']);const after=JSON.parse(await a.p.locator('#game-root').getAttribute('data-camera'));assert(Math.abs(after.scale-before.scale)<.00001);
  }finally{await a.c.close();}
  a=await boot(profile,reviewSave(9));try{await click(a.p,'#home-collection');await snap(a.p,profile,'collection-locked',[]);assert(await a.p.locator('#collection-open-month').isDisabled());}finally{await a.c.close();}
  a=await boot(profile,withDays(activeSave(39),'2026-11'),'2026-11-30');try{await click(a.p,'#home-collection');await snap(a.p,profile,'collection-earned',['#collection-current-trophy','#collection-open-month']);assert.equal(await a.p.locator('.collection-current').getAttribute('data-owned'),'true');}finally{await a.c.close();}
 }
 assert.deepEqual(report.errors,[]);await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');console.log('DONE',report.states.length,'states,',report.errors.length,'app errors');
}finally{await browser.close();server.kill();}
