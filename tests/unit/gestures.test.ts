import { describe, expect, it, vi } from 'vitest';
import { BoardGestures } from '../../src/input/gestures';
import { BoardCamera } from '../../src/input/camera';

function setup() {
  const callbacks = { hit: (): string | null => 'arrow', contains: (_id: string, p: { x: number; y: number }) => p.x >= 0 && p.x <= 10 && p.y >= 0 && p.y <= 10,
    activate: vi.fn(), emptyTap: vi.fn(), preview: vi.fn(), pan: vi.fn(), pinch: vi.fn() };
  return { gesture: new BoardGestures(callbacks), callbacks };
}
describe('board gesture contract', () => {
  it('previews a hold without acting, then activates exactly once on release inside', () => {
    const { gesture, callbacks } = setup();
    gesture.down(1, { x: 5, y: 5 }, 0); gesture.hold(300);
    expect(callbacks.preview).toHaveBeenLastCalledWith('arrow');
    expect(callbacks.activate).not.toHaveBeenCalled();
    gesture.up(1, { x: 5, y: 5 }, 400); gesture.up(1, { x: 5, y: 5 }, 400);
    expect(callbacks.activate).toHaveBeenCalledOnce();
  });
  it('permanently cancels a held arrow after leaving and returning', () => {
    const { gesture, callbacks } = setup();
    gesture.down(1, { x: 5, y: 5 }, 0); gesture.hold(300);
    gesture.move(1, { x: 11, y: 5 }); gesture.move(1, { x: 5, y: 5 }); gesture.up(1, { x: 5, y: 5 }, 400);
    expect(callbacks.activate).not.toHaveBeenCalled();
  });
  it('never turns pan, a coalesced final movement or pointercancel into a tap', () => {
    for (const cancel of [false, true]) {
      const { gesture, callbacks } = setup();
      gesture.down(1, { x: 1, y: 1 }, 0);
      if (cancel) gesture.cancel();
      gesture.up(1, { x: 9, y: 9 }, 400);
      expect(callbacks.activate).not.toHaveBeenCalled();
    }
  });
  it('anchors pinch movement and suppresses the remaining finger release', () => {
    const { gesture, callbacks } = setup();
    gesture.down(1, { x: 1, y: 5 }, 0); gesture.down(2, { x: 9, y: 5 }, 10);
    gesture.move(2, { x: 19, y: 5 });
    expect(callbacks.pinch).toHaveBeenCalledOnce();
    gesture.up(2, { x: 19, y: 5 }, 400); gesture.up(1, { x: 1, y: 5 }, 400);
    expect(callbacks.activate).not.toHaveBeenCalled();
    expect(gesture.phase).toBe('idle');
  });
});
describe('empty board taps', () => {
  const blank = () => { const s=setup(); s.callbacks.hit=()=>null; return s; };
  it('acknowledges only the completed short single-pointer tap once, never an arrow move', () => {
    const {gesture,callbacks}=blank(); gesture.down(1,{x:4,y:4},0);
    expect(callbacks.emptyTap).not.toHaveBeenCalled();
    gesture.up(1,{x:5,y:5},80); gesture.up(1,{x:5,y:5},90);
    expect(callbacks.emptyTap).toHaveBeenCalledExactlyOnceWith({x:5,y:5}); expect(callbacks.activate).not.toHaveBeenCalled();
  });
  it('rejects holds, coalesced drags, out-and-back pans, cancellation and both pinch releases', () => {
    for(const kind of ['hold','coalesced','pan','cancel','pinch']) {
      const {gesture,callbacks}=blank();gesture.down(1,{x:4,y:4},0);
      if(kind==='pan'){gesture.move(1,{x:30,y:4});gesture.move(1,{x:4,y:4});}
      if(kind==='cancel')gesture.cancel();
      if(kind==='pinch'){gesture.down(2,{x:40,y:4},20);gesture.up(2,{x:40,y:4},30);}
      gesture.up(1,kind==='coalesced'?{x:20,y:4}:{x:4,y:4},kind==='hold'?350:90);
      expect(callbacks.emptyTap).not.toHaveBeenCalled();expect(callbacks.activate).not.toHaveBeenCalled();
    }
  });
});
describe('CSS/world camera coordinates', () => {
  it('round-trips points and keeps an interior zoom anchor fixed', () => {
    const camera = new BoardCamera(47, 55);
    camera.layout({ x: 0, y: 100, width: 390, height: 600 }, true);
    const focus = { x: 195, y: 400 }, world = camera.world(focus);
    camera.zoom(focus, focus, 2);
    expect(camera.screen(world).x).toBeCloseTo(focus.x);
    expect(camera.screen(world).y).toBeCloseTo(focus.y);
    expect(camera.world(camera.screen({ x: 12, y: 17 }))).toEqual({ x: 12, y: 17 });
  });
  it('keeps small fields compact without shrinking the large-board fit policy', () => {
    const camera = new BoardCamera(6, 6); camera.layout({ x: 0, y: 100, width: 390, height: 600 }, true);
    expect(camera.screen({ x: 5, y: 5 }).x - camera.screen({ x: 0, y: 0 }).x).toBe(95);
    const center = camera.world({ x: 195, y: 400 }); camera.zoom({ x: 195, y: 400 }, { x: 195, y: 400 }, 2);
    expect(camera.screen(center)).toEqual({ x: 195, y: 400 });
    const large = new BoardCamera(47, 55); large.layout({ x: 0, y: 100, width: 390, height: 600 }, true);
    expect(large.minScale).toBeCloseTo(350 / 48);
  });
  it('centers original occupied bounds and reaches every edge without panning through catalogue padding', () => {
    // c120 has ten empty catalogue rows below its original figure.
    const camera = new BoardCamera(47, 51, { x: 4, y: 0, width: 38, height: 40 });
    camera.layout({ x: 0, y: 100, width: 390, height: 600 }, true);
    expect(camera.screen({ x: 23, y: 20 })).toEqual({ x: 195, y: 400 });
    camera.zoom({ x: 195, y: 400 }, { x: 195, y: 400 }, 100);
    camera.pan(1e9, 1e9);
    expect(camera.screen({ x: 4, y: 0 }).x).toBeCloseTo(163.8);
    expect(camera.screen({ x: 4, y: 0 }).y).toBeCloseTo(340);
    camera.pan(-1e9, -1e9);
    expect(camera.screen({ x: 42, y: 40 }).x).toBeCloseTo(226.2);
    expect(camera.screen({ x: 42, y: 40 }).y).toBeCloseTo(460);
  });
  it('bounds zoom and pan, and keeps the board reachable after orientation changes', () => {
    const camera = new BoardCamera(47, 55);
    camera.layout({ x: 0, y: 100, width: 390, height: 600 }, true);
    camera.zoom({ x: 195, y: 400 }, { x: 195, y: 400 }, 100);
    expect(camera.scale).toBe(camera.maxScale);
    camera.pan(1e9, -1e9);
    expect(camera.x).toBeLessThan(195);
    camera.layout({ x: 0, y: 80, width: 800, height: 200 });
    expect([camera.x, camera.y, camera.scale].every(Number.isFinite)).toBe(true);
    camera.zoom({ x: 400, y: 180 }, { x: 400, y: 180 }, .00001);
    expect(camera.scale).toBe(camera.minScale);
  });
  it('lets a zoomed compact figure move on BOTH axes and restores that view without drift', () => {
    const view={x:0,y:100,width:390,height:600};
    const camera=new BoardCamera(6,6);camera.layout(view,true);
    const fit=camera.snapshot();camera.pan(180,200);expect(camera.snapshot()).toEqual(fit);
    camera.zoom({x:195,y:400},{x:195,y:400},2);
    const before=camera.screen({x:2.5,y:2.5});camera.pan(90,140);
    expect(camera.screen({x:2.5,y:2.5})).toEqual({x:before.x+90,y:before.y+140});
    const saved=camera.snapshot(),restored=new BoardCamera(6,6);restored.layout(view,true);restored.restore(saved);
    expect(restored.snapshot()).toEqual(saved);
    camera.pan(1e9,-1e9);const bounds=[camera.screen({x:0,y:0}),camera.screen({x:5,y:5})];
    expect(bounds[0]!.x).toBeLessThan(390);expect(bounds[1]!.y).toBeGreaterThan(100);
    camera.zoom({x:195,y:400},{x:195,y:400},.01);expect(camera.snapshot()).toEqual(fit);
  });
  it('returns to the original overview after exploring padded content without mutating the live view on inspection', () => {
    const camera=new BoardCamera(47,51,{x:4,y:0,width:38,height:40});
    camera.layout({x:0,y:100,width:390,height:600},true);const original=camera.snapshot();
    expect(camera.needsOverview).toBe(false);
    camera.zoom({x:195,y:400},{x:195,y:400},3);camera.pan(90,-140);
    const explored=camera.snapshot(),target=camera.overview();
    expect(camera.snapshot()).toEqual(explored);expect(target).toEqual(original);expect(camera.needsOverview).toBe(true);
    camera.restore(target);expect(camera.needsOverview).toBe(false);
    expect(camera.snapshot().centerX).toBeCloseTo(original.centerX,10);expect(camera.snapshot().centerY).toBeCloseTo(original.centerY,10);
    for(const p of[{x:4,y:0},{x:42,y:40}]){const at=camera.screen(p);expect(at.x).toBeGreaterThanOrEqual(0);expect(at.x).toBeLessThanOrEqual(390);expect(at.y).toBeGreaterThanOrEqual(100);expect(at.y).toBeLessThanOrEqual(700);}
  });
  it('recomputes overview for a resized viewport while retaining saved world-centre and relative-zoom semantics', () => {
    const camera=new BoardCamera(47,51,{x:4,y:0,width:38,height:40});camera.layout({x:0,y:100,width:390,height:600},true);
    camera.zoom({x:195,y:400},{x:195,y:400},2);camera.pan(40,-70);const saved=camera.snapshot();
    camera.layout({x:0,y:70,width:800,height:240});expect(camera.snapshot().zoom).toBeCloseTo(saved.zoom,10);
    camera.restore(camera.overview());expect(camera.snapshot().zoom).toBe(1);expect(camera.needsOverview).toBe(false);
    const restored=new BoardCamera(47,51,{x:4,y:0,width:38,height:40});restored.layout({x:0,y:70,width:800,height:240},true);restored.restore(camera.snapshot());
    expect(restored.snapshot()).toEqual(camera.snapshot());
    const top=camera.screen({x:4,y:0}),bottom=camera.screen({x:42,y:40});expect(top.x).toBeGreaterThanOrEqual(0);expect(bottom.x).toBeLessThanOrEqual(800);expect(top.y).toBeGreaterThanOrEqual(70);expect(bottom.y).toBeLessThanOrEqual(310);
  });
});
