import { trophyCatalog, validTrophyBinding } from '../content/trophies';
import type { TrophyBinding } from '../domain/trophy';
import { legacyTrophy } from './trophies-v1';

// Published v2 geometry/material libraries. New style revisions get their own version.
const bodies = [
  'M42 42H118L111 76Q106 99 80 111Q54 99 49 76Z',
  'M43 42H117Q111 55 116 71Q119 91 95 104L80 112L65 104Q41 91 44 71Q49 55 43 42Z',
  'M40 42H120V69Q120 99 80 111Q40 99 40 69Z',
  'M39 42H121L114 73L102 93L80 112L58 93L46 73Z',
  'M42 42H118Q126 61 112 77Q119 96 80 111Q41 96 48 77Q34 61 42 42Z',
  'M43 42H117L111 57L117 70L104 91L80 112L56 91L43 70L49 57Z',
  'M44 42H116L111 82Q108 101 80 111Q52 101 49 82Z',
  'M34 42H126Q124 72 104 82L80 109L56 82Q36 72 34 42Z',
  'M41 42H119L125 60L105 90L80 112L55 90L35 60Z',
  'M42 42H118V75Q114 94 80 112Q46 94 42 75Z',
  'M43 42H117Q110 61 117 79Q120 95 80 111Q40 95 43 79Q50 61 43 42Z',
  'M42 42H118L123 57Q113 68 116 79Q104 86 104 94Q92 100 80 111Q68 100 56 94Q56 86 44 79Q47 68 37 57Z',
  'M43 42H117L108 54Q124 72 111 90Q100 103 80 111Q60 103 49 90Q36 72 52 54Z',
  'M44 42H116L110 70L104 76L103 93L80 112L57 93L56 76L50 70Z',
  'M42 42H118Q110 52 117 65Q128 86 104 100L80 111L56 100Q32 86 43 65Q50 52 42 42Z',
  'M43 42H117L109 61L108 80L95 101L80 112L65 101L52 80L51 61Z',
] as const;
const handles = [
  'M43 48H23Q12 48 18 68Q24 88 66 88L64 80Q31 79 27 65Q23 55 43 57Z',
  'M43 48L18 44L20 69L38 88L66 84L62 78L30 63L29 55L43 57Z',
  'M43 48Q10 33 16 62Q21 85 66 89L64 81Q28 78 25 63Q22 47 43 58Z',
  'M43 48Q22 44 17 58Q11 77 66 92L64 83Q30 75 26 64Q25 55 43 57Z',
  'M43 47L12 43L23 56L10 58L29 69L22 72L66 89L64 80L36 65L33 55L43 57Z',
  'M43 48Q13 34 15 58Q16 74 34 76Q24 65 32 61Q37 59 43 60L47 67Q28 89 66 91L64 82Q43 81 50 68L48 54Z',
  'M43 48L24 42L12 57L23 78L66 88L64 81L30 71L23 58L27 52L43 57Z',
  'M43 48Q19 40 14 53Q9 66 28 69Q39 70 32 77L26 83L66 91L64 82L39 78Q47 63 30 62Q20 61 24 55Q28 51 43 58Z',
] as const;
const metals = [
  ['#53301b', '#946132', '#d8a653', '#fff0ba', '#fff9dd'],
  ['#243346', '#536b87', '#a6c5dc', '#e9f4ff', '#ffffff'],
  ['#52302e', '#996359', '#dba084', '#ffe0bd', '#fff3de'],
  ['#283e38', '#4b7c67', '#8cb99a', '#e6edb6', '#fff5dc'],
  ['#4a2d48', '#89576d', '#d796b5', '#ffd5de', '#fff0ed'],
  ['#252b39', '#485268', '#8491ab', '#d6dcec', '#f6f4ff'],
  ['#514220', '#92854a', '#d4c584', '#fff3bc', '#fff9df'],
  ['#294349', '#557c80', '#9dc3c1', '#e6f4df', '#f8fff5'],
  ['#37324e', '#746e9c', '#b5b0d5', '#f1e9fa', '#fffaff'],
  ['#51402c', '#9c8763', '#ddcfab', '#fff5d7', '#fffdf1'],
] as const;
const gems = [
  ['#092d47', '#3198ca', '#c0f5ff'], ['#173b39', '#3db4a0', '#b4ffe1'],
  ['#39234e', '#9b68d0', '#f0c7ff'], ['#521f30', '#c34c6a', '#ffb5c6'],
  ['#403315', '#cfa33c', '#fff2af'], ['#193f27', '#67b56e', '#d7ffc3'],
  ['#22325a', '#617bce', '#d9e1ff'], ['#492b19', '#c98046', '#ffddb0'],
  ['#452649', '#ba76b6', '#ffd6fa'], ['#243a43', '#89b9c1', '#f0ffff'],
  ['#233b3a', '#80ad95', '#e3f4d4'], ['#31314c', '#a09bc8', '#f9eeff'],
] as const;
const seasons = [
  '<path d="M50 28v28M38 35l24 14m-24 0 24-14m-12-7-4 5m4-5 4 5m-4 23-4-5m4 5 4-5"/>',
  '<path d="M50 55 36 41c-8-12 8-19 14-9 7-10 22-3 14 9Z"/>',
  '<path d="M50 56V40m0 4c-13 0-15-10-14-14 11 0 16 4 14 14Zm0-6c0-9 7-13 15-12 0 10-4 15-15 12Z"/>',
  '<path d="M50 27c-3 6-13 15-13 22 0 16 26 16 26 0 0-7-10-16-13-22Zm-6 21c0 4 2 6 6 6"/>',
  '<circle cx="50" cy="43" r="4"/><path d="M46 37c-11-8 0-19 4-7 7-10 18 0 7 7 13 1 10 16-2 11 3 13-12 15-13 2-10 6-17-8-5-12Z"/>',
  '<circle cx="50" cy="43" r="8"/><path d="M50 27v5m0 22v5m-16-16h5m22 0h5M38 31l4 4m16 16 4 4m-24 0 4-4m16-16 4-4"/>',
  '<path d="M35 35c7-7 8 7 15 0s8 7 15 0M35 44c7-7 8 7 15 0s8 7 15 0M35 53c7-7 8 7 15 0s8 7 15 0"/>',
  '<path d="M50 58V28m0 9c-8 0-12-5-12-10 8 0 12 5 12 10Zm0 10c-8 0-13-5-13-10 9 0 13 5 13 10Zm0 9c-8 0-13-5-13-10 9 0 13 5 13 10Zm0-14c8 0 13-5 13-10-9 0-13 5-13 10Zm0 9c8 0 13-5 13-10-9 0-13 5-13 10Z"/>',
  '<path d="M38 40h24c0 11-6 17-12 19-6-2-12-8-12-19Zm-2 0c0-13 28-13 28 0H36Zm14-13 3-4m-12 12 4-4m10 4 4-4"/>',
  '<path d="M56 29c-19 1-21 24-3 28 4 0 9-2 12-6-16 3-23-12-9-22Z"/><path d="m63 27 1 4 4 1-4 2-1 4-2-4-4-2 4-1Z"/>',
  '<path d="M40 54c-2-16 10-23 21-24-2 13-6 22-21 24Zm0 0 16-18m-7 10 8 0m-11 3-1-7"/>',
  '<path d="M50 28v28m-13-21 26 14m-26 0 26-14m-13-7-4 5m4-5 4 5m-4 23-4-5m4 5 4-5M38 36v5m0-5 5-1m19 1v5m0-5-5-1"/>',
] as const;
function ornament(index: number, light: string, dark: string): string {
  const strokes = [
    Array.from({ length: 9 }, (_, i) => `<path d="M${48 + i * 8} 44Q${60 + i * 5} 76 ${74 + i * 1.5} 111"/>`).join(''),
    '<path d="m30 55 50 50 50-50m-100 15 50 50 50-50M45 39l50 50m-34-50 50 50m-50 0 50-50M45 89l50-50"/>',
    '<path d="M28 56Q80 72 132 56M32 65Q80 81 128 65M39 87Q80 103 121 87M48 98Q80 111 112 98"/>',
    '<path d="M42 72c-13-28 25-24 16-7-8 10-16-9-2-9m62 16c13-28-25-24-16-7 8 10 16-9 2-9M55 91c7 12 15 1 9-4m41 4c-7 12-15 1-9-4"/>',
    '<path d="M49 46v17l11 8V51m51-5v17l-11 8V51M61 95l19 10 19-10M39 77l15 9m67-9-15 9"/>',
    Array.from({ length: 7 }, (_, i) => `<path d="M${46 + i * 11} 39l-3 26 4 25"/>`).join(''),
    '<path d="m37 50 18 10-12 15 19 12m61-37-18 10 12 15-19 12M62 99l18-10 18 10"/>',
    '<path d="M40 56q13-12 22 0m36 0q9-12 22 0M39 63q15-12 25 0m32 0q10-12 25 0M56 92q24 13 48 0M61 99q19 10 38 0"/>',
  ];
  return `<g fill="none" stroke="${dark}" stroke-width="1.5" opacity=".4">${strokes[index]}</g><g fill="none" stroke="${light}" stroke-width=".65" opacity=".45" transform="translate(-.7,-.6)">${strokes[index]}</g>`;
}
function stem(index: number, metal: string, edge: string, gem: string): string {
  const variants = [
    '<path d="M76 109h8l-2 28 12 9H66l12-9Z"/><ellipse cx="80" cy="127" rx="9" ry="5"/>',
    '<path d="M75 109h10l4 9-6 12 7 15H70l7-15-6-12Z"/><path d="m76 118 8 12m0-12-8 12"/>',
    '<path d="M73 109h14v6H73Zm3 6h8v25h-8Zm-7 25h22v7H69Z"/><path d="M79 117v21"/>',
    '<path d="M73 109h14l-5 10 6 8-7 10 10 10H69l10-10-7-10 6-8Z"/>',
    '<path d="M71 109h18v6H71Zm1 6h5v25h-5Zm11 0h5v25h-5Zm-15 25h24v7H68Z"/>',
    '<path d="M75 109h10c-13 9-10 17 2 22 9 4 5 13 5 16H68c0-7 8-11 12-12-14-6-17-19-5-26Z"/>',
  ];
  return `<g fill="${metal}" stroke="${edge}" stroke-width="1">${variants[index]}</g><ellipse cx="80" cy="111" rx="10" ry="3" fill="${metal}" stroke="${edge}"/><path d="m80 121 4 5-4 5-4-5Z" fill="${gem}" stroke="${edge}" stroke-width=".7"/>`;
}
function base(index: number, metal: string, dark: string, light: string): string {
  const shapes = [
    '<path d="M65 144h30l6 7H59Zm-11 7h52v10H54Zm-8 10h68v10H46Z"/>',
    '<ellipse cx="80" cy="150" rx="22" ry="7"/><path d="M54 151h52v13q-26 12-52 0Z"/><ellipse cx="80" cy="165" rx="31" ry="8"/>',
    '<path d="M62 143h36l8 13 11 8-9 9H52l-9-9 11-8Z"/><path d="m62 143 5 19-15 11m46-30-5 19 15 11M67 162h26"/>',
    '<path d="M66 143h28l3 9h9l5 20H49l5-20h9Z"/><path d="M54 158h52M52 166h56"/>',
    '<path d="M63 144h34l12 9-3 19H54l-3-19Z"/><path d="m63 144 3 28m31-28-3 28M51 153h58"/>',
    '<path d="M63 143h34l4 8h10v7h-7v8h11v7H45v-7h11v-8h-7v-7h10Z"/>',
  ];
  return `<ellipse cx="80" cy="177" rx="43" ry="6" fill="#080d18" opacity=".4"/><g fill="${metal}" stroke="${light}" stroke-width="1">${shapes[index]}</g><path d="M51 172h58" stroke="${dark}" stroke-width="2"/><rect x="66" y="155" width="28" height="12" rx="2" fill="${dark}" stroke="${light}" stroke-width=".8"/>`;
}
export interface TrophyRenderOptions { binding?: TrophyBinding; scope?: string; }
export function trophy(month: string, earned = false, options: TrophyRenderOptions = {}): string {
  const binding = options.binding;
  if (binding && !validTrophyBinding(month, binding)) throw Error('Invalid frozen trophy binding');
  if (binding?.version === 1) return legacyTrophy(month, earned);
  const d = trophyCatalog[month]; if (!d) throw Error('Missing frozen trophy');
  const scope = options.scope ?? 'art'; if (!/^[a-zA-Z0-9_-]+$/.test(scope)) throw Error('Invalid trophy instance');
  const key = `t-${month}-${scope}-${earned ? 'won' : 'goal'}`, [dark, shade, mid, light, shine] = metals[d.metal]!, gem = gems[d.gem]!;
  const metal = `url(#${key}-metal)`, rim = `url(#${key}-rim)`, jewel = `url(#${key}-gem)`;
  const body = bodies[d.body]!, roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][Number(month.slice(-2)) - 1];
  const rimDecor = [
    '<ellipse cx="80" cy="42" rx="39" ry="5"/><path d="M45 42q35-5 70 0"/>',
    '<path d="m42 43-2-13 14 7 9-13 17 11 17-11 9 13 14-7-2 13Z"/>',
    '<path d="M42 38h76v8H42Z"/><path d="m48 39 4 5 4-5m4 0 4 5 4-5m4 0 4 5 4-5m4 0 4 5 4-5m4 0 4 5 4-5m4 0 4 5 4-5"/>',
    '<path d="M42 35h10v5h12v-5h12v5h8v-5h12v5h12v-5h10v10H42Z"/>',
    '<ellipse cx="80" cy="41" rx="39" ry="6"/><ellipse cx="80" cy="40" rx="32" ry="2"/>',
    '<path d="M42 40q10-14 19 0 10-16 19 0 9-16 19 0 9-14 19 0v6H42Z"/>',
  ][d.rim];
  const frame = d.emblem === 1 ? '<path d="m80 54 23 22-23 22-23-22Z"/>' : d.emblem === 2 ? '<path d="M60 56h40v24q-4 14-20 20-16-6-20-20Z"/>' : '<circle cx="80" cy="76" r="22"/>';
  const laurels = earned ? `<g fill="none" stroke="${light}" stroke-width="1.1" opacity=".8"><path d="M29 128q17-6 21-28m81 28q-17-6-21-28"/></g><g fill="${light}" opacity=".8">${[0,1,2,3,4].map(i => `<ellipse cx="${45 - i * 3}" cy="${105 + i * 4}" rx="2" ry="5" transform="rotate(-45 ${45 - i * 3} ${105 + i * 4})"/><ellipse cx="${115 + i * 3}" cy="${105 + i * 4}" rx="2" ry="5" transform="rotate(45 ${115 + i * 3} ${105 + i * 4})"/>`).join('')}</g>` : '';
  return `<svg class="trophy trophy-rich ${earned ? 'earned' : ''}" data-design="${d.id}" data-trophy-month="${Number(month.slice(-2))}" viewBox="0 0 160 188" aria-hidden="true" style="fill:none;stroke:none">
    <defs><linearGradient id="${key}-metal" x1="0%" y1="0%" x2="100%" y2="15%"><stop stop-color="${dark}"/><stop offset=".18" stop-color="${mid}"/><stop offset=".34" stop-color="${light}"/><stop offset=".42" stop-color="${shine}"/><stop offset=".53" stop-color="${mid}"/><stop offset=".8" stop-color="${shade}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
    <linearGradient id="${key}-rim" x2="0" y2="1"><stop stop-color="${shine}"/><stop offset=".4" stop-color="${mid}"/><stop offset=".65" stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient>
    <radialGradient id="${key}-gem" cx="30%" cy="22%" r="80%"><stop stop-color="${gem[2]}"/><stop offset=".33" stop-color="${gem[1]}"/><stop offset="1" stop-color="${gem[0]}"/></radialGradient>
    <clipPath id="${key}-body"><path d="${body}"/></clipPath></defs>
    ${base(d.base, metal, dark, light)}${stem(d.stem, metal, light, jewel)}
    <g fill="${metal}" stroke="${mid}" stroke-width="1.2" stroke-linejoin="round"><path d="${handles[d.handles]}"/><path d="${handles[d.handles]}" transform="translate(160 0) scale(-1 1)"/></g>
    <path d="${body}" fill="${metal}" stroke="${light}" stroke-width="1.3" stroke-linejoin="round"/>
    <g clip-path="url(#${key}-body)">${ornament(d.ornament, shine, dark)}<path d="M44 40Q60 73 78 112H67Q48 83 43 40Z" fill="${shine}" opacity=".18"/><path d="M112 41Q104 76 82 111h14q25-33 28-70Z" fill="${dark}" opacity=".3"/></g>
    <g fill="${rim}" stroke="${mid}" stroke-width="1" stroke-linejoin="round">${rimDecor}</g>
    <g fill="${dark}" stroke="${shine}" stroke-width="1.3">${frame}</g><circle cx="80" cy="76" r="17" fill="${jewel}" stroke="${mid}" stroke-width="1.5"/>
    <path d="m66 66 14-7 10 5-18 13Z" fill="${gem[2]}" opacity=".2"/><path d="m80 76 14 10-14 7-9-4Z" fill="${gem[0]}" opacity=".42"/>
    <g transform="translate(30,33)" fill="none" stroke="${shine}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${seasons[Number(month.slice(-2)) - 1]}</g>
    <circle cx="80" cy="48" r="2.3" fill="${jewel}" stroke="${shine}" stroke-width=".7"/>
    ${laurels}<text x="80" y="163.5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5.5" font-weight="600" letter-spacing=".6" fill="${light}">${roman} · ${month.slice(2,4)}</text>
    <path d="m48 34 1.2 4 4 1.2-4 1.2L48 45l-1.2-4.6-4-1.2 4-1.2Z" fill="${shine}" opacity=".85"/>
    ${earned ? `<path d="m124 58 1.4 5.4 5.4 1.4-5.4 1.4L124 72l-1.4-5.4-5.4-1.4 5.4-1.4Z" fill="${shine}" opacity=".8"/>` : ''}</svg>`;
}
