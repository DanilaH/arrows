import {createStorage} from '../../src/platform/storage';
import {ProgressStore,freshSave,freshAttempt,decodeSave,SAVE_KEY} from '../../src/progression/save';
import {dailyCatalog} from '../../src/content/daily';
import {INLINE_BYTES} from '../../src/progression/archiveRepository';

let store:ProgressStore;
const api={
 async seed(){const save=freshSave();Object.assign(save,{archiveBrowserFixture:'x'.repeat(INLINE_BYTES+10)});save.freeContinueUsed=true;save.campaign.view={centerX:2,centerY:3,zoom:2};save.daily['2026-01-01']=freshAttempt(dailyCatalog['2026-01-01']!);const raw=JSON.stringify(decodeSave(save));localStorage.setItem(SAVE_KEY,raw);return raw;},
 async load(){store?.destroy();store=new ProgressStore(createStorage());await store.load();return {available:store.available,error:store.error,raw:JSON.stringify(store.state)};},
 async change(guides:boolean){try{await store.presentation(store.board.attemptId,{guides});return 'ok';}catch{return store.uncertain?'uncertain':'failed';}},
 async reward(){return store.commitReward({schema:1,id:'browser-archive-receipt',attempt:store.board.attemptId,mode:'campaign',placement:'hint'});},
 async recover(){await store.recover();return JSON.stringify(store.state);},
 state(){return JSON.stringify(store.state);},
 async keys(){return createStorage().listKeys('arrows.archive.');},
};
declare global{interface Window{archiveReview:typeof api;}}
window.archiveReview=api;
