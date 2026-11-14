import {describe,it,expect} from 'vitest';
import {createA1CueQA,A1_CUE_KEY} from '../../src/game/a1ErrorCue';
describe('isolated bounded QA metadata',()=>{
  it('does not read or write candidate metadata outside native playtest',async()=>{
    const keys:string[]=[];const qa=createA1CueQA({async getItem(k){keys.push(k);return null;},async setItem(k){keys.push(k);},async removeItem(){}},()=>false);
    await qa.load();qa.bindNew('new-attempt','cue');expect(qa.mode('new-attempt')).toBe('off');expect(keys).toEqual([]);
  });
  it('keeps unknown/old attempts off and bounds only its own key',async()=>{
    const db=new Map<string,string>();const storage={async getItem(k:string){return db.get(k)??null;},async setItem(k:string,v:string){db.set(k,v);},async removeItem(k:string){db.delete(k);}};
    const qa=createA1CueQA(storage,()=>true);await qa.load();for(let i=0;i<100;i++)qa.bindNew(`attempt-${i}`,'cue');
    // The test drains the independent optional QA writes, not the game writer.
    await qa.flush();expect([...db.keys()]).toEqual([A1_CUE_KEY]);expect(Object.keys(JSON.parse(db.get(A1_CUE_KEY)!).attempts)).toHaveLength(64);
    const restored=createA1CueQA(storage,()=>true);await restored.load();expect(restored.mode('old-attempt')).toBe('off');expect(restored.mode('attempt-99')).toBe('cue');
  });
  it('fails closed on corrupt or unavailable QA storage without touching game state',async()=>{
    for(const value of ['{','{"version":2}','{"version":1,"next":"cue","attempts":{"x":"random"},"trace":[]}']){
      const qa=createA1CueQA({async getItem(){return value;},async setItem(){throw Error('Must not write');},async removeItem(){}},()=>true);await qa.load();qa.bindNew('fresh','cue');expect(qa.mode('fresh')).toBe('off');
    }
  });
});
