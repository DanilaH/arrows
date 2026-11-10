import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const output = resolve(process.argv[2] ?? '.test-output/compact-opening'); await mkdir(output, { recursive: true });
const fields = JSON.parse(await readFile('src/content/campaign.json', 'utf8'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4189', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true }), frames = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:4189')).ok) break; } catch {} if (i === 99) throw Error('Preview unavailable'); await sleep(100); }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4189'); await page.locator('#game-shell[data-status=ready][data-progress=ready]').waitFor();
  const cdp = await context.newCDPSession(page); let recording = true;
  const loop = (async () => { while (recording) {
    const at = Date.now(), file = `${String(frames.length).padStart(5, '0')}.png`;
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(output, file), Buffer.from(shot.data, 'base64')); frames.push({ at, file }); await sleep(Math.max(0, 55 - (Date.now() - at)));
  } })();
  await sleep(450); await page.locator('#home-play').click(); const cameras = [];
  for (let index = 0; index < 4; index++) {
    const level = fields[index]; await expect(page.locator('#game-shell')).toHaveAttribute('data-level', level.id); await sleep(1000);
    const camera = JSON.parse(await page.locator('#game-root').getAttribute('data-camera')); cameras.push({ levelId: level.id, camera });
    await page.screenshot({ path: resolve(output, `qa-${level.id}.png`) });
    if (index === 3) { await sleep(600); break; }
    // Authored order is independently validated as legal. Every move still uses real touchscreen input.
    for (const [i, arrow] of level.arrows.entries()) {
      const head = arrow.path.at(-1); await page.touchscreen.tap(camera.x + head.x * camera.scale, camera.y + head.y * camera.scale);
      await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(level.arrows.length - i - 1)); await sleep(index === 0 ? 500 : index === 1 ? 350 : 250);
    }
    await expect(page.locator('#win')).toBeVisible(); await sleep(450); await page.locator('#next').click();
  }
  recording = false; await loop; await cdp.detach();
  const storage = await context.storageState(); await writeFile(resolve(output, 'actual-playthrough.storage.json'), JSON.stringify(storage));
  const save = JSON.parse(storage.origins[0].localStorage.find(x => x.name === 'arrows.progress.v1').value);
  if (save.wins.length !== 3 || save.index !== 3 || save.cups.length || Object.keys(save.dailyWins).length) throw Error('Unexpected capture progress');
  const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(.02, ((frames[i + 1]?.at ?? f.at + 55) - f.at) / 1000)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`;
  await writeFile(resolve(output, 'frames.txt'), list);
  const file = resolve(output, 'arrows-compact-opening.gif');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', resolve(output, 'frames.txt'), '-vf', 'fps=18,scale=360:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', file]);
  const assetHashes = {};
  for (const sub of ['assets', 'ui']) for (const name of await readdir(`dist/${sub}`)) assetHashes[`${sub}/${name}`] = createHash('sha256').update(await readFile(`dist/${sub}/${name}`)).digest('hex');
  await writeFile(resolve(output, 'capture-manifest.json'), JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), provenance: 'Actual production Chromium mobile emulation, fresh storage, RU 390x844 DPR2. Three wins earned solely through ordinary touch, no injected progression or altered gameplay pixels. Not physical-phone performance evidence.', assetHashes, cameras, frames: frames.length, durationMs: frames.at(-1).at - frames[0].at, file: 'arrows-compact-opening.gif', wins: save.wins.length }, null, 2));
  console.info({ file, frames: frames.length, wins: save.wins.length }); await context.close();
} finally { await browser.close(); server.kill('SIGTERM'); }
