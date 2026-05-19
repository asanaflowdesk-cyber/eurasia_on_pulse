import { DAYS } from '../config/constants.js';
export const pad = n => String(n).padStart(2,'0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const dateObj = s => { const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1],+m[2]-1,+m[3]) : null; };
export const dayRu = s => { const d=dateObj(s); return d ? DAYS[d.getDay()] : null; };
export function mondayOf(d){ const x=new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate()+(x.getDay()===0?-6:1-x.getDay())); return x; }
export function nextMonday(){ const d=new Date(); d.setHours(0,0,0,0); const add=d.getDay()===1?0:(d.getDay()===0?1:8-d.getDay()); d.setDate(d.getDate()+add); return d; }
