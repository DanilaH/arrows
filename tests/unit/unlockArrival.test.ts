import {describe,it,expect} from 'vitest';
import type {StorageAdapter} from '@danilah/mini-games-kit/platform';
import {campaign} from '../../src/content/campaign';
import {Board} from '../../src/domain/board';
import {freshSave,freshAttempt,decodeSave,ProgressStore,type GameSave} from '../../src/progression/save';
function seed(index:number){const s=freshSave();s.index=index;s.campaign=freshAttempt(campaign[index]!);s.wins=campaign.slice(0,index).map((l,i)=>({attempt:`past-${i}`,levelId:l.id,activeMs:1000,completedAt:i*1000,localDate:'2026-11-01',mistakes:0}));return s;}
function memory(state:GameSave){let raw=JSON.stringify(state),fail=false,writes=0;const storage:StorageAdapter={getItem:async()=>raw,setItem:async(_k,value)=>{if(fail)throw Error('write failed');raw=value;writes++;},removeItem:async()=>{}};return {storage,fail:(value:boolean)=>{fail=value;},writes:()=>writes};}
describe('durable section discovery',()=>{
 it('quietly upgrades existing unlocks and preserves the embedded attempt and receipt ledger',()=>{
  const state=seed(19),board=new Board(state.campaign.level,state.campaign.board.id);board.activate(board.hint()!);state.campaign.board=board.snapshot();state.campaign.started=true;state.receipts=['existing-earned'];
  const {seenUnlocks:_seen,...legacy}=state;const decoded=decodeSave(legacy);expect(decoded.seenUnlocks).toEqual(['collection','calendar']);expect(decoded.campaign.board).toEqual(state.campaign.board);expect(decoded.receipts).toEqual(state.receipts);expect(decoded.wins).toEqual(state.wins);
 });
 it('repairs cosmetic discovery metadata without changing actual section availability or progress',()=>{
  for(const seenUnlocks of [['collection','collection'],['other'],['calendar'],null]){const s=seed(9),decoded=decodeSave({...s,seenUnlocks});expect(decoded.seenUnlocks).toEqual(['collection']);expect(decoded.campaign.board).toEqual(s.campaign.board);}
  expect(decodeSave({...seed(8),seenUnlocks:undefined}).seenUnlocks).toEqual([]);
 });
 it('claims once through the shared writer without overwriting a concurrent earned hint',async()=>{
  const state=seed(9),mem=memory(state),store=new ProgressStore(mem.storage);await store.load();
  expect(await store.markUnlockSeen('calendar')).toBeUndefined();expect(mem.writes()).toBe(0);
  const result=await Promise.all([store.markUnlockSeen('collection'),store.markUnlockSeen('collection'),store.commitReward({id:'earned-hint',schema:1,attempt:state.campaign.board.id,mode:'campaign',placement:'hint'})]);
  expect(result).toEqual([true,undefined,'applied']);expect(store.state.seenUnlocks).toEqual(['collection']);expect(store.state.receipts).toContain('earned-hint');expect(store.state.campaign.hint).not.toBeNull();expect(store.state.wins).toEqual(state.wins);expect(mem.writes()).toBe(2);
 });
 it('does not consume a discovery on a confirmed failed write and can claim after recovery',async()=>{
  const state=seed(9),mem=memory(state),store=new ProgressStore(mem.storage);await store.load();mem.fail(true);
  await expect(store.markUnlockSeen('collection')).rejects.toThrow();expect(store.state.seenUnlocks).toEqual([]);expect(store.state.campaign.board).toEqual(state.campaign.board);expect(store.error).toBe('write');
  mem.fail(false);await store.recover();expect(await store.markUnlockSeen('collection')).toBe(true);expect(store.state.seenUnlocks).toEqual(['collection']);
 });
});
