import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { markSvg, markVector, colors } from './art.mjs';

const check = process.argv.includes('--check'), root = resolve(import.meta.dirname, '../..');
const res = 'native/android/app/src/main/res';
const obsolete = (await readdir(resolve(root, res), { recursive: true })).filter(path => /(?:^|\/)(?:splash\.png|ic_launcher(?:_round|_foreground)?\.png|ic_launcher_(?:foreground|background)\.xml)$/.test(path));
if (obsolete.length) throw Error(`Obsolete default brand resources remain: ${obsolete.join(', ')}`);
const adaptive = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@drawable/arrows_icon_background"/><foreground android:drawable="@drawable/arrows_mark"/><monochrome android:drawable="@drawable/arrows_mark_monochrome"/></adaptive-icon>\n`;
const files = new Map([
  ['public/brand-mark.svg', markSvg()], ['public/favicon.svg', markSvg({ background: true, mask: 'rounded' })],
  ['assets/brand/icon.svg', markSvg({ background: true })],
  [`${res}/drawable/arrows_mark.xml`, markVector()],
  [`${res}/drawable/arrows_mark_monochrome.xml`, markVector({ layer: 'monochrome' })],
  [`${res}/drawable/arrows_splash_mark.xml`, markVector({ size: 288 })],
  [`${res}/drawable/arrows_icon_background.xml`, markVector({ layer: 'background' })],
  [`${res}/mipmap-anydpi/ic_launcher.xml`, markVector({ layer: 'combined', mask: 'rounded' })],
  [`${res}/mipmap-anydpi/ic_launcher_round.xml`, markVector({ layer: 'combined', mask: 'circle' })],
  [`${res}/mipmap-anydpi-v26/ic_launcher.xml`, adaptive], [`${res}/mipmap-anydpi-v26/ic_launcher_round.xml`, adaptive],
  [`${res}/values/arrows_brand.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="arrows_launch_background">${colors.background}</color></resources>\n`],
]);
for (const [relative, content] of files) {
  const path = resolve(root, relative);
  if (check) { if (await readFile(path, 'utf8').catch(() => '') !== content) throw Error(`Brand resource drift: ${relative}; run npm run brand:generate`); }
  else { await mkdir(dirname(path), { recursive: true }); await writeFile(path, content); }
}
console.info(`${check ? 'Checked' : 'Generated'} ${files.size} shared brand resources.`);
