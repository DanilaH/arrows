import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const output = resolve(process.argv[2] ?? '.test-output/identity'); await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4189', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true });
try {
  for (let i = 0; i < 300; i++) { try { if ((await fetch('http://127.0.0.1:4189')).ok) break; } catch {} if (i === 299) throw Error('Preview unavailable'); await new Promise(r => setTimeout(r, 100)); }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
  const page = await context.newPage(); let release; const gate = new Promise(resolve => { release = resolve; });
  // Explicit controlled delayed asset delivery makes the real pre-JS launch state readable.
  // This is not native startup duration, device performance, or an added production delay.
  await page.route('**/assets/index-*.js', async route => { await gate; await route.continue(); });
  await page.goto('http://127.0.0.1:4189', { waitUntil: 'commit' }); await expect(page.locator('.startup-mark')).toBeVisible();
  await expect.poll(() => page.locator('.startup-mark').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  const cdp = await context.newCDPSession(page);
  const frames = []; let recording = true;
  const task = (async () => { while (recording) {
    const at = Date.now(), file = `${String(frames.length).padStart(4, '0')}.png`;
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(resolve(output, file), Buffer.from(shot.data, 'base64')); frames.push({ at, file }); await page.waitForTimeout(Math.max(0, 65 - (Date.now() - at)));
  } })();
  await page.waitForTimeout(900); release();
  await page.locator('#game-shell[data-status=ready][data-progress=ready]').waitFor(); await page.waitForTimeout(850);
  await expect(page.locator('#home-controls')).toHaveCount(0); await page.locator('#home-play').click(); await page.waitForTimeout(700);
  const c = JSON.parse(await page.locator('#game-root').getAttribute('data-camera'));
  await page.touchscreen.tap(c.x + 6 * c.scale, c.y + 3 * c.scale); await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '2');
  await page.waitForTimeout(850); await page.locator('#choose-field').click(); await page.waitForTimeout(900);
  recording = false; await task;
  const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(.02, ((frames[i + 1]?.at ?? f.at + 65) - f.at) / 1000)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`;
  await writeFile(resolve(output, 'frames.txt'), list);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', resolve(output, 'frames.txt'), '-vf', 'fps=18,scale=360:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', resolve(output, 'arrows-launch.gif')]);
  const html = await readFile('dist/index.html', 'utf8'), entry = html.match(/src="\.\/([^\"]+\.js)"/)[1];
  await writeFile(resolve(output, 'capture-manifest.json'), JSON.stringify({ source: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    provenance: 'Actual production-browser UI, 390x844 RU, fresh storage, ordinary touch gameplay. JavaScript asset delivery is held for 900 ms for readability, only in the capture route. Not native launch/performance evidence. No fake wins/rewards or edited pixels.',
    entry, entrySha256: createHash('sha256').update(await readFile(`dist/${entry}`)).digest('hex'), frames: frames.length, durationMs: frames.at(-1).at - frames[0].at, file: 'arrows-launch.gif' }, null, 2));
  console.info({ frames: frames.length, file: resolve(output, 'arrows-launch.gif') }); await cdp.detach(); await context.close();
} finally { await browser.close(); server.kill('SIGTERM'); }
