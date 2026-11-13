import { measurePath, pointAt, rayHitsPath, type Arrow } from '../domain/geometry';
export interface ArrowStyle { color:number; weight:number; marker:number; }
export interface StyleMotion { from:ArrowStyle; to:ArrowStyle; started:number; duration:number; }
const mix=(a:number,b:number,t:number):number=>a+(b-a)*t;
export function sampleStyle(m:StyleMotion,now:number):ArrowStyle {
  const t=m.duration===0?1:1-(1-Math.max(0,Math.min(1,(now-m.started)/m.duration)))**3;
  let color=0;for(const shift of [16,8,0])color|=Math.round(mix(m.from.color>>shift&255,m.to.color>>shift&255,t))<<shift;
  return {color,weight:mix(m.from.weight,m.to.weight,t),marker:mix(m.from.marker,m.to.marker,t)};
}
export function retargetStyle(m:StyleMotion,to:ArrowStyle,now:number,duration:number):StyleMotion {return {from:sampleStyle(m,now),to,started:now,duration};}
export const sameStyle=(a:ArrowStyle,b:ArrowStyle):boolean=>a.color===b.color&&a.weight===b.weight&&a.marker===b.marker;

/** Last visible crossing along the extended parent route, plus an ink margin.
 * Collinear escaping rays conservatively wait until the tail leaves the view. */
export function corridorClearance(parent:Arrow,next:Arrow,exit:number):number {
  const p=measurePath(parent.path),n=measurePath(next.path),origin=next.path.at(-1)!,d=n.direction;
  const points=[...p.points,pointAt(p,p.length+exit)],dist=[...p.distances,p.length+exit];let last=0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1]!,b=points[i]!,fa=(a.x-origin.x)*d.x+(a.y-origin.y)*d.y,fb=(b.x-origin.x)*d.x+(b.y-origin.y)*d.y;
    const aa=-(a.x-origin.x)*d.y+(a.y-origin.y)*d.x,ab=-(b.x-origin.x)*d.y+(b.y-origin.y)*d.x;
    if(Math.min(aa,ab)>0||Math.max(aa,ab)<0||Math.max(fa,fb)<=0)continue;
    if(Math.abs(aa-ab)<1e-8)last=Math.max(last,dist[i]!);
    else {const t=-aa/(ab-aa);if(fa+(fb-fa)*t>0)last=Math.max(last,dist[i-1]!+(dist[i]!-dist[i-1]!)*t);}
  }
  return Math.min(exit,last+1);
}
/** Every actual blocker tail clears the dependent's visible exit corridor.
 * No count-proportional waiting. Long
 * native groups share the same 700ms start budget, with accelerated exits. */
export function flightSchedule(arrows:readonly Arrow[],exitDistance:(a:Arrow)=>number,baseSpeed:number):{delay:number;speed:number}[] {
  const spacing=arrows.length<=1?0:Math.min(115,700/(arrows.length-1));
  const result=arrows.map((_,i)=>({delay:i*spacing,speed:baseSpeed}));
  for(let i=1;i<arrows.length;i++){
    const next=arrows[i]!,p=measurePath(next.path),head=next.path.at(-1)!;
    for(let j=0;j<i;j++)if(rayHitsPath(head,p.direction,arrows[j]!.path)){
      const window=(result[i]!.delay-result[j]!.delay)/1000;
      result[j]!.speed=Math.max(result[j]!.speed,(corridorClearance(arrows[j]!,next,exitDistance(arrows[j]!))+.1)/window);
    }
  }
  return result;
}
