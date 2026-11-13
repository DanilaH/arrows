import {describe,it,expect} from 'vitest';
import {campaign} from '../../src/content/campaign';
import {Board,canExit} from '../../src/domain/board';
import {chooseSingle,cascadePlan,predictHelp,singlePlan,validatePlan} from '../../src/domain/assistance';

function c40(){const b=new Board(campaign[39]!,'qa-c40');for(let i=0;i<21;i++)expect(b.activate(`c40-${i}`).kind).toBe('removed');return b;}
describe('useful single and bounded causal help',()=>{
  it('selects the real c40 blocker and counts native and newly free separately',()=>{
    const ordinary=c40(),choice=chooseSingle(ordinary)!;
    expect(choice.root).toBe('c40-22');expect(choice.native).toEqual([]);expect(choice.newlyFree).toEqual(expect.arrayContaining(['c40-23','c40-24','c40-27']));
    ordinary.activate('c40-23');ordinary.activate('c40-24');const marked=chooseSingle(ordinary)!;
    expect(marked.root).toBe('c40-22');expect(marked.native).toEqual(['c40-23','c40-24']);
    expect(marked.newlyFree).not.toContain('c40-23');expect(marked.newlyFree).not.toContain('c40-24');
  });
  for(const marks of [[],['c40-23'],['c40-23','c40-24']])it(`keeps the exact promised c40 group after new errors ${marks.join(',')}`,()=>{
    const board=c40(),plan=cascadePlan(board,{root:'c40-22'})!;validatePlan(board.level,plan);
    expect(plan.bonus).toEqual(['c40-23','c40-24','c40-27']);expect(plan.budget).toBe(3);
    for(const id of marks)board.activate(id);
    const before=board.snapshot(),prediction=predictHelp(board,plan)!;
    expect(board.snapshot()).toEqual(before);expect(prediction.board.remaining).toHaveLength(15);
    expect(prediction.board.hearts).toBe(3-marks.length);expect(prediction.native).toEqual(marks);
    expect(prediction.bonus).toEqual(plan.bonus.filter(id=>!marks.includes(id)));expect(prediction.result.released).toHaveLength(3);
    expect(prediction.board.snapshot().errors).toEqual(marks);
    const remaining=[...board.level.arrows];for(const id of prediction.board.snapshot().removed){const i=remaining.findIndex(a=>a.id===id);expect(canExit(remaining[i]!,remaining)).toBe(true);remaining.splice(i,1);}
  });
  it('preserves an earned group after an off-path move and rejects an unrelated free bonus',()=>{
    const board=c40(),plan=cascadePlan(board,{root:'c40-22'})!;board.activate('c40-21');
    expect(predictHelp(board,plan)!.board.remaining).toHaveLength(14);
    expect(()=>validatePlan(board.level,{...plan,bonus:['c40-21','c40-23'],budget:2})).toThrow();
  });
  it('never consumes a dead board or silently lowers an exact reserved budget',()=>{
    const board=c40();expect(cascadePlan(new Board(campaign[0]!,'small'),{budget:4})).toBeNull();
    for(const id of ['c40-23','c40-24','c40-27'])board.activate(id);
    expect(board.hearts).toBe(0);expect(singlePlan(board)).toBeNull();expect(cascadePlan(board)).toBeNull();
  });
  it('always returns legal useful singles and bounded groups without rewriting any field',()=>{
    for(const level of [campaign[0]!,campaign[19]!,campaign[119]!]){
      const board=new Board(level,'catalog-qa'),before=board.snapshot(),single=singlePlan(board)!;
      validatePlan(level,single);expect(predictHelp(board,single)?.manual).toEqual([single.root]);
      const cascade=cascadePlan(board);if(cascade){validatePlan(level,cascade);expect(cascade.bonus.length).toBeGreaterThanOrEqual(2);expect(cascade.bonus.length).toBeLessThanOrEqual(4);}
      expect(board.snapshot()).toEqual(before);
    }
  });
  it('does not cap an existing seven-error native closure at the two ordinary bonuses',()=>{
    const level={id:'native-chain',contentVersion:1,width:4,height:10,difficulty:'normal' as const,
      arrows:[{id:'root',path:[{x:0,y:0},{x:0,y:9}]},...Array.from({length:9},(_,i)=>({id:`row-${i}`,path:[{x:2,y:i},{x:1,y:i}]}))],mask:Array.from({length:40},(_,i)=>({x:i%4,y:Math.floor(i/4)}))};
    const initial=new Board(level,'long-auto').snapshot(),board=new Board(level,initial.id,{...initial,errors:Array.from({length:7},(_,i)=>`row-${i}`),lives:2});
    const plan=cascadePlan(board,{root:'root',budget:2})!,result=predictHelp(board,plan)!;
    expect(result.native).toHaveLength(7);expect(result.bonus).toEqual(['row-7','row-8']);expect(result.board.complete).toBe(true);expect(result.board.hearts).toBe(2);expect(result.board.snapshot().errors).toHaveLength(7);
  });
});
