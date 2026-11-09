import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Only use the unedited genuine Stage C playthrough; never synthesize wins for a delivery clip.
if (!process.argv[2]) throw Error('Supply the authentic 19-win browser export');
const sourceStorage = resolve(process.argv[2]), output = resolve(process.argv[3] ?? '.test-output/campaign-bank-gifs');
await mkdir(output, { recursive: true });
const levels = JSON.parse(await readFile('src/content/campaign.json', 'utf8'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4189', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true }), records = [];
const clear = (arrow, remaining) => {
  const h = arrow.path.at(-1), p = arrow.path.at(-2), dx = Math.sign(h.x - p.x), dy = Math.sign(h.y - p.y);
  return !remaining.some(other => other !== arrow && other.path.slice(1).some((b, i) => {
    const a = other.path[i], n = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    for (let j = 0; j <= n; j++) {
      const x = a.x + Math.sign(b.x - a.x) * j, y = a.y + Math.sign(b.y - a.y) * j;
      if (dx && y === h.y && (x - h.x) * dx > 0 || dy && x === h.x && (y - h.y) * dy > 0) return true;
    }
    return false;
  }));
};
async function removeUntil(page, count, pause = 0) {
  const attempt = await page.evaluate(() => JSON.parse(localStorage.getItem('arrows.progress.v1')).campaign);
  const remaining = attempt.level.arrows.filter(a => !attempt.board.removed.includes(a.id));
  while (remaining.length > count) {
    const index = remaining.findIndex(a => clear(a, remaining)); if (index < 0) throw Error('No legal arrow');
    const c = JSON.parse(await page.locator('#game-root').getAttribute('data-camera')), h = remaining[index].path.at(-1);
    await page.touchscreen.tap(c.x + h.x * c.scale, c.y + h.y * c.scale); remaining.splice(index, 1);
    await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(remaining.length));
    if (pause) await page.waitForTimeout(pause);
  }
}
async function capture(page, name, action) {
  const dir = resolve(output, name); await mkdir(dir, { recursive: true });
  const frames = []; let recording = true;
  const task = (async () => {
    while (recording) {
      const at = Date.now(), file = `${String(frames.length).padStart(4, '0')}.png`;
      await page.screenshot({ path: resolve(dir, file) }); frames.push({ at, file });
      await page.waitForTimeout(Math.max(0, 65 - (Date.now() - at)));
    }
  })();
  await page.waitForTimeout(750); await action(); await page.waitForTimeout(1100);
  recording = false; await task;
  const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(.02, ((frames[i + 1]?.at ?? f.at + 65) - f.at) / 1000)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`;
  await writeFile(resolve(dir, 'frames.txt'), list);
  const file = resolve(output, name + '.gif');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', resolve(dir, 'frames.txt'), '-vf', 'fps=18,scale=360:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3', '-loop', '0', file]);
  records.push({ file, frames: frames.length, durationMs: frames.at(-1).at - frames[0].at });
}
try {
  for (let i = 0; i < 300; i++) { try { if ((await fetch('http://127.0.0.1:4189')).ok) break; } catch {} if (i === 299) throw Error('Preview unavailable'); await new Promise(r => setTimeout(r, 100)); }
  const context = await browser.newContext({ storageState: sourceStorage, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4189');
  await page.locator('#game-shell[data-progress=ready][data-status=ready]').waitFor();
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('arrows.progress.v1')));
  if (original.wins.length !== 19 || original.index !== 19 || original.campaign.level.id !== 'c20') throw Error('Wrong playthrough provenance');
  await page.locator('#home-play').click(); await page.waitForTimeout(450); await removeUntil(page, 1);
  await capture(page, 'arrows-beyond-20', async () => {
    await removeUntil(page, 0); await expect(page.locator('#win')).toBeVisible(); await page.waitForTimeout(650);
    await page.locator('#next').click(); await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'c21');
    await page.waitForTimeout(1300); await removeUntil(page, levels[20].arrows.length - 2, 450);
  });
  await removeUntil(page, 1); await page.waitForTimeout(500);
  await capture(page, 'arrows-new-bent-fields', async () => {
    await removeUntil(page, 0); await expect(page.locator('#win')).toBeVisible(); await page.waitForTimeout(500);
    await page.locator('#next').click(); await expect(page.locator('#game-shell')).toHaveAttribute('data-level', 'c22');
    await page.waitForTimeout(1300); await removeUntil(page, levels[21].arrows.length - 3, 500);
  });
  await page.locator('#choose-field').click(); await context.storageState({ path: resolve(output, 'actual-playthrough-21.storage.json') });
  const html = await readFile('dist/index.html', 'utf8'), entry = html.match(/src="\.\/([^\"]+\.js)"/)[1];
  await writeFile(resolve(output, 'capture-manifest.json'), JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    provenance: 'Actual production browser, RU, 390x844. The genuine unedited 19-win Stage C playthrough migrates normally; c20 and c21 are then earned entirely by ordinary touch input. No fake wins/rewards or pixel edits. Not physical-device evidence.',
    storageSha256: createHash('sha256').update(await readFile(sourceStorage)).digest('hex'), entry, entrySha256: createHash('sha256').update(await readFile(`dist/${entry}`)).digest('hex'), records }, null, 2));
  console.info(records); await context.close();
} finally { await browser.close(); server.kill('SIGTERM'); }
