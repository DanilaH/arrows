import { build } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

let bundle: Promise<{ html: string; code: string }> | undefined;
export async function openAssistanceReview(page: Page): Promise<void> {
  bundle ??= (async () => {
    const result = await build({ configFile: false, publicDir: false, logLevel: 'silent', build: {
      write: false, minify: true, target: 'es2022', lib: { entry: resolve('tests/fixtures/assistanceReview.ts'), name: 'AssistanceReview', formats: ['iife'] },
    } });
    const output = Array.isArray(result) ? result[0] : result;
    if (!output || !('output' in output)) throw Error('Missing review bundle');
    const code = output.output.find(item => item.type === 'chunk')?.code;
    if (!code) throw Error('Missing review entry');
    const css = output.output.flatMap(item => item.type === 'asset' && item.fileName.endsWith('.css') ? [item.source] : []).join('\n');
    const html = readFileSync('index.html', 'utf8').replace(/<script type="module" src="\/src\/main.ts"><\/script>/, '<script defer src="/__assistance-review.js"></script>').replace('</head>', `<style>${css}</style></head>`);
    return { html, code };
  })();
  const built = await bundle;
  await page.route('**/__assistance-review.js', route => route.fulfill({ contentType: 'text/javascript', body: built.code }));
  await page.route('**/__assistance-review', route => route.fulfill({ contentType: 'text/html', body: built.html }));
  await page.goto('/__assistance-review');
}
