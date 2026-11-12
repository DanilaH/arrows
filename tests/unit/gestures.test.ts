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
  it('bounds zoom and pan, and keeps the board reachable after orientation changes', () => {
    const camera = new BoardCamera(47, 55);
    camera.layout({ x: 0, y: 100, width: 390, height: 600 }, true);
    camera.zoom({ x: 195, y: 400 }, { x: 195, y: 400 }, 100);
    expect(camera.scale).toBe(camera.maxScale);
    camera.pan(1e9, -1e9);
    expect(camera.x).toBeLessThanOrEqual(48);
    camera.layout({ x: 0, y: 80, width: 800, height: 200 });
    expect([camera.x, camera.y, camera.scale].every(Number.isFinite)).toBe(true);
    camera.zoom({ x: 400, y: 180 }, { x: 400, y: 180 }, .00001);
    expect(camera.scale).toBe(camera.minScale);
  });
});
