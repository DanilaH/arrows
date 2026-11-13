import { test, expect, type Page } from '@playwright/test';
import { campaign } from '../../src/content/campaign';
import { freshSave, freshAttempt, SAVE_KEY, type GameSave } from '../../src/progression/save';
import { defaultSettings, SETTINGS_KEY } from '../../src/app/settings';

async function open(page: Page, theme: 'dark' | 'light', canvas = false) {
  const save = freshSave(); save.index = 19; save.campaign = freshAttempt(campaign[19]!);
  save.wins = campaign.slice(0,19).map((level,index) => ({attempt:`past-${index}`,levelId:level.id,activeMs:1000,completedAt:index*1000,localDate:'2026-11-01',mistakes:0}));
  save.tutorials = ['tap','turns','blockers','guides','zoom','hint'];
  await page.addInitScript(({save,theme,key,settingsKey,settings,canvas}) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(save));
    localStorage.setItem(settingsKey,JSON.stringify({...settings,theme}));
    if (canvas) {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement,type: string,...args: unknown[]) {
        return type.includes('webgl') ? null : Reflect.apply(get,this,[type,...args]);
      } as typeof get;
    }
  },{save,theme,key:SAVE_KEY,settingsKey:SETTINGS_KEY,settings:defaultSettings(),canvas});
  await page.goto('/'); await page.locator('#home-play:enabled').click();
  await expect(page.locator('.route-snapshot,.board-transition')).toHaveCount(0);
  await page.waitForTimeout(400);
}
const camera = async (page: Page) => JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!) as {x:number;y:number;scale:number};
const board = (page: Page) => page.evaluate(key => (JSON.parse(localStorage.getItem(key)!) as GameSave).campaign.board,SAVE_KEY);
async function clearArea(page: Page) {
  return page.locator('#game-root').evaluate(e => ({top:parseFloat(getComputedStyle(e).getPropertyValue('--board-clear-top')),bottom:parseFloat(getComputedStyle(e).getPropertyValue('--board-clear-bottom'))}));
}
async function placePoint(page: Page, point: {x:number;y:number}, target: {x:number;y:number}) {
  for (let i=0;i<30;i++) {
    const c=await camera(page),dx=target.x-c.x-point.x*c.scale,dy=target.y-c.y-point.y*c.scale;
    if (Math.hypot(dx,dy)<.5) return;
    const area=await clearArea(page),start={x:page.viewportSize()!.width/2,y:(area.top+area.bottom)/2};
    await page.mouse.move(start.x,start.y);await page.mouse.down();
    // Cross gesture slop before fine positioning; short coalesced final moves
    // otherwise become taps rather than the requested pan.
    await page.mouse.move(start.x+20,start.y);
    await page.mouse.move(start.x+Math.max(-120,Math.min(120,dx)),start.y+Math.max(-120,Math.min(120,dy)),{steps:3});
    await page.mouse.up();
  }
  throw Error(`Original figure point could not be panned into the requested visible position: ${JSON.stringify({point,target,camera:await camera(page)})}`);
}
async function pixelContrast(page: Page, x: number, y: number) {
  const png=await page.screenshot({clip:{x:Math.floor(x)-2,y:Math.floor(y)-2,width:5,height:5}});
  return page.evaluate(async encoded => {
    const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
    const canvas=new OffscreenCanvas(5,5),ctx=canvas.getContext('2d')!;ctx.drawImage(bitmap,0,0);
    const bg=getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.slice(0,3).map(Number),pixels=ctx.getImageData(0,0,5,5).data;
    let contrast=0;for(let i=0;i<pixels.length;i+=4)contrast=Math.max(contrast,Math.abs(pixels[i]!-bg[0]!)+Math.abs(pixels[i+1]!-bg[1]!)+Math.abs(pixels[i+2]!-bg[2]!));
    return contrast;
  },png.toString('base64'));
}

