export const $ = selector => document.querySelector(selector);
export const $$ = selector => [...document.querySelectorAll(selector)];
export function toast(msg,type=''){
  const t=$('#toast'); if(!t) return;
  t.textContent=msg; t.className='toast '+type;
  clearTimeout(t._to); t._to=setTimeout(()=>t.className='toast hidden',4500);
}
export function sync(msg,cls=''){
  const el=$('#syncStatus'); if(!el) return;
  el.textContent=msg; el.className='sync '+cls;
}
