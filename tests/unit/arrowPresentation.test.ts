import {describe,it,expect} from 'vitest';
import {sampleStyle,retargetStyle,flightSchedule} from '../../src/game/arrowPresentation';
import {measurePath,extractPath,rayHitsPath,type Arrow} from '../../src/domain/geometry';
describe('finite actual-state presentation',()=>{
  it('retargets an early press/flight/cancel from the exact displayed color and width',()=>{
    const a={color:0xb4bcfa,weight:1,marker:0},b={color:0xffd596,weight:1.65,marker:1};
    const motion={from:a,to:b,started:0,duration:220},at=sampleStyle(motion,65);
    const next=retargetStyle(motion,{color:0x6767ff,weight:1,marker:0},65,180);
    expect(sampleStyle(next,65)).toEqual(at);expect(at.weight).toBeGreaterThan(1);expect(at.weight).toBeLessThan(1.65);
    expect(sampleStyle(next,260)).toEqual(next.to);
    expect(sampleStyle(retargetStyle(next,a,90,100),90)).toEqual(sampleStyle(next,90));
  });
  it('clears actual blocker tails before dependent starts inside a fixed 700ms budget',()=>{
    const nested=[{id:'0',path:[{x:0,y:0},{x:20,y:0}]},...Array.from({length:17},(_,i)=>({id:String(i+1),path:[{x:i+1,y:5},{x:i+1,y:4}]}))];
    const exit=(a:Arrow)=>measurePath(a.path).length+30;
    const schedule=flightSchedule(nested,exit,22);
    expect(Math.max(...schedule.map(s=>s.delay))).toBeLessThanOrEqual(700.00001);
    expect(schedule.every(s=>Number.isFinite(s.speed)&&s.speed>=22)).toBe(true);
    // The outermost is a real blocker of inner upward rays.
    const travelled=schedule[0]!.speed*schedule[1]!.delay/1000,next=nested[1]!,p=measurePath(next.path);
    expect(rayHitsPath(next.path.at(-1)!,p.direction,extractPath(measurePath(nested[0]!.path),travelled))).toBe(false);
  });
});
