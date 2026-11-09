export const kinds = ['diamond', 'flower', 'heart', 'ring', 'star', 'leaf', 'cross', 'butterfly'] as const;
export function shape(kind: typeof kinds[number], width: number, height: number): (x: number, y: number) => boolean {
  return (x, y) => {
    const a = (x - (width - 1) / 2) / ((width - 2) / 2), b = (y - (height - 1) / 2) / ((height - 2) / 2);
    const radius = Math.hypot(a, b), angle = Math.atan2(b, a);
    if (kind === 'diamond') return Math.abs(a) + Math.abs(b) < 1;
    if (kind === 'flower') return radius < .79 + .18 * Math.cos(5 * angle);
    if (kind === 'heart') return (a * a + (b + .12) ** 2 - .55) ** 3 + a * a * (b + .12) ** 3 < 0;
    if (kind === 'ring') return radius < .96 && radius > .46;
    if (kind === 'star') return radius < .69 + .26 * Math.cos(5 * (angle + Math.PI / 2));
    if (kind === 'leaf') return a * a + b * b < .94 && Math.abs(a + b * .5) < .7;
    if (kind === 'cross') return Math.abs(a) < .35 && Math.abs(b) < .95 || Math.abs(b) < .35 && Math.abs(a) < .95;
    return ((Math.abs(a) - .5) / .46) ** 2 + ((b + .4) / .52) ** 2 < 1 ||
      ((Math.abs(a) - .42) / .42) ** 2 + ((b - .48) / .48) ** 2 < 1 || Math.abs(a) < .07 && Math.abs(b) < .9;
  };
}
