// Project-owned geometry. One source for browser, Android layers and store export.
export const colors = { background: '#1e1e2c', top: '#393551', bottom: '#181824' };
export const arrows = [
  { color: '#f0efff', path: 'M29 55V42H53V28', head: 'M46 31L53 22L60 31Z' },
  { color: '#bcb6ff', path: 'M77 41V53H43V68', head: 'M36 65L43 74L50 65Z' },
  { color: '#8674ff', path: 'M42 80H61V65H78', head: 'M75 58L84 65L75 72Z' },
];
const dots = Array.from({ length: 6 }, (_, y) => Array.from({ length: 6 }, (_, x) => ({ x: 24 + x * 12, y: 24 + y * 12 }))).flat();
export function markSvg({ background = false, mask = 'square', monochrome = false } = {}) {
  const paths = arrows.map(a => `<path d="${a.path}" stroke="${monochrome ? '#ffffff' : a.color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="${a.head}" fill="${monochrome ? '#ffffff' : a.color}"/>`).join('');
  const bg = background ? `<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${colors.top}"/><stop offset="1" stop-color="${colors.bottom}"/></linearGradient></defs><rect width="108" height="108" fill="url(#bg)"/>${dots.map(p => `<circle cx="${p.x}" cy="${p.y}" r=".7" fill="#d9d3ff" opacity=".13"/>`).join('')}` : '';
  const clip = mask === 'circle' ? '<circle cx="54" cy="54" r="54"/>' : mask === 'rounded' ? '<rect width="108" height="108" rx="25"/>' : '<rect width="108" height="108"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108"><defs><clipPath id="mask">${clip}</clipPath></defs><g clip-path="url(#mask)">${bg}<g${background ? ' transform="translate(-27 -27) scale(1.5)"' : ''}>${!monochrome ? `<g transform="translate(0 1.3)" opacity=".22">${arrows.map(a => `<path d="${a.path}" fill="none" stroke="#090917" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="${a.head}" fill="#090917"/>`).join('')}</g>` : ''}${paths}</g></g></svg>\n`;
}
const backgroundPath = mask => mask === 'circle' ? 'M54 0A54 54 0 1 1 54 108A54 54 0 1 1 54 0Z' : mask === 'rounded' ? 'M25 0H83Q108 0 108 25V83Q108 108 83 108H25Q0 108 0 83V25Q0 0 25 0Z' : 'M0 0H108V108H0Z';
export function markVector({ layer = 'foreground', mask = 'square', size = 108 } = {}) {
  const background = layer === 'background' || layer === 'combined';
  const foreground = layer !== 'background', monochrome = layer === 'monochrome';
  const bg = background ? `<path android:pathData="${backgroundPath(mask)}"><aapt:attr name="android:fillColor"><gradient android:type="linear" android:startX="0" android:startY="0" android:endX="108" android:endY="108" android:startColor="${colors.top}" android:endColor="${colors.bottom}"/></aapt:attr></path>${dots.map(p => `<path android:pathData="M${p.x - .7} ${p.y}a.7 .7 0 1 0 1.4 0a.7 .7 0 1 0 -1.4 0" android:fillColor="#d9d3ff" android:fillAlpha="0.13"/>`).join('')}` : '';
  const paths = foreground ? arrows.map(a => `<path android:pathData="${a.path}" android:strokeColor="${monochrome ? '#ffffff' : a.color}" android:strokeWidth="7" android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="@android:color/transparent"/><path android:pathData="${a.head}" android:fillColor="${monochrome ? '#ffffff' : a.color}"/>`).join('') : '';
  const shadow = foreground && !monochrome ? `<group android:translateY="1.3">${arrows.map(a => `<path android:pathData="${a.path}" android:strokeColor="#090917" android:strokeAlpha="0.22" android:strokeWidth="8" android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="@android:color/transparent"/><path android:pathData="${a.head}" android:fillColor="#090917" android:fillAlpha="0.22"/>`).join('')}</group>` : '';
  return `<?xml version="1.0" encoding="utf-8"?>\n<!-- Generated from tools/brand/art.mjs; run npm run brand:generate. -->\n<vector xmlns:android="http://schemas.android.com/apk/res/android" xmlns:aapt="http://schemas.android.com/aapt" android:width="${size}dp" android:height="${size}dp" android:viewportWidth="108" android:viewportHeight="108">${bg}<group${layer === 'combined' ? ' android:pivotX="54" android:pivotY="54" android:scaleX="1.5" android:scaleY="1.5"' : ''}>${shadow}${paths}</group></vector>\n`;
}
