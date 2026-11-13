import { describe, expect, it } from 'vitest';
import { controlScenes, controlSceneStats } from '../../src/content/controlScenes';
import { Board, canExit, validateLevel, type Level } from '../../src/domain/board';
import { extractPath, measurePath, occupiedCells, rayHitsPath } from '../../src/domain/geometry';

describe('arc-length extraction', () => {
  const path = measurePath([{ x: 0, y: 0 }, { x: 0, y: 2 }, { x: 3, y: 2 }]);
  it('pulls the tail through each bend while the head follows its own ray', () => {
    expect(extractPath(path, 1)).toEqual([{ x: 0, y: 1 }, { x: 0, y: 2 }, { x: 4, y: 2 }]);
    expect(extractPath(path, 4)).toEqual([{ x: 2, y: 2 }, { x: 7, y: 2 }]);
    expect(extractPath(path, 8)).toEqual([{ x: 6, y: 2 }, { x: 11, y: 2 }]);
  });
  it('preserves physical path length across turns and extended-ray travel', () => {
    for (let d = 0; d < 30; d += .17) expect(measurePath(extractPath(path, d)).length).toBeCloseTo(path.length, 9);
    expect(() => extractPath(path, -1)).toThrow();
    expect(() => measurePath([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toThrow();
  });
  it('ignores geometry behind the head, but sees parallel and perpendicular blockers', () => {
    expect(rayHitsPath({ x: 2, y: 2 }, { x: 1, y: 0 }, [{ x: 1, y: 1 }, { x: 1, y: 3 }])).toBe(false);
    expect(rayHitsPath({ x: 2, y: 2 }, { x: 1, y: 0 }, [{ x: 4, y: 1 }, { x: 4, y: 3 }])).toBe(true);
    expect(rayHitsPath({ x: 2, y: 2 }, { x: 1, y: 0 }, [{ x: 4, y: 2 }, { x: 5, y: 2 }])).toBe(true);
  });
});

describe('canonical game rules', () => {
  it('charges the first mistake once and automatically releases a marked arrow after unblocking', () => {
    const board = new Board(controlScenes[0]!, 'test');
    expect(board.activate('straight-0')).toMatchObject({ kind: 'error', first: true });
    for (let i = 0; i < 5; i++) expect(board.activate('straight-0')).toMatchObject({ kind: 'error', first: false });
    expect(board.hearts).toBe(2);
    expect(board.activate('straight-1')).toMatchObject({kind:'removed',released:[{id:'straight-0'}]});
    expect(board.snapshot().removed).toEqual(['straight-1','straight-0']);
    expect(board.isError('straight-0')).toBe(true);
    expect(board.activate('straight-0').kind).toBe('ignored');
    expect(board.hearts).toBe(2);
  });
  it('releases only errored arrows after all blockers leave, retaining mistakes and life cost', () => {
    const level:Level={id:'chain',contentVersion:1,width:7,height:7,difficulty:'normal',mask:[],arrows:[
      {id:'a',path:[{x:0,y:1},{x:1,y:1}]},
      {id:'b',path:[{x:3,y:1},{x:3,y:2}]},
      {id:'c',path:[{x:2,y:4},{x:4,y:4}]},
      {id:'untouched',path:[{x:0,y:6},{x:1,y:6}]},
    ]};validateLevel(level);const board=new Board(level,'chain');
    board.activate('a');board.activate('b');expect(board.hearts).toBe(1);
    expect(board.activate('c')).toMatchObject({kind:'removed',complete:false,released:[{id:'b'},{id:'a'}]});
    expect(board.snapshot()).toMatchObject({removed:['c','b','a'],errors:['a','b'],lives:1});
    expect(board.remaining.map(a=>a.id)).toEqual(['untouched']);
    const multi:Level={...level,arrows:[level.arrows[0]!,level.arrows[1]!,{id:'second',path:[{x:5,y:1},{x:5,y:2}]}]};
    const both=new Board(multi,'both');both.activate('a');
    expect(both.activate('b')).toMatchObject({kind:'removed',complete:false});expect(both.remaining.map(a=>a.id)).toContain('a');
    expect(both.activate('second')).toMatchObject({kind:'removed',complete:true,released:[{id:'a'}]});
    expect(both.hearts).toBe(2);
  });
  it('removes occupancy immediately, independently of any animation callback', () => {
    const board = new Board(controlScenes[0]!, 'test');
    const snapshot = board.snapshot();
    board.activate('straight-1');
    expect(canExit(board.level.arrows[0]!, board.remaining)).toBe(true);
    expect(snapshot.removed).toEqual([]);
    expect(board.snapshot().removed).toEqual(['straight-1']);
    expect(new Board(controlScenes[0]!, 'restart').hearts).toBe(3);
  });
  it('has a stable declared stress fixture and rejects malformed overlapping content', () => {
    expect(controlSceneStats).toEqual([
      { id: 'straight', arrows: 6, segments: 6, dots: 29 },
      { id: 'bent', arrows: 6, segments: 10, dots: 38 },
      { id: 'hard-flower', arrows: 68, segments: 87, dots: 397 },
      { id: 'nightmare-butterfly', arrows: 188, segments: 260, dots: 1859 },
    ]);
    const base = controlScenes[0]!;
    expect(() => validateLevel({ ...base, arrows: [...base.arrows, { ...base.arrows[0]!, id: 'overlap' }] })).toThrow();
  });
  it('validates and solves all fixtures against an independent integer-cell ray oracle', () => {
    for (const level of controlScenes) {
      validateLevel(level);
      const board = new Board(level, level.id);
      let count = 0;
      while (!board.complete) {
        const remaining = board.remaining;
        const occupied = new Map<string, string>();
        for (const arrow of remaining) for (const p of occupiedCells(arrow.path)) occupied.set(`${p.x},${p.y}`, arrow.id);
        const allowed = remaining.filter(arrow => {
          const last = arrow.path.at(-1)!, before = arrow.path.at(-2)!;
          const dx = Math.sign(last.x - before.x), dy = Math.sign(last.y - before.y);
          let x = last.x + dx, y = last.y + dy;
          while (x >= 0 && y >= 0 && x < level.width && y < level.height) {
            const owner = occupied.get(`${x},${y}`); if (owner && owner !== arrow.id) return false;
            x += dx; y += dy;
          }
          return true;
        });
        expect(allowed.length).toBeGreaterThan(0);
        for (const arrow of remaining) expect(canExit(arrow, remaining)).toBe(allowed.includes(arrow));
        // Alternate oracle-valid choices, rather than just the generator's recorded order.
        expect(board.activate(allowed[count++ % allowed.length]!.id).kind).toBe('removed');
      }
      expect(board.hearts).toBe(3);
      expect(board.snapshot().removed).toHaveLength(level.arrows.length);
    }
  });
});
