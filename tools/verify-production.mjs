import { readFile, readdir } from 'node:fs/promises';
const scripts = (await readdir('dist/assets')).filter(name => name.endsWith('.js'));
const forbidden = ['dailyEntryFixture', 'nightmare-butterfly', 'hard-flower', '__control-review', 'adFixture', 'test-owned-attempt', 'assistanceFixture', '__assistance-review', 'Test reward transport', 'archiveBrowserFixture', '__archive-review', 'archiveReview'];
if(process.argv.includes('--release')){
  const root=await readdir('dist'),meta=JSON.parse(await readFile('dist/arrows-build.json','utf8'));
  if(meta.channel!=='release'||root.includes('target-lab.html')||root.includes('content-pilot.html'))throw Error('Release includes laboratory entry points or wrong build channel');
  forbidden.push('Тестирование помощи','Assistance playtest','target-lab-open','content-pilot-open');
}
for (const name of scripts) {
  const code = await readFile(`dist/assets/${name}`, 'utf8');
  for (const marker of forbidden) if (code.includes(marker)) throw Error(`Test-only content in production: ${marker}`);
}
console.info('Production payload excludes control catalogue and isolated test harnesses.');
