import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const output = resolve(process.argv[2] ?? '.test-output/stage-c-gifs');
await mkdir(output, { recursive: true });
const fields = JSON.parse(await readFile('src/content/campaign.json', 'utf8'));
const daily = JSON.parse(await readFile('src/content/daily.json', 'utf8'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4189', '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true });
const records = [], options = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ru-RU' };
const ready = page => page.locator('#game-shell[data-status=ready][data-progress=ready]').waitFor();
async function tap(page, arrow) {
  const c = JSON.parse(await page.locator('#game-root').getAttribute('data-camera')), h = arrow.path.at(-1);
  await page.touchscreen.tap(c.x + h.x * c.scale, c.y + h.y * c.scale);
}
function clear(arrow, remaining) {
  const h = arrow.path.at(-1), before = arrow.path.at(-2), dx = Math.sign(h.x - before.x), dy = Math.sign(h.y - before.y);
  return !remaining.some(other => other !== arrow && other.path.slice(1).some((b, i) => {
    const a = other.path[i], n = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    for (let j = 0; j <= n; j++) {
      const x = a.x + Math.sign(b.x - a.x) * j, y = a.y + Math.sign(b.y - a.y) * j;
      if (dx && y === h.y && (x - h.x) * dx > 0 || dy && x === h.x && (y - h.y) * dy > 0) return true;
    }
    return false;
  }));
}
async function removeUntil(page, level, count = 0) {
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('arrows.progress.v1')));
  const attempt = saved.campaign.level.id === level.id ? saved.campaign : Object.values(saved.daily).find(a => a.level.id === level.id);
  const remaining = level.arrows.filter(a => !attempt.board.removed.includes(a.id));
  while (remaining.length > count) {
    const index = remaining.findIndex(a => clear(a, remaining)); if (index < 0) throw Error('No legal arrow');
    await tap(page, remaining[index]); remaining.splice(index, 1);
    await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', String(remaining.length));
  }
}
async function capture(name, storage, setup, action) {
  const context = await browser.newContext({ ...options, ...(storage ? { storageState: storage } : {}), recordVideo: { dir: output, size: options.viewport } });
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4189'); await ready(page);
  await setup(page); await page.waitForTimeout(450);
  // Explicit screenshots retain short DOM-only menu changes even while the game renderer sleeps.
  const framesDir = resolve(output, `${name}-frames`); await mkdir(framesDir, { recursive: true });
  const frames = []; let recording = true;
  const frameLoop = (async () => {
    while (recording) {
      const stamp = Date.now(), filename = `${String(frames.length).padStart(4, '0')}.png`;
      await page.screenshot({ path: resolve(framesDir, filename), type: 'png' }); frames.push({ filename, stamp });
      await page.waitForTimeout(Math.max(0, 65 - (Date.now() - stamp)));
    }
  })();
  await page.waitForTimeout(600); await action(page); await page.waitForTimeout(950);
  recording = false; await frameLoop;
  const duration = (frames.at(-1).stamp - frames[0].stamp) / 1000, video = page.video();
  const ending = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('arrows.progress.v1')); return s && { index: s.index, wins: s.wins.length, dailyWins: Object.keys(s.dailyWins), cups: s.cups, screen: document.querySelector('#game-shell').dataset.screen }; });
  await context.close(); const input = await video.path(), target = resolve(output, name + '.gif');
  const list = frames.map((frame, i) => `file '${frame.filename}'\nduration ${Math.max(.02, ((frames[i + 1]?.stamp ?? frame.stamp + 65) - frame.stamp) / 1000)}`).join('\n') + `\nfile '${frames.at(-1).filename}'\n`;
  const listPath = resolve(framesDir, 'frames.txt'); await writeFile(listPath, list);
  const filter = 'fps=18,scale=360:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listPath, '-vf', filter, '-loop', '0', target]);
  records.push({ name, file: target, video: input, duration, frameMode: 'timestamped actual page screenshots', ending });
}
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch('http://127.0.0.1:4189')).ok) break; } catch {} if (i === 59) throw Error('Preview unavailable'); await new Promise(r => setTimeout(r, 100)); }
  await capture('arrows-home', null, async () => {}, async page => {
    await page.locator('#home-play').click(); await page.waitForTimeout(550); await tap(page, fields[0].arrows[0]);
    await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '2'); await page.waitForTimeout(600);
    await page.locator('#choose-field').click(); await page.waitForTimeout(1100); await page.locator('#home-play').click();
    await expect(page.locator('#game-shell')).toHaveAttribute('data-remaining', '2');
  });
  if (process.argv[3] !== 'home') {
  // Earn the unlock through normal touch gameplay. The exported storage is never edited or synthesized.
  const prepared = await browser.newContext(options), page = await prepared.newPage();
  await page.goto('http://127.0.0.1:4189'); await ready(page); await page.locator('#home-play').click();
  for (let index = 0; index < 19; index++) {
    await expect(page.locator('#game-shell')).toHaveAttribute('data-level', fields[index].id); await page.waitForTimeout(420);
    if (index === 3) await page.locator('#guides').click();
    await removeUntil(page, fields[index]); await expect(page.locator('#win')).toBeVisible(); await page.locator('#next').click();
    if (index % 3 === 0) console.info(`Actual campaign playthrough: ${index + 1}/19`);
  }
  await page.locator('#choose-field').click();
  const savedPath = resolve(output, 'actual-playthrough.storage.json'); await prepared.storageState({ path: savedPath }); await prepared.close();
  await capture('arrows-collection', savedPath, async () => {}, async page => {
    await page.locator('#home-collection').click(); await page.waitForTimeout(1200);
    await page.locator('#meta-screen').evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })); await page.waitForTimeout(1000);
    await page.locator('[data-month="2026-11"]').click(); await page.waitForTimeout(750);
  });
  const dates = Object.keys(daily).filter(d => d <= new Date().toLocaleDateString('sv-SE')).sort(), day = dates.at(-1);
  if (!day) throw Error('No date currently available');
  await capture('arrows-daily', savedPath, async page => {
    await page.locator('#home-calendar').click(); await page.locator(`[data-date="${day}"]`).click(); await page.locator('#start-daily').click();
    await page.waitForTimeout(450); await removeUntil(page, daily[day], 3);
  }, async page => {
    await removeUntil(page, daily[day]); await expect(page.locator('#win')).toBeVisible(); await page.waitForTimeout(650);
    await page.locator('#next').click(); await expect(page.locator(`[data-date="${day}"]`)).toHaveClass(/done/);
  });
  }
  const assetHashes = {};
  for (const name of await readdir('dist/assets')) assetHashes[name] = createHash('sha256').update(await readFile(`dist/assets/${name}`)).digest('hex');
  await writeFile(resolve(output, 'capture-manifest.json'), JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    provenance: 'Actual production-browser gameplay in Chromium mobile emulation. First 19 campaign wins earned by normal touch input before exporting/restoring that unedited browser storage for clips. No injected gameplay state, fake achievements, rewards or altered gameplay pixels. Not physical-phone performance evidence.',
    viewport: options.viewport, locale: options.locale, assetHashes, records }, null, 2));
  console.info(records.map(({ name, duration, file }) => ({ name, duration, file })));
} finally { await browser.close(); server.kill('SIGTERM'); }
