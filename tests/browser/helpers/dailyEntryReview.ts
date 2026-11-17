import {build} from 'vite';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Page} from '@playwright/test';
let bundle:Promise<{html:string;code:string}>;
export async function openDailyEntryReview(page:Page){
 bundle??=(async()=>{const built=await build({configFile:false,publicDir:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('tests/fixtures/dailyEntryReview.ts'),name:'DailyEntryReview',formats:['iife']}}});const result=Array.isArray(built)?built[0]:built;if(!result||!('output'in result))throw Error('No review output');const code=result.output.find(c=>c.type==='chunk')?.code;if(!code)throw Error('No review code');const css=result.output.flatMap(c=>c.type==='asset'&&c.fileName.endsWith('.css')?[c.source]:[]).join('\n');return{html:readFileSync('index.html','utf8').replace(/<script type="module" src="\/src\/main.ts"><\/script>/,'<script defer src="/__daily-entry-fixture.js"></script>').replace('</head>',`<style>${css}</style></head>`),code};})();
 const built=await bundle;await page.route('**/__daily-entry-fixture.js',r=>r.fulfill({contentType:'text/javascript',body:built.code}));await page.route('**/__daily-entry-fixture',r=>r.fulfill({contentType:'text/html',body:built.html}));await page.goto('/__daily-entry-fixture');
}
