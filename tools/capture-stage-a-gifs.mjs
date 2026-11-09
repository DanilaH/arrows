import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.argv[2] ?? '.test-output/preview-gifs');
await mkdir(output, { recursive: true });
const port = 4189, base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true });
const records = [];
try {
  let online = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) { online = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!online) throw new Error('Preview server did not start');
  async function record(name, index, action, fullHeader = false) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU', recordVideo: { dir: output, size: { width: 390, height: 844 } } });
    const epoch = Date.now();
    const page = await context.newPage();
    await page.goto(base);
    await page.locator('#game-shell[data-status="ready"]').waitFor();
    if (index) {
      await page.locator('#choose-field').click();
      await page.locator('#dialog-content button').nth(index).click();
    }
    await page.waitForTimeout(600);
    const crop = await page.evaluate(includeHeader => {
      const top = document.querySelector('#game-header').getBoundingClientRect().bottom;
      const bottom = document.querySelector('#game-footer').getBoundingClientRect().top;
      return includeHeader ? { x: 0, y: 0, width: 390, height: Math.min(530, Math.floor(bottom)) }
        : { x: 0, y: Math.ceil(top + 4), width: 390, height: Math.floor(bottom - top - 8) };
    }, fullHeader);
    const start = Math.max(0, (Date.now() - epoch) / 1000 - .2);
    const point = async (x, y) => {
      const camera = JSON.parse(await page.locator('#game-root').getAttribute('data-camera'));
      return { x: camera.x + x * camera.scale, y: camera.y + y * camera.scale };
    };
    const tap = async (x, y) => { const p = await point(x, y); await page.touchscreen.tap(p.x, p.y); };
    await page.waitForTimeout(350);
    await action(page, tap);
    await page.waitForTimeout(900);
    const duration = (Date.now() - epoch) / 1000 - start;
    const remaining = await page.locator('#game-shell').getAttribute('data-remaining');
    const video = page.video();
    await context.close();
    const input = await video.path(), target = resolve(output, name + '.gif');
    const filter = `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},fps=18,scale=360:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(start), '-t', String(duration), '-i', input, '-vf', filter, '-loop', '0', target]);
    records.push({ name, file: target, video: input, start_seconds: start, duration_seconds: duration, crop, ending_remaining: Number(remaining) });
  }
  await record('arrows-extraction', 1, async (_page, tap) => {
    await tap(1, 11); await _page.waitForTimeout(1050);
    await tap(7, 2); await _page.waitForTimeout(300);
    await tap(1, 2); await _page.waitForTimeout(700);
  });
  await record('arrows-errors', 0, async (page, tap) => {
    for (let i = 0; i < 3; i++) { await tap(3, 2); await page.waitForTimeout(550); }
    const lives = await page.locator('#game-shell').getAttribute('data-lives');
    if (lives !== '2') throw new Error('Error demonstration lost more than one life');
  }, true);
  await record('arrows-pinch', 3, async (page) => {
    const client = await page.context().newCDPSession(page);
    const center = { x: 195, y: 420 };
    const fingers = span => [{ id: 1, x: center.x - span, y: center.y }, { id: 2, x: center.x + span, y: center.y }];
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(40) });
    for (let i = 1; i <= 10; i++) { await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(40 + 6 * i) }); await page.waitForTimeout(55); }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(450);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 3, ...center }] });
    for (let i = 1; i <= 10; i++) { await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 3, x: center.x - i * 8, y: center.y + i * 3 }] }); await page.waitForTimeout(45); }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.detach();
    if (await page.locator('#game-shell').getAttribute('data-remaining') !== '188') throw new Error('Zoom demonstration made a phantom move');
  });
  const manifest = { source: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), surface: 'production browser build, Chromium mobile emulation; not a physical phone recording', viewport: { width: 390, height: 844, dpr: 2 }, locale: 'ru-RU', staged: 'Own control boards selected through normal UI; real pointer/CDP touch input; no forced game state or edited gameplay pixels', runtime_assets: await readFile('dist/index.html', 'utf8'), records };
  await writeFile(resolve(output, 'capture-manifest.json'), JSON.stringify(manifest, null, 2));
  console.info(JSON.stringify(records.map(({ name, file, duration_seconds }) => ({ name, file, duration_seconds })), null, 2));
} finally { await browser.close(); server.kill('SIGTERM'); }
