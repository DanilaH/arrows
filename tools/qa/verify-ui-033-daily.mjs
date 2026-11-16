// Supplementary actual-APK daily overview/save isolation check.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { controlledNative } from './assistance-native-transport.mjs';
import { activeSave } from './ui-033-state.mjs';

const root = '.test-output/ui-033', port = 4284;
const provenance = JSON.parse(await readFile(`${root}/capture-manifest.json`, 'utf8'));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', `${root}/web`, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
const browser = await chromium.launch();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors = [];
try {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) break; } catch {}
    await sleep(100);
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true, timezoneId: 'Asia/Yekaterinburg' });
  await context.addInitScript(controlledNative, { save: activeSave(39), preserve: true, settings: { version: 1, language: 'ru', theme: 'dark', sound: false, vibration: false } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-11-16T12:00:00+05:00'));
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('arrows.progress.v1')));
  const camera = async () => JSON.parse(await page.locator('#game-root').getAttribute('data-camera'));
  const settle = async () => {
    await page.waitForFunction(() => !document.querySelector('.route-snapshot,.board-transition'));
    await sleep(350);
  };
  await page.goto(`http://127.0.0.1:${port}`);
  await page.locator('#home-calendar:enabled').waitFor();
  await settle();
  const initialCampaign = (await saved()).campaign;
  await page.locator('#home-calendar').click();
  await settle();
  await page.locator('#start-daily:enabled').click();
  await page.waitForFunction(() => document.querySelector('#game-shell').dataset.mode === 'daily' && document.querySelector('#hint').getClientRects().length > 0);
  await settle();
  const initial = await saved(), daily = initial.daily['2026-11-16'];
  assert(daily.level.arrows.length >= 200, 'Must exercise current large daily rather than a legacy small fixture');
  assert.equal(daily.level.contentVersion, 3);
  const fit = await camera();
  await page.mouse.move(195, 422);
  await page.mouse.wheel(0, -1000);
  await page.locator('#board-overview:visible').waitFor();
  await sleep(200);
  await page.locator('#board-overview').click();
  await page.locator('#board-overview').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('arrows.progress.v1')).daily['2026-11-16'].view?.zoom === 1);
  const finalCamera = await camera(), after = await saved();
  for (const key of ['x', 'y', 'scale']) assert(Math.abs(fit[key] - finalCamera[key]) < 1e-6, key);
  assert.deepEqual(after.daily['2026-11-16'].board, daily.board);
  assert.deepEqual(after.campaign, initialCampaign, 'Daily overview must not write the campaign attempt/view');
  await page.locator('#choose-field').click();
  await settle();
  await page.reload();
  await page.locator('#home-calendar:enabled').waitFor();
  await settle();
  await page.locator('#home-calendar').click();
  await settle();
  await page.locator('#start-daily:enabled').click();
  await page.waitForFunction(() => document.querySelector('#game-shell').dataset.mode === 'daily' && document.querySelector('#hint').getClientRects().length > 0);
  await settle();
  const resumed = (await saved()).daily['2026-11-16'];
  assert.equal(resumed.board.id, daily.board.id);
  assert.deepEqual(resumed.board, daily.board);
  assert.equal(resumed.view.zoom, 1);
  assert.deepEqual(errors, []);
  const result = { status: 'PASS', source: provenance.source, apkSha256: provenance.apkSha256, date: '2026-11-16', arrows: daily.level.arrows.length, contentVersion: daily.level.contentVersion, realWorkerOrCooperativeClient: true, actualWheelAndOverviewButton: true, fit, finalCamera, campaignUnchanged: true, dailyBoardUnchanged: true, sameAttemptAfterReload: true, persistedZoom: resumed.view.zoom, errors, method: 'Actual signed APK web in Chromium; prepared campaign progress/controlled native transport; no ad/help used; not phone evidence' };
  await writeFile(`${root}/daily-overview.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
  server.kill();
}
