import { readFile, readdir } from 'node:fs/promises';
const scripts = (await readdir('dist/assets')).filter(name => name.endsWith('.js'));
const forbidden = ['nightmare-butterfly', 'hard-flower', '__control-review', 'adFixture', 'test-owned-attempt'];
for (const name of scripts) {
  const code = await readFile(`dist/assets/${name}`, 'utf8');
  for (const marker of forbidden) if (code.includes(marker)) throw Error(`Test-only content in production: ${marker}`);
}
console.info('Production payload excludes control catalogue and isolated test harnesses.');
