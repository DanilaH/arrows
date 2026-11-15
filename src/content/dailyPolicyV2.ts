import {dateOrdinal,validDate} from '../progression/calendar';
import {patternKinds,patternSize} from './patternsV1';
export const DENSE_DAILY_START='2026-01-01';
export const DENSE_DAILY_VERSION=3;
const dailyKinds=patternKinds.filter(k=>!['sword','key','dragonfly','lightning','snowflake','spiral','cross','planet'].includes(k));
export function denseDailyDifficulty(date:string):'hard'|'nightmare'{if(!validDate(date)||date<DENSE_DAILY_START)throw Error('Invalid dense daily date');const weekday=(dateOrdinal(date)+4)%7;return weekday===3||weekday===6?'nightmare':'hard';}
export function denseDailySpec(date:string){
 const ordinal=dateOrdinal(date),difficulty=denseDailyDifficulty(date),kind=dailyKinds[((ordinal*13+Math.floor(ordinal/32)*7)%dailyKinds.length+dailyKinds.length)%dailyKinds.length]!;
 const cells=difficulty==='nightmare'?3300+160*(ordinal%3):2500+128*(ordinal%3),size=patternSize(kind,cells,96);
 return{date,ordinal,seed:Number(date.replaceAll('-','')),difficulty,kind,...size,depth:difficulty==='nightmare'?36+ordinal%5:25+ordinal%4};
}
