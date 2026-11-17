import {it,expect,vi} from 'vitest';
import {ProgressStore,freshSave,freshAttempt,decodeSave,SAVE_KEY,type GameSave} from '../../src/progression/save';
import {ArchiveRepository,ARCHIVE_PREFIX,INLINE_BYTES} from '../../src/progression/archiveRepository';
import {draftSave} from '../../src/progression/saveDraft';
import {dailyCatalog} from '../../src/content/daily';

function setup(seed:GameSave){
 const rows=new Map<string,string>([[SAVE_KEY,JSON.stringify(seed)]]),writes:{key:string;bytes:number}[]=[];
 let fail:(key:string,value:string)=>'before'|'after'|'corrupt'|undefined=()=>undefined,readFailure=false;
 const storage={async getItem(key:string){if(readFailure)throw Error('read unavailable');return rows.get(key)??null;},async setItem(key:string,value:string){const mode=fail(key,value);if(mode==='before')throw Error('write rejected');writes.push({key,bytes:new TextEncoder().encode(value).length});if(value.length>4*1024*1024)throw Error('native budget');rows.set(key,mode==='corrupt'?value+' ':value);if(mode==='after')throw Error('reply lost');},async removeItem(key:string){rows.delete(key);},async listKeys(prefix:string){return [...rows.keys()].filter(k=>k.startsWith(prefix));}};
 return {rows,writes,storage,setFail(fn:typeof fail){fail=fn;},setReadFailure(value:boolean){readFailure=value;}};
}
function large(){const s=freshSave();Object.assign(s,{archiveFixturePadding:'x'.repeat(INLINE_BYTES+100)});s.freeContinueUsed=true;s.campaign.view={centerX:2,centerY:3,zoom:2};s.daily['2026-02-02']=freshAttempt(dailyCatalog['2026-02-02']!);s.daily['2026-01-01']=freshAttempt(dailyCatalog['2026-01-01']!);return decodeSave(s);}
function repo(storage:ReturnType<typeof setup>['storage']){return new ArchiveRepository(storage,SAVE_KEY,decodeSave,freshSave);}
it('migrates exact schema2 data and insertion order, with bounded blocks and one small root',async()=>{
 const seed=large(),f=setup(seed),r=repo(f.storage),loaded=await r.load();
 expect(loaded).toEqual(seed);expect(JSON.parse(f.rows.get(SAVE_KEY)!)).toMatchObject({format:'arrows-progress-archive',version:1});
 expect(f.rows.get(SAVE_KEY)!.length).toBeLessThan(200);expect(f.writes.every(w=>w.bytes<=128*1024)).toBe(true);
 const restored=await repo(f.storage).load();expect(restored).toEqual(seed);expect(Object.keys(restored.daily)).toEqual(['2026-02-02','2026-01-01']);
 expect(JSON.stringify(restored)).toBe(JSON.stringify(seed));r.destroy();
});
for(const at of ['block','root'] as const)it(`failed migration at ${at} leaves the legacy root intact and retries`,async()=>{
 const f=setup(large()),before=f.rows.get(SAVE_KEY);f.setFail(key=>(at==='block'?key.startsWith(ARCHIVE_PREFIX):key===SAVE_KEY)?'before':undefined);
 const store=new ProgressStore(f.storage);await store.load();expect(store.available).toBe(false);expect(f.rows.get(SAVE_KEY)).toBe(before);
 f.setFail(()=>undefined);await store.recover();expect(store.available).toBe(true);expect(store.state).toEqual(decodeSave(JSON.parse(before!)));store.destroy();
});
it('verifies block bytes before any root publication',async()=>{
 const f=setup(large()),before=f.rows.get(SAVE_KEY);f.setFail(key=>key.startsWith(ARCHIVE_PREFIX)?'corrupt':undefined);const store=new ProgressStore(f.storage);await store.load();expect(store.available).toBe(false);expect(f.rows.get(SAVE_KEY)).toBe(before);store.destroy();
});
for(const phase of ['before','after'] as const)it(`${phase} root write failure preserves reward effect+dedup atomicity`,async()=>{
 const f=setup(large()),store=new ProgressStore(f.storage);await store.load();const id=store.board.attemptId,before=structuredClone(store.state),receipt={schema:1 as const,id:'archive-earned',attempt:id,mode:'campaign' as const,placement:'hint' as const};
 f.setFail(key=>key===SAVE_KEY?phase:undefined);
 if(phase==='before'){await expect(store.commitReward(receipt)).rejects.toThrow();expect(store.state).toEqual(before);expect((await repo(f.storage).load()).receipts).not.toContain(receipt.id);f.setFail(()=>undefined);}
 expect(await store.commitReward(receipt)).toBe('applied');expect(await store.commitReward(receipt)).toBe('already-applied');
 const restored=await repo(f.storage).load();expect(restored.receipts).toEqual([receipt.id]);expect(restored.campaign.hint).not.toBeNull();expect(restored.freeContinueUsed).toBe(true);expect(restored.campaign.view).toEqual(before.campaign.view);store.destroy();
});
it('rejects missing/corrupt blocks without overwriting the root or fabricating progress',async()=>{
 const f=setup(large()),r=repo(f.storage);await r.load();r.destroy();const pointer=f.rows.get(SAVE_KEY)!,root=JSON.parse(pointer).root;f.rows.delete(ARCHIVE_PREFIX+root);
 const store=new ProgressStore(f.storage);await store.load();expect(store.available).toBe(false);expect(store.error).toBe('load');expect(f.rows.get(SAVE_KEY)).toBe(pointer);store.destroy();
});
it('recovers a committed-but-unconfirmed receipt without a second grant',async()=>{
 const f=setup(large()),store=new ProgressStore(f.storage);await store.load();const receipt={schema:1 as const,id:'unconfirmed-archive',attempt:store.board.attemptId,mode:'campaign' as const,placement:'hint' as const};
 f.setFail(key=>{if(key===SAVE_KEY){f.setReadFailure(true);return 'after';}return undefined;});
 await expect(store.commitReward(receipt)).rejects.toThrow();expect(store.uncertain).toBe(true);
 f.setReadFailure(false);f.setFail(()=>undefined);await store.recover();expect(await store.commitReward(receipt)).toBe('already-applied');expect(store.state.receipts).toEqual([receipt.id]);store.destroy();
});
it('rejects a stale archive writer, then recovers the newer state',async()=>{
 const f=setup(large()),a=new ProgressStore(f.storage),b=new ProgressStore(f.storage);await a.load();await b.load();await a.presentation(a.board.attemptId,{guides:true});
 await expect(b.presentation(b.board.attemptId,{guides:false})).rejects.toThrow();expect(b.uncertain).toBe(true);await b.recover();expect(b.state.campaign.guides).toBe(true);a.destroy();b.destroy();
});
it('cleans orphan blocks without deleting the committed graph',async()=>{
 const f=setup(large()),r=repo(f.storage);await r.load();const orphan=ARCHIVE_PREFIX+'a'.repeat(64);f.rows.set(orphan,'orphan');const loaded=await r.load();
 await vi.waitFor(()=>expect(f.rows.has(orphan)).toBe(false));expect(await repo(f.storage).load()).toEqual(loaded);r.destroy();
});
it('copies only touched mutable attempts and shares frozen geometry without mutating the source',()=>{
 const seed=large(),before=structuredClone(seed),draft=draftSave(seed);draft.state.daily['2026-01-01']!.board={...draft.state.daily['2026-01-01']!.board,lives:2,errors:['test']};draft.state.helpLedger.candidateEnabled=false;
 const next=draft.finish();expect(seed).toEqual(before);expect(next.daily['2026-02-02']).toBe(seed.daily['2026-02-02']);expect(next.daily['2026-01-01']).not.toBe(seed.daily['2026-01-01']);expect(next.daily['2026-01-01']!.level).toBe(seed.daily['2026-01-01']!.level);expect(Object.isFrozen(next.daily['2026-01-01']!.level.arrows)).toBe(true);
});
it('rejects a stale inline writer before it can replace a larger migrated profile',async()=>{
 const f=setup(freshSave()),a=new ProgressStore(f.storage),b=new ProgressStore(f.storage);await a.load();await b.load();
 const current=structuredClone(a.state);Object.assign(current,{archiveFixturePadding:'x'.repeat(INLINE_BYTES+10)});const r=repo(f.storage);await r.load();await r.write(current);r.destroy();const root=f.rows.get(SAVE_KEY);
 await expect(b.presentation(b.board.attemptId,{guides:true})).rejects.toThrow();expect(b.uncertain).toBe(true);expect(f.rows.get(SAVE_KEY)).toBe(root);await b.recover();expect(b.state).toEqual(current);a.destroy();b.destroy();
});
it('an optional cleanup deletion failure cannot invalidate a committed receipt',async()=>{
 const f=setup(large()),r=repo(f.storage);await r.load();r.destroy();const orphan=ARCHIVE_PREFIX+'a'.repeat(64);f.rows.set(orphan,'orphan');const remove=vi.spyOn(f.storage,'removeItem').mockRejectedValue(Error('delete unavailable'));
 const store=new ProgressStore(f.storage);await store.load();await vi.waitFor(()=>expect(remove).toHaveBeenCalled());const receipt={schema:1 as const,id:'gc-earned',attempt:store.board.attemptId,mode:'campaign' as const,placement:'hint' as const};expect(await store.commitReward(receipt)).toBe('applied');remove.mockRestore();store.destroy();expect((await repo(f.storage).load()).receipts).toEqual([receipt.id]);
});
it('migrates a pending exact help request and preserves active help against a late legacy reward',async()=>{
 const f=setup(freshSave()),first=new ProgressStore(f.storage);await first.load();const request=(await first.prepareHelpRequest(first.helpOffer(first.board.attemptId)!))!;expect(request).toBeTruthy();
 const seed=structuredClone(first.state);Object.assign(seed,{archiveFixturePadding:'x'.repeat(INLINE_BYTES+10)});first.destroy();const g=setup(seed),store=new ProgressStore(g.storage);await store.load();expect(store.state.helpLedger.requests[request.requestId]).toEqual(request);
 const receipt={schema:2 as const,intentVersion:1 as const,id:request.requestId,requestId:request.requestId,attempt:request.owner.attempt,mode:request.owner.mode,placement:'hint' as const};expect(await store.commitReward(receipt)).toBe('applied');const active=structuredClone(store.currentHelp(store.board.attemptId));expect(active).toBeTruthy();
 await store.commitReward({schema:1,id:'late-legacy-archive',attempt:store.board.attemptId,mode:'campaign',placement:'hint'});expect(store.currentHelp(store.board.attemptId)).toEqual(active);expect(store.state.helpLedger.rights['late-legacy-archive']!.status).toBe('reserved');store.destroy();const restored=new ProgressStore(g.storage);await restored.load();expect(restored.currentHelp(restored.board.attemptId)).toEqual(active);expect(await restored.commitReward(receipt)).toBe('already-applied');restored.destroy();
});
