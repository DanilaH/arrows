import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { markSvg, markVector, colors } from './art.mjs';

const check = process.argv.includes('--check'), root = resolve(import.meta.dirname, '../..');
const res = 'native/android/app/src/main/res';
const obsolete = (await readdir(resolve(root, res), { recursive: true })).filter(path => /(?:^|\/)(?:splash\.png|ic_launcher(?:_round|_foreground)?\.png|ic_launcher_(?:foreground|background)\.xml)$/.test(path));
if (obsolete.length) throw Error(`Obsolete default brand resources remain: ${obsolete.join(', ')}`);
const adaptive = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@drawable/arrows_icon_background"/><foreground android:drawable="@drawable/arrows_launcher_foreground"/><monochrome android:drawable="@drawable/arrows_launcher_foreground"/></adaptive-icon>\n`;
const bitmap = name => `<?xml version="1.0" encoding="utf-8"?>\n<bitmap xmlns:android="http://schemas.android.com/apk/res/android" android:src="@drawable/${name}" android:gravity="fill" android:filter="true"/>\n`;
const files = new Map([
  ['public/brand-mark.svg', markSvg()], ['public/favicon.svg', markSvg({ background: true, mask: 'rounded' })],
  ['assets/brand/icon.svg', markSvg({ background: true })],
  [`${res}/drawable/arrows_mark.xml`, markVector()],
  [`${res}/drawable/arrows_mark_monochrome.xml`, markVector({ layer: 'monochrome' })],
  [`${res}/drawable/arrows_splash_mark.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:width="288dp" android:height="288dp"><inset android:drawable="@drawable/arrows_round_icon" android:inset="48dp"/></item></layer-list>\n`],
  [`${res}/drawable/arrows_icon_background.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android"><gradient android:type="radial" android:centerX="0.65" android:centerY="0.3" android:gradientRadius="65%p" android:startColor="#240652" android:centerColor="#10032f" android:endColor="#08031b"/></shape>\n`],
  [`${res}/drawable/arrows_launcher_foreground.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<inset xmlns:android="http://schemas.android.com/apk/res/android" android:drawable="@drawable/arrows_launcher_art" android:inset="16%"/>\n`],
  [`${res}/drawable-nodpi/arrows_launcher_art.png`, await readFile(resolve(root,'assets/brand/launcher-foreground.png'))],
  [`${res}/drawable-nodpi/arrows_round_icon.png`, await readFile(resolve(root,'assets/brand/launcher-round.png'))],
  [`${res}/drawable-nodpi/arrows_store_icon.png`, await readFile(resolve(root,'assets/brand/store-icon.png'))],
  ['public/favicon.png', await readFile(resolve(root,'assets/brand/store-icon.png'))],
  [`${res}/mipmap-anydpi/ic_launcher.xml`, bitmap('arrows_store_icon')],
  [`${res}/mipmap-anydpi/ic_launcher_round.xml`, bitmap('arrows_round_icon')],
  [`${res}/mipmap-anydpi-v26/ic_launcher.xml`, adaptive], [`${res}/mipmap-anydpi-v26/ic_launcher_round.xml`, adaptive],
  [`${res}/values/arrows_brand.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="arrows_launch_background">${colors.background}</color></resources>\n`],
]);
for (const [relative, content] of files) {
  const path = resolve(root, relative);
  if (check) { if (!(await readFile(path).catch(() => Buffer.alloc(0))).equals(Buffer.from(content))) throw Error(`Brand resource drift: ${relative}; run npm run brand:generate`); }
  else { await mkdir(dirname(path), { recursive: true }); await writeFile(path, content); }
}
console.info(`${check ? 'Checked' : 'Generated'} ${files.size} shared brand resources.`);
