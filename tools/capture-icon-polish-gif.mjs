import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const output = resolve(process.argv[2] ?? '.test-output/icon-polish-release');
const savePath = process.argv[3] ?? '.test-output/autonomous-daily-release/earned-save.json';
const rawSave = await readFile(savePath, 'utf8'), state = JSON.parse(rawSave);
if (state.wins.length !== 19 || state.wins.some(w => w.mistakes) || state.cups.length || state.receipts.length) throw Error('Use the documented genuine 19-win capture save');
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4196', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true }), sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:4196')).ok) break; } catch {} if (i === 99) throw Error('Preview unavailable'); await sleep(100); }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'ru-RU', timezoneId: 'Asia/Yekaterinburg' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00Z'));
  await page.addInitScript(s => localStorage.setItem('arrows.progress.v1', JSON.stringify(s)), state);
  await page.goto('http://127.0.0.1:4196'); await page.locator('#home-collection:enabled').click();
  await page.locator('#home-settings').click(); await page.locator('#theme-light').click(); await page.locator('#close-settings').click(); await sleep(500);
  const cdp = await context.newCDPSession(page), frames = [], dir = resolve(output, 'frames'); await mkdir(dir, { recursive: true }); let recording = true;
  const loop = (async () => { while (recording) { const at = Date.now(), file = `${String(frames.length).padStart(5, '0')}.png`; const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(resolve(dir, file), Buffer.from(shot.data, 'base64')); frames.push({ at, file }); await sleep(Math.max(0, 55 - (Date.now() - at))); } })();
  try {
    await sleep(1200); await page.locator('[data-medal=legend] summary').click(); await sleep(900);
    await page.locator('[data-medal=legend] summary').click(); await sleep(450);
    await page.locator('#home-settings').click(); await sleep(550); await page.locator('#theme-dark').click(); await sleep(450); await page.locator('#close-settings').click(); await sleep(1400);
    await expect(page.locator('[data-medal=legend] progress')).toHaveAttribute('value', '19');
  } finally { recording = false; await loop; await cdp.detach(); }
  if (errors.length) throw Error(errors.join());
  await writeFile(resolve(dir, 'frames.txt'), frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(.02, ((frames[i + 1]?.at ?? f.at + 55) - f.at) / 1000)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', resolve(dir, 'frames.txt'), '-vf', 'fps=18,scale=390:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', resolve(output, 'arrows-icon-polish.gif')]);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('arrows.progress.v1')));
  for (const key of ['wins', 'dailyWins', 'cups', 'receipts', 'trophyDesigns']) if (JSON.stringify(after[key]) !== JSON.stringify(state[key])) throw Error('Capture changed canonical progress: ' + key);
  const assets = {}; for (const sub of ['assets', 'ui']) for (const file of await readdir(`dist/${sub}`)) assets[`${sub}/${file}`] = createHash('sha256').update(await readFile(`dist/${sub}/${file}`)).digest('hex');
  await writeFile(resolve(output, 'capture-manifest.json'), JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), provenance: 'Current unmodified production Chromium mobile emulation. Restored actual touch-earned 19-win save from 0.16.0 capture; no newly earned or fabricated award/win/receipt. Ordinary medal disclosure and Settings light/dark interactions. No SDK/test fixture entry. Browser rendering, not physical-phone evidence.', restoredSaveSha256: createHash('sha256').update(rawSave).digest('hex'), assets, frames: frames.length, durationMs: frames.at(-1).at - frames[0].at, viewport: page.viewportSize(), canonicalProgressUnchanged: true, errors }, null, 2));
  await context.close(); console.info('Captured icon polish');
} finally { await browser.close(); server.kill('SIGTERM'); }
