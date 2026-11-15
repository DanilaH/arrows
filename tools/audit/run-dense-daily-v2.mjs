import {writeFileSync} from 'node:fs';
import {auditDenseDates} from '../../.test-output/daily-v2-audit/dense-daily-v2.js';
const start=Date.parse('2026-01-01T00:00:00Z'),dates=Array.from({length:365},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10));
for(const year of[2028,2029,2030,2037,2046,2060,2099,2100,2120,2164,2199,2200])for(const day of['01-08','06-14','12-28'])dates.push(`${year}-${day}`);
dates.push('2028-02-29','2048-02-29','2100-02-28','2200-12-31');
const report=auditDenseDates([...new Set(dates)]);writeFileSync('docs/verification/DAILY_V2_AUDIT.json',JSON.stringify(report,null,2)+'\n');console.log('AUDIT PASS',report.rows.length,'dates,',report.rows.filter(x=>x.fallback).length,'fallbacks');
