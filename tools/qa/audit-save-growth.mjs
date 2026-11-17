import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {campaign,dailyLevel,freshSave,freshAttempt,decodeSave,ProgressStore} from '../../.test-output/production-readiness/ssr/ui-composition-source.js';

// Diagnostic reproducer, not a storage migration or a phone performance test.
const source=await readFile('native/android/app/src/main/java/com/danilah/arrows/ArrowsStoragePlugin.java','utf8');
const limitMatch=source.match(/bytes\.length\s*>\s*(\d+)\s*\*\s*1024\s*\*\s*1024/);
assert(limitMatch,'Native storage budget changed: review this capacity probe');
const limit=Number(limitMatch[1])*1024*1024,start=Date.now(),deadline=start+120000;
const save=freshSave();save.index=19;save.campaign=freshAttempt(campaign[19]);
save.helpLedger.assignments[save.campaign.board.id]=save.helpLedger.nextVariant;
save.wins=campaign.slice(0,19).map((level,i)=>({attempt:'capacity-before-'+i,levelId:level.id,completedAt:i+1,activeMs:1000,mistakes:0}));
save.seenUnlocks=['collection','calendar'];save.tutorials=['tap','turns','blockers','guides','zoom','hint'];
const samples=[];let firstFailure=null;
for(let i=0;i<90;i++){
  assert(Date.now()<deadline,'Capacity diagnostic budget exceeded');
  const date=new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10),before=structuredClone(save),level=dailyLevel(date);
  assert(level&&level.contentVersion===3);
  const attempt=freshAttempt(level);save.daily[date]=attempt;save.helpLedger.assignments[attempt.board.id]=save.helpLedger.nextVariant;save.revision++;
  const bytes=Buffer.byteLength(JSON.stringify(save),'utf8');
  samples.push({date,arrows:level.arrows.length,levelBytes:Buffer.byteLength(JSON.stringify(level),'utf8'),profileBytes:bytes});
  if(bytes>limit){
    decodeSave(before);
    let raw=JSON.stringify(before),attemptedBytes=0;
    const store=new ProgressStore({async getItem(){return raw;},async setItem(_key,value){attemptedBytes=Buffer.byteLength(value,'utf8');if(attemptedBytes>limit)throw Error('Native storage byte budget');raw=value;},async removeItem(){raw=null;}},()=>new Date('2026-11-17T12:00:00Z'));
    await store.load();const previous=raw,previousRevision=store.state.revision;let rejected=false;
    try{await store.openDaily(date);}catch{rejected=true;}
    assert(rejected,'Expected the actual ProgressStore.openDaily write to fail at the native byte budget');
    assert.equal(store.error,'write');assert.equal(raw,previous);assert.equal(store.state.revision,previousRevision);assert(!store.state.daily[date]);
    firstFailure={date,openedBefore:i,requestedCount:i+1,beforeBytes:Buffer.byteLength(previous,'utf8'),candidateBytes:attemptedBytes,plannedProfileBytes:bytes,rejectedByActualWriter:true,confirmedError:store.error,priorProgressPreserved:true,beforeSha256:createHash('sha256').update(previous).digest('hex')};
    store.destroy();break;
  }
}
assert(firstFailure,'No reproduced failure within90dates: review the diagnostic scope');
const result={source:process.env.GITHUB_SHA??'local',productionGate:'BLOCKED_SAVE_CAPACITY',nativeLimitBytes:limit,firstFailure,samples,elapsedMs:Date.now()-start,provenance:'Real current dailyLevel/date mapping and schema2 ProgressStore; legal opened-but-unplayed archive state after19campaign wins, no fabricated geometry. Controlled storage adapter reproduces the exact native UTF8 budget; not a physical phone or Java bridge execution.',notChanged:'No game/level/save/generator/monetization code changed by this probe.'};
await mkdir('.test-output/save-capacity-audit',{recursive:true});await writeFile('.test-output/save-capacity-audit/report.json',JSON.stringify(result,null,2));
console.info(JSON.stringify({...result,samples:undefined},null,2));
