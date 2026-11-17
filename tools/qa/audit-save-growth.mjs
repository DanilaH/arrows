import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {campaign,dailyLevel,freshSave,freshAttempt,decodeSave,ProgressStore,Board,canExit,trophyBinding,monthDates,ArchiveRepository} from '../../.test-output/production-readiness/ssr/ui-composition-source.js';

// Exact native per-value budget, actual frozen daily generation. These are
// authored compatibility histories, not organic play or physical-device timings.
const native=await readFile('native/android/app/src/main/java/com/danilah/arrows/ArrowsStoragePlugin.java','utf8');
const limit=Number(native.match(/bytes\.length\s*>\s*(\d+)\s*\*\s*1024\s*\*\s*1024/)[1])*1024*1024;
const size=s=>Buffer.byteLength(s,'utf8'),sha=s=>createHash('sha256').update(s).digest('hex'),key='arrows.progress.v1',start=performance.now();
const seed=freshSave();seed.index=19;seed.campaign=freshAttempt(campaign[19]);seed.helpLedger.assignments[seed.campaign.board.id]=seed.helpLedger.nextVariant;
seed.wins=campaign.slice(0,19).map((l,i)=>({attempt:'capacity-before-'+i,levelId:l.id,completedAt:i+1,activeMs:1000,mistakes:0}));seed.seenUnlocks=['collection','calendar'];seed.tutorials=['tap','turns','blockers','guides','zoom','hint'];
const dateAt=i=>new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10);
for(let i=0;i<54;i++){const d=dateAt(i),a=freshAttempt(dailyLevel(d));seed.daily[d]=a;seed.helpLedger.assignments[a.board.id]=seed.helpLedger.nextVariant;seed.revision++;}
const legacy=JSON.stringify(seed),expected=JSON.stringify(decodeSave(JSON.parse(legacy)));
assert(size(legacy)<limit);
const rows=new Map([[key,legacy]]),writes=[];
const storage={async getItem(k){return rows.get(k)??null;},async setItem(k,v){const bytes=size(v);assert(bytes<=limit);writes.push({key:k,bytes});rows.set(k,v);},async removeItem(k){rows.delete(k);},async listKeys(prefix){return [...rows.keys()].filter(k=>k.startsWith(prefix));}};
const store=new ProgressStore(storage,()=>new Date('2028-01-02T12:00:00Z'));
await store.load();assert(store.available);assert.equal(JSON.stringify(store.state),expected);assert.equal(JSON.parse(rows.get(key)).format,'arrows-progress-archive');
const migration={legacyBytes:size(legacy),rootBytes:size(rows.get(key)),logicalUnchanged:true,openedBefore:54};
const d55=dateAt(54);assert(await store.openDaily(d55));assert.equal(Object.keys(store.state.daily).length,55);
const formerBlocker={requestedCount:55,date:d55,opened:true,rootBytes:size(rows.get(key))};
for(let i=55;i<730;i++){const date=dateAt(i);assert(await store.openDaily(date));if(i===364||i===729)console.info('Archive opened '+(i+1)+' actual dates');}
assert.equal(Object.keys(store.state.daily).length,730);
// Grid oracle supplies valid deterministic removal histories, independent of
// Board.hint/canExit; the unchanged production decoder replays the histories.
function witness(level){
 const cells=new Map();
 for(const a of level.arrows)for(let i=1;i<a.path.length;i++){const p=a.path[i-1],q=a.path[i],n=Math.abs(p.x-q.x)+Math.abs(p.y-q.y);for(let j=0;j<=n;j++){const k=(p.x+Math.sign(q.x-p.x)*j)+','+(p.y+Math.sign(q.y-p.y)*j);if(!cells.has(k))cells.set(k,new Set());cells.get(k).add(a.id);}}
 const blockers=new Map();for(const a of level.arrows){const p=a.path.at(-1),q=a.path.at(-2),dx=Math.sign(p.x-q.x),dy=Math.sign(p.y-q.y),b=new Set();for(let x=p.x+dx,y=p.y+dy;x>=0&&y>=0&&x<level.width&&y<level.height;x+=dx,y+=dy)for(const id of cells.get(x+','+y)??[])if(id!==a.id)b.add(id);blockers.set(a.id,b);}
 const left=new Set(blockers.keys()),order=[];while(left.size){const id=[...left].find(id=>[...blockers.get(id)].every(b=>!left.has(b)));assert(id);order.push(id);left.delete(id);}return order;
}
const rich={...store.state,daily:{},dailyWins:{},cups:[],trophyDesigns:{},freeContinueUsed:true,helpLedger:structuredClone(store.state.helpLedger)};
const partials=new Set(['2026-01-15','2026-12-31','2027-12-31']);
for(const [date,a]of Object.entries(store.state.daily)){
 const order=witness(a.level),partial=partials.has(date),removed=partial?order.slice(0,3):order;
 const remaining=a.level.arrows.filter(v=>!removed.includes(v.id)),blocked=partial?remaining.find(v=>!canExit(v,remaining)):null;
 const next={...a,started:true,activeMs:12345,board:{...a.board,removed,errors:blocked?[blocked.id]:[],lives:blocked?2:3},view:partial?{centerX:a.level.width/2,centerY:a.level.height/2,zoom:2}:null};
 rich.daily[date]=next;if(!partial)rich.dailyWins[date]={attempt:a.board.id,levelId:a.level.id,completedAt:new Date(date+'T12:00:00Z').getTime(),activeMs:12345,mistakes:0,localDate:date};
}
for(const month of new Set(Object.keys(rich.daily).map(d=>d.slice(0,7))))if(monthDates(month).every(d=>rich.dailyWins[d])){rich.cups.push(month);rich.trophyDesigns[month]=trophyBinding(month);}
const valid=decodeSave(rich),richHash=sha(JSON.stringify(valid));store.destroy();
const repository=new ArchiveRepository(storage,key,decodeSave,freshSave);await repository.load();await repository.write(valid);repository.destroy();
const cold=performance.now(),restored=new ProgressStore(storage,()=>new Date('2028-01-02T12:00:00Z'));await restored.load();assert(restored.available);assert.equal(sha(JSON.stringify(restored.state)),richHash);
const coldMs=performance.now()-cold,id=restored.state.daily['2027-12-31'].board.id;
const beforeWrites=writes.length,warm=performance.now();await restored.presentation(id,{guides:true});const target=restored.findAttempt(id).saved;const board=new Board(target.level,id,target.board);assert.equal((await restored.move(id,board.hint(),50)).kind,'removed');
const warmMs=performance.now()-warm,warmWrites=writes.slice(beforeWrites),warmBytes=warmWrites.reduce((n,w)=>n+w.bytes,0);assert(warmBytes<512*1024,'A warm action rewrote too much archive data');
const receipt={schema:1,id:'archive-retained-receipt',attempt:'retired-archive-owner',mode:'daily',placement:'hint'};assert.equal(await restored.commitReward(receipt),'applied');assert.equal(await restored.commitReward(receipt),'already-applied');
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const finalState=canonical(restored.state);restored.destroy();const again=new ProgressStore(storage,()=>new Date('2028-01-02T12:00:00Z'));await again.load();assert(again.available);assert.equal(sha(canonical(again.state)),sha(finalState));assert(again.state.freeContinueUsed);assert(again.state.receipts.includes(receipt.id));assert.equal(Object.keys(again.state.daily).length,730);again.destroy();
assert(writes.every(w=>w.bytes<=128*1024));
const report={source:process.env.GITHUB_SHA??'local',productionGate:'PASS',nativeLimitBytes:limit,migration,formerBlocker,longArchive:{days:730,completed:Object.keys(valid.dailyWins).length,partial:partials.size,cups:valid.cups.length,logicalBytes:size(JSON.stringify(valid)),rootBytes:size(rows.get(key)),logicalHash:richHash,exactReload:true,receiptDedupPreserved:true,lifetimeGiftPreserved:true},writes:{maxValueBytes:Math.max(...writes.map(w=>w.bytes)),warmActionBytes:warmBytes,warmActionWrites:warmWrites.length,storedBlocks:rows.size-1},timings:{coldRichProfileMs:Math.round(coldMs),warmPresentationAndMoveMs:Math.round(warmMs),totalMs:Math.round(performance.now()-start)},provenance:'Actual730dailyLevel dates.54-field legacy migration and actual openDaily through730dates; separately authored727complete/3partial histories validated by unchanged decoder. Exact native per-value budget in a controlled KV adapter; Node timings are not phone benchmarks. No generator or published field changes.'};
await mkdir('.test-output/save-capacity-audit',{recursive:true});await writeFile('.test-output/save-capacity-audit/report.json',JSON.stringify(report,null,2));console.info(JSON.stringify(report,null,2));
