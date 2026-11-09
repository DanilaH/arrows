import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const output = resolve(process.argv[2] ?? '.test-output/stage-b-gifs');
await mkdir(output, { recursive: true });
const levels = JSON.parse(await readFile('src/content/campaign.json', 'utf8'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4189', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true });
const records = [];
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch('http://127.0.0.1:4189')).ok) break; } catch {}
    if (i === 59) throw Error('Preview unavailable');
    await new Promise(r => setTimeout(r, 100));
  }
  async function capture(name, prelude, action) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', recordVideo: { dir: output, size: { width: 390, height: 844 } } });
    const epoch = Date.now(), page = await context.newPage();
    const ready = async () => { await page.locator('#game-shell[data-status=ready][data-progress=ready]').waitFor(); await page.waitForTimeout(500); };
    const tap = async arrow => {
      const camera = JSON.parse(await page.locator('#game-root').getAttribute('data-camera')), head = arrow.path.at(-1);
      await page.touchscreen.tap(camera.x + head.x * camera.scale, camera.y + head.y * camera.scale);
    };
    const canExit = (arrow, remaining) => {
      const head = arrow.path.at(-1), before = arrow.path.at(-2), dx = Math.sign(head.x - before.x), dy = Math.sign(head.y - before.y);
      return !remaining.some(other => other !== arrow && other.path.slice(1).some((b, i) => {
        const a = other.path[i];
        for (let j = 0, n = Math.abs(b.x - a.x) + Math.abs(b.y - a.y); j <= n; j++) {
          const x = a.x + Math.sign(b.x - a.x) * j, y = a.y + Math.sign(b.y - a.y) * j;
          if (dx && y === head.y && (x - head.x) * dx > 0 || dy && x === head.x && (y - head.y) * dy > 0) return true;
        }
        return false;
      }));
    };
    const solve = async index => {
      const remaining = [...levels[index].arrows];
      while (remaining.length) {
        const i = remaining.findIndex(a => canExit(a, remaining)); if (i < 0) throw Error('No legal exit');
        await tap(remaining[i]); remaining.splice(i, 1);
        await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(remaining.length));
      }
      await expect(page.locator('#win')).toBeVisible(); await page.locator('#next').click(); await ready();
    };
    await page.goto('http://127.0.0.1:4189'); await page.locator('#home-play').click(); await ready();
    await prelude({ page, tap, solve });
    const start = Math.max(0, (Date.now() - epoch) / 1000 - .15);
    await page.waitForTimeout(450); await action({ page, tap, solve, ready, canExit }); await page.waitForTimeout(900);
    const duration = (Date.now() - epoch) / 1000 - start + .35, state = await page.locator('#game-shell').evaluate(s => ({ ...s.dataset }));
    const video = page.video(); await context.close(); const input = await video.path(), target = resolve(output, name + '.gif');
    // Recorder PTS can have a different origin than Node wall time. Anchor the clip at the actual video end.
    const videoDuration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', input], { encoding: 'utf8' }));
    const videoStart = Math.max(0, videoDuration - duration);
    const filter = 'fps=18,scale=360:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3';
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(videoStart), '-t', String(duration), '-i', input, '-vf', filter, '-loop', '0', target]);
    records.push({ name, file: target, video: input, start: videoStart, duration, endingState: state });
  }
  await capture('arrows-campaign', async () => {}, async ({ page, tap, ready }) => {
    for (const a of levels[0].arrows) { await tap(a); await page.waitForTimeout(450); }
    await expect(page.locator('#win')).toBeVisible(); await page.waitForTimeout(500);
    await page.locator('#next').click(); await ready();
  });
  await capture('arrows-restore', async ({ solve }) => { await solve(0); await solve(1); }, async ({ page, tap, ready, canExit }) => {
    const level = levels[2], blocked = level.arrows.find(a => !canExit(a, level.arrows)), free = level.arrows.find(a => canExit(a, level.arrows));
    await tap(blocked); await page.waitForTimeout(450); await tap(free); await page.waitForTimeout(450);
    await page.locator('#guides').click(); await page.waitForTimeout(450); await page.reload(); await page.locator('#home-play').click(); await ready();
    await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '5');
    await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '2');
    await expect(page.locator('#guides')).toHaveAttribute('aria-pressed', 'true');
  });
  await capture('arrows-continue', async ({ page, solve }) => {
    for (let i = 0; i < 4; i++) { if (i === 3) await page.locator('#guides').click(); await solve(i); }
  }, async ({ page, tap, canExit }) => {
    const blocked = levels[4].arrows.filter(a => !canExit(a, levels[4].arrows)).slice(0, 3); if (blocked.length !== 3) throw Error('Not enough blockers');
    for (const a of blocked) { await tap(a); await page.waitForTimeout(400); }
    await expect(page.locator('[data-action=free-continue]')).toBeVisible(); await page.waitForTimeout(800);
    await page.locator('[data-action=free-continue]').click(); await page.waitForTimeout(650);
    await tap(blocked[0]); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '3');
  });
  const hashes = {};
  for (const name of await readdir('dist/assets')) hashes[name] = createHash('sha256').update(await readFile(`dist/assets/${name}`)).digest('hex');
  await writeFile(resolve(output, 'capture-manifest.json'), JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    provenance: 'Actual production build in Chromium mobile emulation. Own campaign reached with normal touch input; no forced state, injected rewards or edited gameplay pixels. Not physical-device evidence.',
    viewport: { width: 390, height: 844, dpr: 2 }, locale: 'ru-RU', assetHashes: hashes, records }, null, 2));
  console.info(records.map(({ name, file, duration }) => ({ name, file, duration })));
} finally { await browser.close(); server.kill('SIGTERM'); }
