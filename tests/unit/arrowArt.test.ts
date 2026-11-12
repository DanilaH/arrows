import { describe, it, expect } from 'vitest';
import { roundedRoute, roundedTip } from '../../src/game/arrowArt';
import { distanceToPath, extractPath, measurePath, type Point } from '../../src/domain/geometry';

describe('display-only rounded arrows',()=>{
  const source=Object.freeze([{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:3,y:2},{x:3,y:1}].map(p=>Object.freeze(p)));
  it('softens bends while the unchanged canonical corners remain inside the minimum shaft',()=>{
    const snapshot=JSON.stringify(source),display=roundedRoute(source);
    expect(JSON.stringify(source)).toBe(snapshot);expect(display[0]).toEqual(source[0]);expect(display.at(-1)).toEqual(source.at(-1));
    for(const corner of source.slice(1,-1)){
      expect(display).not.toContainEqual(corner);
      expect(distanceToPath(corner,display)).toBeLessThan(.12);
    }
    expect(display.every(p=>distanceToPath(p,source)<=.061)).toBe(true);
  });
  it('keeps exact endpoints and finite bounded curves through very short moving windows',()=>{
    const measured=measurePath(source);
    for(const travel of [0,.000001,1.999999,2,2.000001,3.999999,4,4.000001,5,6,8])for(const length of [.000001,.03,1,measured.length]){
      const window=extractPath(measured,travel,length),display=roundedRoute(window);
      expect(display[0]).toEqual(window[0]);expect(display.at(-1)).toEqual(window.at(-1));
      expect(display.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&distanceToPath(p,window)<=.061)).toBe(true);
      const inset=roundedRoute(window,.6),head=window.at(-1)!,before=window.at(-2)!;
      expect(inset[0]).toEqual(window[0]);
      expect(inset.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&distanceToPath(p,window)<=.061)).toBe(true);
      expect((inset.at(-1)!.x-before.x)*(head.x-before.x)+(inset.at(-1)!.y-before.y)*(head.y-before.y)).toBeGreaterThanOrEqual(-1e-9);
    }
  });
  it('makes a convex filled marker that covers the logical head in all four orientations',()=>{
    function contains(points:readonly Point[],p:Point):boolean{
      let inside=false;
      for(let i=0,j=points.length-1;i<points.length;j=i++){
        const a=points[i]!,b=points[j]!;
        if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
      }return inside;
    }
    for(const direction of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}])for(const size of [.48,.6,.74]){
      const head={x:10,y:12},path=[{x:head.x-direction.x,y:head.y-direction.y},head],tip=roundedTip(path,size);
      expect(contains(tip,head)).toBe(true);expect(tip.every(p=>Math.abs(p.x-head.x)<1&&Math.abs(p.y-head.y)<1)).toBe(true);
      const crosses=tip.map((a,i)=>{const b=tip[(i+1)%tip.length]!,c=tip[(i+2)%tip.length]!;return(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);});
      expect(crosses.every(n=>n>=-1e-12)||crosses.every(n=>n<=1e-12)).toBe(true);
    }
  });
});
