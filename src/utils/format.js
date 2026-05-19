export const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
export function soft(h,a=.12){ h = /^#[0-9a-f]{6}$/i.test(h||'') ? h : '#1f5f5b'; const n=parseInt(h.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
export const badgeStyle = c => `background:${soft(c,.12)};color:${c};border-color:${soft(c,.25)}`;
