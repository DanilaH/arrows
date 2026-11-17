import {test,expect,type Page} from '@playwright/test';
import {campaign} from '../../src/content/campaign';
import {freshSave,freshAttempt,SAVE_KEY} from '../../src/progression/save';
// @ts-expect-error Isolated QA transport; never an application import.
import {controlledNative} from '../../tools/qa/assistance-native-transport.mjs';
const events=(page:Page,name:string)=>page.evaluate(name=>Reflect.get(window,'assistanceQA').snapshot().events.filter((e:any)=>e.event===name),name);
async function boot(page:Page,language='ru',index=0){
 const save=freshSave();save.index=index;save.campaign=freshAttempt(campaign[index]!);save.wins=campaign.slice(0,index).map((l,i)=>({attempt:`release-before-${i}`,levelId:l.id,activeMs:1,completedAt:1,mistakes:0}));save.tutorials=['tap','turns','blockers','guides','zoom','hint'];save.seenUnlocks=['collection','calendar'];
 await page.addInitScript(controlledNative,{save,settings:{version:1,language,theme:'dark',sound:true,vibration:true}});
 await page.goto('/');await expect(page.locator('#game-shell')).toHaveAttribute('data-progress','ready');return save;
}
test('RU difficulty is translated in the actual Home, board and live locale change',async({page})=>{
 const index=campaign.findIndex(l=>l.difficulty==='hard');await boot(page,'ru',index);
 await expect(page.locator('.home-difficulty')).toHaveText('Сложный');await page.locator('#home-play').click();await expect(page.locator('#difficulty')).toHaveText('Сложный');
 await page.locator('#game-settings').click();await page.locator('#setting-language').selectOption('en');await page.locator('#close-settings').click();await expect(page.locator('#difficulty')).toHaveText('Hard');await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page).toHaveTitle('Arrows');
});
test('startup, meaningful first input and explicit re-entry have distinct bounded events',async({page})=>{
 const save=await boot(page,'en');await expect.poll(()=>events(page,'startup_timing')).toHaveLength(1);await page.locator('#home-play').click();expect(await events(page,'level_start')).toHaveLength(0);
 const c=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!),head=save.campaign.level.arrows[0]!.path.at(-1)!;
 await page.mouse.click(c.x+head.x*c.scale,c.y+head.y*c.scale);await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','2');await expect.poll(()=>events(page,'attempt_context')).toHaveLength(1);
 expect((await events(page,'attempt_context'))[0].params).toMatchObject({attempt:save.campaign.board.id,difficulty:'normal',arrows:3,content_version:3});
 await page.locator('#choose-field').click();await page.locator('#home-play').click();await expect.poll(()=>events(page,'level_resume')).toHaveLength(1);
 expect(await events(page,'level_start')).toHaveLength(1);expect(await events(page,'attempt_context')).toHaveLength(1);expect(await events(page,'startup_timing')).toHaveLength(1);
 expect(JSON.parse(await page.evaluate(key=>localStorage.getItem(key)!,SAVE_KEY)).campaign.board.id).toBe(save.campaign.board.id);
});
