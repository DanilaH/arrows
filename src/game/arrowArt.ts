import type { Point } from '../domain/geometry';

const routeCache = new WeakMap<readonly Point[], { inset: number; points: readonly Point[] }>();
/** Display-only fillets. Logical routes, arc distances and collision geometry stay orthogonal. */
function corners(points: readonly Point[], radius: number, closed: boolean): Point[] {
  if (points.length < 3) return [...points];
  const result: Point[] = closed ? [] : [points[0]!];
  const from = closed ? 0 : 1, end = closed ? points.length : points.length - 1;
  for (let i = from; i < end; i++) {
    const before=points[(i+points.length-1)%points.length]!, at=points[i]!, after=points[(i+1)%points.length]!;
    const incoming=Math.hypot(at.x-before.x,at.y-before.y), outgoing=Math.hypot(after.x-at.x,after.y-at.y);
    if (incoming < 1e-9 || outgoing < 1e-9) { result.push(at); continue; }
    const cross=(at.x-before.x)*(after.y-at.y)-(at.y-before.y)*(after.x-at.x);
    if (Math.abs(cross)<1e-12) { result.push(at); continue; }
    const cut=Math.min(radius,incoming/2,outgoing/2);
    const enter={x:at.x+(before.x-at.x)*cut/incoming,y:at.y+(before.y-at.y)*cut/incoming};
    const leave={x:at.x+(after.x-at.x)*cut/outgoing,y:at.y+(after.y-at.y)*cut/outgoing};
    result.push(enter);
    const steps=closed?6:4;
    for (let step=1;step<=steps;step++) {
      const t=step/steps,u=1-t;
      result.push({x:u*u*enter.x+2*u*t*at.x+t*t*leave.x,y:u*u*enter.y+2*u*t*at.y+t*t*leave.y});
    }
  }
  if (!closed) result.push(points.at(-1)!);
  return result;
}
export function roundedRoute(path: readonly Point[], inset = 0): readonly Point[] {
  const cached=routeCache.get(path);
  if (cached?.inset===inset) return cached.points;
  let shaft=path;
  if (inset>0 && path.length>1) {
    const head=path.at(-1)!,before=path.at(-2)!,length=Math.hypot(head.x-before.x,head.y-before.y);
    const cut=Math.min(inset,length), points=[...path];
    if (length-cut<1e-9) points.pop();
    else points[points.length-1]={x:head.x+(before.x-head.x)*cut/length,y:head.y+(before.y-head.y)*cut/length};
    shaft=points;
  }
  const points=corners(shaft,.24,false);routeCache.set(path,{inset,points});return points;
}
/** Filled triangular marker with the same soft corners in Home, flight and contact/return. */
export function roundedTip(path: readonly Point[], size: number): readonly Point[] {
  if (path.length<2) return [];
  const head=path.at(-1)!, before=path.at(-2)!, dx=Math.sign(head.x-before.x),dy=Math.sign(head.y-before.y);
  return corners([
    {x:head.x+dx*size*.18,y:head.y+dy*size*.18},
    {x:head.x-dx*size-dy*size*.58,y:head.y-dy*size+dx*size*.58},
    {x:head.x-dx*size+dy*size*.58,y:head.y-dy*size-dx*size*.58},
  ],size*.26,true);
}
export const svgPoints = (points: readonly Point[]): string => points.map(p=>`${+p.x.toFixed(4)},${+p.y.toFixed(4)}`).join(' ');
