import {it,expect,vi} from 'vitest';
import contract from '../../src/platform/analytics-contract.json';
import {validEvent} from '../../src/platform/analytics';
import {ProgressStore,SAVE_KEY,type SaveChange} from '../../src/progression/save';
// @ts-expect-error Build-time, Node-only checker.
import {releaseConfigProblems} from '../../tools/release-config.mjs';

it('checks every shared analytics shape and rejects missing/extra/wrong-type fields',()=>{
 for(const [name,fields]of Object.entries(contract)){
  const params=Object.fromEntries(Object.entries(fields).map(([key,type])=>[key,type==='string'?'sample':type==='number'?1:true]));
  expect(validEvent(name,params),name).toBe(true);expect(validEvent(name,{...params,extra:'value'}),name).toBe(false);
  for(const [key,type]of Object.entries(fields)){
   const missing={...params};delete missing[key];expect(validEvent(name,missing),`${name}.${key}`).toBe(false);
   expect(validEvent(name,{...params,[key]:type==='number'?'1':type==='string'?true:1}),`${name}.${key}`).toBe(false);
  }
 }
});
it('publishes restart timing from the successful queued snapshot, never a pending or failed write',async()=>{
 let raw:string|null=null,block=false,entered=false,fail=false,release:()=>void=()=>{};const changes:SaveChange[]=[];
 const store=new ProgressStore({async getItem(k){return k===SAVE_KEY?raw:null;},async setItem(_k,v){if(fail)throw Error('write rejected');if(block){block=false;entered=true;await new Promise<void>(r=>{release=r;});}raw=v;},async removeItem(){raw=null;}});
 await store.load();store.subscribe(e=>changes.push(e));const id=store.board.attemptId;
 await store.move(id,store.board.hint()!,100);changes.length=0;block=true;
 const time=store.presentation(id,{},1234),restart=store.restart(id);await vi.waitFor(()=>expect(entered).toBe(true));expect(changes.filter(e=>e.restarted)).toHaveLength(0);
 release();await time;await restart;expect(changes.filter(e=>e.restarted).map(e=>e.restarted)).toEqual([{attempt:id,levelId:'c01',mode:'campaign',activeMs:1334}]);
 expect(JSON.parse(raw!).campaign.activeMs).toBe(0);expect(raw).not.toContain('restarted');
 changes.length=0;fail=true;await expect(store.restart(store.board.attemptId)).rejects.toThrow();expect(changes.filter(e=>e.restarted)).toHaveLength(0);
 store.destroy();
});
it('fails production configuration closed with names-only diagnostics',()=>{
 const env={ARROWS_AD_MODE:'live',YANDEX_REWARDED_AD_UNIT_ID:'R-M-123456-1',YANDEX_INTERSTITIAL_AD_UNIT_ID:'R-M-123456-2',YANDEX_BANNER_AD_UNIT_ID:'R-M-123456-3',APPMETRICA_API_KEY:'11111111-2222-3333-4444-555555555555',ARROWS_RELEASE_KEYSTORE:'/private/test.keystore',ARROWS_RELEASE_STORE_PASSWORD:'secret-store',ARROWS_RELEASE_KEY_PASSWORD:'secret-key',ARROWS_RELEASE_KEY_ALIAS:'release',ARROWS_RELEASE_CERT_SHA256:'a'.repeat(64)};
 expect(releaseConfigProblems(env,()=>true)).toEqual({missing:[],invalid:[]});expect(releaseConfigProblems({},()=>false).missing).toHaveLength(10);
 for(const [name,value]of Object.entries({...env,ARROWS_AD_MODE:'test',YANDEX_REWARDED_AD_UNIT_ID:'demo-rewarded-yandex',YANDEX_INTERSTITIAL_AD_UNIT_ID:'R-M-XXXXXX-Y',APPMETRICA_API_KEY:'not-a-key',ARROWS_RELEASE_CERT_SHA256:'bad'})){
  if(value===env[name as keyof typeof env])continue;
  expect(releaseConfigProblems({...env,[name]:value},()=>true).invalid).toContain(name);
 }
 expect(releaseConfigProblems(env,()=>false).invalid).toContain('ARROWS_RELEASE_KEYSTORE');
 expect(JSON.stringify(releaseConfigProblems({...env,APPMETRICA_API_KEY:'secret-value'},()=>false))).not.toContain('secret-value');
});
