import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const storage = resolve(process.argv[2] ?? ''), output = resolve(process.argv[3] ?? '.test-output/ad-fallback-gif');
if (!process.argv[2]) throw Error('Supply an unedited storage export earned through genuine play');
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4189', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true });
function clear(arrow, remaining) {
  const h = arrow.path.at(-1), before = arrow.path.at(-2), dx = Math.sign(h.x - before.x), dy = Math.sign(h.y - before.y);
  return !remaining.some(other => other !== arrow && other.path.slice(1).some((b, i) => {
    const a = other.path[i], n = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    for (let j = 0; j <= n; j++) { const x = a.x + Math.sign(b.x - a.x) * j, y = a.y + Math.sign(b.y - a.y) * j; if (dx && y === h.y && (x - h.x) * dx > 0 || dy && x === h.x && (y - h.y) * dy > 0) return true; }
    return false;
  }));
}
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch('http://127.0.0.1:4189')).ok) break; } catch {} if (i === 59) throw Error('Preview unavailable'); await new Promise(r => setTimeout(r, 100)); }
  const context = await browser.newContext({ storageState: storage, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' });
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4189'); await page.locator('#game-shell[data-status=ready][data-progress=ready]').waitFor(); await page.locator('#home-play').click(); await page.waitForTimeout(500);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('arrows.progress.v1'))), a = before.campaign;
  const remaining = a.level.arrows.filter(arrow => !a.board.removed.includes(arrow.id)), blocked = remaining.filter(arrow => !a.board.errors.includes(arrow.id) && !clear(arrow, remaining)).slice(0, 6);
  if (blocked.length !== 6 || a.board.lives !== 3 || a.freeUsed) throw Error('Need a genuine untouched large attempt');
  const framesDir = resolve(output, 'frames'); await mkdir(framesDir, { recursive: true }); const frames = []; let recording = true;
  const loop = (async () => { while (recording) {
    const at = Date.now(), file = `${String(frames.length).padStart(4, '0')}.png`; await page.screenshot({ path: resolve(framesDir, file), type: 'png' }); frames.push({ at, file }); await page.waitForTimeout(Math.max(0, 65 - (Date.now() - at)));
  } })();
  const tap = async arrow => { const c = JSON.parse(await page.locator('#game-root').getAttribute('data-camera')), h = arrow.path.at(-1); await page.touchscreen.tap(c.x + h.x * c.scale, c.y + h.y * c.scale); await page.waitForTimeout(220); };
  await page.waitForTimeout(600); for (const arrow of blocked.slice(0, 3)) await tap(arrow);
  await expect(page.locator('#game-dialog')).toBeVisible(); await page.waitForTimeout(500); await page.locator('[data-action="free-continue"]').click(); await expect(page.locator('#game-shell')).toHaveAttribute('data-lives', '3');
  await page.waitForTimeout(500); for (const arrow of blocked.slice(3)) await tap(arrow);
  await page.waitForTimeout(550); await page.locator('[data-action="rewarded-continue"]').click(); await expect(page.locator('#dialog-content')).toContainText('Видео сейчас недоступно'); await page.waitForTimeout(1300);
  recording = false; await loop;
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('arrows.progress.v1')));
  if (after.receipts.length !== before.receipts.length || after.campaign.board.id !== a.board.id || JSON.stringify(after.campaign.board.removed) !== JSON.stringify(a.board.removed) || after.campaign.board.lives !== 0) throw Error('Unavailable video altered earned state');
  const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(.02, ((frames[i + 1]?.at ?? f.at + 65) - f.at) / 1000)}`).join('\n') + `\nfile '${frames.at(-1).file}'\n`;
  await writeFile(resolve(framesDir, 'frames.txt'), list);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', resolve(framesDir, 'frames.txt'), '-vf', 'fps=18,scale=390:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle', '-loop', '0', resolve(output, 'arrows-video-unavailable.gif')]);
  const html = await readFile('dist/index.html', 'utf8'), entry = html.match(/src="\.\/([^\"]+\.js)"/)[1];
  await writeFile(resolve(output, 'capture-manifest.json'), JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), provenance: 'Actual production browser UI, 390x844 RU. Unedited genuine 19-level playthrough export, normal touch input. Shows the unavailable-video path, not a real ad or SDK earned proof. No injected wins, receipts or fabricated rewards.', entry, entry_sha256: createHash('sha256').update(await readFile(`dist/${entry}`)).digest('hex'), storage_sha256: createHash('sha256').update(await readFile(storage)).digest('hex'), frames: frames.length, duration_ms: frames.at(-1).at - frames[0].at, attempt_preserved: after.campaign.board.id === a.board.id, receipts_before: before.receipts.length, receipts_after: after.receipts.length, lives_after: after.campaign.board.lives }, null, 2));
  await context.close(); console.info('Captured real unavailable-video path');
} finally { await browser.close(); server.kill('SIGTERM'); }
