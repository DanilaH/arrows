import { test, expect } from '@playwright/test';
import { campaign } from '../../src/content/campaign';

test('loads the bundled face for RU and EN without a font CDN and keeps narrow controls reachable', async ({page}) => {
  const fonts:string[]=[];page.on('request',r=>{if(r.resourceType()==='font')fonts.push(r.url());});
  await page.setViewportSize({width:320,height:568});await page.goto('/');await page.locator('#home-play:enabled').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>Array.from(document.fonts).some(f=>f.family==='Nunito'&&f.status==='loaded'))).toBe(true);
  expect(fonts.length).toBeGreaterThan(0);expect(fonts.every(url=>new URL(url).origin==='http://127.0.0.1:4173')).toBe(true);
  await page.evaluate(()=>document.documentElement.style.fontSize='125%');
  for(const language of ['ru','en']){
    await page.locator('#home-settings').click();await page.locator('#setting-language').selectOption(language);
    await page.locator('#theme-light').click();
    expect(await page.locator('#settings-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await page.locator('#close-settings').click();await expect(page.locator('#settings-dialog')).not.toBeVisible();
    expect(await page.locator('#meta-screen').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    for(const id of ['home-play','home-settings']){
      const target=page.locator('#'+id);await target.scrollIntoViewIfNeeded();
      expect(await target.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
    }
  }
});

test('a missing font never holds startup or prevents a real accepted move',async({page})=>{
  await page.route('**/fonts/nunito-variable.ttf',route=>route.abort());await page.goto('/');
  await page.locator('#home-play:enabled').click();await page.waitForTimeout(450);
  const c=JSON.parse((await page.locator('#game-root').getAttribute('data-camera'))!),p=campaign[0]!.arrows[0]!.path.at(-1)!;
  await page.mouse.click(c.x+p.x*c.scale,c.y+p.y*c.scale);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining','2');
  await expect(page.locator('#game-shell')).toHaveAttribute('data-lives','3');
});
