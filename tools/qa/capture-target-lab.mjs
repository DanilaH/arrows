/** Real production-payload recordings. Only the native transport/save are QA-controlled. */
import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {controlledNative} from './assistance-native-transport.mjs';
import {freshSave} from '../../.test-output/assistance-source/assistance-state.js';
const catalogue=JSON.parse(await readFile('src/lab/challenges.json','utf8'));
const proof=JSON.parse(await readFile('docs/evidence/target-lab/catalogue-proof.json','utf8'));
const out='.test-output/assistance-023',port=4198,sleep=ms=>new Promise(r=>setTimeout(r,ms));
await mkdir(out,{recursive:true});
const manifest={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),provenance:'Unmodified APK web payload in Chromium WebGL, 390x844 DPR1.5. Explicit seeded main profile and controlled native transport; separate real target-lab save. No SDK ad shown, no physical haptics/phone-performance claim. Audio is actual application WebAudio output.',payload:{},clips:[]};
for(const name of await readdir('dist',{recursive:true})){try{manifest.payload[name]=createHash('sha256').update(await readFile('dist/'+name)).digest('hex');}catch{}}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'}),browser=await chromium.launch({headless:true});
async function clip(name,index,theme,qa){
 const dir=`${out}/${name}`;await mkdir(dir,{recursive:true});const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
 await ctx.addInitScript(controlledNative,{save:freshSave(),settings:{version:1,language:'en',theme,sound:true,vibration:true}});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}/target-lab.html`);await page.waitForFunction(()=>document.querySelector('#game-shell')?.dataset.status==='ready');
 if(index)await page.locator(`[data-target-index="${index}"]`).click();await page.mouse.click(20,200);await sleep(250);await page.evaluate(()=>assistanceQA.startAudio());
 let capturing=true,n=0;const times=[],start=performance.now();const frames=(async()=>{while(capturing){times.push(performance.now()-start);await page.screenshot({path:`${dir}/${String(n++).padStart(5,'0')}.png`});await sleep(55);}})();
 const tap=async id=>{const c=JSON.parse(await page.locator('#game-root').getAttribute('data-camera')),p=catalogue[index].level.arrows.find(a=>a.id===id).path.at(-1);await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);};
 try{await sleep(600);if(qa){await page.locator('#lab-options summary').click();await page.locator('#lab-help').selectOption('single');await sleep(450);await page.locator('#lab-restart').click();await page.locator('#lab-hint').click();await sleep(800);}for(const id of proof.proof[index].solution){await tap(id);await sleep(370);}await sleep(2600);}finally{capturing=false;await frames;}
 const audio=await page.evaluate(()=>assistanceQA.stopAudio());await writeFile(`${dir}/actual-output.webm`,Buffer.from(audio));
 const state=await page.evaluate(()=>({lab:JSON.parse(localStorage.getItem('arrows.target-lab.v1')),main:JSON.parse(localStorage.getItem('arrows.progress.v1')),diagnostic:assistanceQA.snapshot()}));
 if(errors.length||state.diagnostic.request||Object.keys(state.lab.results).length!==1)throw Error(JSON.stringify({errors,state}));await writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));
 await writeFile(`${dir}/frames.txt`,times.map((t,i)=>`file '${String(i).padStart(5,'0')}.png'\nduration ${Math.max(.01,((times[i+1]??(performance.now()-start))-t)/1000)}`).join('\n')+`\nfile '${String(n-1).padStart(5,'0')}.png'\n`);
 execFileSync('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',`${dir}/frames.txt`,'-i',`${dir}/actual-output.webm`,'-vf','scale=390:844','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',`${out}/${name}-audio.mp4`]);
 execFileSync('ffmpeg',['-y','-v','error','-i',`${out}/${name}-audio.mp4`,'-vf','fps=12,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer',`${out}/${name}.gif`]);
 manifest.clips.push({name,level:catalogue[index].id,help:qa?'single-qa':'none',theme,frames:n,durationMs:times.at(-1),result:state.lab.results[catalogue[index].id]});await writeFile(`${out}/capture-manifest.json`,JSON.stringify(manifest,null,2));await ctx.close();console.log(name,n);
}
try{for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}`)).ok)break;}catch{}await sleep(100);}await clip('b1-target-none',0,'dark',false);await clip('b1-target-qa-single',1,'light',true);}finally{await browser.close();server.kill();}