for (const theme of ['dark','light'] as const) for (const canvas of [false,true]) {
  test(`softly fades actual ${canvas?'Canvas':'WebGL'} arrow pixels at both HUD edges without hidden taps (${theme})`,async({page},info)=>{
    await open(page,theme,canvas);
    const area=await clearArea(page),width=page.viewportSize()!.width;
    await page.mouse.move(width/2,(area.top+area.bottom)/2);
    // Mobile-emulated wheel deltas are smaller than desktop deltas. Advance
    // through real events until the middle segment can reach either fade.
    for(let i=0;i<6&&(await camera(page)).scale<35;i++){
      const initial=await camera(page);await page.mouse.wheel(0,-1000);
      await expect.poll(async()=>(await camera(page)).scale).toBeGreaterThan(initial.scale*1.1);
    }
    expect((await camera(page)).scale).toBeGreaterThanOrEqual(35);
    const segments=campaign[19]!.arrows.flatMap(a=>a.path.slice(1).flatMap((end,i)=>{
      const start=a.path[i]!;return start.y===end.y&&Math.abs(end.x-start.x)>=3?[{x:(start.x+end.x)/2,y:start.y}]:[];
    })).sort((a,b)=>Math.hypot(a.x-23,a.y-27)-Math.hypot(b.x-23,b.y-27));
    const point=segments[0]!;
    for (const y of [area.top-14,area.bottom+16]) {
      const x=width/2;await placePoint(page,point,{x,y});
      const before=await board(page),fade=page.locator('#game-root > .board-edge-fade');
      const faded=await pixelContrast(page,x,y);
      await fade.evaluate(e=>(e as HTMLElement).style.visibility='hidden');
      const raw=await pixelContrast(page,x,y);
      await fade.evaluate(e=>(e as HTMLElement).style.visibility='');
      expect(raw).toBeGreaterThan(80);expect(faded).toBeGreaterThan(raw*.1);expect(faded).toBeLessThan(raw*.9);
      await page.mouse.click(x,y);expect(await board(page)).toEqual(before);
    }
    await placePoint(page,point,{x:width/2,y:(area.top+area.bottom)/2});
    const before=await board(page);await page.mouse.click(width/2,(area.top+area.bottom)/2);
    await expect.poll(()=>board(page)).not.toEqual(before);
    await page.waitForTimeout(700);await page.screenshot({path:info.outputPath(`soft-edges-${theme}-${canvas?'canvas':'webgl'}.png`)});
  });
}

test('keeps the enlarged field and action row stable when overlay messages appear, including resize and reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await open(page,'dark');
  await page.locator('#hint:visible').waitFor();
  const original=await camera(page),footer=await page.locator('#game-footer').boundingBox();
  expect(footer!.height).toBeLessThanOrEqual(80);
  const initialArea=await clearArea(page);expect(initialArea.bottom).toBeGreaterThan(footer!.y-16);
  await page.locator('#app-status').evaluate(e=>e.textContent='A temporary two-line message that must not reserve space or move the next arrow.');
  await page.waitForTimeout(150);expect(await camera(page)).toEqual(original);expect(await page.locator('#game-footer').boundingBox()).toEqual(footer);
  await page.locator('#app-status').evaluate(e=>e.textContent='');
  for (const size of [{width:360,height:740},{width:780,height:360},{width:412,height:915}]) {
    await page.setViewportSize(size);
    await expect.poll(async()=>Math.round((await page.locator('canvas').boundingBox())!.height)).toBe(size.height);
    await expect.poll(async()=>Math.round((await clearArea(page)).bottom)).toBeGreaterThan(size.height-110);
    const area=await clearArea(page),header=(await page.locator('#game-header').boundingBox())!,actions=(await page.locator('#game-footer').boundingBox())!;
    expect(area.top).toBeCloseTo(header.y+header.height+28,1);expect(area.bottom).toBeCloseTo(actions.y-8,1);
    expect(await page.locator('#game-root > .board-edge-fade').evaluate(e=>getComputedStyle(e).pointerEvents)).toBe('none');
  }
});
