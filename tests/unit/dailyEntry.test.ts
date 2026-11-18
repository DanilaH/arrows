import {it,expect,vi,afterEach} from 'vitest';
import {dailyDestination,dailyEntryLabel,dailyCupProgress,reminderProjection} from '../../src/progression/dailyEntry';
import {freshSave,freshAttempt,ProgressStore,SAVE_KEY,type GameSave} from '../../src/progression/save';
import {campaign} from '../../src/content/campaign';
import {createDailyReminders,type DailyReminderBridge,type ReminderStatus} from '../../src/platform/dailyReminders';
const win={attempt:'earned',levelId:'daily',completedAt:1,activeMs:1,mistakes:0};
function unlocked(){const s=freshSave();s.index=19;s.campaign=freshAttempt(campaign[19]!);s.wins=campaign.slice(0,19).map((l,i)=>({...win,attempt:`past-${i}`,levelId:l.id}));return s;}
it('opens at level20, today before any older unfinished attempt, and resumes the exact date',()=>{
 const s=unlocked();s.index=18;expect(dailyDestination(s,'2027-01-01')).toEqual({kind:'locked'});s.index=19;
 s.daily['2026-12-31']={...s.campaign,started:true};expect(dailyDestination(s,'2027-01-01')).toEqual({kind:'daily',date:'2027-01-01',today:true,resumed:false});
 s.daily['2027-01-01']={...s.campaign,started:true};expect(dailyEntryLabel(dailyDestination(s,'2027-01-01'),'en')).toContain('Resume daily');
 s.dailyWins['2027-01-01']=win;expect(dailyDestination(s,'2027-01-01')).toEqual({kind:'daily',date:'2026-12-31',today:false,resumed:true});
});
it('walks real leap/year boundaries and never advertises a future daily',()=>{
 const s=unlocked();s.dailyWins['2028-03-01']=win;expect(dailyDestination(s,'2028-03-01')).toMatchObject({date:'2028-02-29'});
 for(let at=Date.parse('2026-01-01T00:00Z');at<=Date.parse('2026-01-05T00:00Z');at+=86400000)s.dailyWins[new Date(at).toISOString().slice(0,10)]=win;
 expect(dailyDestination(s,'2026-01-05')).toEqual({kind:'tomorrow'});expect(dailyDestination(s,'2026-01-06')).toMatchObject({date:'2026-01-06'});
 expect(dailyDestination(s,'2025-12-31')).toEqual({kind:'tomorrow'});
});
it('counts the whole trophy month, including unavailable future days, without granting a cup',()=>{
 const s=unlocked();s.dailyWins['2026-11-17']=win;s.dailyWins['2026-10-31']=win;
 expect(dailyCupProgress(s,'2026-11-17')).toEqual({done:1,total:30,earned:false});expect(s.cups).toEqual([]);
});
it('projects two calendar months without loading content or rewriting attempts',()=>{
 const s=unlocked();s.dailyWins['2026-12-17']=win;s.dailyWins['2027-01-02']=win;s.dailyWins['2026-11-30']=win;s.daily['2026-12-18']={...s.campaign,started:true};
 const before=JSON.stringify(s),p=reminderProjection(s,'2026-12-17');expect(p).toEqual({version:1,unlocked:true,from:'2026-12-01',to:'2027-01-31',lastCompleted:'2027-01-02',completed:['2026-12-17','2027-01-02'],started:['2026-12-18']});expect(JSON.stringify(s)).toBe(before);
 expect(reminderProjection(s,'2028-01-01')?.to).toBe('2028-02-29');
});
afterEach(()=>{vi.unstubAllGlobals();});
it('does not export an optimistic/failing save as reminder truth; recovers from the confirmed root',async()=>{
 const seed=unlocked(),rows=new Map([[SAVE_KEY,JSON.stringify(seed)]]);let fail=false;
 const store=new ProgressStore({async getItem(k){return rows.get(k)??null;},async setItem(k,v){if(fail)throw Error('disk');rows.set(k,v);},async removeItem(k){rows.delete(k);}});
 await store.load();expect(store.durableWitness).toBe(rows.get(SAVE_KEY));fail=true;
 await expect(store.presentation(store.board.attemptId,{guides:true})).rejects.toThrow();expect(store.durableWitness).toBeUndefined();expect(store.state.campaign.guides).toBe(false);
 fail=false;await store.recover();expect(store.durableWitness).toBe(rows.get(SAVE_KEY));store.destroy();
});
it('binds reminder data to the captured root and coalesces concurrent commits; optional failure preserves progress',async()=>{
 vi.stubGlobal('window',new EventTarget());vi.stubGlobal('document',Object.assign(new EventTarget(),{hidden:false}));
 const seed=unlocked(),rows=new Map([[SAVE_KEY,JSON.stringify(seed)]]),store=new ProgressStore({async getItem(k){return rows.get(k)??null;},async setItem(k,v){rows.set(k,v);},async removeItem(k){rows.delete(k);}});await store.load();
 const status:ReminderStatus={enabled:true,allowed:true,requested:true,pending:''},sent:Parameters<DailyReminderBridge['sync']>[0][]=[];
 let reject=true;const bridge:DailyReminderBridge={async status(){return status;},async sync(value){sent.push(value);if(reject)throw Error('optional native service');return status;},async request(){return status;},async consume(){return status;},async openSettings(){},async addListener(){return{async remove(){}};}};
 const reminders=createDailyReminders(store,()=> 'en',()=>{},true,bridge);reminders.sync();
 await store.presentation(store.board.attemptId,{guides:true});await store.presentation(store.board.attemptId,{guides:false});reject=false;
 await vi.waitFor(()=>expect(sent.at(-1)?.snapshot?.rootHash).toBeDefined());
 const raw=store.durableWitness!,bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)),hash=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
 await vi.waitFor(()=>expect(sent.at(-1)?.snapshot?.rootHash).toBe(hash));expect(store.error).toBeNull();expect(store.state.campaign.guides).toBe(false);reminders.destroy();store.destroy();
});

