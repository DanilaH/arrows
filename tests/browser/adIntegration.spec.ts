import { test, expect } from '@playwright/test';
import { build } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
let code = '';
test.beforeAll(async () => {
  const result = await build({ configFile: false, publicDir: false, logLevel: 'silent', build: { write: false, minify: false, lib: { entry: resolve('tests/fixtures/adIntegration.ts'), name: 'AdIntegration', formats: ['iife'] } } });
  const output = Array.isArray(result) ? result[0] : result;
  if (!('output' in output!)) throw Error('Missing test bundle');
  code = output.output.find(item => item.type === 'chunk')!.code;
});
test.beforeEach(async ({ page }) => {
  const html = `<html lang="ru"><head><style>${readFileSync('src/style.css', 'utf8')}\n${readFileSync('src/themes.css', 'utf8')}</style></head><body><button id="begin" onclick="adFixture.start()">Start test request</button><dialog id="ad-dialog" aria-labelledby="ad-title"></dialog></body></html>`;
  await page.route('**/__ad-fixture', route => route.fulfill({ contentType: 'text/html', body: html })); await page.goto('/__ad-fixture');
  await page.addScriptTag({ content: code });
});
test('shows loading/cancel UI and returns to the transition once cancellation is confirmed', async ({ page }) => {
  await page.locator('#begin').click(); await expect(page.locator('#ad-dialog')).toBeVisible(); await expect(page.locator('#ad-title')).toHaveText('Загружаем видео…');
  await page.locator('#ad-cancel').click(); await expect(page.locator('#ad-dialog')).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, 'adFixture').snapshot().advances)).toBe(1);
});
test('cannot close an invoked ad from Escape and waits for foreground after dismissal', async ({ page }) => {
  await page.locator('#begin').click(); await page.evaluate(() => Reflect.get(window, 'adFixture').shown());
  await expect(page.locator('#ad-cancel')).not.toBeVisible(); await page.keyboard.press('Escape'); await expect(page.locator('#ad-dialog')).toBeVisible();
  await page.evaluate(() => { const fixture = Reflect.get(window, 'adFixture'); fixture.background(true); fixture.dismiss(); });
  await expect(page.locator('#ad-dialog')).not.toBeVisible(); expect(await page.evaluate(() => Reflect.get(window, 'adFixture').snapshot().advances)).toBe(0);
  await page.evaluate(() => Reflect.get(window, 'adFixture').background(false)); await expect.poll(() => page.evaluate(() => Reflect.get(window, 'adFixture').snapshot().advances)).toBe(1);
});
test('keeps pending-ad UI within a short landscape viewport in the light theme', async ({ page }) => {
  await page.setViewportSize({ width: 780, height: 360 }); await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; document.documentElement.lang = 'en'; });
  await page.locator('#begin').click(); await expect(page.locator('#ad-title')).toHaveText('Loading video…');
  expect(await page.locator('#ad-dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true); await expect(page.locator('#ad-cancel')).toBeInViewport();
});
