import { measurePath, type Arrow, type Point } from '../domain/geometry';

export interface ArrowContact { arrowId: string; distance: number; point: Point; }
/** Nearest forward contact, including collinear segments. Presentation only. */
export function arrowContact(arrow: Arrow, others: readonly Arrow[]): ArrowContact | null {
  const path = measurePath(arrow.path), head = arrow.path.at(-1)!, d = path.direction;
  let contact: ArrowContact | null = null;
  for (const other of others) {
    if (other.id === arrow.id) continue;
    for (let i = 1; i < other.path.length; i++) {
      const a = other.path[i - 1]!, b = other.path[i]!;
      const fa = (a.x-head.x)*d.x + (a.y-head.y)*d.y, fb = (b.x-head.x)*d.x + (b.y-head.y)*d.y;
      const aa = -(a.x-head.x)*d.y + (a.y-head.y)*d.x, ab = -(b.x-head.x)*d.y + (b.y-head.y)*d.x;
      if (Math.min(aa, ab) > 0 || Math.max(aa, ab) < 0 || Math.max(fa, fb) <= 1e-8) continue;
      const distance = Math.max(0, Math.min(fa, fb));
      if (!contact || distance < contact.distance) contact = { arrowId: other.id, distance, point: { x: head.x+d.x*distance, y: head.y+d.y*distance } };
    }
  }
  return contact;
}
export interface BumpTiming { distance: number; outwardMs: number; holdMs: number; returnMs: number; totalMs: number; }
export function bumpTiming(contactDistance: number, scale: number): BumpTiming {
  // Stop the visible tip at the blocker surface, rather than through its centre line.
  const stroke = Math.max(.11, 1.9 / scale), tip = Math.max(.28, stroke*2.8)*.12;
  const distance = Math.max(0, contactDistance - stroke/2 - tip);
  const outwardMs = Math.max(110, Math.min(270, distance*scale/850*1000));
  const holdMs = 55, returnMs = Math.max(190, Math.min(350, outwardMs*1.35));
  return { distance, outwardMs, holdMs, returnMs, totalMs: outwardMs+holdMs+returnMs };
}
export function sampleBump(timing: BumpTiming, elapsed: number): { distance: number; contacted: boolean; done: boolean; impactAge: number } {
  const time = Math.max(0, elapsed), contacted = time >= timing.outwardMs, done = time >= timing.totalMs;
  let amount: number;
  if (!contacted) { const t = time/timing.outwardMs; amount = t*t*(2-t); }
  else if (time <= timing.outwardMs+timing.holdMs) amount = 1;
  else { const t = Math.min(1,(time-timing.outwardMs-timing.holdMs)/timing.returnMs); amount = (1-t)**3; }
  return { distance: done ? 0 : timing.distance*amount, contacted, done, impactAge: time-timing.outwardMs };
}