it('keeps the old state/proof pair during an in-flight publication and exposes the new pair together',async()=>{
 const seed=unlocked();let raw=JSON.stringify(seed),hold:undefined|(()=>void),written=false;
 const store=new ProgressStore({async getItem(){return raw;},async setItem(_key,value){raw=value;written=true;await new Promise<void>(resolve=>{hold=resolve;});},async removeItem(){}});await store.load();const before=store.durableWitness;
 const moving=store.presentation(store.board.attemptId,{guides:true});await vi.waitFor(()=>expect(written).toBe(true));
 expect(store.state.campaign.guides).toBe(false);expect(store.durableWitness===before).toBe(true);expect(raw===before).toBe(false);
 hold!();await moving;expect(store.state.campaign.guides).toBe(true);expect(store.durableWitness===raw).toBe(true);store.destroy();
});

it('serializes the automatic permission request and keeps denial separate from the automatic schedule',async()=>{
 vi.stubGlobal('window',new EventTarget());vi.stubGlobal('document',Object.assign(new EventTarget(),{hidden:false}));
 const rows=new Map([[SAVE_KEY,JSON.stringify(unlocked())]]),store=new ProgressStore({async getItem(k){return rows.get(k)??null;},async setItem(k,v){rows.set(k,v);},async removeItem(k){rows.delete(k);}});await store.load();
 let status:ReminderStatus={enabled:true,allowed:false,requested:false,pending:''},requests=0,finish:undefined|(()=>void);
 const bridge:DailyReminderBridge={async status(){return {...status};},async sync(){return {...status};},async request(){requests++;await new Promise<void>(resolve=>{finish=resolve;});status={...status,requested:true};return {...status};},async consume(){return {...status};},async openSettings(){},async addListener(){return{async remove(){}};}};
 const reminders=createDailyReminders(store,()=> 'en',()=>{},true,bridge);await reminders.refresh();
 const first=reminders.requestOnce();await reminders.requestOnce();expect(requests).toBe(1);finish!();await first;
 expect(reminders.state).toMatchObject({enabled:true,requested:true,allowed:false});await reminders.requestOnce();expect(requests).toBe(1);
 reminders.destroy();store.destroy();
});
