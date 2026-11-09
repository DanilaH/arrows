import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Input must be an unedited browser export earned through real campaign play (see capture-stage-c-gifs.mjs).
const saved = resolve(process.argv[2] ?? ''), output = resolve(process.argv[3] ?? '.test-output/year-gif');
if (!process.argv[2]) throw Error('Supply authentic unlocked browser storage');
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4189', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true });
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch('http://127.0.0.1:4189')).ok) break; } catch {} if (i === 59) throw Error('Preview unavailable'); await new Promise(r => setTimeout(r, 100)); }
  const context = await browser.newContext({ storageState: saved, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4189');
  await page.locator('#game-shell[data-progress=ready][data-status=ready]').waitFor(); await page.locator('#home-collection').click();
  await expect(page.locator('.month-trophy')).toHaveCount(12);
  await page.locator('#meta-screen').evaluate(root => {
    const heading = root.querySelector('.trophy-year').parentElement;
    root.scrollTop += heading.getBoundingClientRect().top - root.getBoundingClientRect().top - 14;
  });
  await page.waitForTimeout(450);
  const frames = []; let recording = true;
  const recordingTask = (async () => {
    while (recording) {
      const at = Date.now(), file = `${String(frames.length).padStart(4, '0')}.png`;
      await page.screenshot({ path: resolve(output, file), type: 'png' }); frames.push({ at, file });
      await page.waitForTimeout(Math.max(0, 65 - (Date.now() - at)));
    }
  })();
  await page.waitForTimeout(1000); await page.locator('[data-month="2026-01"]').click(); await page.waitForTimeout(750);
  await page.locator('[data-date="2026-01-01"]').click(); await page.waitForTimeout(500); await page.locator('#start-daily').click(); await page.waitForTimeout(650);
  await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'd20260101'); await page.waitForTimeout(1000);
  recording = false; await recordingTask;
  const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(.02, ((frames[i + 1]?.at ?? f.at + 65) - f.at) / 1000)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`;
  await writeFile(resolve(output, 'frames.txt'), list);
  const filter = 'fps=18,scale=360:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3';
  const target = resolve(output, 'arrows-year-2026.gif');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', resolve(output, 'frames.txt'), '-vf', filter, '-loop', '0', target]);
  const html = await readFile('dist/index.html', 'utf8'), entry = html.match(/src="\.\/([^\"]+\.js)"/)[1];
  await writeFile(resolve(output, 'capture-manifest.json'), JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    provenance: 'Actual current production browser UI, RU, 390x844. Unedited genuine 19-level playthrough exported by Stage C was upgraded normally. No fake wins, trophies or rewards. Timestamped actual screenshots; not phone performance evidence.',
    entry, entry_sha256: createHash('sha256').update(await readFile(`dist/${entry}`)).digest('hex'), storage_sha256: createHash('sha256').update(await readFile(saved)).digest('hex'), frames: frames.length, file: target }, null, 2));
  console.info({ file: target, frames: frames.length }); await context.close();
} finally { await browser.close(); server.kill('SIGTERM'); }
