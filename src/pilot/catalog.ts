import fields from './fields.json' with {type:'json'};
import baseline from './baseline.json' with {type:'json'};
import type {Level} from '../domain/board';
export const pilotRows=fields as unknown as readonly {level:Level;pace:string;family:string;motif:string;position?:number;date?:string;metrics:{arrows:number;initialFree:number;depth:number};situations:{maxUnlock:number}}[];
export const candidateFields=pilotRows.map(r=>r.level);
export const baselineFields=baseline as readonly Level[];
