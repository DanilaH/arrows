import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const storage = resolve(process.argv[2] ?? ''), output = resolve(process.argv[3] ?? '.test-output/trophy-gifs');
if (!process.argv[2]) throw Error('Supply an unedited browser export earned by real play');
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4189', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true }), records = [];
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch('http://127.0.0.1:4189')).ok) break; } catch {} if (i === 59) throw Error('Preview unavailable'); await new Promise(r => setTimeout(r, 100)); }
  async function record(name, action) {
    const context = await browser.newContext({ storageState: storage, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
    const page = await context.newPage(); await page.goto('http://127.0.0.1:4189');
    await page.locator('#game-shell[data-status=ready][data-progress=ready]').waitFor(); await page.locator('#home-collection').click();
    await expect(page.locator('#trophy-year')).toHaveCount(0); await expect(page.locator('.month-trophy')).toHaveCount(12);
    await page.locator('#meta-screen').evaluate(root => { root.scrollTop += root.querySelector('.trophy-heading').getBoundingClientRect().top - 14; });
    await page.waitForTimeout(450);
    const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('arrows.progress.v1')).cups);
    const dir = resolve(output, name); await mkdir(dir, { recursive: true }); const frames = []; let recording = true;
    const loop = (async () => { while (recording) {
      const at = Date.now(), file = `${String(frames.length).padStart(4, '0')}.png`;
      await page.screenshot({ path: resolve(dir, file), type: 'png' }); frames.push({ at, file }); await page.waitForTimeout(Math.max(0, 65 - (Date.now() - at)));
    } })();
    await page.waitForTimeout(800); await action(page); await page.waitForTimeout(1200); recording = false; await loop;
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('arrows.progress.v1')).cups);
    if (JSON.stringify(initial) !== JSON.stringify(after)) throw Error('Preview changed awarded trophies');
    const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(.02, ((frames[i + 1]?.at ?? f.at + 65) - f.at) / 1000)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`;
    await writeFile(resolve(dir, 'frames.txt'), list); const target = resolve(output, name + '.gif');
    const filter = 'fps=18,scale=390:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle';
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', resolve(dir, 'frames.txt'), '-vf', filter, '-loop', '0', target]);
    records.push({ name, file: target, frames: frames.length, duration_ms: frames.at(-1).at - frames[0].at, owned_before: initial, owned_after: after }); await context.close();
  }
  await record('arrows-current-trophies', async page => {
    await page.locator('#meta-screen').evaluate(root => root.scrollBy({ top: 270, behavior: 'smooth' })); await page.waitForTimeout(900);
    await page.locator('[data-month="2026-11"]').click(); await page.waitForTimeout(650); await page.locator('#view-trophy').click(); await expect(page.locator('#trophy-viewer')).toBeVisible(); await page.waitForTimeout(400);
  });
  const html = await readFile('dist/index.html', 'utf8'), entry = html.match(/src="\.\/([^\"]+\.js)"/)[1];
  await writeFile(resolve(output, 'capture-manifest.json'), JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    provenance: 'Actual production browser UI, RU, 390x844, timestamped page screenshots. Unedited genuine 19-level Stage C playthrough is upgraded normally. Reward appearance is explicitly labelled as preview. No wins/cups/receipts are fabricated; ownership is asserted unchanged. Not physical-phone evidence.',
    entry, entry_sha256: createHash('sha256').update(await readFile(`dist/${entry}`)).digest('hex'), storage_sha256: createHash('sha256').update(await readFile(storage)).digest('hex'), records }, null, 2));
  console.info(records.map(({ name, file, frames }) => ({ name, file, frames })));
} finally { await browser.close(); server.kill('SIGTERM'); }
