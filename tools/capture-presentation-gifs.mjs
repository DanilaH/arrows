import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const output = resolve(process.argv[2] ?? '.test-output/presentation-gifs'); await mkdir(output, { recursive: true });
const levels = JSON.parse(await readFile('src/content/campaign.json', 'utf8'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4195', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true }), records = [];
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch('http://127.0.0.1:4195')).ok) break; } catch {} if (i === 59) throw Error('Preview unavailable'); await new Promise(r => setTimeout(r, 100)); }
  async function record(name, setup, action) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
    const page = await context.newPage(); await page.goto('http://127.0.0.1:4195');
    await page.locator('#game-shell[data-status=ready][data-progress=ready]').waitFor(); await setup(page);
    const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('arrows.progress.v1')));
    const dir = resolve(output, name); await mkdir(dir, { recursive: true }); const frames = []; let recording = true;
    const loop = (async () => { while (recording) {
      const at = Date.now(), file = `${String(frames.length).padStart(4, '0')}.png`;
      await page.screenshot({ path: resolve(dir, file), type: 'png' }); frames.push({ at, file }); await page.waitForTimeout(Math.max(0, 65 - (Date.now() - at)));
    } })();
    await page.waitForTimeout(650); await action(page); await page.waitForTimeout(1000); recording = false; await loop;
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('arrows.progress.v1')));
    const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(.02, ((frames[i + 1]?.at ?? f.at + 65) - f.at) / 1000)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`;
    await writeFile(resolve(dir, 'frames.txt'), list); const target = resolve(output, name + '.gif');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', resolve(dir, 'frames.txt'), '-vf', 'fps=18,scale=390:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle', '-loop', '0', target]);
    records.push({ name, frames: frames.length, duration_ms: frames.at(-1).at - frames[0].at, wins_before: initial.wins.length, wins_after: after.wins.length, cups_before: initial.cups, cups_after: after.cups }); await context.close();
  }
  await record('arrows-themes-settings', async () => {}, async page => {
    await page.locator('#home-settings').click(); await page.waitForTimeout(650); await page.locator('#theme-light').click(); await page.waitForTimeout(700);
    await page.locator('#setting-sound').click(); await page.waitForTimeout(350); await page.locator('#setting-language').selectOption('en'); await page.waitForTimeout(700); await page.locator('#close-settings').click();
  });
  const tap = async (page, index) => { const camera = JSON.parse(await page.locator('#game-root').getAttribute('data-camera')), p = levels[0].arrows[index].path.at(-1); await page.touchscreen.tap(camera.x + p.x * camera.scale, camera.y + p.y * camera.scale); };
  await record('arrows-theme-gameplay', async page => {
    await page.locator('#home-settings').click(); await page.locator('#theme-light').click(); await page.locator('#close-settings').click(); await page.locator('#home-play').click(); await page.waitForTimeout(500);
  }, async page => {
    await tap(page, 0); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '2'); await page.waitForTimeout(650);
    const attempt = await page.locator('#game-shell').getAttribute('data-attempt'); await page.locator('#game-settings').click(); await page.locator('#theme-dark').click(); await page.waitForTimeout(600); await page.locator('#close-settings').click();
    await expect(page.locator('#game-shell')).toHaveAttribute('data-attempt', attempt); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '2'); await page.waitForTimeout(450);
    await tap(page, 1); await page.waitForTimeout(350); await tap(page, 2); await expect(page.locator('#win')).toBeVisible();
  });
  const html = await readFile('dist/index.html', 'utf8'), entry = html.match(/src="\.\/([^\"]+\.js)"/)[1];
  await writeFile(resolve(output, 'capture-manifest.json'), JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), provenance: 'Actual production browser UI, RU/EN, 390x844, timestamped page screenshots. Fresh sessions, normal UI and genuine touch play only; no seeded wins, cups or receipts. GIFs are silent and are not physical-phone evidence.', entry, entry_sha256: createHash('sha256').update(await readFile(`dist/${entry}`)).digest('hex'), records }, null, 2));
  console.info(records);
} finally { await browser.close(); server.kill('SIGTERM'); }
