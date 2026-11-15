import {describe,it,expect} from 'vitest';
import {Board,validateLevel} from '../../src/domain/board';
import {baselineFields,candidateFields,pilotRows} from '../../src/pilot/catalog';
import {createPilotStore,PILOT_KEY,validPilotAttempt} from '../../src/pilot/store';
import {analyzeCampaignLevel} from '../../tools/content/campaign-analysis';
import {situationSignature} from '../../tools/content/pilot-source';
import {qualityProblems} from '../../tools/content/dense-quality';
import type {Pace} from '../../tools/content/campaign-shapes';
describe('Frozen content pilot, structurally checked rather than human calibrated',()=>{
 it('has 20 campaign positions and 7 independent daily comparisons, with four campaign peaks',()=>{
  expect(candidateFields).toHaveLength(27);expect(new Set(candidateFields.map(l=>l.id)).size).toBe(27);
  expect(pilotRows.slice(0,20).map(r=>r.position)).toEqual(Array.from({length:20},(_,i)=>i+21));
  expect(pilotRows.slice(0,20).filter(r=>r.pace==='nightmare')).toHaveLength(4);
  expect(pilotRows.slice(20).map(r=>r.level.difficulty)).toEqual(['hard','hard','nightmare','hard','hard','nightmare','hard']);
  for(let i=0;i<27;i++)expect(candidateFields[i]!.id).not.toBe(baselineFields[i]!.id);
 });
 for(const row of pilotRows)it(`${row.level.id}: geometry, independent DAG, three legal orders and declared situations`,()=>{
  validateLevel(row.level);const metrics=analyzeCampaignLevel(row.level),situations=situationSignature(row.level);
  expect(qualityProblems(row.pace as Pace,metrics)).toEqual([]);expect(metrics.initialFree).toBeGreaterThanOrEqual(2);
  expect(row.metrics).toMatchObject(metrics);expect(row.situations).toMatchObject(situations);
  if(row.motif==='interior-exit')expect(situations.interiorRoots).toBeGreaterThan(0);
  if(row.pace!=='breather')expect(situations.maxUnlock).toBeGreaterThanOrEqual(2);
 });
 it('reduces daily initial/early mechanical freedom without exceeding the old Nightmare size',()=>{
  for(let i=20;i<27;i++){const a=analyzeCampaignLevel(candidateFields[i]!),b=analyzeCampaignLevel(baselineFields[i]!);expect(a.initialFreeFraction).toBeLessThan(b.initialFreeFraction/2);expect(a.depth).toBeGreaterThan(b.depth*2);expect(a.arrows).toBeLessThan(100);}
 });
});
describe('Optional pilot resume, separate from product saves and native rights',()=>{
 const banks={candidate:candidateFields,baseline:baselineFields};
 it('keeps errors/lives and distinct comparison boards, and rejects illegal removal histories',()=>{
  const data=new Map([['arrows.progress.v1','main-unchanged']]),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}},store=createPilotStore(storage,banks),level=candidateFields[0]!,board=new Board(level,'pilot-attempt');
  const blocked=board.remaining.find(a=>a.id!==board.hint()&&!validPilotAttempt({...board.snapshot(),removed:[a.id]},level))!;board.activate(blocked.id);board.activate(board.hint()!);
  store.save('candidate',0,board.snapshot());const restored=createPilotStore(storage,banks);
  expect(restored.restore('candidate',0)).toEqual(board.snapshot());expect(restored.restore('baseline',0)).toBeUndefined();expect(data.get('arrows.progress.v1')).toBe('main-unchanged');
  expect(validPilotAttempt({...board.snapshot(),removed:[blocked.id]},level)).toBe(false);expect(validPilotAttempt({...board.snapshot(),lives:3},level)).toBe(false);
 });
 it('survives corrupt/oversized/blocked optional storage and retains current session',()=>{
  const storage={getItem:()=>JSON.stringify({version:1,index:999,boards:{}}),setItem:()=>{throw Error('blocked');}},store=createPilotStore(storage,banks),b=new Board(candidateFields[0]!,'session').snapshot();
  expect(store.failed).toBe(true);store.save('candidate',0,b);expect(store.restore('candidate',0)).toEqual(b);expect(store.failed).toBe(true);expect(PILOT_KEY).not.toBe('arrows.progress.v1');
 });
});
