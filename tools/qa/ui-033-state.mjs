// QA only; never imported by application entry points.
import {Board,freshSave,freshAttempt,campaign,dailyCatalog,monthDates,trophyBinding,decodeSave} from '../../.test-output/ui-033/ssr/ui-composition-source.js';
export {Board,freshSave};
export function reviewSave(index=119,left){
 const s=freshSave();s.index=index;s.campaign=freshAttempt(campaign[index]);
 s.wins=campaign.slice(0,index).map((l,i)=>({attempt:`ui033-past-${i}`,levelId:l.id,activeMs:43000,completedAt:Date.parse('2026-11-15T12:00:00+05:00')+i*60000,localDate:'2026-11-15',mistakes:i%7===0?1:0}));
 s.tutorials=['tap','turns','blockers','guides','zoom','hint'];s.seenUnlocks=index>=19?['collection','calendar']:index>=9?['collection']:[];
 if(left!==undefined){const b=new Board(s.campaign.level,s.campaign.board.id);while(b.remaining.length>left)b.activate(b.hint());s.campaign.board=b.snapshot();s.campaign.started=true;s.campaign.activeMs=38000;}
 return decodeSave(s);
}
export function activeSave(index=119){const s=reviewSave(index),b=new Board(s.campaign.level,s.campaign.board.id);for(let i=0;i<Math.min(8,b.remaining.length-1);i++)b.activate(b.hint());s.campaign.board=b.snapshot();s.campaign.started=true;s.campaign.activeMs=38000;return decodeSave(s);}
export function withDays(save,month,count=monthDates(month).length){
 for(const date of monthDates(month).slice(0,count)){const a=freshAttempt(dailyCatalog[date]),b=new Board(a.level,a.board.id);while(!b.complete)b.activate(b.hint());a.board=b.snapshot();a.started=true;save.daily[date]=a;save.dailyWins[date]={attempt:b.attemptId,levelId:b.level.id,completedAt:Date.parse(date+'T12:00:00+05:00'),localDate:date,activeMs:84000,mistakes:0};}
 if(count===monthDates(month).length){if(!save.cups.includes(month))save.cups.push(month);save.trophyDesigns[month]=trophyBinding(month);}
 return decodeSave(save);
}
export const awardSave=()=>withDays(withDays(activeSave(39),'2026-08'),'2026-11',6);
