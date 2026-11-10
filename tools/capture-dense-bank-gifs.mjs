import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const output = resolve(process.argv[2] ?? '.test-output/dense-bank-gifs'); await mkdir(output, { recursive: true });
const fields = JSON.parse(await readFile('src/content/campaign.json', 'utf8'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4189', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true }), records = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function blockers(arrow, remaining) {
  const h = arrow.path.at(-1), before = arrow.path.at(-2), dx = Math.sign(h.x - before.x), dy = Math.sign(h.y - before.y);
  return remaining.filter(other => other !== arrow && other.path.slice(1).some((b, i) => {
    const a = other.path[i], n = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    for (let j = 0; j <= n; j++) {
      const x = a.x + Math.sign(b.x - a.x) * j, y = a.y + Math.sign(b.y - a.y) * j;
      if (dx && y === h.y && (x - h.x) * dx > 0 || dy && x === h.x && (y - h.y) * dy > 0) return true;
    } return false;
  }));
}
async function tap(page, arrow) {
  const camera = JSON.parse(await page.locator('#game-root').getAttribute('data-camera')), p = arrow.path.at(-1);
  await page.touchscreen.tap(camera.x + p.x * camera.scale, camera.y + p.y * camera.scale);
}
async function remaining(page, level) {
  const removed = await page.evaluate(() => JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign.board.removed);
  return level.arrows.filter(a => !removed.includes(a.id));
}
async function solve(page, index, delay = 0) {
  const level = fields[index]; await expect(page.locator('#game-shell')).toHaveAttribute('data-level', level.id); await sleep(400);
  const arrows = await remaining(page, level);
  while (arrows.length) {
    const i = arrows.findIndex(a => blockers(a, arrows).length === 0); if (i < 0) throw Error('No legal arrow');
    await tap(page, arrows[i]); arrows.splice(i, 1); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(arrows.length)); if (delay) await sleep(delay);
  }
  await expect(page.locator('#win')).toBeVisible();
}
async function dependencyDemo(page, index) {
  const level = fields[index], arrows = await remaining(page, level);
  const choices = arrows.map(arrow => ({ arrow, blocks: blockers(arrow, arrows) })).filter(v => v.blocks.length > 0 && v.blocks.length <= 3 && v.blocks.every(b => blockers(b, arrows).length === 0)).sort((a, b) => a.blocks.length - b.blocks.length);
  if (!choices.length) throw Error('No short visible dependency chain'); const { arrow, blocks } = choices[0];
  await tap(page, arrow); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '2'); await sleep(650);
  let count = arrows.length;
  for (const b of blocks) { await tap(page, b); count--; await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(count)); await sleep(550); }
  await tap(page, arrow); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(count - 1)); await sleep(650);
}
async function capture(page, name, action) {
  const directory = resolve(output, name); await mkdir(directory, { recursive: true }); const cdp = await page.context().newCDPSession(page), frames = []; let recording = true;
  const loop = (async () => { while (recording) {
    const at = Date.now(), file = `${String(frames.length).padStart(5, '0')}.png`;
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(directory, file), Buffer.from(shot.data, 'base64')); frames.push({ at, file }); await sleep(Math.max(0, 65 - (Date.now() - at)));
  } })();
  await sleep(900); await action(cdp); await sleep(850); recording = false; await loop; await cdp.detach();
  await writeFile(resolve(directory, 'frames.txt'), frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(.02, ((frames[i + 1]?.at ?? f.at + 65) - f.at) / 1000)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`);
  const file = resolve(output, `${name}.gif`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', resolve(directory, 'frames.txt'), '-vf', 'fps=16,scale=360:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', file]);
  records.push({ file: `${name}.gif`, frames: frames.length, durationMs: frames.at(-1).at - frames[0].at }); console.info(`Captured ${name}`);
}
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:4189')).ok) break; } catch {} if (i === 99) throw Error('Preview unavailable'); await sleep(100); }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4189'); await page.locator('#home-play:enabled').waitFor(); await page.locator('#home-play').click();
  for (let i = 0; i < 4; i++) { if (i === 3) await page.locator('#guides').click(); await solve(page, i); await page.locator('#next').click(); }
  await sleep(500);
  await capture(page, 'arrows-dense-early', async () => {
    await solve(page, 4, 170); await sleep(600); await page.locator('#next').click(); await sleep(1000); await dependencyDemo(page, 5);
  });
  for (let i = 5; i < 19; i++) {
    await solve(page, i); await page.locator('#next').click(); console.info(`Touch-earned campaign wins: ${i + 1}/19`);
  }
  await sleep(650); await context.storageState({ path: resolve(output, 'actual-nineteen-wins.storage.json') });
  await capture(page, 'arrows-dense-nightmare', async cdp => {
    await dependencyDemo(page, 19); await sleep(600);
    const center = { x: 195, y: 425 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: center.x - 35, y: center.y, id: 1 }, { x: center.x + 35, y: center.y, id: 2 }] });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: center.x - 35 - i * 6, y: center.y, id: 1 }, { x: center.x + 35 + i * 6, y: center.y, id: 2 }] }); await sleep(70); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(1200);
  });
  const storage = await context.storageState(); await writeFile(resolve(output, 'ending.storage.json'), JSON.stringify(storage));
  const state = JSON.parse(storage.origins[0].localStorage.find(v => v.name === 'arrows.progress.v1').value);
  if (state.wins.length !== 19 || state.index !== 19 || state.cups.length || Object.keys(state.dailyWins).length) throw Error('Unexpected earned progress');
  const assetHashes = {};
  for (const sub of ['assets', 'ui']) for (const file of await readdir(`dist/${sub}`)) assetHashes[`${sub}/${file}`] = createHash('sha256').update(await readFile(`dist/${sub}/${file}`)).digest('hex');
  await writeFile(resolve(output, 'capture-manifest.json'), JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), provenance: 'Actual production Chromium mobile emulation RU390x844 DPR2. Fresh storage; nineteen wins earned by ordinary touch selected with an independent cell-walking oracle. Clips show genuine blocked/free dependencies and pinch. No injected progression, rewards or altered gameplay pixels. Not physical-device performance evidence.', assetHashes, records, ending: { wins: state.wins.length, index: state.index, cups: state.cups, dailyWins: state.dailyWins } }, null, 2));
  await context.close();
} finally { await browser.close(); server.kill('SIGTERM'); }
