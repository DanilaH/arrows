import {test,expect,type Page} from '@playwright/test';
import {build} from 'vite';
import {resolve} from 'node:path';
import type {} from '../fixtures/archiveReview';

let bundle:Promise<string>;
async function open(page:Page){
 bundle??=(async()=>{const result=await build({configFile:false,publicDir:false,logLevel:'silent',build:{write:false,minify:true,target:'es2022',lib:{entry:resolve('tests/fixtures/archiveReview.ts'),name:'ArchiveReview',formats:['iife']}}});const output=Array.isArray(result)?result[0]:result;if(!output||!('output'in output))throw Error('No fixture bundle');return output.output.find(o=>o.type==='chunk')!.code;})();
 await page.route('**/__archive-review.js',async route=>route.fulfill({contentType:'text/javascript',body:await bundle}));
 await page.route('**/__archive-review',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><script defer src="/__archive-review.js"></script>'}));
 await page.goto('/__archive-review');await page.waitForFunction(()=>!!window.archiveReview);
}
test('browser migration uses committed IndexedDB blocks and preserves exact state, rights and reload',async({page})=>{
 await open(page);const before=await page.evaluate(()=>window.archiveReview.seed());const loaded=await page.evaluate(()=>window.archiveReview.load());expect(loaded.available).toBe(true);expect(loaded.raw).toBe(before);
 const physical=await page.evaluate(()=>({root:JSON.parse(localStorage.getItem('arrows.progress.v1')!),keys:Object.keys(localStorage)}));expect(physical.root.format).toBe('arrows-progress-archive');expect(physical.keys.filter(k=>k.startsWith('arrows.archive.'))).toEqual([]);expect((await page.evaluate(()=>window.archiveReview.keys())).length).toBeGreaterThan(4);
 expect(await page.evaluate(()=>window.archiveReview.change(true))).toBe('ok');expect(await page.evaluate(()=>window.archiveReview.reward())).toBe('applied');const saved=await page.evaluate(()=>window.archiveReview.state());await page.reload();await page.waitForFunction(()=>!!window.archiveReview);expect((await page.evaluate(()=>window.archiveReview.load())).raw).toBe(saved);expect(await page.evaluate(()=>window.archiveReview.reward())).toBe('already-applied');expect(JSON.parse(saved).freeContinueUsed).toBe(true);
});
test('IndexedDB transaction abort after request success leaves legacy root intact and retries',async({page})=>{
 await open(page);const before=await page.evaluate(()=>window.archiveReview.seed());
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args:Parameters<typeof put>){const request=put.apply(this,args);request.addEventListener('success',()=>this.transaction.abort());return request;};});
 expect((await page.evaluate(()=>window.archiveReview.load())).available).toBe(false);expect(await page.evaluate(()=>localStorage.getItem('arrows.progress.v1'))).toBe(before);
 await page.reload();await page.waitForFunction(()=>!!window.archiveReview);expect((await page.evaluate(()=>window.archiveReview.load())).raw).toBe(before);
});
test('two browser writers cannot overwrite a migrated root or drop a committed reward',async({page,context})=>{
 await open(page);await page.evaluate(()=>window.archiveReview.seed());await page.evaluate(()=>window.archiveReview.load());const other=await context.newPage();await open(other);await other.evaluate(()=>window.archiveReview.load());expect(await page.evaluate(()=>window.archiveReview.reward())).toBe('applied');expect(await other.evaluate(()=>window.archiveReview.change(true))).toBe('uncertain');const recovered=JSON.parse(await other.evaluate(()=>window.archiveReview.recover()));expect(recovered.receipts).toEqual(['browser-archive-receipt']);expect(await other.evaluate(()=>window.archiveReview.change(true))).toBe('ok');await other.close();
});
test('actual game plays, saves victory and advances after archive migration and reload',async({page})=>{
 await open(page);const seeded=JSON.parse(await page.evaluate(()=>window.archiveReview.seed()));
 // Enter the unmodified game: its startup must perform the migration itself.
 await page.goto('/');await expect(page.locator('#game-shell')).toHaveAttribute('data-progress','ready');await page.locator('#home-play:enabled').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-screen','game');await expect(page.locator('.route-snapshot,.board-transition')).toHaveCount(0);
 for(const [i,arrow]of seeded.campaign.level.arrows.entries()){
  const camera=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!),head=arrow.path.at(-1);await page.mouse.click(camera.x+head.x*camera.scale,camera.y+head.y*camera.scale);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining',String(seeded.campaign.level.arrows.length-i-1));
 }
 await page.reload();await page.locator('#home-play:enabled').click();await expect(page.locator('#game-shell')).toHaveAttribute('data-level','c02');await open(page);const restored=JSON.parse((await page.evaluate(()=>window.archiveReview.load())).raw);expect(restored.wins).toHaveLength(1);expect(restored.daily).toEqual(seeded.daily);expect(restored.freeContinueUsed).toBe(true);expect(restored.index).toBe(1);
});
