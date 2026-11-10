import { shape } from './silhouettes';

export const campaignFamilies = ['crescent', 'shield', 'flower', 'hourglass', 'lightning', 'heart', 'crown', 'infinity', 'star', 'anchor', 'droplet', 'butterfly', 'hexagon', 'key', 'ring', 'wave', 'gear', 'leaf', 'diamond', 'cross'] as const;
export type Family = typeof campaignFamilies[number];
export type Pace = 'breather' | 'normal' | 'hard' | 'nightmare';
export const campaignPacing: readonly Pace[] = ['breather', 'normal', 'hard', 'normal', 'breather', 'normal', 'hard', 'normal', 'normal', 'nightmare'];
export function campaignMask(kind: Family, width: number, height: number): (x: number, y: number) => boolean {
  if (['diamond', 'flower', 'heart', 'ring', 'star', 'leaf', 'cross', 'butterfly'].includes(kind)) return shape(kind as Parameters<typeof shape>[0], width, height);
  return (x, y) => {
    const a = (x - (width - 1) / 2) / ((width - 2) / 2), b = (y - (height - 1) / 2) / ((height - 2) / 2);
    const r = Math.hypot(a, b), angle = Math.atan2(b, a);
    switch (kind) {
      case 'crescent': return r < .95 && Math.hypot(a - .4, b + .2) > .75;
      case 'shield': return Math.abs(b) < .92 && Math.abs(a) < (b < -.25 ? .8 : .8 * Math.sqrt((.94 - b) / 1.2));
      case 'hourglass': return Math.abs(b) < .92 && Math.abs(a) < .22 + .7 * Math.abs(b);
      case 'lightning': return b > -.93 && b < .93 && a > -.25 - .55 * b && a < .25 - .55 * b;
      case 'crown': return Math.abs(a) < .9 && b < .8 && b > -.75 + .65 * Math.abs(Math.sin(a * Math.PI / .9));
      case 'infinity': return ((Math.abs(a) - .42) / .52) ** 2 + (b / .62) ** 2 < 1 && (((Math.abs(a) - .42) / .25) ** 2 + (b / .27) ** 2 > 1);
      case 'anchor': return Math.abs(a) < .12 && Math.abs(b) < .85 || Math.abs(b + .47) < .1 && Math.abs(a) < .48 || r < .9 && r > .62 && b > .15;
      case 'droplet': return b < .85 && b > -.95 && a * a < .65 * (b + 1) * (.92 - b);
      case 'hexagon': return Math.abs(a) < .9 && Math.abs(b) < .86 && Math.abs(a) + .58 * Math.abs(b) < 1.05;
      case 'key': return Math.hypot(a, b + .42) < .48 && Math.hypot(a, b + .42) > .2 || Math.abs(a) < .12 && b > -.05 && b < .9 || a > 0 && a < .43 && (b > .42 && b < .57 || b > .74 && b < .88);
      case 'wave': return Math.abs(a) < .92 && Math.abs(b - .28 * Math.sin(a * Math.PI * 1.5)) < .42;
      case 'gear': return r < .83 + .1 * Math.cos(8 * angle) && r > .25;
      default: throw Error('Unknown campaign silhouette');
    }
  };
}

