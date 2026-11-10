import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const output = resolve(process.argv[2] ?? '.test-output/polish-gifs'); await mkdir(output, { recursive: true });
const fields = JSON.parse(await readFile('src/content/campaign.json', 'utf8'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4189', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true }), records = [];
const options = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function clear(arrow, remaining) {
  const h = arrow.path.at(-1), before = arrow.path.at(-2), dx = Math.sign(h.x - before.x), dy = Math.sign(h.y - before.y);
  return !remaining.some(other => other !== arrow && other.path.slice(1).some((b, i) => {
    const a = other.path[i], n = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    for (let j = 0; j <= n; j++) {
      const x = a.x + Math.sign(b.x - a.x) * j, y = a.y + Math.sign(b.y - a.y) * j;
      if (dx && y === h.y && (x - h.x) * dx > 0 || dy && x === h.x && (y - h.y) * dy > 0) return true;
    } return false;
  }));
}
async function solve(page, index, delay = 0) {
  const level = fields[index]; await expect(page.locator('#game-shell')).toHaveAttribute('data-level', level.id); await sleep(400);
  const removed = await page.evaluate(() => JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign.board.removed);
  const remaining = level.arrows.filter(a => !removed.includes(a.id));
  while (remaining.length) {
    const i = remaining.findIndex(a => clear(a, remaining)); if (i < 0) throw Error('No legal arrow');
    const a = remaining[i], c = JSON.parse(await page.locator('#game-root').getAttribute('data-camera')), h = a.path.at(-1);
    await page.touchscreen.tap(c.x + h.x * c.scale, c.y + h.y * c.scale); remaining.splice(i, 1);
    await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(remaining.length)); if (delay) await sleep(delay);
  }
  await expect(page.locator('#win')).toBeVisible();
}
async function capture(page, name, action) {
  const dir = resolve(output, name); await mkdir(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page), frames = []; let recording = true;
  const loop = (async () => { while (recording) {
    const at = Date.now(), file = `${String(frames.length).padStart(5, '0')}.png`;
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(dir, file), Buffer.from(shot.data, 'base64')); frames.push({ at, file }); await sleep(Math.max(0, 55 - (Date.now() - at)));
  } })();
  await sleep(650); await action(); await sleep(850); recording = false; await loop; await cdp.detach();
  await writeFile(resolve(dir, 'frames.txt'), frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(.02, ((frames[i + 1]?.at ?? f.at + 55) - f.at) / 1000)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`);
  const file = resolve(output, `${name}.gif`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', resolve(dir, 'frames.txt'), '-vf', 'fps=18,scale=360:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', file]);
  records.push({ file, frames: frames.length, durationMs: frames.at(-1).at - frames[0].at, ending: await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('arrows.progress.v1')); return { wins: s.wins.length, index: s.index, dailyWins: s.dailyWins, cups: s.cups }; }) });
  console.info(`Captured ${name}`);
}
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:4189')).ok) break; } catch {} if (i === 99) throw Error('Preview unavailable'); await sleep(100); }
  const context = await browser.newContext(options), page = await context.newPage();
  await page.goto('http://127.0.0.1:4189'); await page.locator('#game-shell[data-status=ready][data-progress=ready]').waitFor(); await sleep(300);
  await capture(page, 'arrows-bent-opening', async () => {
    await page.locator('#home-play').click(); await solve(page, 0, 620); await sleep(550);
    await page.locator('#next').click(); await solve(page, 1, 470); await sleep(550); await page.locator('#next').click(); await sleep(650);
  });
  for (let index = 2; index < 19; index++) {
    if (index === 3) await page.locator('#guides').click();
    await solve(page, index); await page.locator('#next').click();
    if (index % 3 === 0) console.info(`Earned through ordinary touch: ${index + 1}/19`);
  }
  await page.locator('#choose-field').click(); await sleep(450);
  await context.storageState({ path: resolve(output, 'actual-playthrough.storage.json') });
  await capture(page, 'arrows-menu-motion', async () => {
    await page.locator('#home-collection').click(); await sleep(750);
    await page.locator('#meta-screen').evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })); await sleep(650);
    await page.locator('[data-month="2026-11"]').click(); await sleep(650); await page.locator('#view-trophy').click(); await sleep(950);
    await page.locator('[data-close-trophy]').click(); await sleep(350); await page.locator('[data-nav=back]').click(); await sleep(400);
    await page.locator('[data-nav=back]').click(); await sleep(550); await page.locator('#home-settings').click(); await sleep(700);
    await page.locator('#theme-light').click(); await sleep(650); await page.locator('#close-settings').click(); await sleep(700);
  });
  await page.screenshot({ path: resolve(output, 'light-home-qa.png') });
  const assetHashes = {};
  for (const sub of ['assets', 'ui']) for (const file of await readdir(`dist/${sub}`)) assetHashes[`${sub}/${file}`] = createHash('sha256').update(await readFile(`dist/${sub}/${file}`)).digest('hex');
  await writeFile(resolve(output, 'capture-manifest.json'), JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), provenance: 'Actual production Chromium mobile-emulation UI, RU 390x844. Fresh storage; first nineteen campaign wins earned solely by ordinary touch. Unedited storage export retained. CDP frames, timestamped without altered pixels or synthetic rewards. Not physical-device evidence.', assetHashes, records }, null, 2));
  await context.close();
} finally { await browser.close(); server.kill('SIGTERM'); }
