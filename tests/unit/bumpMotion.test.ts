import { describe, expect, it } from 'vitest';
import { arrowContact, bumpTiming, sampleBump } from '../../src/game/bumpMotion';
import { extractPath, measurePath, type Arrow } from '../../src/domain/geometry';

const arrow = (id: string, path: number[][]): Arrow => ({ id, path: path.map(([x,y]) => ({ x:x!, y:y! })) });
describe('route-aware contact and return', () => {
  it('chooses the nearest blocking segment in all four directions and ignores behind/self', () => {
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const transform = (x:number,y:number): number[] => [x*dx!-y*dy!,x*dy!+y*dx!];
      const a=arrow('a',[transform(-3,0),transform(0,0)]);
      const far=arrow('far',[transform(8,-2),transform(8,2)]), near=arrow('near',[transform(3,-2),transform(3,2)]), behind=arrow('behind',[transform(-6,-2),transform(-6,2)]);
      expect(arrowContact(a,[far,a,behind,near])).toEqual({arrowId:'near',distance:3,point:{x:dx!*3,y:dy!*3}});
      expect(arrowContact(a,[a,behind])).toBeNull();
    }
  });
  it('handles collinear obstacles and compares every bend rather than only their heads', () => {
    const a=arrow('a',[[0,0],[2,0]]), b=arrow('b',[[8,0],[12,0]]), c=arrow('c',[[5,-2],[5,2],[7,2]]);
    expect(arrowContact(a,[b])).toMatchObject({distance:6,point:{x:8,y:0}});
    expect(arrowContact(a,[b,c])).toMatchObject({arrowId:'c',distance:3,point:{x:5,y:0}});
  });
  it('travels along arc length up to the surface and returns exactly to the original polyline', () => {
    const timing=bumpTiming(5,24), path=measurePath([{x:0,y:0},{x:0,y:2},{x:3,y:2},{x:3,y:4}]);
    expect(sampleBump(timing,0).distance).toBe(0);
    const contact=sampleBump(timing,timing.outwardMs); expect(contact.contacted).toBe(true); expect(contact.distance).toBeLessThan(5); expect(contact.distance).toBeGreaterThan(4.7);
    const moved=extractPath(path,contact.distance); expect(moved[0]!.y).toBe(2); expect(moved.at(-1)!.x).toBe(3); expect(moved[0]).not.toEqual({x:path.points[0]!.x,y:path.points[0]!.y+contact.distance});
    const back=sampleBump(timing,timing.outwardMs+timing.holdMs+timing.returnMs/2); expect(back.distance).toBeLessThan(contact.distance); expect(back.distance).toBeGreaterThan(0);
    const end=sampleBump(timing,timing.totalMs); expect(end).toMatchObject({distance:0,done:true}); expect(extractPath(path,end.distance)).toEqual([...path.points]);
  });
  it('bounds a distant collision and permits a silent early return when its obstacle disappears', () => {
    const t=bumpTiming(100,42); expect(t.totalMs).toBeLessThan(700);
    const returning={distance:2,outwardMs:0,holdMs:0,returnMs:190,totalMs:190};
    expect(sampleBump(returning,0).distance).toBe(2); expect(sampleBump(returning,95).distance).toBeCloseTo(.25); expect(sampleBump(returning,190).done).toBe(true);
  });
});
